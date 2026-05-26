import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

function PlacesInput({
  placeholder,
  onPlaceSelected,
  value,
}: {
  placeholder: string;
  onPlaceSelected: (
    address: string,
    location: { lat: number; lng: number },
  ) => void;
  value: string;
}) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchPredictions = async (text: string) => {
    if (text.length < 2) return setPredictions([]);
    try {
      const res = await fetch(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_KEY,
          },
          body: JSON.stringify({
            input: text,
            languageCode: "en",
          }),
        },
      );
      const data = await res.json();
      console.log("RESPONSE:", JSON.stringify(data));
      setPredictions(data.suggestions || []);
    } catch (e) {
      console.log("ERROR:", e);
    }
  };

  const handleChange = (text: string) => {
    setQuery(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchPredictions(text), 350);
  };

  const handleSelect = async (item: any) => {
    const placeId = item.placePrediction.placeId;
    const description = item.placePrediction.text.text;
    setQuery(description);
    setPredictions([]);

    // Fetch coordinates
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            "X-Goog-Api-Key": GOOGLE_KEY,
            "X-Goog-FieldMask": "location,displayName,formattedAddress",
          },
        },
      );
      const data = await res.json();
      console.log("PLACE DETAILS:", JSON.stringify(data));
      if (data.location) {
        onPlaceSelected(description, {
          lat: data.location.latitude,
          lng: data.location.longitude,
        });
      }
    } catch (e) {
      console.log("DETAILS ERROR:", e);
    }
  };

  return (
    <View
      style={[{ position: "relative", zIndex: isDropdownOpen ? 10000 : 1 }]}
    >
      <TextInput
        placeholder={placeholder}
        value={query}
        onChangeText={handleChange}
        placeholderTextColor="#999"
        style={styles.input}
        onFocus={() => setIsDropdownOpen(true)}
        onBlur={() => {
          // Delay to allow selection
          setTimeout(() => setIsDropdownOpen(false), 200);
        }}
      />
      {predictions.length > 0 && (
        <FlatList
          data={predictions}
          keyExtractor={(item: any) => item.placePrediction.placeId}
          style={[
            styles.list,
            {
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              maxHeight: 200,
              zIndex: 1000,
              elevation: 1000,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.mainText}>
                {item.placePrediction.structuredFormat.mainText.text}
              </Text>
              <Text style={styles.secondaryText}>
                {item.placePrediction.structuredFormat.secondaryText?.text}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  list: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
  },
  row: { padding: 13, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  mainText: { fontSize: 14, color: "#111", fontWeight: "500" },
  secondaryText: { fontSize: 12, color: "#888", marginTop: 2 },
});

export default PlacesInput;
