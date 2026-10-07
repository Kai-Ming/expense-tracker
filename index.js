// index.js
import { Platform } from "react-native";

if (Platform.OS !== "web") {
  require("./tasks/tripTask");
}

require("expo-router/entry");
