import { db } from "@/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Trip {
  id: string;
  user_id: string;
  distance: number;
  toll?: number;
  mileage?: number;
  date?: any;
  from_address: string;
  to_address: string;
  from_time?: Timestamp;
  to_time?: Timestamp;
  remark: string;
  route_image_url?: string;
  to_home: boolean;
  platform: number; // 1 - Mobile, 2 - Web
  created_at: any;
}

export default function TripScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [role, setRole] = useState<number | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        }
      } else {
        setUserId(null);
        setRole(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      setTrips([]);
      return;
    }
    const q = query(
      collection(db, "trips"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tripsData: Trip[] = [];
      querySnapshot.forEach((doc) => {
        tripsData.push({ id: doc.id, ...doc.data() } as Trip);
      });
      setTrips(tripsData);
    });
    return () => unsubscribe();
  }, [userId]);

  // Helper function to safely format the auto-generated server timestamp or string date
  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    if (dateValue.seconds) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString("en-MY");
    }
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString("en-MY");
    }
    return String(dateValue);
  };

  const handleDelete = async (id: string) => {
    console.log("delete");
    console.log(id);
    const performDelete = async () => {
      try {
        await deleteDoc(doc(db, "trips", id));
      } catch (error) {
        console.error("Error deleting trip:", error);
        if (Platform.OS === "web") {
          window.alert("Error deleting trip. Please try again.");
        } else {
          Alert.alert("Error", "Could not delete the trip.");
        }
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this expense?")) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete Expense",
        "Are you sure you want to delete this expense?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: performDelete },
        ],
      );
    }
  };

  const renderItem = ({ item }: { item: Trip }) => {
    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setExpandedId(isExpanded ? null : item.id);
        }}
        style={styles.card}
      >
        {/* Card Main View */}
        <View style={styles.cardHeader}>
          <View style={styles.cardLocation}>
            <Text style={styles.addressText}>
              {item.platform === 2 ? "Web" : "Mobile"}
            </Text>
            <Text style={styles.addressText} numberOfLines={1}>
              📍 {item.from_address}
            </Text>
            <Text style={styles.addressText} numberOfLines={1}>
              🏁 {item.to_address}
            </Text>
            <Text style={styles.dateText}>
              {formatDate(item.date || item.created_at)}
            </Text>
          </View>
          {/* <View style={styles.rightMetrics}>
            <Text style={styles.distanceValue}>{item.distance} km</Text>
            {item.total && (
              <Text style={styles.costText}>RM {item.total.toFixed(2)}</Text>
            )}
          </View> */}
        </View>

        {/* Expanded Details Section */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.separator} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Toll:</Text>
              <Text style={styles.detailValue}>
                RM {item.toll ? Number(item.toll).toFixed(2) : "0.00"}
              </Text>
            </View>

            {item.mileage !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mileage:</Text>
                <Text style={styles.detailValue}>
                  RM {item.mileage ? Number(item.mileage).toFixed(2) : "0.00"}
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.descriptionLabel}>Remark:</Text>
              <Text style={styles.descriptionText}>{item.remark || "N/A"}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.descriptionLabel}>From:</Text>
              <Text style={styles.descriptionText}>
                {item.from_address || "N/A"}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.descriptionLabel}>To:</Text>
              <Text style={styles.descriptionText}>
                {item.to_address || "N/A"}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.descriptionLabel}>From Time:</Text>
              <Text style={styles.descriptionText}>
                {item.from_time && typeof item.from_time.toDate === "function"
                  ? item.from_time.toDate().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.descriptionLabel}>To Time:</Text>
              <Text style={styles.descriptionText}>
                {item.to_time && typeof item.to_time.toDate === "function"
                  ? item.to_time.toDate().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })
                  : "N/A"}
              </Text>
            </View>

            <Text style={styles.descriptionLabel}>Route Map:</Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setSelectedImage(item.route_image_url || null);
              }}
            >
              <Image
                source={{ uri: item.route_image_url }}
                style={styles.image}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
            <Modal
              visible={!!selectedImage}
              transparent={true}
              onRequestClose={() => setSelectedImage(null)}
              animationType="fade"
            >
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setSelectedImage(null)}
              >
                <View style={styles.modalContent}>
                  {selectedImage && (
                    <Image
                      source={{ uri: selectedImage }}
                      style={styles.fullImage}
                      resizeMode="contain"
                    />
                  )}
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Text style={styles.closeButtonText}>Close Preview</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Modal>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  listContent: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "transparent",
  },
  cardLocation: {
    flexDirection: "column",
    flex: 1,
    marginRight: 16,
  },
  addressText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  rightMetrics: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
  costText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
    marginTop: 4,
  },
  expandedContent: { marginTop: 12, backgroundColor: "transparent" },
  separator: { height: 1, backgroundColor: "#eee", marginBottom: 12 },
  descriptionLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "bold",
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 4,
  },
  section: { marginBottom: 8 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    backgroundColor: "transparent",
  },
  detailLabel: { fontSize: 14, color: "#777" },
  detailValue: { fontSize: 14, color: "#333", fontWeight: "600" },

  image: {
    width: "100%",
    height: 200,
    marginTop: 4,
    borderRadius: 4,
    backgroundColor: "#f9f9f9",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "90%", height: "80%" },
  modalContent: {
    width: "90%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  closeButtonText: { color: "white", fontWeight: "bold" },
  deleteButton: {
    backgroundColor: "#F44336",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  deleteButtonText: { color: "#fff", fontWeight: "bold" },
});
