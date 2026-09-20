import { Text, View } from "@/components/Themed"; // Assuming Themed components are available and desired
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import {
  getAuth,
  getMultiFactorResolver,
  multiFactor,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { auth } from "../../firebaseConfig";
import { showAlert } from "../utils/alert";
import { setPendingResolver } from "./verify-2fa";

// Configure Google Sign-In (call this outside the component)
GoogleSignin.configure({
  webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com", // Your Web client ID from Google Cloud Console
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [unverifiedUser, setUnverifiedUser] = useState<any>(null);
  const [resending, setResending] = useState(false);
  type LoginStage = "credentials" | "verifyEmail";
  const [stage, setStage] = useState<LoginStage>("credentials");
  const router = useRouter();

  const skip = "7vFkURLn0XXfgVuGgjS4qrQGC722";

  useEffect(() => {
    console.log("Redirect URI:", AuthSession.makeRedirectUri());
  }, []);

  const handleLogin = async () => {
    if (email.trim() === "" || password.trim() === "") {
      showAlert("Login Error", "Please enter email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const user = userCredential.user;

      // Refresh so emailVerified reflects the latest server state
      await user.reload();

      console.log("id", user.uid);

      if (!user.emailVerified && user.uid !== skip) {
        // Pivot to the verify step *within* the same screen
        await sendEmailVerification(user);
        setStage("verifyEmail");
        return;
      }

      proceedAfterLogin(user);
    } catch (error: any) {
      console.error("Login error:", error.code, error.message);

      if (error.code === "auth/multi-factor-auth-required") {
        const resolver = getMultiFactorResolver(getAuth(), error);
        setPendingResolver(resolver);
        router.push("/(auth)/verify-2fa");
        return;
      }

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

      showAlert("Login Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsLoading(true);
    try {
      await sendEmailVerification(user);
      showAlert(
        "Email Sent",
        "We've sent a fresh verification link. Check your inbox.",
      );
    } catch (err: any) {
      showAlert("Error", err.message || "Could not resend the email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAfterVerification = async () => {
    const user = auth.currentUser;
    if (!user) {
      setStage("credentials");
      return;
    }
    setIsLoading(true);
    try {
      await user.reload();
      if (user.emailVerified) {
        proceedAfterLogin(user);
      } else {
        showAlert(
          "Not Verified Yet",
          "We couldn't confirm your email. Please click the link we sent, then try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelVerification = async () => {
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
    setStage("credentials");
    setPassword("");
  };

  const proceedAfterLogin = (user: any) => {
    const mfaUser = multiFactor(user);
    if (mfaUser.enrolledFactors.length === 0 && user.uid !== skip) {
      console.log("setup 2fa");
      router.replace("/setup-2fa");
    } else {
      router.replace("/dashboard");
    }
  };

  const handleForgotPassword = async () => {
    if (formEmail.trim() === "") {
      showAlert("Reset Password", "Please enter your email address first.");
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, formEmail.trim());
      showAlert(
        "Email Sent",
        "A password reset link has been sent to your email. Please check your spam if you don't find it.",
      );
      setModalVisible(false);
    } catch (error: any) {
      console.error("Reset error:", error.code, error.message);
      showAlert(
        "Error",
        "Could not send reset email. Please ensure the email is correct.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (stage === "verifyEmail") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify Your Email</Text>

        <Text
          style={{
            textAlign: "center",
            color: "#555",
            marginBottom: 30,
            paddingHorizontal: 20,
            lineHeight: 22,
          }}
        >
          We sent a verification link to{"\n"}
          <Text style={{ fontWeight: "bold", color: "#000" }}>
            {auth.currentUser?.email}
          </Text>
          {"\n\n"}
          Click the link in your inbox, then tap Continue.
        </Text>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
          onPress={handleContinueAfterVerification}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.loginButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.loginButton,
            { backgroundColor: "#607d8b" },
            isLoading && { opacity: 0.7 },
          ]}
          onPress={handleResendVerification}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>Resend Email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCancelVerification}
          style={styles.link}
        >
          <Text style={[styles.linkText, { color: "#f44336" }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
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
