import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

function PlacesInput({
  placeholder,
  onPlaceSelected,
  value,
  disabled = false,
}: {
  placeholder: string;
  onPlaceSelected: (
    address: string,
    location: { lat: number; lng: number },
  ) => void;
  value: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [mapKey, setMapKey] = useState(0); // Force re-render of map container

  const timer = useRef(null);
  const googleMap = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const mapContainerId = useRef(`map-${Date.now()}-${Math.random()}`);
  const isMapInitializing = useRef(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (disabled) {
      setIsDropdownOpen(false);
      setPredictions([]);
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      cleanupMap();
    };
  }, []);

  const cleanupMap = () => {
    if (googleMap.current) {
      google.maps.event.clearInstanceListeners(googleMap.current);
      googleMap.current = null;
      markerRef.current = null;
      geocoder.current = null;
      isMapInitializing.current = false;
    }
  };

  const loadGoogleMapsScript = () => {
    return new Promise((resolve) => {
      if (window.google) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=geometry,places,marker`;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const initMap = () => {
    if (isMapInitializing.current) {
      return;
    }

    // Clean up any existing map
    cleanupMap();

    const mapElement = document.getElementById(mapContainerId.current);
    if (!mapElement) {
      console.log("Map element not found");
      return;
    }

    // Check if element is visible
    if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
      console.log("Map element not visible, retrying in 100ms");
      setTimeout(initMap, 100);
      return;
    }

    isMapInitializing.current = true;

    try {
      const center = selectedLocation || { lat: 3.0414, lng: 101.5461 };

      googleMap.current = new google.maps.Map(mapElement, {
        center: center,
        mapId: "DEMO_MAP_ID",
        zoom: 13,
        mapTypeControl: true,
        fullscreenControl: false,
        streetViewControl: false,
      });

      // Add click listener to map
      googleMap.current.addListener("click", (e: any) => {
        const latLng = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };
        setSelectedLocation(latLng);

        if (markerRef.current) {
          markerRef.current.setPosition(e.latLng);
        } else {
          markerRef.current = new google.maps.Marker({
            position: e.latLng,
            map: googleMap.current,
            animation: google.maps.Animation.DROP,
          });
        }

        if (geocoder.current) {
          geocoder.current.geocode(
            { location: latLng },
            (results: any, status: any) => {
              if (status === "OK" && results[0]) {
                setSelectedAddress(results[0].formatted_address);
              }
            },
          );
        }
      });

      geocoder.current = new google.maps.Geocoder();

      if (selectedLocation) {
        markerRef.current = new google.maps.Marker({
          position: selectedLocation,
          map: googleMap.current,
          animation: google.maps.Animation.DROP,
        });
      }

      // Force map to render properly
      setTimeout(() => {
        if (googleMap.current) {
          google.maps.event.trigger(googleMap.current, "resize");
        }
        isMapInitializing.current = false;
      }, 150);
    } catch (error) {
      console.error("Error initializing map:", error);
      isMapInitializing.current = false;
    }
  };

  // Handle modal open/close
  useEffect(() => {
    if (showMapModal) {
      // Reset map key to force re-render of container
      setMapKey((prev) => prev + 1);

      const initializeMap = async () => {
        const loaded = await loadGoogleMapsScript();
        if (loaded) {
          // Wait for the DOM to update with the new container
          setTimeout(initMap, 150);
        }
      };

      initializeMap();
    } else {
      cleanupMap();
    }
  }, [showMapModal]);

  const fetchPredictions = async (text: string) => {
    if (text.length < 2) return setPredictions([]);
    try {
      const res = await fetch(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_KEY,
          },
          body: JSON.stringify({
            input: text,
            languageCode: "en",
          }),
        },
      );

      const data = await res.json();
      setPredictions(data.suggestions || []);
    } catch (e) {
      console.log("ERROR:", e);
    }
  };

  const handleChange = (text: string) => {
    if (disabled) return;
    setQuery(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchPredictions(text), 350);
  };

  const handleSelect = async (item: any) => {
    if (disabled) return;
    const placeId = item.placePrediction.placeId;
    const description = item.placePrediction.text.text;
    setQuery(description);
    setPredictions([]);

    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            "X-Goog-Api-Key": GOOGLE_KEY,
            "X-Goog-FieldMask": "location,displayName,formattedAddress",
          },
        },
      );
      const data = await res.json();
      if (data.location) {
        const location = {
          lat: data.location.latitude,
          lng: data.location.longitude,
        };

        onPlaceSelected(description, location);
        setSelectedLocation(location);
        setSelectedAddress(description);
        setShowMapModal(false);
      }
    } catch (e) {
      console.log("DETAILS ERROR:", e);
    }
  };

  const handleConfirmLocation = () => {
    if (selectedLocation && selectedAddress) {
      onPlaceSelected(selectedAddress, selectedLocation);
      setQuery(selectedAddress);
      setShowMapModal(false);
    }
  };

  const handleCloseModal = () => {
    cleanupMap();
    setShowMapModal(false);
  };

  const renderMapModal = () => {
    if (Platform.OS !== "web") {
      return (
        <Modal
          visible={showMapModal}
          animationType="slide"
          transparent={false}
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Map not available</Text>
              <View style={{ width: 50 }} />
            </View>
            <View style={styles.mapPlaceholder}>
              <Text>Google Maps is only available on web platform</Text>
            </View>
          </View>
        </Modal>
      );
    }

    return (
      <Modal
        visible={showMapModal}
        animationType="fade"
        transparent={false}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseModal}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Location on Map</Text>
            <TouchableOpacity
              onPress={handleConfirmLocation}
              disabled={!selectedLocation}
            >
              <Text
                style={[
                  styles.confirmButton,
                  !selectedLocation && styles.confirmButtonDisabled,
                ]}
              >
                Confirm
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapWrapper}>
            <div
              key={mapKey} // This forces re-render when modal reopens
              id={mapContainerId.current}
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#e8e8e8",
              }}
            />
          </View>

          {selectedLocation && (
            <View style={styles.selectedInfo}>
              {/* <Text style={styles.selectedInfoText}>
                📍 Lat: {selectedLocation.lat.toFixed(6)}, Lng:{" "}
                {selectedLocation.lng.toFixed(6)}
              </Text> */}
              {selectedAddress && (
                <Text style={styles.selectedAddressText}>
                  {selectedAddress}
                </Text>
              )}
            </View>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <View
      style={[
        {
          position: "relative",
          zIndex: isDropdownOpen ? 10000 : 1,
          flexDirection: "row",
          width: "100%",
        },
      ]}
    >
      <View style={{ flexDirection: "column", flex: 1 }}>
        <View style={{ flexDirection: "row" }}>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder={placeholder}
              value={query}
              onChangeText={handleChange}
              placeholderTextColor="#999"
              style={[styles.input, disabled && styles.disabledInput]}
              onFocus={() => {
                if (!disabled) setIsDropdownOpen(true);
              }}
              onBlur={() => {
                setTimeout(() => setIsDropdownOpen(false), 200);
              }}
              editable={!disabled}
              pointerEvents={disabled ? "none" : "auto"}
            />
          </View>
        </View>

        {!disabled && isDropdownOpen && predictions.length > 0 && (
          <FlatList
            data={predictions}
            keyExtractor={(item: any) => item.placePrediction.placeId}
            style={[
              styles.list,
              {
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                maxHeight: 200,
                zIndex: 1000,
                elevation: 1000,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }: any) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.mainText}>
                  {item.placePrediction.structuredFormat.mainText.text}
                </Text>
                <Text style={styles.secondaryText}>
                  {item.placePrediction.structuredFormat.secondaryText?.text}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {!disabled && (
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => setShowMapModal(true)}
        >
          <Text style={styles.mapButtonText}>🗺️</Text>
        </TouchableOpacity>
      )}

      {renderMapModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  disabledInput: {
    backgroundColor: "#f0f0f0",
    color: "#999",
    borderColor: "#ddd",
  },
  mapButton: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
    marginLeft: 10,
  },
  mapButtonText: {
    fontSize: 20,
  },
  list: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
  },
  row: { padding: 13, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  mainText: { fontSize: 14, color: "#111", fontWeight: "500" },
  secondaryText: { fontSize: 12, color: "#888", marginTop: 2 },

  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    zIndex: 1,
  },
  closeButton: {
    fontSize: 24,
    color: "#333",
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  confirmButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    padding: 8,
  },
  confirmButtonDisabled: {
    color: "#999",
  },
  mapWrapper: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  selectedInfo: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  selectedInfoText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  selectedAddressText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
});

export default PlacesInput;
