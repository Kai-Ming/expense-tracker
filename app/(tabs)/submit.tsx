import PlacesInput from "@/components/PlacesInput";
import { Text, View } from "@/components/Themed";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import MapComponent from "../../components/MapComponent";

export default function SubmitExpenseScreen() {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<any>(null);

  const [distance, setDistance] = useState<string | null>(null);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  /* const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]); */
  const [destination, setDestination] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [points, setPoints] = useState<(google.maps.LatLngLiteral | null)[]>([
    null,
    null,
  ]);
  const [fromAddress, setFromAddress] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");

  const [totalTraveledDistance, setTotalTraveledDistance] = useState<number>(0);
  const [lastCoords, setLastCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Ensure routeCoords starts as an empty array to store the breadcrumbs
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const updateDestination = (latLng: { lat: number; lng: number }) => {
    setDestination(latLng);
    setPoints((prev) => [prev[0], latLng]);
  };

  const fitMapToRoute = (
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number },
  ) => {
    if (!mapRef.current) return;
    mapRef.current.fitToCoordinates(
      [
        { latitude: p1.lat, longitude: p1.lng },
        { latitude: p2.lat, longitude: p2.lng },
      ],
      {
        edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
        animated: true,
      },
    );
  };

  function getHaversineDistance(
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number },
  ) {
    const R = 6371; // Earth's radius in km
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    (async () => {
      // 1. Explicitly set loading to true so the UI knows to wait
      setLocationLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required.");
        setLocationLoading(false);
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
        },
        async (loc) => {
          const newLat = loc.coords.latitude;
          const newLng = loc.coords.longitude;
          const newPoint = { latitude: newLat, longitude: newLng };

          // 2. Update coordinates
          setCurrentLocation({ lat: newLat, lng: newLng });
          setPoints((prev) => [{ lat: newLat, lng: newLng }, prev[1]]);
          setRouteCoords((prev) => [...prev, newPoint]);

          // 3. CRITICAL: Reverse Geocode to get the address string immediately
          try {
            const geo = await Location.reverseGeocodeAsync({
              latitude: newLat,
              longitude: newLng,
            });

            if (geo.length > 0) {
              const g = geo[0];
              // Format the address clearly
              const address = [g.name, g.street, g.city]
                .filter(Boolean)
                .join(", ");
              setFromAddress(address);
              // Turn off loading once we have a real address
              setLocationLoading(false);
            }
          } catch (error) {
            console.error("Geocoding error:", error);
          }

          // Map animation to keep zoomed in on the user
          if (mapRef.current) {
            mapRef.current.animateToRegion(
              {
                latitude: newLat,
                longitude: newLng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              },
              1000,
            );
          }
        },
      );
    })();

    return () => locationSubscription?.remove();
  }, []);

  // Recalculate route whenever origin or destination changes
  /* useEffect(() => {
    if (currentLocation && destination) {
      calculateDistance(currentLocation, destination);
    } else {
      setDistance(null);
      setRoutePolyline(null);
      setRouteCoords([]);
    }
  }, [currentLocation, destination]); */

  const calculateDistance = async (
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number },
  ) => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${p1.lat},${p1.lng}&destination=${p2.lat},${p2.lng}&key=${apiKey}&units=metric`;
    try {
      const response = await fetch(url);
      const result = await response.json();
      if (result.status === "OK") {
        const leg = result.routes[0].legs[0];
        setDistance(leg.distance.text);
        const polyline = result.routes[0].overview_polyline.points;
        setRoutePolyline(polyline);
        setRouteCoords(decodePolyline(polyline));
        setTimeout(() => fitMapToRoute(p1, p2), 300);
      }
    } catch (error) {
      console.error("Distance error:", error);
    }
  };

  // Polyline decoder remains necessary for map visualization
  function decodePolyline(encoded: string) {
    const coords = [];
    let index = 0,
      lat = 0,
      lng = 0;
    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;
      coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return coords;
  }

  const defaultRegion = {
    latitude: 3.073,
    longitude: 101.518,
    latitudeDelta: 0.005,
    longitudeDelta: 0.5,
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <MapComponent
          ref={mapRef}
          points={points}
          fromAddress={fromAddress}
          toAddress={toAddress}
          routeCoords={routeCoords}
          defaultRegion={defaultRegion}
          styles={styles}
        />

        <View style={styles.inputPanel}>
          <Text style={styles.title}>Select Location</Text>

          <Text style={styles.label}>From (Current Location):</Text>
          <View
            style={[
              styles.input,
              { backgroundColor: "#f0f7ff", borderColor: "#b3d4f7" },
            ]}
          >
            <Text style={{ color: "#444", fontSize: 15 }} numberOfLines={2}>
              📍{" "}
              {locationLoading
                ? "Fetching your location..."
                : fromAddress || "Finding address..."}
            </Text>
          </View>

          <Text style={styles.label}>To (Destination):</Text>
          <PlacesInput
            placeholder="Search destination…"
            onPlaceSelected={(address, location) => {
              setToAddress(address);
              updateDestination(location);
            }}
          />

          {distance && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>📍 Distance: {distance}</Text>
              <Text style={styles.addressPreview} numberOfLines={1}>
                {fromAddress} → {toAddress}
              </Text>
            </View>
          )}
          {routeCoords.length > 0 && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>
                📏 Actual Path Distance: {totalTraveledDistance.toFixed(2)} km
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              { marginTop: 16 },
              (!currentLocation || !destination || locationLoading) &&
                styles.buttonDisabled,
            ]}
            onPress={() => Alert.alert("Location Selected", `To: ${toAddress}`)}
            disabled={!currentLocation || !destination || locationLoading}
          >
            <Text style={styles.buttonText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { width: "100%", height: 260 },
  inputPanel: { backgroundColor: "#fff", padding: 20, paddingBottom: 32 },
  distanceBadge: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    marginBottom: 4,
  },
  distanceText: { color: "#2196F3", fontWeight: "600", fontSize: 15 },
  addressPreview: { color: "#666", fontSize: 13, marginTop: 4 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#2196F3",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: { backgroundColor: "#aaa" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
