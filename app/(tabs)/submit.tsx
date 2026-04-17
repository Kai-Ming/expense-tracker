import { Text, View } from "@/components/Themed";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { db, storage } from "../../firebaseConfig";

export default function SubmitExpenseScreen() {
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [distance, setDistance] = useState("0");
  const [purpose, setPurpose] = useState("");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [parking, setParking] = useState("0.00");
  const [toll, setToll] = useState("0.00");
  const [tripReport, setTripReport] = useState("");
  const [businessCard, setBusinessCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mileageRate, setMileageRate] = useState<number>(0.8);

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
    const unsubscribe = onSnapshot(doc(db, "config", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.mileage_rate) {
          setMileageRate(data.mileage_rate);
        }
      }
    });
    return () => unsubscribe();
  }, []);

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
      setBusinessCard(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Error", "You must be logged in to submit an expense.");
      return;
    }
    if (!purpose.trim() || !name.trim() || !date) {
      Alert.alert(
        "Missing Information",
        "Please fill in the purpose and your name.",
      );
      return;
    }

    setLoading(true);

    const distNum = parseFloat(distance) || 0;
    const mileage = distNum * mileageRate;
    const parkingVal = parseFloat(parking) || 0;
    const tollVal = parseFloat(toll) || 0;
    const totalCost = mileage + parkingVal + tollVal;

    let duration = "0h 0m";
    if (fromTime && toTime) {
      const [h1, m1] = fromTime.split(":").map(Number);
      const [h2, m2] = toTime.split(":").map(Number);
      let diff = h2 * 60 + m2 - (h1 * 60 + m1);
      if (diff < 0) diff += 1440;
      duration = `${Math.floor(diff / 60)}h ${diff % 60}m`;
    }

    try {
      let businessCardUrl = "";
      if (businessCard) {
        const response = await fetch(businessCard);
        const blob = await response.blob();
        const storageRef = ref(storage, `business-cards/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        businessCardUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "expenses"), {
        user_id: user.uid,
        date,
        purpose,
        from_address: fromAddress,
        to_address: toAddress,
        company,
        name,
        contact_number: contactNumber,
        from_time: fromTime,
        to_time: toTime,
        duration: duration,
        distance: distNum,
        tripReport: tripReport,
        parking: parkingVal,
        toll: tollVal,
        mileage: mileage,
        cost: totalCost,
        business_card_url: businessCardUrl,
        approval_status: 0,
        createdAt: serverTimestamp(),
        type: 1,
      });

      Alert.alert("Success", "Expense entry submitted for approval.");
      setFromAddress("");
      setToAddress("");
      setDistance("0");
      setPurpose("");
      setCompany("");
      setName("");
      setContactNumber("");
      setDate(new Date().toISOString().split("T")[0]);
      setFromTime("");
      setToTime("");
      setParking("0.00");
      setToll("0.00");
      setTripReport("");
      setBusinessCard(null);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.mapWrapper}></View>

      <View style={styles.formContainer}>
        <Text style={styles.title}>Submit Travel Expense</Text>

        <Text style={styles.label}>From Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="From..."
          value={fromAddress}
          onChangeText={setFromAddress}
        />

        <Text style={styles.label}>To Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="To..."
          value={toAddress}
          onChangeText={setToAddress}
        />

        <Text style={styles.label}>Distance (km) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          value={distance}
          onChangeText={setDistance}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Purpose *</Text>
        <Picker
          selectedValue={purpose}
          onValueChange={(itemValue) => setPurpose(itemValue)}
          style={styles.picker}
        >
          {purposeList.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>

        <Text style={styles.label}>Company / Site</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. HQ Building"
          value={company}
          onChangeText={setCompany}
        />

        <Text style={styles.label}>Your Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Contact Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 012-3456789"
          value={contactNumber}
          onChangeText={(text) => setContactNumber(text.replace(/[^0-9]/g, ""))}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
        />

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>From Time</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM"
              value={fromTime}
              onChangeText={setFromTime}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>To Time</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM"
              value={toTime}
              onChangeText={setToTime}
            />
          </View>
        </View>

        <Text style={styles.label}>Trip Report</Text>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
          placeholder="Enter key outcomes or trip summary"
          value={tripReport}
          onChangeText={setTripReport}
          multiline
          numberOfLines={10}
        />

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Parking (RM)</Text>
            <TextInput
              style={styles.input}
              value={parking}
              onChangeText={setParking}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Toll (RM)</Text>
            <TextInput
              style={styles.input}
              value={toll}
              onChangeText={setToll}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.imageSection}>
          <TouchableOpacity
            style={styles.imagePicker}
            onPress={pickBusinessCard}
          >
            <Text style={styles.imagePickerText}>
              {businessCard ? "Change Business Card" : "Attach Business Card"}
            </Text>
          </TouchableOpacity>
          {businessCard && (
            <Image source={{ uri: businessCard }} style={styles.previewImage} />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingBottom: 40 },
  mapWrapper: { height: 250, width: "100%" },
  formContainer: { padding: 20 },
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
  picker: {
    height: 50,
    width: "100%",
    color: "#333",
  },
});
