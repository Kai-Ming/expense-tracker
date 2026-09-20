import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: "Login" }} />
      <Stack.Screen name="signup" options={{ title: "Sign up" }} />
      <Stack.Screen
        name="verify-2fa"
        options={{ title: "Authenticate User" }}
      />
      <Stack.Screen
        name="setup-2fa"
        options={{ title: "Setup Authentication" }}
      />
    </Stack>
  );
}
