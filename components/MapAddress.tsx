import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import {
    Platform,
    StyleSheet,
    Text,
    View
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

interface MapAddressProps {
  points?: Array<{ lat: number; lng: number }>;
  fromAddress?: string;
  toAddress?: string;
  routeCoords?: Array<{ lat: number; lng: number }>;
  defaultRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  styles?: any;
  onLocationSelect?: (locationData: {
    latitude: number;
    longitude: number;
    address: string;
    coordinates: { lat: number; lng: number };
  }) => void;
  enableTapToSelect?: boolean;
  initialSelectedLocation?: { lat: number; lng: number };
}

const MapAddress = forwardRef((props: MapAddressProps, ref: any) => {
  const mapRef = useRef<MapView>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [isTapEnabled] = useState(props.enableTapToSelect !== false);

  const {
    points,
    fromAddress,
    toAddress,
    defaultRegion,
    styles,
    onLocationSelect,
    initialSelectedLocation,
  } = props;

  // Set initial location if provided
  useEffect(() => {
    if (initialSelectedLocation) {
      setSelectedLocation({
        latitude: initialSelectedLocation.lat,
        longitude: initialSelectedLocation.lng,
      });
    }
  }, [initialSelectedLocation]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getSelectedLocation: () => {
      if (selectedLocation) {
        return {
          ...selectedLocation,
          address: selectedAddress,
          coordinates: {
            lat: selectedLocation.latitude,
            lng: selectedLocation.longitude,
          },
        };
      }
      return null;
    },
    clearSelection: () => {
      setSelectedLocation(null);
      setSelectedAddress("");
    },
    setLocation: (lat: number, lng: number, address?: string) => {
      setSelectedLocation({ latitude: lat, longitude: lng });
      if (address) setSelectedAddress(address);
      // Animate to the location
      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000,
      );
    },
    animateToRegion: (region: any) => {
      mapRef.current?.animateToRegion(region, 1000);
    },
  }));

  // Helper to validate coordinates
  const isValidCoordinate = (point: any) => {
    return (
      point &&
      typeof point.lat === "number" &&
      typeof point.lng === "number" &&
      !isNaN(point.lat) &&
      !isNaN(point.lng)
    );
  };

  // Handle map press (tap to select)
  const handleMapPress = async (event: any) => {
    if (!isTapEnabled) return;

    const { coordinate } = event.nativeEvent;
    const { latitude, longitude } = coordinate;

    // Get address using reverse geocoding
    let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

    try {
      // Try to get address from Google Maps Geocoding API
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`,
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          address = data.results[0].formatted_address;
        }
      }
    } catch (error) {
      console.log("Geocoding error:", error);
    }

    const locationData = {
      latitude,
      longitude,
      address: address,
      coordinates: { lat: latitude, lng: longitude },
    };

    setSelectedLocation({ latitude, longitude });
    setSelectedAddress(address);

    // Call parent callback
    if (onLocationSelect) {
      onLocationSelect(locationData);
    }
  };

  // For Web platform, use Google Maps JavaScript API
  if (Platform.OS === "web") {
    // This will be handled by the parent component's Google Maps implementation
    return (
      <View
        style={[
          styles?.map || stylesContainer.map,
          { backgroundColor: "#e0e0e0" },
        ]}
      >
        <Text style={stylesContainer.text}>Map view is handled by parent</Text>
      </View>
    );
  }

  // For Mobile (iOS/Android), use react-native-maps
  return (
    <View style={[styles?.container || stylesContainer.container, { flex: 1 }]}>
      <MapView
        ref={mapRef}
        style={styles?.map || stylesContainer.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={
          defaultRegion || {
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }
        }
        showsUserLocation
        showsMyLocationButton
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        rotateEnabled={false}
        onPress={handleMapPress}
        onLongPress={handleMapPress}
        mapType="standard"
      >
        {/* Start Marker */}
        {isValidCoordinate(points?.[0]) && (
          <Marker
            coordinate={{
              latitude: points[0].lat,
              longitude: points[0].lng,
            }}
            title="From"
            description={fromAddress}
            pinColor="#2196F3"
          />
        )}

        {/* Destination Marker */}
        {isValidCoordinate(points?.[1]) && (
          <Marker
            coordinate={{
              latitude: points[1].lat,
              longitude: points[1].lng,
            }}
            title="To"
            description={toAddress}
            pinColor="#F44336"
          />
        )}

        {/* Selected Location Marker (Tap to Select) */}
        {isTapEnabled && selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="Selected Location"
            description={selectedAddress}
            pinColor="#FF6B6B"
            draggable={true}
            onDragEnd={(e) => {
              const { coordinate } = e.nativeEvent;
              handleMapPress({ nativeEvent: { coordinate } });
            }}
          />
        )}
      </MapView>

      {/* Selected Location Info */}
      {isTapEnabled && selectedLocation && (
        <View style={styles?.addressOverlay || stylesContainer.addressOverlay}>
          <Text
            style={styles?.addressText || stylesContainer.addressText}
            numberOfLines={2}
          >
            📍 {selectedAddress}
          </Text>
          <Text style={styles?.coordText || stylesContainer.coordText}>
            Lat: {selectedLocation.latitude.toFixed(6)}, Lng:{" "}
            {selectedLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
});

const stylesContainer = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  text: {
    color: "#666",
    fontSize: 16,
  },
  addressOverlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  coordText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});

export default MapAddress;
