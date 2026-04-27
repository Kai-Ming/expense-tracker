import React, { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface PlacesAutocompleteProps {
  apiKey: string;
  onPlaceSelected: (details: PlaceDetails) => void;
  placeholder?: string;
  language?: string;
  /** Restrict results to specific country codes, e.g. ['my', 'sg'] */
  countries?: string[];
  /** Restrict results to specific place types, e.g. ['geocode', 'establishment'] */
  types?: string;
  /** Minimum characters before triggering search */
  minLength?: number;
  /** Debounce delay in ms */
  debounceDelay?: number;
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay],
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlacesAutocomplete({
  apiKey,
  onPlaceSelected,
  placeholder = "Search places...",
  language = "en",
  countries = [],
  types = "geocode",
  minLength = 3,
  debounceDelay = 350,
}: PlacesAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // ── Autocomplete fetch ───────────────────────────────────────────────────

  const fetchPredictions = useCallback(
    async (text: string) => {
      if (text.length < minLength) {
        setPredictions([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          input: text,
          key: apiKey,
          language,
          types,
        });

        if (countries.length > 0) {
          // Each country restriction must be added separately
          countries.forEach((c) => params.append("components", `country:${c}`));
        }

        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "OK") {
          setPredictions(data.predictions);
        } else if (data.status === "ZERO_RESULTS") {
          setPredictions([]);
        } else {
          console.warn("Places API error:", data.status, data.error_message);
          setPredictions([]);
        }
      } catch (err) {
        console.error("Failed to fetch predictions:", err);
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, language, countries, types, minLength],
  );

  const debouncedFetch = useDebounce(fetchPredictions, debounceDelay);

  // ── Place details fetch ──────────────────────────────────────────────────

  const fetchPlaceDetails = useCallback(
    async (placeId: string) => {
      setFetchingDetails(true);
      try {
        const params = new URLSearchParams({
          place_id: placeId,
          key: apiKey,
          language,
          fields: "place_id,name,formatted_address,geometry",
        });

        const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "OK") {
          return data.result as PlaceDetails;
        }
        console.warn("Place Details error:", data.status);
        return null;
      } catch (err) {
        console.error("Failed to fetch place details:", err);
        return null;
      } finally {
        setFetchingDetails(false);
      }
    },
    [apiKey, language],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (text.length === 0) {
      setPredictions([]);
    } else {
      debouncedFetch(text);
    }
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    Keyboard.dismiss();
    setQuery(prediction.description);
    setPredictions([]);

    const details = await fetchPlaceDetails(prediction.place_id);
    if (details) {
      onPlaceSelected(details);
    }
  };

  const handleClear = () => {
    setQuery("");
    setPredictions([]);
    inputRef.current?.focus();
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderPrediction = ({ item }: { item: PlacePrediction }) => (
    <TouchableOpacity
      style={styles.predictionItem}
      onPress={() => handleSelectPrediction(item)}
      activeOpacity={0.7}
    >
      <View style={styles.pinIconWrapper}>
        <Text style={styles.pinIcon}>📍</Text>
      </View>
      <View style={styles.predictionText}>
        <Text style={styles.mainText} numberOfLines={1}>
          {item.structured_formatting.main_text}
        </Text>
        <Text style={styles.secondaryText} numberOfLines={1}>
          {item.structured_formatting.secondary_text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const showDropdown = isFocused && (predictions.length > 0 || loading);

  return (
    <View style={styles.container}>
      {/* Input row */}
      <View
        style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Small delay so taps on predictions register first
            setTimeout(() => setIsFocused(false), 150);
          }}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never" // We handle this ourselves
        />
        {fetchingDetails && (
          <ActivityIndicator
            size="small"
            color="#4F8EF7"
            style={styles.spinner}
          />
        )}
        {!fetchingDetails && query.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
            <Text style={styles.clearIcon}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Dropdown */}
      {showDropdown && (
        <View style={styles.dropdown}>
          {loading && predictions.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#4F8EF7" />
              <Text style={styles.loadingText}>Searching…</Text>
            </View>
          ) : (
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.place_id}
              renderItem={renderPrediction}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              // Cap the visible height so it doesn't overflow the screen
              style={{ maxHeight: 280 }}
            />
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: "100%",
    zIndex: 999, // needed on Android for dropdown overlay
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 52,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  inputWrapperFocused: {
    borderColor: "#4F8EF7",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.14,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 0, // remove default Android padding
  },
  spinner: {
    marginLeft: 8,
  },
  clearBtn: {
    marginLeft: 8,
    padding: 2,
  },
  clearIcon: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  dropdown: {
    position: "absolute",
    top: 58, // inputWrapper height + gap
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  predictionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pinIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  pinIcon: {
    fontSize: 15,
  },
  predictionText: {
    flex: 1,
  },
  mainText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  secondaryText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 58,
  },
});
