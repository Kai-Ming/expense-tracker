import { useEffect, useRef, useState } from "react";
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

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

  const timer = useRef<any>(null);

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
    };
  }, []);

  const reverseGeocodeNative = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`,
      );
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        setSelectedAddress(data.results[0].formatted_address);
      }
    } catch (error) {
      console.error("Native Geocoding Error:", error);
    }
  };

  const handleNativeMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const location = { lat: latitude, lng: longitude };
    setSelectedLocation(location);
    reverseGeocodeNative(latitude, longitude);
  };

  const handleConfirmLocation = () => {
    if (selectedLocation && selectedAddress) {
      onPlaceSelected(selectedAddress, selectedLocation);
      setQuery(selectedAddress);
      setShowMapModal(false);
    }
  };

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

  const renderMapModal = () => (
    <Modal
      visible={showMapModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowMapModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowMapModal(false)}>
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

        <MapView
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: selectedLocation?.lat || 3.0414,
            longitude: selectedLocation?.lng || 101.5461,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={handleNativeMapPress}
        >
          {selectedLocation && (
            <Marker
              coordinate={{
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lng,
              }}
            />
          )}
        </MapView>

        {selectedLocation && (
          <View style={styles.selectedInfo}>
            {selectedAddress ? (
              <Text style={styles.selectedAddressText}>{selectedAddress}</Text>
            ) : (
              <Text style={styles.selectedInfoText}>Fetching address...</Text>
            )}
          </View>
        )}
      </View>
    </Modal>
  );

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
  selectedInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  selectedInfoText: {
    fontSize: 14,
    color: "#888",
  },
  selectedAddressText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
});

export default PlacesInput;
