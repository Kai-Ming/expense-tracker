import PlacesInput from "@/components/PlacesInput";
import { Text, View } from "@/components/Themed";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  DeviceEventEmitter,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import MapComponent from "../../components/MapComponent";
import { db, storage } from "../../firebaseConfig";

const LOCATION_TRACKING_TASK = "background-location-task";
const BG_LOCATION_EVENT = "bg-location-update";

TaskManager.defineTask(LOCATION_TRACKING_TASK, ({ data, error }: any) => {
  if (error) {
    console.error("Background Task Error:", error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations;
      const latLng = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      console.log("Background location captured:", latLng);

      // Emit the event to any active foreground listeners
      DeviceEventEmitter.emit(BG_LOCATION_EVENT, latLng);
    }
  }
});

export default function SubmitExpenseScreen() {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<any>(null);
  const remarkRef = useRef("");
  const fromTimeRef = useRef<Date | null>(null);
  // Ref to hold the location subscription so we can stop it
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );

  const [distance, setDistance] = useState<string | null>(null);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
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

  // Trip active state — tracking only starts after Confirm is pressed
  const [tripActive, setTripActive] = useState<boolean>(false);
  const [toHome, setToHome] = useState<boolean>(false);

  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const [mileageRate, setMileageRate] = useState<number>(0);
  const [officeCoords, setOfficeCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [arrivalDistance, setArrivalDistance] = useState<number>(0.1);
  const [toll, setToll] = useState<string>("");

  const OFFICE_COORDINATES = { lat: 3.0277632, lng: 101.4693888 };

  useEffect(() => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) return;

    const unsubscribe = onSnapshot(
      doc(db, "config", "7HTZfcBtebPsm0zlZB3c"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.mileage_rate_mobile)
            setMileageRate(data.mileage_rate_mobile);

          if (data.office_location) {
            setOfficeCoords({
              lat: data.office_location.latitude,
              lng: data.office_location.longitude,
            });
          }
          if (data.arrival_distance) {
            setArrivalDistance(data.arrival_distance);
          }
        }
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    remarkRef.current = formRemark;
  }, [formRemark]);

  useEffect(() => {
    fromTimeRef.current = fromTime;
  }, [fromTime]);

  const updateDestination = (latLng: { lat: number; lng: number }) => {
    setDestination(latLng);
    setPoints((prev) => [prev[0], latLng]);
  };

  const resetForm = () => {
    setFromAddress("");
    setToAddress("");
    setDistance(null);
    setTotalTraveledDistance(0);
    setRouteCoords([]);
    setLastCoords(null);
    setFormRemark("");
    remarkRef.current = "";
    setFromTime(null);
    fromTimeRef.current = null;
    setToTime(null);
    setPoints([null, null]);
    setDestination(null);
    setTripActive(false);

    // Stop any active tracking
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;

    // Re-fetch current location after reset to repopulate the From field
    fetchCurrentLocation();
  };

  const uploadRoutePreview = async (
    points: ({ lat: number; lng: number } | null)[],
    polyline: string | null,
    apiKey: string | undefined,
    storage: any,
  ): Promise<string> => {
    // Return empty string if data is missing to avoid crashing the upload
    if (!points || !points || !apiKey) return "";

    try {
      // Generate URL: Use polyline if available, otherwise just markers
      const pathParam = polyline ? `path=enc:${polyline}` : "";
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x400&${pathParam}&markers=color:red|label:A|${points.lat},${points.lng}&markers=color:blue|label:B|${points.lat},${points.lng}&key=${apiKey}`;

      const response = await fetch(staticMapUrl);
      if (!response.ok) return "";

      const blob = await response.blob();
      const routeRef = ref(storage, `route-images/${Date.now()}.png`);
      const uploadResult = await uploadBytes(routeRef, blob);

      return await getDownloadURL(uploadResult.ref);
    } catch (error) {
      console.error("Static Map Upload Error:", error);
      return "";
    }
  };

  const fetchTollCost = async (
    origin: { lat: number; lng: number },
    dest: { lat: number; lng: number },
  ): Promise<number> => {
    try {
      const response = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
            "X-Goog-FieldMask": "routes.travelAdvisory.tollInfo",
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: { latitude: origin.lat, longitude: origin.lng },
              },
            },
            destination: {
              location: { latLng: { latitude: dest.lat, longitude: dest.lng } },
            },
            travelMode: "DRIVE",
            extraComputations: ["TOLLS"],
            routeModifiers: { vehicleInfo: { emissionType: "GASOLINE" } },
          }),
        },
      );

      const data = await response.json();
      const tollInfo = data.routes?.[0]?.travelAdvisory?.tollInfo;
      if (tollInfo?.estimatedPrice?.length > 0) {
        const price = tollInfo.estimatedPrice[0];
        return (price.units ?? 0) + (price.nanos ?? 0) / 1e9;
      }
      return 0;
    } catch (error) {
      console.error("Toll fetch error:", error);
      return 0;
    }
  };

  const saveTripToFirestore = async (
    finalToAddress: string,
    finalDistance: number,
    finalEndTime: Date,
    finalImageUrl: string,
  ) => {
    let subToAddress = finalToAddress;
    let subDistance = finalDistance;
    let finalToll = 0;

    // Perform comparison if going home and we have a valid starting point
    if (toHome && points && currentLocation) {
      const distToCurrent = getHaversineDistance(points, currentLocation);
      const distToOffice = getHaversineDistance(points, officeCoords);

      if (distToOffice < distToCurrent) {
        console.log(`Route Comparison: Using Current.`);
      } else {
        console.log(`Route Comparison: Using Office.`);
        subDistance = parseFloat(distToOffice.toFixed(2));
        if (officeCoords) {
          subToAddress = await getAddressFromCoords(
            officeCoords.lat,
            officeCoords.lng,
          );
          if (currentLocation) {
            finalToll = await fetchTollCost(currentLocation, officeCoords);
          }
        }
      }
    }
    if (finalToll === 0 && currentLocation && destination) {
      finalToll = await fetchTollCost(currentLocation, destination);
    }

    let mileage = subDistance * mileageRate;
    let total = mileage + finalToll;
    // ────────────────────────────────────────────────────────────────────────

    try {
      await addDoc(collection(db, "trips"), {
        user_id: userId,
        from_address: fromAddress,
        to_address: subToAddress,
        distance: subDistance,
        toll: parseFloat(finalToll.toFixed(2)), // ← new field
        mileage: parseFloat(mileage.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        remark: remarkRef.current || formRemark,
        from_time: fromTimeRef.current || fromTime,
        to_time: finalEndTime,
        to_home: toHome,
        route_image_url: finalImageUrl,
        created_at: serverTimestamp(),
      });

      Alert.alert("Success", "Your trip data has been saved.");
      resetForm();
    } catch (error) {
      console.error("Error saving trip:", error);
      Alert.alert("Error", "Failed to save trip to Firebase.");
    }
  };

  const startTracking = async () => {
    // 1. Check Foreground Permission
    const { status: fgStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") return;

    // 2. Check Background Permission (Crucial!)
    const { status: bgStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please set location permission to 'Allow all the time'.",
      );
      return;
    }

    // 3. Start Background Updates
    await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10,
      deferredUpdatesInterval: 1000,
      // This keeps a notification visible so Android doesn't kill the app
      foregroundService: {
        notificationTitle: "Trip in Progress",
        notificationBody: "Tracking your location for the expense report.",
        notificationColor: "#2196F3",
      },
    });

    setTripActive(true);
  };

  const stopTracking = async () => {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TRACKING_TASK,
    );
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
    }
    setTripActive(false);
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

  const getStaticMapUrl = (
    coords: { latitude: number; longitude: number }[],
  ) => {
    if (coords.length === 0) return null;

    // 1. Create the base URL
    const baseUrl = "https://maps.googleapis.com/maps/api/staticmap";

    // 2. Format the path (polyline) from your route coordinates
    // Note: For very long routes, you might need to "sample" every 5th or 10th point
    // to stay under URL character limits.
    const pathString = coords
      .map((c) => `${c.latitude},${c.longitude}`)
      .join("|");

    const params = [
      `size=600x300`,
      `scale=2`,
      `maptype=roadmap`,
      `path=color:0x2196F3|weight:5|${pathString}`,
      `key=${apiKey}`, // Uses your existing apiKey variable
    ];

    return `${baseUrl}?${params.join("&")}`;
  };

  const uploadRouteImage = async (
    coords: { latitude: number; longitude: number }[],
    tripId: string,
  ) => {
    const staticImageUrl = getStaticMapUrl(coords); // Use the helper from the previous step
    if (!staticImageUrl) return null;

    try {
      // 1. Fetch the image from Google as a blob
      const response = await fetch(staticImageUrl);
      const blob = await response.blob();

      // 2. Initialize Storage and reference the folder
      const storage = getStorage();
      // Path: route-images/trip_12345.jpg
      const storageRef = ref(storage, `route-images/${tripId}.jpg`);

      // 3. Upload to Firebase
      const snapshot = await uploadBytes(storageRef, blob);

      // 4. Get the permanent Firebase URL to save in Firestore
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Upload failed:", error);
      return null;
    }
  };

  const getAddressFromCoords = async (
    lat: number,
    lng: number,
  ): Promise<string> => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("API Key is missing from process.env");
      // Fallback to native if no key is found
      const geo = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      return geo.length > 0
        ? [geo.name, geo.city].filter(Boolean).join(", ")
        : "API Key Missing";
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      console.log("Google Geocode Status:", data.status);

      if (data.status === "OK" && data.results.length > 0) {
        return data.results[0].formatted_address
          .replace(/\b\d{5}\b,?\s*/g, "")
          .trim();
      } else if (data.status === "REQUEST_DENIED") {
        console.error("Google API Error:", data.error_message);
        return "API Access Denied";
      }

      return "Address not found";
    } catch (error) {
      console.error("Fetch error:", error);
      return "Network error";
    }
  };

  function getHaversineDistance(
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number },
  ) {
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
  }

  // ─── 1. Fetch current location ONCE on mount (for the From field only) ───────
  const fetchCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setFromAddress("Permission Denied");
        setLocationLoading(false);
        return;
      }

      // Use a slightly lower accuracy or a timeout for the initial fix
      // to ensure it doesn't hang indefinitely
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const curr = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCurrentLocation(curr);
      setPoints((prev) => [curr, prev]);

      const addressText = await getAddressFromCoords(
        loc.coords.latitude,
        loc.coords.longitude,
      );

      setFromAddress(addressText || "Address found, but empty");
    } catch (error) {
      console.error("Error fetching current location:", error);
      setFromAddress("Error finding address");
    } finally {
      setLocationLoading(false);
    }
  };

  // ─── 2. Auth + initial location fetch on mount ────────────────────────────────
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("Fetched User Data:", userData);
            const displayName =
              userData.name || userData.username || user.displayName || "User";
            setUsername(displayName);
          } else {
            setUsername(user.displayName || "User");
          }
        } catch (error) {
          console.error("Error fetching user doc:", error);
          setUsername("");
        }
      } else {
        setUserId(null);
        setUsername("");
      }
    });

    fetchCurrentLocation();

    return () => {
      unsubscribe();
      // Clean up any active tracking subscription on unmount
      locationSubscriptionRef.current?.remove();
    };
  }, []);

  // ─── 3. Start path tracking ONLY when tripActive becomes true ────────────────
  useEffect(() => {
    if (!tripActive) return;

    let isMounted = true;

    // Helper function to handle coordinate math and state updating
    const handleNewCoordinate = (newLat: number, newLng: number) => {
      if (!isMounted) return;

      const curr = { lat: newLat, lng: newLng };

      // Update current position marker
      setCurrentLocation(curr);
      setPoints((prev) => [curr, prev]);

      // Append breadcrumb
      setRouteCoords((prev) => [
        ...prev,
        { latitude: newLat, longitude: newLng },
      ]);

      // Accumulate distance
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
    };

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || !isMounted) return;

      if (currentLocation) {
        setLastCoords(currentLocation);
        setRouteCoords([
          { latitude: currentLocation.lat, longitude: currentLocation.lng },
        ]);
      }

      // 1. Listen to Foreground Stream
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
        },
        (loc) => {
          handleNewCoordinate(loc.coords.latitude, loc.coords.longitude);

          // Optional: Mirror map panning while foreground is active
          if (mapRef.current) {
            mapRef.current.animateToRegion(
              {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              },
              1000,
            );
          }
        },
      );

      locationSubscriptionRef.current = subscription;
    })();

    // 2. Listen to Background Stream events when app wakes back up / runs in background
    const backgroundSubscription = DeviceEventEmitter.addListener(
      BG_LOCATION_EVENT,
      (coords) => {
        handleNewCoordinate(coords.latitude, coords.longitude);
      },
    );

    return () => {
      isMounted = false;
      locationSubscriptionRef.current?.remove();
      locationSubscriptionRef.current = null;
      backgroundSubscription.remove();
    };
  }, [tripActive]);

  const submitTripEarly = async () => {
    if (!currentLocation) {
      Alert.alert(
        "Error",
        "Current location not available. Please wait a moment.",
      );
      return;
    }

    try {
      const geo = await Location.reverseGeocodeAsync({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      });

      let currentSpotAddress = "Unknown Location";
      if (geo.length > 0) {
        const g = geo;
        currentSpotAddress = [g.name, g.street, g.city]
          .filter(Boolean)
          .join(", ");
      }

      const endTime = new Date();

      const routeImageUrl = await uploadRoutePreview(
        points,
        routePolyline,
        apiKey,
        storage,
      );

      // We use the current location as both the 'from' and 'to' point
      // for a spot-submission entry.
      console.log("Saving trip------------------");
      await saveTripToFirestore(
        currentSpotAddress,
        parseFloat(totalTraveledDistance.toFixed(2)),
        endTime,
        routeImageUrl,
      );
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert("Error", "Failed to save the trip.");
    }
  };

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
        enableOnAndroid={true}
        extraScrollHeight={64}
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
            value={toAddress}
            placeholder="Search destination…"
            onPlaceSelected={(address, location) => {
              setToAddress(address);
              updateDestination(location);
            }}
          />

          <View style={styles.row}>
            <Text style={styles.label}>Going Home:</Text>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={tripActive ? "#2196F3" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              value={toHome}
              onValueChange={(newValue) => setToHome(newValue)}
              disabled={tripActive}
            />
          </View>

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
              tripActive && { backgroundColor: "#f44336" },
            ]}
            onPress={() => {
              if (tripActive) {
                Alert.alert(
                  "Reset Trip",
                  "Are you sure you want to cancel the current trip?",
                  [
                    { text: "No", style: "cancel" },
                    { text: "Yes", onPress: () => resetForm() },
                  ],
                );
              } else {
                const startTime = new Date();
                setFromTime(startTime);
                setTripActive(true);
                Alert.alert(
                  "Trip Started",
                  `Start time: ${startTime.toLocaleTimeString()}`,
                );
              }
            }}
            disabled={!currentLocation || !destination || locationLoading}
          >
            <Text style={styles.buttonText}>
              {tripActive ? "Cancel Trip" : "Confirm Location"}
            </Text>
          </TouchableOpacity>

          {tripActive && (
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: "#f44336", marginTop: 10 },
                (!currentLocation || locationLoading) && styles.buttonDisabled,
              ]}
              onPress={submitTripEarly}
              disabled={!currentLocation || locationLoading}
            >
              <Text style={styles.buttonText}>End Trip Early</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
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
