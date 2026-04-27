import PlacesInput from "@/components/PlacesInput";
import { Text, View } from "@/components/Themed";
import { decode } from "@mapbox/polyline";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
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
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { db, storage } from "../../firebaseConfig";

export default function SubmitExpenseScreen() {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<View>(null);
  const googleMap = useRef<google.maps.Map | null>(null);
  const markers = useRef<(google.maps.marker.AdvancedMarkerElement | null)[]>([
    null,
    null,
  ]);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(
    null,
  );
  const inputARef = useRef<any>(null);
  const inputBRef = useRef<any>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  const [distance, setDistance] = useState<string | null>(null);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
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
  const [showMap, setShowMap] = useState<boolean>(true);
  const [mileageRate, setMileageRate] = useState<number>(0.8);
  const [formMileageRate, setFormMileageRate] = useState<number>(0.8);
  const [step, setStep] = useState(1);

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
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;

    // If configId is undefined, don't run the listener
    if (!configId) {
      console.error(
        "Firebase Config ID is missing from environment variables.",
      );
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "config", "7HTZfcBtebPsm0zlZB3c"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          if (data.mileage_rate) {
            setMileageRate(data.mileage_rate);
          }
        } else {
          console.error("Config document not found.");
        }
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const auth = getAuth();

    // 1. Handle Auth & User Data (Fixed getDoc error)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef); // Now works with correct import

          if (userSnap.exists()) {
            const data = userSnap.data();
            setUsername(
              data.name || data.username || user.displayName || "User",
            );
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      }
    });

    // 2. Initialize Mobile Maps
    // Note: On mobile, we don't 'loadScript'.
    // We initialize the library components directly.
    initMobileMap();

    return () => unsubscribe();
  }, []);

  const initMobileMap = () => {
    // On Mobile, you don't need document.createElement.
    // Instead, you will use the <MapView /> component in your render function.
    console.log("Map initialized for mobile");
  };

  const updatePoint = (index: number, latLng: { lat: number; lng: number }) => {
    console.log("UPDATE POINT:", index, latLng);
    setPoints((prev) => {
      const next = [...prev];
      next[index] = latLng;
      return next;
    });
  };
  const reverseGeocode = (latLng: google.maps.LatLngLiteral, index: number) => {
    if (!geocoder.current) return;
    geocoder.current.geocode({ location: latLng }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
        const address = results[0].formatted_address;
        index === 0
          ? setFromAddress(address || "")
          : setToAddress(address || "");
      }
    });
  };

  const resetAll = () => {
    markers.current.forEach((m) => {
      if (m) m.map = null;
    });
    markers.current = [null, null];
    directionsRenderer.current?.setDirections({ routes: [] });
    setPoints([null, null]);
    setDistance(null);
    setRoutePolyline(null);
    setFormPurpose("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormCompany("");
    setFormName("");
    setFormContactNumber("");
    setFromAddress("");
    setToAddress("");
    setFormFromTime("");
    setFormToTime("");
    setFormParking("0.00");
    setFormToll("0.00");
    setFormTripReport("");
    setBusinessCardFile(null);
  };

  // Separate Effect to handle calculation when points update
  useEffect(() => {
    if (points[0] && points[1]) {
      calculateDistance(
        points[0] as google.maps.LatLngLiteral,
        points[1] as google.maps.LatLngLiteral,
      );
      // Reset parking and toll when new points are set, assuming they might be route-dependent
      setFormParking("0.00");
      setFormToll("0.00");
    } else {
      // Clear directions if one point is removed
      directionsRenderer.current?.setDirections({ routes: [] });
      setDistance(null);
    }
  }, [points]);

  const calculateDistance = async (p1: any, p2: any) => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${p1.lat},${p1.lng}&destination=${p2.lat},${p2.lng}&key=${apiKey}&units=metric`;
    try {
      const response = await fetch(url);
      const result = await response.json();
      if (result.status === "OK") {
        const leg = result.routes[0].legs[0];
        setDistance(leg.distance.text);
        setRoutePolyline(result.routes[0].overview_polyline.points);
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

  // Robust calculation that handles distance strings (removing commas and units)
  const calculateMileage = useCallback(() => {
    console.log(getDistance());
    console.log(mileageRate);
    return (getDistance() * mileageRate).toFixed(2);
  }, [mileageRate, getDistance]);

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
    if (diff < 0) diff += 1440; // Handle duration crossing midnight
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  const pickBusinessCard = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to make this work!",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setBusinessCardFile(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    console.log(fromAddress);
    console.log(distance);
    console.log(formPurpose);
    console.log(formName);
    console.log(formDate);
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Error", "You must be logged in to submit an expense.");
      return;
    }

    const dist = getDistance();
    const mileage = parseFloat(calculateMileage());
    const cost = parseFloat(calculateCost());

    if (!formPurpose.trim() || !formName.trim() || !formDate || dist === 0) {
      Alert.alert(
        "Missing Information",
        "Please ensure both addresses, a purpose, and your name are provided.",
      );
      return;
    }

    setLoading(true);

    try {
      let businessCardUrl = "";
      if (businessCardFile) {
        const response = await fetch(businessCardFile);
        const blob = await response.blob();
        const storageRef = ref(storage, `business-cards/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        businessCardUrl = await getDownloadURL(storageRef);
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
        tripReport: formTripReport,
        parking: parseFloat(formParking),
        toll: parseFloat(formToll),
        mileage: mileage,
        cost: cost,
        business_card_url: businessCardUrl,
        approval_status: 0,
        createdAt: serverTimestamp(),
        type: 1,
      });

      setFormPurpose("");
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormCompany("");
      setFormName("");
      setFormContactNumber("");
      setFormFromTime("");
      setFormToTime("");
      setFromAddress("");
      setToAddress("");
      setBusinessCardFile(null);
      Alert.alert("Success", "Expense entry submitted for approval.");
    } catch (error) {
      console.error("Submission error: ", error);
      Alert.alert(
        "Submission Failed",
        "There was an error saving your expense.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {step === 1 ? (
        // ── Step 1: Addresses + Map ──
        <View style={{ flex: 1, padding: 20 }}>
          <Text style={styles.title}>Submit Travel Expense</Text>
          <Text style={styles.label}>From:</Text>
          <PlacesInput
            placeholder="From..."
            onPlaceSelected={(address, location) => {
              setFromAddress(address);
              updatePoint(0, location);
            }}
          />
          <Text style={styles.label}>To:</Text>
          <PlacesInput
            placeholder="To..."
            onPlaceSelected={(address, location) => {
              setToAddress(address);
              updatePoint(1, location);
            }}
          />

          {distance && (
            <View
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: "#f0f7ff",
                borderRadius: 8,
              }}
            >
              <Text
                style={{ color: "#2196F3", fontWeight: "600", fontSize: 15 }}
              >
                📍 Distance: {distance} km
              </Text>
              <Text style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
                {fromAddress} → {toAddress}
              </Text>
            </View>
          )}

          {distance && routePolyline && (
            <MapView
              style={{ height: 250, borderRadius: 12, marginTop: 16 }}
              initialRegion={{
                latitude: (points[0]!.lat + points[1]!.lat) / 2,
                longitude: (points[0]!.lng + points[1]!.lng) / 2,
                latitudeDelta:
                  Math.abs(points[0]!.lat - points[1]!.lat) * 2 + 0.05,
                longitudeDelta:
                  Math.abs(points[0]!.lng - points[1]!.lng) * 2 + 0.05,
              }}
            >
              <Marker
                coordinate={{
                  latitude: points[0]!.lat,
                  longitude: points[0]!.lng,
                }}
                title="From"
                pinColor="green"
              />
              <Marker
                coordinate={{
                  latitude: points[1]!.lat,
                  longitude: points[1]!.lng,
                }}
                title="To"
                pinColor="red"
              />
              <Polyline
                coordinates={decode(routePolyline).map(([lat, lng]) => ({
                  latitude: lat,
                  longitude: lng,
                }))}
                strokeColor="#2196F3"
                strokeWidth={4}
              />
            </MapView>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              { marginTop: 24 },
              (!points[0] || !points[1]) && styles.buttonDisabled,
            ]}
            onPress={() => setStep(2)}
            disabled={!points[0] || !points[1]}
          >
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // ── Step 2: Rest of the form ──
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formContainer}>
            {/* Back button */}
            <TouchableOpacity
              onPress={() => setStep(1)}
              style={{ marginBottom: 16 }}
            >
              <Text style={{ color: "#2196F3", fontSize: 15 }}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Trip Details</Text>

            {/* Route summary */}
            <View
              style={{
                padding: 12,
                backgroundColor: "#f0f7ff",
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#2196F3", fontWeight: "600" }}>
                📍 {distance} km
              </Text>
              <Text
                style={{ color: "#666", fontSize: 13, marginTop: 4 }}
                numberOfLines={2}
              >
                {fromAddress} → {toAddress}
              </Text>
            </View>

            <Text style={styles.label}>Purpose:</Text>
            <View
              style={[
                styles.purposeInput,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  overflow: "hidden",
                },
              ]}
            >
              <Picker
                selectedValue={formPurpose}
                onValueChange={(itemValue) => setFormPurpose(itemValue)}
                style={{
                  color: formPurpose === "" ? "#999" : "#333",
                  flex: 1,
                  marginVertical: -8,
                }}
                dropdownIconColor="transparent"
                mode="dropdown"
              >
                <Picker.Item
                  label="Select a purpose..."
                  value=""
                  enabled={false}
                  color="#999"
                />
                {purposeList.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>

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
              onChangeText={(text) =>
                setFormContactNumber(text.replace(/[^0-9]/g, ""))
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
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                  value={formFromTime}
                  onChangeText={setFormFromTime}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>To Time:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                  value={formToTime}
                  onChangeText={setFormToTime}
                />
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingBottom: 40 },
  mapWrapper: { height: 250, width: "100%" },
  formContainer: { padding: 20, zIndex: 1 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
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
    paddingVertical: 6,
    fontSize: 16,
    color: "#333",
  },
  fieldValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    paddingVertical: 12,
  },
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
    marginTop: 30,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: { backgroundColor: "#aaa" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    width: "100%",
    overflow: "hidden",
  },
  picker: {
    fontSize: 14,
    color: "#333",
    width: "100%",
  },

  inputContainer: {
    backgroundColor: "white",
    borderRadius: 5,
  },
  list: {
    backgroundColor: "white",
    borderRadius: 5,
  },
  description: {
    fontSize: 14,
    color: "#111",
  },
});
