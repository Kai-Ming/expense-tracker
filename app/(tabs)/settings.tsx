import PlacesInput from "@/components/PlacesInput";
import { Text, View } from "@/components/Themed";
import {
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import {
  collection,
  doc,
  GeoPoint,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { db } from "../../firebaseConfig";

export default function settings() {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<number>(1);

  const [password, setPassword] = useState("");

  // FIX 1: We keep track of BOTH the auth status ID and the physical Firestore document ID
  const [userId, setUserId] = useState<string | null>(null); // Auth user.uid
  const [firestoreDocId, setFirestoreDocId] = useState<string | null>(null); // Random Auto-ID (e.g. Jk8sD92nLmPq)

  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState<string>("");

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState<string>("");

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [mileageModalVisible, setMileageModalVisible] = useState(false);
  const [mileageRate, setMileageRate] = useState<string>("0.0");
  const [mobileMileageRate, setMobileMileageRate] = useState<string>("0.0");

  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [officeAddress, setOfficeAddress] = useState<string>("");
  const [officeCoord, setOfficeCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [distance, setDistance] = useState<string>("0.00");

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();

          setUsername(userData.username);
          setEmail(userData.email);
          setRole(userData.role);

          // FIX 2: Save the actual Firestore document auto-generated key name
          setFirestoreDocId(userDoc.id);
        } else {
          console.log("Still no document found with that UID field");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) return;

    const unsubscribe = onSnapshot(
      doc(db, "config", "7HTZfcBtebPsm0zlZB3c"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.mileage_rate) setMileageRate(data.mileage_rate.toString());
          if (data.mileage_rate_mobile)
            setMobileMileageRate(data.mileage_rate_mobile.toString());
          if (data.arrival_distance)
            setDistance((data.arrival_distance * 1000).toString());
        }
      },
    );
    return () => unsubscribe();
  }, []);

  const changeUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    // FIX 3: Change check to verify we found the database document reference string
    if (!firestoreDocId) {
      Alert.alert(
        "Error",
        "User document record not found. Try logging in again.",
      );
      return;
    }

    setIsSaving(true);

    try {
      // FIX 4: Target the explicit firestore string document name, NOT the auth UID string
      const userDocRef = doc(db, "users", firestoreDocId);

      await updateDoc(userDocRef, {
        username: newUsername.trim(),
      });

      setUsername(newUsername.trim());
      Alert.alert("Success", "Username updated successfully!");
      setUsernameModalVisible(false);
      setNewUsername("");
    } catch (error) {
      console.error("Error updating username: ", error);
      Alert.alert("Error", "Failed to update username. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const changeEmail = async () => {
    if (!newEmail.trim() || !password) {
      Alert.alert("Error", "Please fill in both email and password.");
      return;
    }

    setIsSaving(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user && user.email) {
        // Re-authenticate
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);

        // Request email change
        await verifyBeforeUpdateEmail(user, newEmail.trim());

        // Update Firestore
        const userDocRef = doc(db, "users", firestoreDocId);
        await updateDoc(userDocRef, { email: newEmail.trim() });

        Alert.alert("Success", "Verification email sent to " + newEmail);
        setEmailModalVisible(false);
        setPassword(""); // Clear password
        setNewEmail("");
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }

    setIsSaving(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user && user.email) {
        // 1. Re-authenticate
        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword,
        );
        await reauthenticateWithCredential(user, credential);

        // 2. Update Password
        await updatePassword(user, newPassword);

        Alert.alert("Success", "Password updated successfully!");
        setPasswordModalVisible(false);

        // Reset fields
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateMileageRate = async () => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) {
      console.error("No Config ID found in environment variables");
      return;
    }

    setIsSaving(true);

    const docRef = doc(db, "config", configId);
    try {
      await updateDoc(docRef, {
        mileage_rate: parseFloat(mileageRate),
        mileage_rate_mobile: parseFloat(mobileMileageRate),
      });
      Alert.alert("Success", "Mileage rate updated successfully!");
      setMileageModalVisible(false);
    } catch (error) {
      console.error("Error updating document:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateOfficeAddress = async () => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY; // Your Google API Key

    if (!configId) {
      console.error("No Config ID found in environment variables");
      return;
    }

    if (!apiKey) {
      console.error("Google Maps API Key is missing");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Encode the address string to make it URL-safe
      const encodedAddress = encodeURIComponent(officeAddress);
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

      // 2. Call the Google Geocoding API
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      // 3. Check if Google successfully found the address
      if (data.status !== "OK" || !data.results.length) {
        Alert.alert("Error", `Geocoding failed: ${data.status}`);
        return;
      }

      // 4. Extract latitude and longitude
      const { lat, lng } = data.results[0].geometry.location;

      console.log("Coordinates found:", lat, lng);

      // 5. Update Firebase with the address AND coordinates
      /* const docRef = doc(db, "config", configId);
      await updateDoc(docRef, {
        office_address: officeAddress,
        office_location: {
          latitude: lat,
          longitude: lng,
        },
      }); */

      const docRef = doc(db, "config", configId);
      await updateDoc(docRef, {
        office_coordinates: new GeoPoint(lat, lng), // <--- Creates native Firestore GeoPoint
      });

      Alert.alert(
        "Success",
        "Office address and coordinates updated successfully!",
      );
      setAddressModalVisible(false);
    } catch (error) {
      console.error("Error updating document or fetching coordinates:", error);
      alert("An error occurred while updating the address.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateArrivalDistance = async () => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) {
      console.error("No Config ID found in environment variables");
      return;
    }

    setIsSaving(true);
    const docRef = doc(db, "config", configId);
    try {
      console.log(distance);
      await updateDoc(docRef, {
        arrival_distance: parseFloat(distance) / 1000,
      });
      Alert.alert("Success", "Arrival distance updated successfully!");
      setDistanceModalVisible(false);
    } catch (error) {
      console.error("Error updating document:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Username:{" "}
        <Text style={styles.details}>{username || "Fetching username..."}</Text>
      </Text>
      <Text style={styles.label}>
        Email:{" "}
        <Text style={styles.details}>{email || "Fetching email..."}</Text>
      </Text>
      <TouchableOpacity
        onPress={() => setUsernameModalVisible(true)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Change Username</Text>
      </TouchableOpacity>
      <Modal
        animationType="fade"
        transparent={true}
        visible={usernameModalVisible}
        statusBarTranslucent={true}
        onRequestClose={() => !isSaving && setUsernameModalVisible(false)}
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
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalView}>
                <Text style={styles.modalTitle}>Change Username</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>New username:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter New Username"
                    placeholderTextColor="#999999"
                    value={newUsername}
                    onChangeText={setNewUsername}
                    editable={!isSaving}
                    keyboardType="default"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={() => setUsernameModalVisible(false)}
                    disabled={isSaving}
                  >
                    <Text style={styles.textStyle}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dialogButton,
                      styles.submitButton,
                      isSaving && { opacity: 0.7 },
                    ]}
                    onPress={changeUsername}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.textStyle}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* Change Email */}
      {/* <TouchableOpacity
        onPress={() => setEmailModalVisible(true)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Change Email</Text>
      </TouchableOpacity>
      <Modal
        animationType="fade"
        transparent={true}
        visible={emailModalVisible}
        statusBarTranslucent={true}
        onRequestClose={() => !isSaving && setEmailModalVisible(false)}
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
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalView}>
                <Text style={styles.modalTitle}>Change Email</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>New email:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter New Email"
                    placeholderTextColor="#999999"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    editable={!isSaving}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>Current Password:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Password to Confirm"
                    placeholderTextColor="#999999"
                    value={password}
                    onChangeText={setPassword}
                    editable={!isSaving}
                    secureTextEntry={true} // Hides the password
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={() => {
                      setEmailModalVisible(false);
                      setPassword(""); // Clear password on cancel
                    }}
                    disabled={isSaving}
                  >
                    <Text style={styles.textStyle}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dialogButton, styles.submitButton, isSaving && { opacity: 0.7 }]}
                    onPress={changeEmail}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.textStyle}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal> */}
      <TouchableOpacity
        onPress={() => setPasswordModalVisible(true)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Change Password</Text>
      </TouchableOpacity>
      <Modal
        animationType="fade"
        transparent={true}
        visible={passwordModalVisible}
        statusBarTranslucent={true}
        onRequestClose={() => !isSaving && setPasswordModalVisible(false)}
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
                <Text style={styles.modalTitle}>Change Password</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>Current Password:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Current Password"
                    placeholderTextColor="#999999"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    editable={!isSaving}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>New Password:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor="#999999"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    editable={!isSaving}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>
                    Confirm New Password:
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#999999"
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    secureTextEntry
                    editable={!isSaving}
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={() => {
                      setPasswordModalVisible(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                    }}
                    disabled={isSaving}
                  >
                    <Text style={styles.textStyle}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dialogButton,
                      styles.submitButton,
                      isSaving && { opacity: 0.7 },
                    ]}
                    onPress={changePassword}
                    disabled={isSaving}
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
      {role === 0 && (
        <>
          <TouchableOpacity
            onPress={() => setMileageModalVisible(true)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Change Mileage</Text>
          </TouchableOpacity>

          <Modal
            animationType="fade"
            transparent={true}
            visible={mileageModalVisible}
            statusBarTranslucent={true}
            onRequestClose={() => !isSaving && setMileageModalVisible(false)}
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
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Change Mileage</Text>

                    <View style={styles.formGroup}>
                      <Text style={styles.modalSubtitle}>Web Mileage:</Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999999"
                        value={mileageRate}
                        onChangeText={setMileageRate}
                        editable={!isSaving}
                        keyboardType="decimal-pad"
                      />

                      <Text style={styles.modalSubtitle}>Mobile Mileage:</Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999999"
                        value={mobileMileageRate}
                        onChangeText={setMobileMileageRate}
                        editable={!isSaving}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.dialogButton, styles.cancelButton]}
                        onPress={() => setMileageModalVisible(false)}
                        disabled={isSaving}
                      >
                        <Text style={styles.textStyle}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.dialogButton,
                          styles.submitButton,
                          isSaving && { opacity: 0.7 },
                        ]}
                        onPress={updateMileageRate}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.textStyle}>Submit</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        </>
      )}
      {role === 0 && (
        <>
          <TouchableOpacity
            onPress={() => setAddressModalVisible(true)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Change Office Address</Text>
          </TouchableOpacity>
          <Modal
            animationType="fade"
            transparent={true}
            visible={addressModalVisible}
            statusBarTranslucent={true}
            onRequestClose={() => !isSaving && setAddressModalVisible(false)}
          >
            <View style={styles.screenOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardContainer}
              >
                <ScrollView
                  style={[styles.modalScrollWrapper, { overflow: "visible" }]}
                  contentContainerStyle={[
                    styles.modalScrollContent,
                    { overflow: "visible" },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Change Office Address</Text>

                    <View style={styles.formGroup}>
                      <Text style={styles.modalSubtitle}>Office Address:</Text>
                      <View style={{ width: "100%" }}>
                        <PlacesInput
                          value={officeAddress}
                          placeholder="Search office..."
                          onPlaceSelected={(address, location) => {
                            setOfficeAddress(address);
                          }}
                        />
                      </View>
                    </View>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.dialogButton, styles.cancelButton]}
                        onPress={() => setAddressModalVisible(false)}
                        disabled={isSaving}
                      >
                        <Text style={styles.textStyle}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.dialogButton,
                          styles.submitButton,
                          isSaving && { opacity: 0.7 },
                        ]}
                        onPress={updateOfficeAddress}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.textStyle}>Submit</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        </>
      )}
      {role === 0 && (
        <>
          <TouchableOpacity
            onPress={() => setDistanceModalVisible(true)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Change Arrival Distance</Text>
          </TouchableOpacity>
          <Modal
            animationType="fade"
            transparent={true}
            visible={distanceModalVisible}
            statusBarTranslucent={true}
            onRequestClose={() => !isSaving && setDistanceModalVisible(false)}
          >
            <View style={styles.screenOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardContainer}
              >
                <ScrollView
                  style={[styles.modalScrollWrapper, { overflow: "visible" }]}
                  contentContainerStyle={[
                    styles.modalScrollContent,
                    { overflow: "visible" },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>
                      Change Arrival Distance
                    </Text>

                    <View style={styles.formGroup}>
                      <Text style={styles.modalSubtitle}>
                        Arrival Distance (m):
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999999"
                        value={distance}
                        onChangeText={setDistance}
                        editable={!isSaving}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.dialogButton, styles.cancelButton]}
                        onPress={() => setDistanceModalVisible(false)}
                        disabled={isSaving}
                      >
                        <Text style={styles.textStyle}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.dialogButton,
                          styles.submitButton,
                          isSaving && { opacity: 0.7 },
                        ]}
                        onPress={updateArrivalDistance}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.textStyle}>Submit</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  label: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 5,
    marginTop: 10,
  },
  details: {
    fontSize: 16,
    fontWeight: "normal",
    color: "#000",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    width: "100%",
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
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
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
  formGroup: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: "normal",
    marginBottom: 8,
    color: "#666",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  dialogButton: {
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    flex: 1,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#2196F3",
  },
  cancelButton: {
    backgroundColor: "#f44336",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
  },
});
