import { Text, View } from "@/components/Themed"; // Assuming Themed components are available and desired
import { useRouter } from "expo-router";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import React, { useState } from "react";
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
import Icon from "react-native-vector-icons/Ionicons";
import { auth } from "../firebaseConfig";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (email.trim() === "" || password.trim() === "") {
      Alert.alert("Login Error", "Please enter email and password.");
      return;
    }
    console.log("logging in");

    setIsLoading(true);
    try {
      //const auth = getAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error.code, error.message);
      let errorMessage = "An error occurred during login.";

      if (error.code === "auth/configuration-not-found") {
        errorMessage =
          "Firebase Auth is not configured. Please enable Email/Password provider in the Firebase Console.";
      } else if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        errorMessage =
          "Invalid email or password. Please check your credentials and try again.";
      }

      alert(`Login Failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (formEmail.trim() === "") {
      Alert.alert("Reset Password", "Please enter your email address first.");
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, formEmail.trim());
      Alert.alert(
        "Email Sent",
        "A password reset link has been sent to your email. Please check your spam if you don't find it.",
      );
      setModalVisible(false);
    } catch (error: any) {
      console.error("Reset error:", error.code, error.message);
      Alert.alert(
        "Error",
        "Could not send reset email. Please ensure the email is correct.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { width: "100%" }]}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Icon
            name={showPassword ? "eye" : "eye-off"}
            size={24}
            color="#888"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footerRow}>
        {/* <Link href="/signup" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Sign up</Text>
          </TouchableOpacity>
        </Link> */}

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.link}
        >
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          statusBarTranslucent={true}
          onRequestClose={() => !isLoading && setModalVisible(false)}
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
                  <Text style={styles.modalTitle}>Forgot Password</Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.modalSubtitle}>Email:</Text>
                    <TextInput
                      style={[styles.input, { width: "100%" }]}
                      placeholder="Enter Email"
                      placeholderTextColor="#999999"
                      value={formEmail}
                      onChangeText={setFormEmail}
                      keyboardType="email-address"
                      editable={!isLoading}
                    />
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.dialogButton, styles.cancelButton]}
                      onPress={() => setModalVisible(false)}
                      disabled={isLoading}
                    >
                      <Text style={styles.textStyle}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.dialogButton,
                        styles.submitButton,
                        isLoading && { opacity: 0.7 },
                      ]}
                      onPress={handleForgotPassword}
                      disabled={isLoading}
                    >
                      {isLoading ? (
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
      </View>
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
