import React, { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

// We define these as null/empty so the code doesn't crash
// if you pass them as children from another file.
export const Marker = () => null;
export const Polyline = () => null;
export const PROVIDER_GOOGLE = "google";

const MapComponent = forwardRef((props: any, ref: any) => {
  return (
    <View style={[styles.placeholder, props.styles?.map]}>
      <Text style={styles.text}>Map not supported on Web</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  text: { color: "#666" },
});

export default MapComponent;
