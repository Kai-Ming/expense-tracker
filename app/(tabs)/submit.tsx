import PlacesInput from "@/components/PlacesInput";
import { Text, View } from "@/components/Themed";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
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
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import MapComponent from "../../components/MapComponent";
import { db } from "../../firebaseConfig";

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
      const location = locations[0];
      const latLng = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      console.log("Background location captured:", latLng);
      DeviceEventEmitter.emit(BG_LOCATION_EVENT, latLng);
    }
  }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function SubmitExpenseScreen() {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<any>(null);
  const remarkRef = useRef("");
  const fromTimeRef = useRef<Date | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const currentLocationRef = useRef<{ lat: number; lng: number } | null>(null);

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

  const [selectedFromIndex, setSelectedFromIndex] = useState<number>(0);
  const [selectedGoingIndex, setSelectedGoingIndex] = useState<number>(0);

  const [formRemark, setFormRemark] = useState<string>("");
  const [fromTime, setFromTime] = useState<Date | null>(null);
  const [toTime, setToTime] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");

  const [tripActive, setTripActive] = useState<boolean>(false);
  const [toHome, setToHome] = useState<boolean>(false);

  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const [mileageRate, setMileageRate] = useState<number>(0);
  const [mileageRateOutstation, setMileageRateOutstation] = useState<number>(0);
  const [outStationDistance, setOutstationDistance] = useState<number>(50);
  const [homeCoords, setHomeCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [endTripReason, setEndTripReason] = useState<string>("");
  const [showEndTripModal, setShowEndTripModal] = useState(false);
  const [officeCoords, setOfficeCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [arrivalDistance, setArrivalDistance] = useState<number>(0.1);
  const [drivingDistance, setDrivingDistance] = useState<number>(0);
  const [toll, setToll] = useState<string>("");
  const totalTraveledDistanceRef = useRef<number>(0);
  const toAddressRef = useRef<string>("");
  const routeCoordsRef = useRef<{ latitude: number; longitude: number }[]>([]);
  const tripActiveRef = useRef(false);
  const arrivalDistanceRef = useRef<number>(0.1);
  const destinationRef = useRef<{ lat: number; lng: number } | null>(null);
  const pointsRef = useRef<({ lat: number; lng: number } | null)[]>([
    null,
    null,
  ]);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const isSubmittingRef = useRef(false);
  const roadDistanceRef = useRef<number>(0);
  const hasReachedDestinationRef = useRef<boolean>(false);

  const OFFICE_COORDINATES = { lat: 3.0277632, lng: 101.4693888 };
  const MIN_TRAVEL_DISTANCE = 0.04;

  const locations = [
    { lat: 3.0409332, lng: 101.5453218 },
    {
      lat: 5.333704064834522,
      lng: 100.29405526266623,
    },
  ];

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    lastCoordsRef.current = lastCoords;
  }, [lastCoords]);

  useEffect(() => {
    arrivalDistanceRef.current = arrivalDistance;
  }, [arrivalDistance]);

  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);

  useEffect(() => {
    tripActiveRef.current = tripActive;
  }, [tripActive]);

  useEffect(() => {
    totalTraveledDistanceRef.current = totalTraveledDistance;
  }, [totalTraveledDistance]);

  useEffect(() => {
    toAddressRef.current = toAddress;
  }, [toAddress]);

  useEffect(() => {
    routeCoordsRef.current = routeCoords;
  }, [routeCoords]);

  useEffect(() => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;

    const unsubscribe = onSnapshot(
      doc(db, "config", "7HTZfcBtebPsm0zlZB3c"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.mileage_rate_mobile)
            setMileageRate(data.mileage_rate_mobile);
          if (data.mileage_rate_outstation_mobile)
            setMileageRateOutstation(data.mileage_rate_outstation_mobile);
          if (data.outstation_disance)
            setOutstationDistance(data.outstation_distance);

          if (data.office_coordinates) {
            setOfficeCoords({
              lat: data.office_coordinates.latitude,
              lng: data.office_coordinates.longitude,
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

  useEffect(() => {
    currentLocationRef.current = currentLocation;
  }, [currentLocation]);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  useEffect(() => {
    async function setupNotifications() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
        });
      }
    }
    setupNotifications();
  }, []);

  const sendTripSavedNotification = async (distance: number, total: number) => {
    await Notifications.requestPermissionsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Trip Saved ✅",
        body: `${distance.toFixed(2)} km • RM ${total.toFixed(2)} total`,
        sound: true,
      },
      trigger: null,
    });
  };

  const updateDestination = (latLng: { lat: number; lng: number }) => {
    setDestination(latLng);
    setPoints((prev) => [prev[0], latLng]);
  };

  const resetForm = async () => {
    await stopTracking();

    setFromAddress("");
    setToAddress("");
    setSelectedGoingIndex(0);
    setEndTripReason("");
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
    setCurrentLocation(null);
    currentLocationRef.current = null;
    roadDistanceRef.current = 0;
    hasReachedDestinationRef.current = false;

    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;

    fetchCurrentLocation();
  };

  const uploadRoutePreview = async (
    points: ({ lat: number; lng: number } | null)[],
    polyline: string | null,
    apiKey: string | undefined,
    storage: any,
  ): Promise<string> => {
    if (!points || !points || !apiKey) return "";

    try {
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

  const fetchRoadDistanceAndToll = async (
    origin: { lat: number; lng: number },
    dest: { lat: number; lng: number },
  ) => {
    return {
      distance: getHaversineDistance(origin, dest),
      toll: 0,
      polyline: "",
    };
  };

  // NEW: Fetch road distance and toll using Google Directions API
  const fetchRoadDistanceAndToll1 = async (
    origin: { lat: number; lng: number },
    dest: { lat: number; lng: number },
  ): Promise<{ distance: number; toll: number; polyline: string }> => {
    try {
      const response = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
            "X-Goog-FieldMask":
              "routes.distanceMeters,routes.polyline.encodedPolyline",
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
          }),
        },
      );

      const data = await response.json();
      const route = data.routes?.[0];

      if (!route) {
        console.warn("No route found");
        return { distance: 0, toll: 0, polyline: "" };
      }

      // Extract distance in kilometers
      const distanceMeters = route.distanceMeters || 0;
      const distanceKm = distanceMeters / 1000;

      // Extract toll cost
      let tollCost = 0;
      if (tollInfo?.estimatedPrice?.length > 0) {
        const price = tollInfo.estimatedPrice[0];
        tollCost = (price.units ?? 0) + (price.nanos ?? 0) / 1e9;
      }

      // Extract polyline for map display
      const polyline = route.polyline?.encodedPolyline || "";

      return { distance: distanceKm, toll: tollCost, polyline };
    } catch (error) {
      console.error("Directions API error:", error);
      return { distance: 0, toll: 0, polyline: "" };
    }
  };

  // NEW: Check if user has reached destination using road distance
  const checkAndAutoSubmitWithRoadDistance = async (
    currentCoords: { lat: number; lng: number },
    origin: { lat: number; lng: number },
  ) => {
    const dest = destinationRef.current;
    if (!dest || isSubmittingRef.current || hasReachedDestinationRef.current)
      return false;

    // Use FREE local math to see if they are near destination
    const localDistanceToDest = getHaversineDistance(currentCoords, dest);

    // If they are within your arrival threshold (e.g., 0.05 km / 50 meters)
    if (localDistanceToDest <= arrivalDistanceRef.current) {
      hasReachedDestinationRef.current = true;
      isSubmittingRef.current = true;

      try {
        // CALL GOOGLE API EXACTLY ONCE HERE - At the very end of the trip!
        const totalResult = await fetchRoadDistanceAndToll(origin, dest);
        roadDistanceRef.current = totalResult.distance;
        // If you still need tolls, totalResult.toll is captured here ONCE.
      } catch (e) {
        console.error(
          "Final distance fetch failed, falling back to local math",
          e,
        );
        roadDistanceRef.current = totalTraveledDistanceRef.current;
      }

      await stopTracking();
      await submitTripInBackground();
      isSubmittingRef.current = false;
      return true;
    }
    return false;
  };

  const saveTripToFirestore = async (
    finalToAddress: string,
    finalDistance: number,
    finalEndTime: Date,
    finalImageUrl: string,
    endTripReason: string,
    finalToll: number = 0,
  ) => {
    const currentLoc = currentLocationRef.current;

    let subToAddress = finalToAddress;
    let subDistance = finalDistance;
    let finalTollAmount = finalToll;

    // Perform comparison if going home and we have a valid starting point
    if (toHome && points && currentLocation) {
      const resultToCurrent = await fetchRoadDistanceAndToll(
        points,
        currentLocation,
      );

      if (resultToCurrent.distance * 1.2 > drivingDistance) {
        resultToCurrent.distance = drivingDistance;
      }

      const resultToOffice = await fetchRoadDistanceAndToll(
        points,
        officeCoords,
      );

      if (resultToOffice.distance < resultToCurrent.distance) {
        subDistance = resultToOffice.distance;
        if (officeCoords) {
          subToAddress = await getAddressFromCoords(
            officeCoords.lat,
            officeCoords.lng,
          );
          finalTollAmount = resultToOffice.toll;
        }
      } else {
        finalTollAmount = resultToCurrent.toll;
      }
    }

    // If toll wasn't calculated above and we have origin/destination
    if (finalTollAmount === 0 && currentLocation && destination) {
      const result = await fetchRoadDistanceAndToll(
        currentLocation,
        destination,
      );
      finalTollAmount = result.toll;
    }

    let mileageRateTemp = mileageRate;

    if (subDistance > outStationDistance) {
      mileageRateTemp = mileageRateOutstation;
    }

    let mileage = subDistance * mileageRate;
    let total = mileage + finalTollAmount;

    try {
      await addDoc(collection(db, "trips"), {
        user_id: userId,
        from_address: fromAddress,
        to_address: subToAddress,
        distance: subDistance,
        toll: parseFloat(finalTollAmount.toFixed(2)),
        mileage: parseFloat(mileage.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        remark: remarkRef.current || formRemark,
        from_time: fromTimeRef.current || fromTime,
        to_time: finalEndTime,
        to_home: toHome,
        route_image_url: finalImageUrl,
        endTripReason: endTripReason,
        date: new Date().toISOString().split("T")[0],
        platform: 1,
        created_at: serverTimestamp(),
      });

      await sendTripSavedNotification(subDistance, total);

      Alert.alert("Success", "Your trip data has been saved.");
      resetForm();
    } catch (error) {
      console.error("Error saving trip:", error);
      Alert.alert("Error", "Failed to save trip to Firebase.");
    }
  };

  const startTracking = async () => {
    await calculateDistance();
    const { status: fgStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") return;

    const { status: bgStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please set location permission to 'Allow all the time'.",
      );
      return;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10,
      deferredUpdatesInterval: 1000,
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

    const MAX_POINTS = 50;
    const sampled =
      coords.length <= MAX_POINTS
        ? coords
        : coords.filter(
            (_, i) =>
              i === 0 ||
              i === coords.length - 1 ||
              i % Math.floor(coords.length / MAX_POINTS) === 0,
          );

    const pathString = sampled
      .map((c) => `${c.latitude},${c.longitude}`)
      .join("|");

    const start = coords[0];
    const end = coords[coords.length - 1];
    const markerA = `markers=color:green|label:A|${start.latitude},${start.longitude}`;
    const markerB = `markers=color:red|label:B|${end.latitude},${end.longitude}`;

    const params = [
      `size=600x300`,
      `scale=2`,
      `maptype=roadmap`,
      `path=color:0x2196F3ff|weight:5|${pathString}`,
      markerA,
      markerB,
      `key=${apiKey}`,
    ];

    const url = `https://maps.googleapis.com/maps/api/staticmap?${params.join("&")}`;

    if (url.length > 8192) {
      console.warn("Static map URL too long:", url.length, "chars");
    }

    return url;
  };

  const uploadRouteImage = async (
    coords: { latitude: number; longitude: number }[],
    tripId: string,
  ) => {
    const staticImageUrl = getStaticMapUrl(coords);
    if (!staticImageUrl) return null;

    try {
      const response = await fetch(staticImageUrl);
      const blob = await response.blob();

      const storage = getStorage();
      const storageRef = ref(storage, `route-images/${tripId}.jpg`);

      const snapshot = await uploadBytes(storageRef, blob);
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
      console.error("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is undefined");
      const geo = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (geo.length > 0) {
        const g = geo[0];
        return [g.name, g.street, g.city].filter(Boolean).join(", ");
      }
      return "Address not found";
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        return data.results[0].formatted_address
          .replace(/\b\d{5}\b,?\s*/g, "")
          .trim();
      }

      console.warn(
        "Google geocoding failed, falling back to native:",
        data.status,
      );
      const geo = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (geo.length > 0) {
        const g = geo[0];
        return [g.name, g.street, g.city].filter(Boolean).join(", ");
      }

      return "Address not found";
    } catch (error) {
      console.error("Geocoding fetch error:", error);
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        if (geo.length > 0) {
          const g = geo[0];
          return [g.name, g.street, g.city].filter(Boolean).join(", ");
        }
      } catch (nativeError) {
        console.error("Native geocoding also failed:", nativeError);
      }
      return "Address not found";
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

  const fetchCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setFromAddress("Permission Denied");
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const curr = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCurrentLocation(curr);
      setPoints((prev) => [curr, prev[1]]);

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

            const homeCoord = userData.home_coordinates;
            if (homeCoord) {
              setHomeCoords({
                lat: homeCoord.latitude,
                lng: homeCoord.longitude,
              });
            }

            const officeLocation = userData.office;

            if (officeLocation === 0) {
              setOfficeCoords(locations[0]);
            } else {
              setOfficeCoords(locations[1]);
            }
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
      locationSubscriptionRef.current?.remove();
    };
  }, []);

  // UPDATED: Track with road distance calculation
  useEffect(() => {
    if (!tripActive) return;

    let isMounted = true;
    let originCoords = currentLocationRef.current;

    const handleNewCoordinate = async (lat: number, lng: number) => {
      if (!tripActiveRef.current) return;

      const curr = { lat, lng };
      setCurrentLocation(curr);
      currentLocationRef.current = curr;

      // Calculate distance locally from previous point to map out incremental progress
      const prev = lastCoordsRef.current;
      if (prev) {
        const delta = getHaversineDistance(prev, curr);
        const newTotal = totalTraveledDistanceRef.current + delta;

        totalTraveledDistanceRef.current = newTotal;
        setTotalTraveledDistance(newTotal);
        setDistance(`${newTotal.toFixed(2)} km`);

        // Check arrival status locally
        await checkAndAutoSubmitWithRoadDistance(curr, originCoords);
      }

      lastCoordsRef.current = curr;
      setLastCoords(curr);
    };

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || !isMounted) return;

      if (currentLocation) {
        setLastCoords(currentLocation);
        originCoords = currentLocation;
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

  const selectDefault = async (index: number) => {
    console.log(tripActive);
    if (index === 0) {
      return;
    }

    setToHome(false);
    if (selectedGoingIndex === index) {
      setSelectedGoingIndex(0);
      clearAddress();
    } else if (index === 1) {
      setSelectedGoingIndex(index);
      const location = locations[0];
      let address = await getAddressFromCoords(location.lat, location.lng);
      setToAddress(address);
      updateDestination(location);
    } else if (index === 2) {
      setSelectedGoingIndex(index);
      const location = locations[1];
      let address = await getAddressFromCoords(location.lat, location.lng);

      setToAddress(address);
      updateDestination(location);
    } else if (index === 3) {
      setToHome(true);
      setSelectedGoingIndex(index);
      let homeAddress = await getAddressFromCoords(
        homeCoords.lat,
        homeCoords.lng,
      );
      setToAddress(homeAddress);
      updateDestination(homeCoords);
    }
  };

  const clearAddress = () => {
    setToAddress("");
    setDestination(null);
  };

  // Add this function to your component
  const getRoadDistance = async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ) => {
    const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!key) {
      throw new Error("Google Maps API key is required");
    }

    try {
      const response = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask":
              "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: origin.lat,
                  longitude: origin.lng,
                },
              },
            },
            destination: {
              location: {
                latLng: {
                  latitude: destination.lat,
                  longitude: destination.lng,
                },
              },
            },
            travelMode: "DRIVE",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to calculate route");
      }

      const route = data.routes?.[0];

      if (!route) {
        throw new Error("No route found");
      }

      const distanceMeters = route.distanceMeters || 0;
      const distanceKm = distanceMeters / 1000;
      const durationSeconds = route.duration || 0;

      return {
        distance: distanceKm,
        distanceMeters: distanceMeters,
        duration: durationSeconds,
        durationMinutes: durationSeconds / 60,
        polyline: route.polyline?.encodedPolyline || "",
      };
    } catch (error) {
      console.error("Error calculating road distance:", error);
      throw error;
    }
  };

  // Then use it anywhere in your component:
  const calculateDistance = async () => {
    try {
      const origin = currentLocation;
      const dest = destination;

      const result = await getRoadDistance(origin, dest);
      console.log(`Distance: ${result.distance.toFixed(2)} km`);
      console.log(`Duration: ${result.durationMinutes.toFixed(0)} min`);

      // Use the distance for calculations
      const mileageCost = result.distance * mileageRate;
      console.log(`Mileage cost: RM ${mileageCost.toFixed(2)}`);
      setDrivingDistance(result.distance);
    } catch (error) {
      console.error("Failed to get distance:", error);
    }
  };

  const submitTrip = async () => {
    const currentLoc = currentLocationRef.current;
    if (!currentLoc) return;

    try {
      const finalDistance = totalTraveledDistanceRef.current;
      const finalToAddress = toAddressRef.current;
      const finalRouteCoords = routeCoordsRef.current;

      const resolvedToAddress = finalToAddress || "Unknown Destination";
      const endTime = new Date();
      const tripId = `trip_${Date.now()}`;

      const routeImageUrl =
        finalRouteCoords.length > 0
          ? await uploadRouteImage(finalRouteCoords, tripId)
          : "";

      await saveTripToFirestore(
        resolvedToAddress,
        parseFloat(finalDistance.toFixed(2)),
        endTime,
        routeImageUrl ?? "",
        endTripReason,
      );
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert("Error", "Failed to save the trip.");
    }
  };

  const submitTripInBackground = async () => {
    const startPoint = pointsRef.current?.[0];
    const currentLoc = currentLocationRef.current;
    const dest = destinationRef.current;

    if (!currentLoc) return;

    try {
      let finalDistance = totalTraveledDistanceRef.current;
      let finalToAddress = toAddressRef.current;
      let finalToll = 0;
      let finalRouteCoords = routeCoordsRef.current;

      // toHome logic with road distance
      if (toHome && startPoint && officeCoords) {
        const resultToCurrent = await fetchRoadDistanceAndToll(
          startPoint,
          currentLoc,
        );
        const resultToOffice = await fetchRoadDistanceAndToll(
          startPoint,
          officeCoords,
        );

        if (resultToOffice.distance < resultToCurrent.distance) {
          finalDistance = resultToOffice.distance;
          finalToAddress = await getAddressFromCoords(
            officeCoords.lat,
            officeCoords.lng,
          );
          finalToll = resultToOffice.toll;
        } else {
          finalToll = resultToCurrent.toll;
        }
      } else if (dest) {
        const result = await fetchRoadDistanceAndToll(currentLoc, dest);
        finalToll = result.toll;
        // Use the road distance from origin to destination if available
        if (roadDistanceRef.current > 0) {
          finalDistance = roadDistanceRef.current;
        } else {
          // Fallback: use the accumulated distance
          finalDistance = totalTraveledDistanceRef.current;
        }
      }

      const mileage = finalDistance * mileageRate;
      const total = mileage + finalToll;

      await addDoc(collection(db, "trips"), {
        user_id: userId,
        from_address: fromAddress,
        to_address: finalToAddress,
        distance: parseFloat(finalDistance.toFixed(2)),
        toll: parseFloat(finalToll.toFixed(2)),
        mileage: parseFloat(mileage.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        remark: remarkRef.current || formRemark,
        from_time: fromTimeRef.current || fromTime,
        to_time: new Date(),
        to_home: toHome,
        route_image_url: await uploadRouteImage(
          finalRouteCoords,
          `trip_${Date.now()}`,
        ),
        date: new Date().toISOString().split("T")[0],
        created_at: serverTimestamp(),
      });

      await sendTripSavedNotification(finalDistance, total);
    } catch (error) {
      console.error("Background submission failed:", error);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Trip Auto‑Submit Failed",
          body: "Please check your connection and try again.",
        },
        trigger: null,
      });
    } finally {
      await stopTracking();
      totalTraveledDistanceRef.current = 0;
      routeCoordsRef.current = [];
      toAddressRef.current = "";
      roadDistanceRef.current = 0;
      hasReachedDestinationRef.current = false;
    }
  };

  const submitTripEarly = async () => {
    const currentLoc = currentLocationRef.current;
    if (!currentLoc) {
      Alert.alert(
        "Error",
        "Current location not available. Please wait a moment.",
      );
      return;
    }

    try {
      const finalDistance = totalTraveledDistanceRef.current;
      const finalRouteCoords = routeCoordsRef.current;

      const geo = await Location.reverseGeocodeAsync({
        latitude: currentLoc.lat,
        longitude: currentLoc.lng,
      });

      let currentSpotAddress = "Unknown Location";
      if (geo.length > 0) {
        const g = geo[0];
        currentSpotAddress = [g.name, g.street, g.city]
          .filter(Boolean)
          .join(", ");
      }

      const endTime = new Date();
      const tripId = `trip_${Date.now()}`;

      const routeImageUrl =
        finalRouteCoords.length > 0
          ? await uploadRouteImage(finalRouteCoords, tripId)
          : "";

      await saveTripToFirestore(
        currentSpotAddress,
        parseFloat(finalDistance.toFixed(2)),
        endTime,
        routeImageUrl ?? "",
        endTripReason,
      );
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert("Error", "Failed to save the trip.");
    }
  };

  const renderEndTripModal = () => {
    let isSaving = false;
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showEndTripModal}
        statusBarTranslucent={true}
        onRequestClose={() => !isSaving && setShowEndTripModal(false)}
      >
        <View style={styles.screenOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardContainer}
          >
            <ScrollView
              style={styles.modalScrollWrapper}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalView}>
                <Text style={styles.modalTitle}>End Trip Early?</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>
                    Do you want to end trip early? Please give a reason.
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Distance Travelled: {distance}
                  </Text>

                  <Text style={styles.modalSubtitle}>Reason:</Text>
                  <TextInput
                    style={[styles.input, styles.textbox]}
                    placeholder="End Trip Reason"
                    placeholderTextColor="#999999"
                    value={endTripReason}
                    onChangeText={setEndTripReason}
                    editable={!isSaving}
                    keyboardType="default"
                    numberOfLines={3}
                    multiline={true}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={() => {
                      setShowEndTripModal(false);
                      setEndTripReason("");
                    }}
                  >
                    <Text style={styles.textStyle}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dialogButton,
                      styles.submitButton,
                      isSaving && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      console.log("a");
                      submitTripEarly();
                    }}
                    disabled={isSaving || endTripReason === ""}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.textStyle}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  };

  const resetBackgroundState = () => {
    totalTraveledDistanceRef.current = 0;
    toAddressRef.current = "";
    routeCoordsRef.current = [];
    currentLocationRef.current = null;
    remarkRef.current = "";
    fromTimeRef.current = null;
    roadDistanceRef.current = 0;
    hasReachedDestinationRef.current = false;
    setTripActive(false);
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
            disabled={selectedGoingIndex !== 0}
          />
          <View style={[{ flexDirection: "row", marginTop: 5 }]}>
            <TouchableOpacity
              style={[
                styles.dialogButton,
                selectedGoingIndex === 1
                  ? styles.submitButtonActive
                  : styles.submitButton,
                { marginLeft: 0 },
              ]}
              onPress={() => {
                selectDefault(1);
              }}
              disabled={tripActive}
            >
              <Text
                style={[
                  selectedGoingIndex === 1
                    ? styles.textStyleActive
                    : styles.textStyle,
                  { fontWeight: "normal" },
                ]}
              >
                HQ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dialogButton,
                selectedGoingIndex === 2
                  ? styles.submitButtonActive
                  : styles.submitButton,
                { marginLeft: 15 },
              ]}
              onPress={() => {
                selectDefault(2);
              }}
              disabled={tripActive}
            >
              <Text
                style={[
                  selectedGoingIndex === 2
                    ? styles.textStyleActive
                    : styles.textStyle,
                  { fontWeight: "normal" },
                ]}
              >
                Penang
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dialogButton,
                selectedGoingIndex === 3
                  ? styles.submitButtonActive
                  : styles.submitButton,
                { marginLeft: 15 },
              ]}
              onPress={() => {
                selectDefault(3);
              }}
              disabled={tripActive}
            >
              <Text
                style={[
                  selectedGoingIndex === 3
                    ? styles.textStyleActive
                    : styles.textStyle,
                  { fontWeight: "normal" },
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>
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
              <Text style={styles.distanceText}>📏 Distance: {distance}</Text>
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
            onPress={async () => {
              if (tripActive) {
                Alert.alert(
                  "Reset Trip",
                  "Are you sure you want to cancel the current trip?",
                  [
                    { text: "No", style: "cancel" },
                    {
                      text: "Yes",
                      onPress: async () => {
                        await stopTracking();
                        resetForm();
                      },
                    },
                  ],
                );
              } else {
                const startTime = new Date();
                setFromTime(startTime);
                setTripActive(true);
                await startTracking();
                Alert.alert(
                  "Trip Started",
                  `Start time: ${startTime.toLocaleTimeString()}`,
                );
              }
            }}
            disabled={
              !currentLocation || !destination || locationLoading || !formRemark
            }
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
                (!currentLocation || locationLoading || !formRemark) &&
                  styles.buttonDisabled,
              ]}
              onPress={() => setShowEndTripModal(true)}
              disabled={!currentLocation || locationLoading}
            >
              <Text style={styles.buttonText}>End Trip Early</Text>
            </TouchableOpacity>
          )}

          {renderEndTripModal()}
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
  textStyle: {
    color: "white",
    fontWeight: "bold",
  },
  textStyleActive: {
    color: "#2196F3",
  },
  submitButton: {
    backgroundColor: "#2196F3",
  },
  submitButtonActive: {
    backgroundColor: "#fff",
    borderColor: "#2196F3",
    borderWidth: 1,
  },
  dialogButton: {
    borderRadius: 8,
    padding: 12,
    flex: 1,
    alignItems: "center",
  },
  screenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    ...StyleSheet.absoluteFillObject,
  },
  keyboardContainer: {
    flex: 1,
    width: "100%",
  },
  modalScrollWrapper: {
    flex: 1,
    width: "100%",
    maxHeight: "80%",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  modalView: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 25,
    alignItems: "stretch",
    shadowColor: "#000",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    elevation: 0,
  },
  cancelButton: {
    backgroundColor: "#f44336",
  },
  formGroup: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: "normal",
    marginBottom: 8,
    color: "#666",
  },
  textbox: {
    height: 100,
    paddingTop: 10,
    width: "100%",
  },
});
