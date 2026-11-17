import { getAuth } from "firebase/auth";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../firebaseConfig"; // adjust path to match your setup

export interface Favourite {
  id: string;
  name: string;
  address: string;
  coords?: { lat: number; lng: number } | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (fav: Favourite) => void;
  title?: string;
}

export default function FavouritesPicker({
  visible,
  onClose,
  onSelect,
  title = "Select a Favourite",
}: Props) {
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!visible) {
      setSearch("");
      return;
    }

    let unsub: (() => void) | undefined;
    let cancelled = false;

    const start = async () => {
      setLoading(true);
      setError(null);

      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error("Not signed in");

        // Resolve the Firestore doc id for this auth user
        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error("User record not found");
        const docId = snap.docs[0].id;

        if (cancelled) return;

        const locationsRef = collection(
          db,
          "users",
          docId,
          "favourite_locations",
        );

        unsub = onSnapshot(
          locationsRef,
          (s) => {
            setFavourites(
              s.docs.map((d) => ({ id: d.id, ...d.data() })) as Favourite[],
            );
            setLoading(false);
          },
          (err) => {
            console.warn("favourite_locations listener failed:", err);
            setError("Could not load favourites.");
            setLoading(false);
          },
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Could not load favourites.");
          setLoading(false);
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [visible]);

  const filtered = search.trim()
    ? favourites.filter((f) => {
        const s = search.toLowerCase();
        return (
          (f.name || "").toLowerCase().includes(s) ||
          (f.address || "").toLowerCase().includes(s)
        );
      })
    : favourites;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      statusBarTranslucent={true}
      onRequestClose={onClose}
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
          >
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>{title}</Text>

              {loading ? (
                <ActivityIndicator
                  color="#2196F3"
                  size="small"
                  style={{ marginVertical: 24 }}
                />
              ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : favourites.length === 0 ? (
                <Text style={styles.emptyText}>
                  No favourites saved yet. Add some from Settings → Manage
                  Favourite Locations.
                </Text>
              ) : (
                <>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search name or address…"
                    placeholderTextColor="#999999"
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />

                  {filtered.length === 0 ? (
                    <Text style={styles.emptyText}>
                      No favourites match “{search}”.
                    </Text>
                  ) : (
                    filtered.map((fav) => (
                      <TouchableOpacity
                        key={fav.id}
                        style={styles.row}
                        onPress={() => onSelect(fav)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.rowName}>
                          {fav.name || "Unnamed"}
                        </Text>
                        <Text style={styles.rowAddress} numberOfLines={2}>
                          {fav.address || "No address"}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.dialogButton, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.textStyle}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    ...StyleSheet.absoluteFillObject,
  },
  keyboardContainer: { flex: 1, width: "100%" },
  modalScrollWrapper: { flex: 1, width: "100%" },
  modalScrollContent: {
    flexGrow: 1,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  searchInput: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#333",
    marginBottom: 10,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
    borderRadius: 6,
  },
  rowName: { color: "#333", fontSize: 16, fontWeight: "600", marginBottom: 2 },
  rowAddress: { color: "#666", fontSize: 13 },
  rowCoords: { color: "#999", fontSize: 11, marginTop: 2 },
  emptyText: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 24,
  },
  errorText: {
    color: "#f44336",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 24,
  },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  dialogButton: {
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    flex: 1,
    alignItems: "center",
  },
  cancelButton: { backgroundColor: "#f44336" },
  textStyle: { color: "white", fontWeight: "bold" },
});
