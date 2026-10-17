import { Text, View } from "@/components/Themed";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { db, functions } from "../firebaseConfig";

export default function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getUserUidByEmail = async (email: string) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert("User not found");
      return null;
    }
    return snapshot.docs[0].id;
  };

  const checkUserExists = httpsCallable<{ email: string }, { exists: boolean }>(
    functions,
    "checkUserExists",
  );

  const handleSubmit = async () => {
    if (!email) {
      // Individual validation checks
      alert("Please add an email.");
      console.log("Email is missing");
      return;
    }

    // If all validations pass
    console.log("All validations passed");

    try {
      setIsLoading(true);
      const { data } = await checkUserExists({ email: email });
      if (!data.exists) {
        alert("No account found for that email.");
        return;
      }

      await addDoc(collection(db, "delete_requests"), {
        email: email,
        created_at: serverTimestamp(),
      });
      resetForm();
      alert("Request submitted successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save request.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delete Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.loginButtonText}>Request Delete Account</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 30, color: "#000" },
  input: {
    width: "80%",
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 8,
    marginBottom: 15,
    color: "#000",
  },
  loginButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
  link: { marginTop: 20 },
  linkText: { color: "#2196F3", fontSize: 14 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between", // Pushes them to opposite sides
    alignItems: "center",
    width: "80%", // Matches your input and button width
    marginTop: 20,
  },
  forgotPasswordLinkContainer: {
    width: "80%",
    marginBottom: 20,
    marginTop: 20,
  },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    width: "80%",
  },
  forgotPasswordText: {
    color: "#2196F3",
    fontSize: 14,
    textAlign: "right",
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
  passwordContainer: {
    position: "relative",
    width: "80%",
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 2,
  },
});
