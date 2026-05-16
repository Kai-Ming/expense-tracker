import { Text, View } from "@/components/Themed";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { db, storage } from "../../firebaseConfig";

export default function SubmitExpenseWebScreen() {
  const [distance, setDistance] = useState<string>("0.00");
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
  const [businessCardFile, setBusinessCardFile] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [mileageRate, setMileageRate] = useState<number>(0.8);
  const [formMileageRate, setFormMileageRate] = useState<number>(0.8);
  const [userTrips, setUserTrips] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!userId || !formDate) return;

    // 1. Create JS Date objects for the start and end of the selected day
    const startOfDay = new Date(formDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(formDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(
      `🔍 Searching: user_id=${userId} between ${startOfDay} and ${endOfDay}`,
    );

    // 2. Query where created_at is within that 24-hour window
    const q = query(
      collection(db, "trips"),
      where("user_id", "==", userId),
      where("created_at", ">=", startOfDay),
      where("created_at", "<=", endOfDay),
      orderBy("created_at", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("✅ Trips found for this date:", snapshot.docs.length);
        const tripsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUserTrips(tripsData);
      },
      (error) => {
        console.error("❌ Firestore Error:", error);
      },
    );

    return () => unsubscribe();
  }, [userId, formDate]);

  useEffect(() => {
    if (mileageRate !== undefined) {
      setFormMileageRate(mileageRate);
    }
  }, [mileageRate]);

  useEffect(() => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) return;

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
            const displayName =
              userData.name || userData.username || user.displayName || "User";
            setUsername(displayName);
          }
        } catch (error) {
          console.error("Error fetching user doc:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleTripSelect = (tripId: string) => {
    setSelectedTripId(tripId);
    const selectedTrip = userTrips.find((t) => t.id === tripId);

    if (selectedTrip) {
      setFromAddress(selectedTrip.from_address || "");
      setToAddress(selectedTrip.to_address || "");
      setDistance(selectedTrip.distance?.toString() || "0.00");
      setFormTripReport(selectedTrip.remark || "");

      // Convert Firebase Timestamps to HH:mm for the HTML time inputs
      if (selectedTrip.from_time) {
        const start = selectedTrip.from_time.toDate
          ? selectedTrip.from_time.toDate()
          : new Date(selectedTrip.from_time);
        setFormFromTime(start.toTimeString().slice(0, 5));
      }
      if (selectedTrip.to_time) {
        const end = selectedTrip.to_time.toDate
          ? selectedTrip.to_time.toDate()
          : new Date(selectedTrip.to_time);
        setFormToTime(end.toTimeString().slice(0, 5));
      }
    }
  };

  const getDistanceValue = () =>
    parseFloat(distance.replace(/[^0-9.]/g, "")) || 0;

  const calculateMileage = useCallback(() => {
    return (getDistanceValue() * mileageRate).toFixed(2);
  }, [mileageRate, distance]);

  const calculateCost = () => {
    const travelCost = getDistanceValue() * mileageRate;
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
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  const updateMileageRate = async () => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) {
      console.error("No Config ID found in environment variables");
      return;
    }
    const docRef = doc(db, "config", configId);
    try {
      await updateDoc(docRef, { mileage_rate: formMileageRate });
      alert("Rate updated successfully!");
    } catch (error) {
      console.error("Error updating document:", error);
    }
  };

  const handleSubmit = async () => {
    const dist = getDistanceValue();
    if (
      dist === 0 ||
      !formPurpose.trim() ||
      !formDate ||
      !fromAddress ||
      !toAddress
    ) {
      alert("Please ensure all required fields are filled.");
      return;
    }

    try {
      let businessCardUrl = "";
      if (businessCardFile) {
        const storageRef = ref(
          storage,
          `business-cards/${Date.now()}_${businessCardFile.name}`,
        );
        const uploadResult = await uploadBytes(storageRef, businessCardFile);
        businessCardUrl = await getDownloadURL(uploadResult.ref);
      }

      await addDoc(collection(db, "expenses"), {
        user_id: userId,
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
        business_card_url: businessCardUrl,
        parking: parseFloat(formParking),
        toll: parseFloat(formToll),
        mileage: parseFloat(calculateMileage()),
        cost: parseFloat(calculateCost()),
        type: 1,
        approval_status: 0,
        created_at: serverTimestamp(),
      });
      alert("Expense submitted successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save expense.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.detailsContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Submit Travel Expense</Text>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Date:</Text>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                style={htmlInputStyle}
              />
            </View>

            <View
              style={[
                styles.inputRow,
                {
                  marginTop: 10,
                  marginBottom: 20,
                  borderBottomWidth: 1,
                  borderColor: "#eee",
                  paddingBottom: 15,
                  zIndex: isDropdownOpen ? 1000 : 1,
                  elevation: isDropdownOpen ? 1000 : 1,
                },
              ]}
            >
              <Text style={styles.fieldLabel}>Import Trip:</Text>

              <View
                style={[
                  styles.dropdownContainer,
                  { zIndex: isDropdownOpen ? 9999 : 1 },
                ]}
              >
                <TouchableOpacity
                  style={styles.dropdownHeader}
                  onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <Text style={styles.selectedText}>
                    {selectedTripId
                      ? "Trip Selected"
                      : userTrips.length > 0
                        ? `-- Select a Trip --`
                        : "-- No Trips --"}
                  </Text>
                </TouchableOpacity>

                {/* Use a clear ternary operator to avoid "0" or "false" being rendered as text */}
                {isDropdownOpen === true ? (
                  <View style={styles.dropdownListWrapper}>
                    <ScrollView style={styles.tripList}>
                      {userTrips.map((trip) => (
                        <TouchableOpacity
                          key={trip.id}
                          onPress={() => {
                            handleTripSelect(trip.id);
                            setIsDropdownOpen(false);
                          }}
                          style={styles.tripItem}
                        >
                          <Text style={styles.timeText}>
                            {trip.created_at?.toDate().toLocaleTimeString()}
                          </Text>
                          <Text style={styles.addressText}>
                            <Text style={styles.boldLabel}>Remark: </Text>
                            {trip.remark || "No Remark"}
                          </Text>

                          <Text style={styles.addressText}>
                            <Text style={styles.boldLabel}>From: </Text>
                            {trip.from_address}
                          </Text>

                          <Text style={styles.addressText}>
                            <Text style={styles.boldLabel}>To: </Text>
                            {trip.to_address}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.fieldLabel}>From:</Text>
              <TextInput
                placeholder="From..."
                value={fromAddress}
                onChangeText={setFromAddress}
                style={styles.webTextInput}
              />
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>To:</Text>
              <TextInput
                placeholder="To..."
                value={toAddress}
                onChangeText={setToAddress}
                style={styles.webTextInput}
              />
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Distance (km):</Text>
              <TextInput
                placeholder="0.00"
                value={distance}
                onChangeText={setDistance}
                keyboardType="numeric"
                style={styles.webTextInput}
              />
            </View>

            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Purpose:</Text>
              <select
                value={formPurpose}
                onChange={(e) => setFormPurpose(e.target.value)}
                style={htmlSelectStyle}
              >
                <option value="" disabled>
                  Select a purpose...
                </option>
                <option value="Application support">Application support</option>
                <option value="Attending seminar/training">
                  Attending seminar/training
                </option>
                <option value="Breakfast/Lunch/Dinner meeting">
                  Breakfast/Lunch/Dinner meeting
                </option>
                <option value="Documents submission">
                  Documents submission
                </option>
                <option value="Door knocking">Door knocking</option>
                <option value="Meeting and follow-up">
                  Meeting and follow-up
                </option>
                <option value="Presentation">Presentation</option>
                <option value="Service and support">Service and support</option>
                <option value="Site inspection">Site inspection</option>
                <option value="Site visitation">Site visitation</option>
              </select>
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Company/Site:</Text>
              <TextInput
                value={formCompany}
                onChangeText={setFormCompany}
                style={styles.webTextInput}
                placeholder="Company/Site"
              />
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Name:</Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                style={styles.webTextInput}
                placeholder="Name"
              />
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Contact:</Text>
              <TextInput
                value={formContactNumber}
                onChangeText={(text) =>
                  setFormContactNumber(text.replace(/[^0-9]/g, ""))
                }
                style={styles.webTextInput}
                placeholder="Contact Number"
              />
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>From Time:</Text>
              <input
                type="time"
                value={formFromTime}
                onChange={(e) => setFormFromTime(e.target.value)}
                style={htmlInputStyle}
              />
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>To Time:</Text>
              <input
                type="time"
                value={formToTime}
                onChange={(e) => setFormToTime(e.target.value)}
                style={htmlInputStyle}
              />
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Duration:</Text>
              <Text style={styles.fieldValue}>{calculateDuration()}</Text>
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Parking (RM):</Text>
              <TextInput
                value={formParking}
                onChangeText={setFormParking}
                keyboardType="numeric"
                style={styles.webTextInput}
              />
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Toll (RM):</Text>
              <TextInput
                value={formToll}
                onChangeText={setFormToll}
                keyboardType="numeric"
                style={styles.webTextInput}
              />
            </View>

            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Trip Report:</Text>
              <TextInput
                value={formTripReport}
                onChangeText={setFormTripReport}
                multiline
                style={[styles.webTextInput, { minHeight: 80 }]}
                placeholder="Trip Report"
              />
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Business Card:</Text>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files && setBusinessCardFile(e.target.files[0])
                }
                style={htmlInputStyle}
              />
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Mileage:</Text>
              <Text style={styles.fieldValue}>RM {calculateMileage()}</Text>
            </View>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Cost:</Text>
              <Text style={styles.fieldValue}>RM {calculateCost()}</Text>
            </View>

            <TouchableOpacity onPress={handleSubmit} style={styles.button}>
              <Text style={styles.buttonText}>Submit Expense</Text>
            </TouchableOpacity>
          </View>

          {/* Mileage rate configuration form restored[cite: 1] */}
          <View style={styles.mileageUpdateContainer}>
            <Text style={[styles.fieldLabel, { marginBottom: 10 }]}>
              Mileage Rate
            </Text>
            <select
              value={formMileageRate}
              onChange={(e) => setFormMileageRate(parseFloat(e.target.value))}
              style={htmlSelectStyle}
            >
              <option value={0.6}>0.6</option>
              <option value={0.8}>0.8</option>
              <option value={1.0}>1.0</option>
            </select>
            <TouchableOpacity
              onPress={updateMileageRate}
              style={[styles.button, { marginTop: 10 }]}
            >
              <Text style={styles.buttonText}>Update Rate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const htmlInputStyle = {
  padding: "8px 12px",
  border: "1px solid #ccc",
  width: "100%",
  maxWidth: "400px",
  boxSizing: "border-box" as const,
};

const htmlSelectStyle = { ...htmlInputStyle, height: "auto" };

const styles = StyleSheet.create({
  boldLabel: {
    fontWeight: "bold",
    color: "#333",
  },
  dropdownContainer: {
    position: "relative",
    marginVertical: 10,
    width: "100%",
    maxWidth: 400,
    zIndex: 5000,
    elevation: 5,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 0, // Removed border radius
    backgroundColor: "#fff",
  },
  dropdownListWrapper: {
    position: "absolute",
    top: 50, // Increased from 45 to add a gap (adjust as needed)
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 0, // Removed border radius
    maxHeight: 300,
    zIndex: 5001,
    boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
  },
  selectedText: {
    fontSize: 14,
    color: "#333",
  },
  arrow: {
    fontSize: 12,
    color: "#666",
  },
  tripList: {
    maxHeight: 280,
  },
  tripItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedTripItem: {
    backgroundColor: "#f0f7ff",
  },
  listContainer: {
    marginVertical: 10,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2196F3",
  },
  remarkText: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#666",
  },
  addressText: {
    fontSize: 13,
    color: "#444",
    lineHeight: 18,
  },
  emptyItem: {
    padding: 20,
    alignItems: "center",
  },
  container: { flex: 1, backgroundColor: "#fff" },
  detailsContainer: { flex: 1 },
  scrollContent: { padding: 20 },
  formContainer: { flex: 1 },
  webTextInput: {
    flex: 1,
    maxWidth: 400,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    zIndex: 1,
    position: "relative",
  },
  inputRow: { flexDirection: "row", alignItems: "center" },
  fieldLabel: { fontSize: 14, fontWeight: "600", width: 120 },
  fieldValue: { fontSize: 14, flex: 1 },
  button: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 5,
    marginTop: 20,
    alignItems: "center",
    maxWidth: 200,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  formLabel: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  mileageUpdateContainer: {
    marginTop: 40,
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 20,
  },
});
