import { Alert, Platform } from "react-native";

export const showAlert = (title: string, message?: string) => {
  if (Platform.OS === "web") {
    // window.alert only takes one string on web
    alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
) => {
  if (Platform.OS === "web") {
    const ok = window.confirm(`${title}\n\n${message}`);
    if (ok) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: cancelLabel, style: "cancel" },
      { text: confirmLabel, onPress: onConfirm },
    ]);
  }
};
