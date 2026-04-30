import PlacesInput from "@/components/PlacesInput";
import { Text, View } from "@/components/Themed";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapComponent from "../../components/MapComponent";
import { db, storage } from "../../firebaseConfig";

// Decodes a Google Maps encoded polyline string into an array of lat/lng coords
function decodePolyline(
  encoded: string,
): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
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

export default function SubmitExpenseScreen() {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

  const [distance, setDistance] = useState<string | null>(null);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [destination, setDestination] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  // Keep points array for MapComponent compatibility
  const [points, setPoints] = useState<(google.maps.LatLngLiteral | null)[]>([
    null,
    null,
  ]);
  const [formPurpose, setFormPurpose] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [formCompany, setFormCompany] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formContactNumber, setFormContactNumber] = useState<string>("");
  const [fromAddress, setFromAddress] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");
  const [formFromTime, setFormFromTime] = useState<string>("");
  const [formToTime, setFormToTime] = useState<string>("");
  const [formParking, setFormParking] = useState<string>("0.00");
  const [formToll, setFormToll] = useState<string>("0.00");
  const [formTripReport, setFormTripReport] = useState<string>("");
  const [businessCardFile, setBusinessCardFile] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [mileageRate, setMileageRate] = useState<number>(0.8);
  const [formMileageRate, setFormMileageRate] = useState<number>(0.8);
  const [step, setStep] = useState(1);
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [purposeModalVisible, setPurposeModalVisible] = useState(false);
  const [showFromTimePicker, setShowFromTimePicker] = useState(false);
  const [showToTimePicker, setShowToTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  const openPurposeModal = () => {
    setPurposeModalVisible(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }),
    ]).start();
  };

  const closePurposeModal = (onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPurposeModalVisible(false);
      setShowPurposeModal(false);
      onDone?.();
    });
  };

  const purposeList = [
    { label: "Application support", value: "Application support" },
    {
      label: "Attending seminar/training",
      value: "Attending seminar/training",
    },
    {
      label: "Breakfast/Lunch/Dinner meeting",
      value: "Breakfast/Lunch/Dinner meeting",
    },
    { label: "Documents submission", value: "Documents submission" },
    {
      label: "Documents submission with meeting",
      value: "Documents submission with meeting",
    },
    { label: "Door knocking", value: "Door knocking" },
    { label: "Goods delivery", value: "Goods delivery" },
    {
      label: "Initial meeting and introduction",
      value: "Initial meeting and introduction",
    },
    { label: "Meeting and follow-up", value: "Meeting and follow-up" },
    { label: "Presentation", value: "Presentation" },
    { label: "Product demonstration", value: "Product demonstration" },
    { label: "Service and support", value: "Service and support" },
    { label: "Site inspection", value: "Site inspection" },
    { label: "Site survey", value: "Site survey" },
    { label: "Site visitation", value: "Site visitation" },
    { label: "Tea break meeting", value: "Tea break meeting" },
    { label: "Tender submission", value: "Tender submission" },
    {
      label: "Tender submission with meeting",
      value: "Tender submission with meeting",
    },
    {
      label: "Training and commissioning",
      value: "Training and commissioning",
    },
  ];

  useEffect(() => {
    if (mileageRate !== undefined) {
      setFormMileageRate(mileageRate);
    }
  }, [mileageRate]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "config", "7HTZfcBtebPsm0zlZB3c"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.mileage_rate) setMileageRate(data.mileage_rate);
        }
      },
    );
    return () => unsubscribe();
  }, []);

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
    return () => unsubscribe();
  }, []);

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

  // Fetch current GPS location on mount
  useEffect(() => {
    (async () => {
      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Location access is required to calculate your route.",
          );
          setLocationLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setCurrentLocation(coords);
        setPoints((prev) => [coords, prev[1]]);
        const geo = await Location.reverseGeocodeAsync({
          latitude: coords.lat,
          longitude: coords.lng,
        });
        if (geo.length > 0) {
          const g = geo[0];
          const parts = [g.name, g.street, g.city, g.region].filter(Boolean);
          setFromAddress(parts.join(", "));
        } else {
          setFromAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        }
      } catch (e) {
        console.error("Location error:", e);
        Alert.alert("Location Error", "Could not fetch your current location.");
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  // Recalculate route whenever origin or destination changes
  useEffect(() => {
    if (currentLocation && destination) {
      calculateDistance(currentLocation, destination);
      setFormParking("0.00");
      setFormToll("0.00");
    } else {
      setDistance(null);
      setRoutePolyline(null);
      setRouteCoords([]);
    }
  }, [currentLocation, destination]);

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
        // Fit map after coords are ready
        setTimeout(() => fitMapToRoute(p1, p2), 300);
      } else {
        console.log("Directions error:", result.status);
      }
    } catch (error) {
      console.error("Distance error:", error);
    }
  };

  const getDistance = () => {
    if (!distance) return 0.0;
    return parseFloat(distance.replace(/[^0-9.]/g, ""));
  };

  const calculateMileage = useCallback(() => {
    return (getDistance() * mileageRate).toFixed(2);
  }, [mileageRate, distance]);

  const calculateCost = () => {
    const travelCost = getDistance() * mileageRate;
    const parking = parseFloat(formParking) || 0;
    const toll = parseFloat(formToll) || 0;
    return (travelCost + parking + toll).toFixed(2);
  };

  const calculateDuration = () => {
    if (!formFromTime || !formToTime) return "0h 0m";
    const [h1, m1] = formFromTime.split(":").map(Number);
    const [h2, m2] = formToTime.split(":").map(Number);
    let diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 0) diff += 1440;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const pickBusinessCard = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera roll permissions required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) setBusinessCardFile(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to submit an expense.");
      return;
    }

    const dist = getDistance();
    const mileage = parseFloat(calculateMileage());
    const cost = parseFloat(calculateCost());

    if (
      dist === 0.0 ||
      !formPurpose.trim() ||
      !formDate ||
      !fromAddress ||
      !toAddress ||
      !formCompany ||
      !formName.trim() ||
      !formContactNumber.trim() ||
      !formFromTime ||
      !formToTime
    ) {
      Alert.alert(
        "Missing Information",
        "Please ensure all fields are filled in.",
      );
      return;
    }

    setLoading(true);
    try {
      let businessCardUrl = "";
      let routeImageUrl = "";

      // Capture route image from Static Maps API
      if (routePolyline && currentLocation && destination) {
        try {
          const encodedPolyline = encodeURIComponent(routePolyline);
          const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x400&path=enc:${encodedPolyline}&markers=color:red|label:A|${currentLocation.lat},${currentLocation.lng}&markers=color:blue|label:B|${destination.lat},${destination.lng}&key=${apiKey}`;
          const mapResponse = await fetch(staticMapUrl);
          if (mapResponse.ok) {
            const blob = await mapResponse.blob();
            const routeRef = ref(storage, `route-images/${Date.now()}.png`);
            const uploadResult = await uploadBytes(routeRef, blob);
            routeImageUrl = await getDownloadURL(uploadResult.ref);
          }
        } catch (mapErr) {
          console.error("Failed to capture static route image:", mapErr);
        }
      }

      // Upload business card if provided
      if (businessCardFile) {
        const response = await fetch(businessCardFile);
        const blob = await response.blob();
        const storageRef = ref(storage, `business-cards/${Date.now()}.jpg`);
        const uploadResult = await uploadBytes(storageRef, blob);
        businessCardUrl = await getDownloadURL(uploadResult.ref);
      }

      await addDoc(collection(db, "expenses"), {
        user_id: user.uid,
        user_name: username,
        date: formDate,
        purpose: formPurpose,
        from_address: fromAddress,
        to_address: toAddress,
        company: formCompany,
        name: formName,
        contact_number: formContactNumber,
        from_time: formFromTime,
        to_time: formToTime,
        duration: calculateDuration(),
        distance: dist,
        trip_report: formTripReport,
        parking: parseFloat(formParking),
        toll: parseFloat(formToll),
        mileage,
        cost,
        business_card_url: businessCardUrl,
        route_image_url: routeImageUrl,
        approval_status: 0,
        createdAt: serverTimestamp(),
        type: 1,
      });

      // Reset form
      setFormPurpose("");
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormCompany("");
      setFormName("");
      setFormContactNumber("");
      setFormFromTime("");
      setFormToTime("");
      setFromAddress("");
      setToAddress("");
      setDestination(null);
      setPoints((prev) => [prev[0], null]);
      setDistance(null);
      setRouteCoords([]);
      setRoutePolyline(null);
      setBusinessCardFile(null);
      setStep(1);
      Alert.alert("Success", "Expense entry submitted for approval.");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        console.error("Storage/Firestore Error Code:", (error as any).code);
      }
      console.error("Full error object:", error);
      Alert.alert(
        "Submission Failed",
        "There was an error saving your expense.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Default map region — Malaysia (Shah Alam / KL area)
  const defaultRegion = {
    latitude: 3.073,
    longitude: 101.518,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  return (
    <View style={{ flex: 1 }}>
      {/* ── Step 1: Addresses + Map ── */}
      {step === 1 && (
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
          bounces={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Map sits at the top as a fixed-height block inside the scroll */}
          {/* <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={defaultRegion}
            showsUserLocation
            showsMyLocationButton
            scrollEnabled={false}
            zoomEnabled={true}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            {points[0] && (
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
            {points[1] && (
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
            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#2196F3"
                strokeWidth={4}
              />
            )}
          </MapView> */}
          <MapComponent
            ref={mapRef}
            points={points}
            fromAddress={fromAddress}
            toAddress={toAddress}
            routeCoords={routeCoords}
            defaultRegion={defaultRegion}
            styles={styles}
          />

          {/* Input panel below the map */}
          <View style={styles.inputPanel}>
            <Text style={styles.title}>Submit Travel Expense</Text>

            <Text style={styles.label}>From (Current Location):</Text>
            {locationLoading ? (
              <View style={[styles.input, { opacity: 0.6 }]}>
                <Text style={{ color: "#999", fontSize: 15 }}>
                  📍 Fetching your location…
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.input,
                  { backgroundColor: "#f0f7ff", borderColor: "#b3d4f7" },
                ]}
              >
                <Text style={{ color: "#444", fontSize: 15 }} numberOfLines={2}>
                  📍 {fromAddress || "Location unavailable"}
                </Text>
              </View>
            )}

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

            <TouchableOpacity
              style={[
                styles.button,
                { marginTop: 16 },
                (!currentLocation || !destination || locationLoading) &&
                  styles.buttonDisabled,
              ]}
              onPress={() => setStep(2)}
              disabled={!currentLocation || !destination || locationLoading}
            >
              <Text style={styles.buttonText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      )}

      {/* ── Step 2: Trip detail form ── */}
      {step === 2 && (
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formContainer}>
            <TouchableOpacity
              onPress={() => setStep(1)}
              style={{ marginBottom: 16 }}
            >
              <Text style={{ color: "#2196F3", fontSize: 15 }}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Trip Details</Text>

            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>📍 {distance}</Text>
              <Text style={styles.addressPreview} numberOfLines={2}>
                {fromAddress} → {toAddress}
              </Text>
            </View>

            <Text style={styles.label}>Purpose:</Text>
            <TouchableOpacity
              style={styles.purposeInput}
              onPress={openPurposeModal}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: formPurpose === "" ? "#999" : "#333",
                  fontSize: 16,
                  flex: 1,
                }}
              >
                {formPurpose === "" ? "Select a purpose..." : formPurpose}
              </Text>
              <Text style={{ color: "#999", fontSize: 18 }}>▾</Text>
            </TouchableOpacity>

            {/* Purpose Modal — manually animated to avoid Android grey-block flash */}
            <Modal
              visible={purposeModalVisible}
              transparent
              animationType="none"
              statusBarTranslucent
              hardwareAccelerated
              onRequestClose={() => closePurposeModal()}
            >
              {/* Animated dim overlay */}
              <Animated.View
                style={[styles.modalOverlay, { opacity: overlayOpacity }]}
              >
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={1}
                  onPress={() => closePurposeModal()}
                />
                {/* Animated sheet sliding up */}
                <Animated.View
                  style={[
                    styles.modalSheet,
                    {
                      transform: [{ translateY: sheetTranslateY }],
                      paddingBottom: insets.bottom + 16,
                    },
                  ]}
                >
                  <View style={styles.modalHandle} />
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Purpose</Text>
                    <TouchableOpacity onPress={() => closePurposeModal()}>
                      <Text style={{ color: "#2196F3", fontSize: 16 }}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={purposeList}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.modalItem,
                          formPurpose === item.value &&
                            styles.modalItemSelected,
                        ]}
                        onPress={() => {
                          setFormPurpose(item.value);
                          closePurposeModal();
                        }}
                      >
                        <Text
                          style={[
                            styles.modalItemText,
                            formPurpose === item.value &&
                              styles.modalItemTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {formPurpose === item.value && (
                          <Text style={{ color: "#2196F3", fontSize: 18 }}>
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => (
                      <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
                    )}
                  />
                </Animated.View>
              </Animated.View>
            </Modal>

            <Text style={styles.label}>Company/Site</Text>
            <TextInput
              style={styles.input}
              placeholder="Company/Site"
              placeholderTextColor="#999"
              value={formCompany}
              onChangeText={setFormCompany}
            />

            <Text style={styles.label}>Name:</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#999"
              value={formName}
              onChangeText={setFormName}
            />

            <Text style={styles.label}>Contact:</Text>
            <TextInput
              style={styles.input}
              placeholder="Contact"
              placeholderTextColor="#999"
              value={formContactNumber}
              onChangeText={(t) =>
                setFormContactNumber(t.replace(/[^0-9]/g, ""))
              }
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Date:</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              value={formDate}
              onChangeText={setFormDate}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>From Time:</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowFromTimePicker(true)}
                >
                  <Text
                    style={{
                      color: formFromTime ? "#333" : "#999",
                      fontSize: 16,
                    }}
                  >
                    {formFromTime || "HH:MM"}
                  </Text>
                </TouchableOpacity>
                {showFromTimePicker && (
                  <DateTimePicker
                    value={(() => {
                      if (formFromTime) {
                        const [h, m] = formFromTime.split(":").map(Number);
                        const d = new Date();
                        d.setHours(h, m, 0, 0);
                        return d;
                      }
                      return new Date();
                    })()}
                    mode="time"
                    is24Hour
                    display="default"
                    onChange={(_, date) => {
                      setShowFromTimePicker(false);
                      if (date) {
                        const h = date.getHours().toString().padStart(2, "0");
                        const m = date.getMinutes().toString().padStart(2, "0");
                        setFormFromTime(`${h}:${m}`);
                      }
                    }}
                  />
                )}
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>To Time:</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowToTimePicker(true)}
                >
                  <Text
                    style={{
                      color: formToTime ? "#333" : "#999",
                      fontSize: 16,
                    }}
                  >
                    {formToTime || "HH:MM"}
                  </Text>
                </TouchableOpacity>
                {showToTimePicker && (
                  <DateTimePicker
                    value={(() => {
                      if (formToTime) {
                        const [h, m] = formToTime.split(":").map(Number);
                        const d = new Date();
                        d.setHours(h, m, 0, 0);
                        return d;
                      }
                      return new Date();
                    })()}
                    mode="time"
                    is24Hour
                    display="default"
                    onChange={(_, date) => {
                      setShowToTimePicker(false);
                      if (date) {
                        const h = date.getHours().toString().padStart(2, "0");
                        const m = date.getMinutes().toString().padStart(2, "0");
                        setFormToTime(`${h}:${m}`);
                      }
                    }}
                  />
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Parking:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  value={formParking}
                  onChangeText={setFormParking}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Toll:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  value={formToll}
                  onChangeText={setFormToll}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>Cost:</Text>
            <Text style={styles.input}>RM {calculateCost()}</Text>

            <Text style={styles.label}>Trip Report:</Text>
            <TextInput
              style={[
                styles.input,
                { minHeight: 80, textAlignVertical: "top" },
              ]}
              placeholder="Trip Report"
              placeholderTextColor="#999"
              value={formTripReport}
              onChangeText={setFormTripReport}
              multiline
              numberOfLines={10}
            />

            <View style={styles.imageSection}>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickBusinessCard}
              >
                <Text style={styles.imagePickerText}>
                  {businessCardFile
                    ? "Change Business Card"
                    : "Attach Business Card"}
                </Text>
              </TouchableOpacity>
              {businessCardFile && (
                <Image
                  source={{ uri: businessCardFile }}
                  style={styles.previewImage}
                />
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Submitting..." : "Submit Entry"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Map occupies the top ~45% of the screen in step 1
  map: {
    width: "100%",
    height: 260,
  },
  inputPanel: {
    backgroundColor: "#fff",
    padding: 20,
    paddingBottom: 32,
  },
  distanceBadge: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    marginBottom: 4,
  },
  distanceText: {
    color: "#2196F3",
    fontWeight: "600",
    fontSize: 15,
  },
  addressPreview: {
    color: "#666",
    fontSize: 13,
    marginTop: 4,
  },
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingBottom: 40 },
  formContainer: { padding: 20, zIndex: 1 },
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
  purposeInput: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    marginTop: 0,
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: { fontSize: 17, fontWeight: "600", color: "#333" },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalItemSelected: { backgroundColor: "#f0f7ff" },
  modalItemText: { fontSize: 15, color: "#333", flex: 1 },
  modalItemTextSelected: { color: "#2196F3", fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  halfInput: { width: "48%" },
  imagePicker: {
    flex: 1,
    backgroundColor: "#f0f7ff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#2196F3",
    borderStyle: "dashed",
  },
  imagePickerText: { color: "#2196F3", fontWeight: "bold" },
  imageSection: { marginTop: 25, flexDirection: "row", alignItems: "center" },
  previewImage: { width: 60, height: 60, borderRadius: 8, marginLeft: 15 },
  button: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: { backgroundColor: "#aaa" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
