import InfoModal from "@/components/InfoModal";
import { useRouter } from "expo-router";
import {
  getAuth,
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
} from "firebase/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

export default function Setup2FA() {
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"loading" | "scan" | "verify">("loading");
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  // Step 1: Generate secret on mount
  React.useEffect(() => {
    (async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error("Not signed in");

        const mfaUser = multiFactor(user);
        const session = await mfaUser.getSession();
        const secret = await TotpMultiFactorGenerator.generateSecret(session);

        setTotpSecret(secret);
        setOtpauthUrl(
          secret.generateQrCodeUrl(user.email || user.uid, "YourAppName"),
        );
        setStep("scan");
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Could not start 2FA setup.");
        router.back();
      }
    })();
  }, []);

  // Step 2: Verify the code and enroll
  const handleEnroll = async () => {
    if (!totpSecret) return;
    if (!/^\d{6}$/.test(code)) {
      Alert.alert("Error", "Enter the 6-digit code from your app.");
      return;
    }

    setSaving(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in");

      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecret,
        code,
      );

      await multiFactor(user).enroll(assertion, "Authenticator App");

      /* Alert.alert("Success", "Two-factor authentication is now enabled.", [
        { text: "OK", onPress: () => router.back() },
      ]); */
      setShowConfirm(true);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Invalid Code", "The code didn't match. Please try again.");
      setCode("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Set Up Two-Factor Authentication</Text>

      {step === "loading" && <ActivityIndicator size="large" />}

      {step === "scan" && (
        <>
          <Text style={styles.subtitle}>
            Scan this QR code with Google Authenticator, Authy, or Microsoft
            Authenticator.
          </Text>
          <View style={styles.qrContainer}>
            {otpauthUrl ? <QRCode value={otpauthUrl} size={220} /> : null}
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setStep("verify")}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </>
      )}

      {step === "verify" && (
        <>
          <Text style={styles.subtitle}>
            Enter the 6-digit code shown in your authenticator app.
          </Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.codeInput}
            placeholder="000000"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.button, saving && { opacity: 0.6 }]}
            onPress={handleEnroll}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify & Enable</Text>
            )}
          </TouchableOpacity>

          <InfoModal
            visible={showConfirm}
            title="Success"
            content="Two-factor authentication is now enabled."
            onConfirm={() => {
              setShowConfirm(false);
              router.replace("/(tabs)");
            }}
            onRequestClose={() => setShowConfirm(false)}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20,
    textAlign: "center",
  },
  qrContainer: {
    padding: 16,
    backgroundColor: "#fff",
    marginVertical: 20,
    elevation: 2,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 16,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: "center",
    width: "100%",
    marginVertical: 24,
  },
  button: {
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
