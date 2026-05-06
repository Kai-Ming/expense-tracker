import PlacesInput from "@/components/PlacesInput";
import { Text, View } from "@/components/Themed";
import * as Location from "expo-location";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import MapComponent from "../../components/MapComponent";
import { db } from "../../firebaseConfig";

export default function SubmitExpenseScreen() {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<any>(null);
  const remarkRef = useRef("");
  const fromTimeRef = useRef<Date | null>(null);

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

  const [formRemark, setFormRemark] = useState<string>("");
  const [fromTime, setFromTime] = useState<Date | null>(null);
  const [toTime, setToTime] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");

  // Ensure routeCoords starts as an empty array to store the breadcrumbs
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  // Keep the Ref in sync with the state for formRemark
  useEffect(() => {
    remarkRef.current = formRemark;
  }, [formRemark]);

  // Keep the Ref in sync with the state for fromTime
  useEffect(() => {
    fromTimeRef.current = fromTime;
  }, [fromTime]);

  const updateDestination = (latLng: { lat: number; lng: number }) => {
    setDestination(latLng);
    setPoints((prev) => [prev[0], latLng]);
  };

  const resetForm = () => {
    // Clear Addresses
    setFromAddress("");
    setToAddress("");

    // Clear Distance and Path
    setDistance(null);
    setTotalTraveledDistance(0);
    setRouteCoords([]);
    setLastCoords(null);

    // Clear Remark
    setFormRemark("");
    remarkRef.current = ""; // Don't forget the ref!

    // Clear Timestamps
    setFromTime(null);
    fromTimeRef.current = null;
    setToTime(null);

    // Reset Markers
    setPoints([null, null]);
    setDestination(null);
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

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Log this to see what is actually coming back from Firebase
            console.log("Fetched User Data:", userData);

            const displayName =
              userData.name || userData.username || user.displayName || "User";
            setUsername(displayName);
          } else {
            // Fallback if no Firestore doc exists yet
            setUsername(user.displayName || "User");
          }
        } catch (error) {
          console.error("Error fetching user doc:", error);
          setUsername("");
        }
      } else {
        setUserId(null);
        setUsername(""); // Reset on logout
      }
    });

    const getHaversineDistance = (
      p1: { lat: number; lng: number },
      p2: { lat: number; lng: number },
    ) => {
      const R = 6371;
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
    };

    (async () => {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
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
          const curr = { lat: newLat, lng: newLng };

          // Update UI States
          setCurrentLocation(curr);
          setPoints((prev) => [curr, prev[1]]);
          setRouteCoords((prev) => [
            ...prev,
            { latitude: newLat, longitude: newLng },
          ]);

          // Fix: Update Address Field immediately
          const geo = await Location.reverseGeocodeAsync({
            latitude: newLat,
            longitude: newLng,
          });
          if (geo.length > 0) {
            const g = geo[0];
            setFromAddress(
              [g.name, g.street, g.city].filter(Boolean).join(", "),
            );
            setLocationLoading(false);
          }

          // Calculate Traveled Distance
          setLastCoords((prev) => {
            if (prev) {
              const delta = getHaversineDistance(prev, curr);
              setTotalTraveledDistance((total) => {
                const newTotal = total + delta;
                setDistance(`${newTotal.toFixed(2)} km`);
                return newTotal;
              });
            }
            return curr;
          });

          if (destination) {
            const distToTarget = getHaversineDistance(curr, destination);

            if (distToTarget < 0.05) {
              // 50 meters
              locationSubscription?.remove();

              const endTime = new Date();
              setToTime(endTime);

              const saveTrip = async () => {
                try {
                  await addDoc(collection(db, "trips"), {
                    user_id: userId,
                    from_address: fromAddress,
                    to_address: toAddress,
                    distance: parseFloat(totalTraveledDistance.toFixed(2)),
                    remark: formRemark,
                    /* route_path: routeCoords, */
                    from_time: fromTime,
                    to_time: endTime,
                    created_at: serverTimestamp(),
                  });

                  Alert.alert(
                    "Trip Completed",
                    "Your trip data has been saved.",
                  );
                  resetForm();
                } catch (error) {
                  console.error("Error saving trip:", error);
                  Alert.alert("Error", "Failed to save trip to Firebase.");
                }
              };

              saveTrip();
            }
          }

          // Map Zoom Centering
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
  }, [destination]);

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
          <Text style={styles.title}>Submit Trip</Text>

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

          <Text style={styles.label}>Remark (Optional):</Text>
          <TextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
            placeholder="Trip Remark..."
            placeholderTextColor="#999"
            value={formRemark}
            onChangeText={setFormRemark}
            multiline
            numberOfLines={3}
          />

          {distance && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>
                📏 Actual Distance: {distance}
              </Text>
              <Text style={styles.addressPreview} numberOfLines={1}>
                {fromAddress} → {toAddress}
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
            onPress={() => {
              const startTime = new Date();
              setFromTime(startTime);
              Alert.alert(
                "Trip Started",
                `Start time: ${startTime.toLocaleTimeString()}`,
              );
            }}
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
