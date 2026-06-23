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
  disabled = false,
}: {
  placeholder: string;
  onPlaceSelected: (
    address: string,
    location: { lat: number; lng: number },
  ) => void;
  value: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (disabled) {
      setIsDropdownOpen(false);
      setPredictions([]);
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

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
      setPredictions(data.suggestions || []);
    } catch (e) {
      console.log("ERROR:", e);
    }
  };

  const handleChange = (text: string) => {
    if (disabled) return;
    setQuery(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchPredictions(text), 350);
  };

  const handleSelect = async (item: any) => {
    if (disabled) return;
    const placeId = item.placePrediction.placeId;
    const description = item.placePrediction.text.text;
    setQuery(description);
    setPredictions([]);

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
        style={[styles.input, disabled && styles.disabledInput]}
        onFocus={() => {
          if (!disabled) setIsDropdownOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setIsDropdownOpen(false), 200);
        }}
        editable={!disabled}
        pointerEvents={disabled ? "none" : "auto"}
      />
      {!disabled && isDropdownOpen && predictions.length > 0 && (
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
          // --- ADDED: List Header containing your 2 elements ---
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <TouchableOpacity
                style={styles.headerItem}
                onPress={() => console.log("Header Item 1 pressed")}
              >
                <Text style={styles.headerText}>📍 Use Current Location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerItem}
                onPress={() => console.log("Header Item 2 pressed")}
              >
                <Text style={styles.headerText}>⭐ Saved Places</Text>
              </TouchableOpacity>
            </View>
          }
          // ----------------------------------------------------

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
  disabledInput: {
    backgroundColor: "#f0f0f0",
    color: "#999",
    borderColor: "#ddd",
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

  // --- ADDED: Styles for the top items ---
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fcfcfc",
  },
  headerItem: {
    padding: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  headerText: {
    fontSize: 14,
    color: "#007AFF", // iOS blue styling example
    fontWeight: "600",
  },
});

export default PlacesInput;
