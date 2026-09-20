import { useRouter } from "expo-router";
import { MultiFactorResolver, TotpMultiFactorGenerator } from "firebase/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Module-level store — the resolver can't be passed through route params
export let pendingResolver: MultiFactorResolver | null = null;
export const setPendingResolver = (r: MultiFactorResolver | null) => {
  pendingResolver = r;
};

export default function Verify2FA() {
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert("Error", "Enter the 6-digit code.");
      return;
    }
    if (!pendingResolver) {
      Alert.alert("Session expired", "Please sign in again.");
      router.replace("/(auth)/login");
      return;
    }

    setSaving(true);
    try {
      const totpHint = pendingResolver.hints.find(
        (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID,
      );
      if (!totpHint) throw new Error("No TOTP factor enrolled");

      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        totpHint.uid,
        code,
      );

      await pendingResolver.resolveSignIn(assertion);
      setPendingResolver(null);
      router.replace("/(tabs)");
    } catch (err) {
      console.error(err);
      Alert.alert("Invalid Code", "The code is incorrect or expired.");
      setCode("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Two-Factor Authentication</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code from your authenticator app.
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
        onPress={handleVerify}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
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
  codeInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 16,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
