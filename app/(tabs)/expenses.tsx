/* import MapDisplay from "@/components/MapDisplay"; */
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Dropdown } from "react-native-paper-dropdown";
import { db, storage } from "../../firebaseConfig";

interface Expense {
  id: string;
  distance: number;
  date?: string;
  trip_ids: string[];
  from_address: string;
  to_address: string;
  purpose: string;
  from_time?: string;
  to_time?: string;
  duration?: string;
  company: string;
  name: string;
  trip_report?: string;
  contact_number: string;
  parking: number;
  toll: number;
  mileage: number;
  cost: number;
  user_id: string;
  user_name?: string;
  business_card_url?: string;
  route_image_url?: string;
  approval_status: number;
  created_att: any;
}

interface Trip {
  id: string;
  user_id: string;
  distance: number;
  toll?: number;
  mileage?: number;
  date?: any;
  from_address: string;
  to_address: string;
  from_time?: string;
  to_time?: string;
  remark: string;
  route_image_url?: string;
  to_home: boolean;
  created_at: any;
}

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [appliedStartDate, setAppliedStartDate] = useState<string>("");
  const [appliedEndDate, setAppliedEndDate] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Expense>>({});
  const [mileageRate, setMileageRate] = useState<number>(0.8);
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const [showPurposeDropDown, setShowPurposeDropDown] = useState(false);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [tempPoints, setTempPoints] = useState<(any | null)[]>([null, null]);
  const [tempPolyline, setTempPolyline] = useState<string | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [filterSearch, setFilterSearch] = useState<string>("");

  const router = useRouter();
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const editInputARef = useRef<any>(null);
  const editInputBRef = useRef<any>(null);

  const purposeList = [
    { label: "Application support", value: "Application support" },
    {
      label: "Attending seminar/training",
      value: "Attending seminar/training",
    },
    {
      label: "Breakfast/Lunch/Dinner meeting",
      value: "Breakfast/Lunch/Dinner meeting",
    },
    { label: "Documents submission", value: "Documents submission" },
    {
      label: "Documents submission with meeting",
      value: "Documents submission with meeting",
    },
    { label: "Door knocking", value: "Door knocking" },
    { label: "Goods delivery", value: "Goods delivery" },
    {
      label: "Initial meeting and introduction",
      value: "Initial meeting and introduction",
    },
    { label: "Meeting and follow-up", value: "Meeting and follow-up" },
    { label: "Presentation", value: "Presentation" },
    { label: "Product demonstration", value: "Product demonstration" },
    { label: "Service and support", value: "Service and support" },
    { label: "Site inspection", value: "Site inspection" },
    { label: "Site survey", value: "Site survey" },
    { label: "Site visitation", value: "Site visitation" },
    { label: "Tea break meeting", value: "Tea break meeting" },
    { label: "Tender submission", value: "Tender submission" },
    {
      label: "Tender submission with meeting",
      value: "Tender submission with meeting",
    },
    {
      label: "Training and commissioning",
      value: "Training and commissioning",
    },
  ];

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
      setExpenses([]);
      return;
    }
    const q = query(
      collection(db, "expenses"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = [];
      querySnapshot.forEach((doc) => {
        expensesData.push({ id: doc.id, ...doc.data() } as Expense);
      });
      setExpenses(expensesData);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "trips"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData: Trip[] = [];
      snapshot.forEach((doc) => {
        tripsData.push({ id: doc.id, ...doc.data() } as Trip);
      });
      setAllTrips(tripsData);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "config", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.mileage_rate) {
          setMileageRate(data.mileage_rate);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const getTripById = (tripId: string): Trip | undefined => {
    return allTrips.find((trip) => trip.id === tripId);
  };

  const handleApplyFilter = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setFilterStatus(null);
    setFilterSearch("");
  };

  const activeFilterCount = [
    appliedStartDate || appliedEndDate,
    filterStatus !== null,
    filterSearch.trim() !== "",
  ].filter(Boolean).length;

  const filteredExpenses = expenses.filter((e) => {
    // Date range filter
    if (appliedStartDate || appliedEndDate) {
      if (!e.date) return false;
      if (appliedStartDate && e.date < appliedStartDate) return false;
      if (appliedEndDate && e.date > appliedEndDate) return false;
    }

    // Status filter
    if (filterStatus !== null && e.approval_status !== filterStatus)
      return false;

    // Search filter: match name, company, or purpose
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      const matchName = (e.name || "").toLowerCase().includes(q);
      const matchCompany = (e.company || "").toLowerCase().includes(q);
      const matchPurpose = (e.purpose || "").toLowerCase().includes(q);
      if (!matchName && !matchCompany && !matchPurpose) return false;
    }

    return true;
  });

  const handleDelete = async (id: string) => {
    const performDelete = async () => {
      try {
        await deleteDoc(doc(db, "expenses", id));
      } catch (error) {
        console.error("Error deleting expense:", error);
        Alert.alert("Error", "Could not delete the expense.");
      }
    };
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: performDelete },
      ],
    );
  };

  const handleEdit = async (expense: Expense) => {
    setEditingId(expense.id);
    setEditFormData({ ...expense });
    setTempPolyline(null);
    setTempPoints([null, null]);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      let routeImageUrl = editFormData.route_image_url || "";
      const docRef = doc(db, "expenses", editingId);

      const mileage = editFormData.mileage || 0;
      const parking = editFormData.parking || 0;
      const toll = editFormData.toll || 0;
      const updatedCost = mileage + parking + toll;

      let updatedDuration = editFormData.duration;
      if (editFormData.from_time && editFormData.to_time) {
        const [h1, m1] = editFormData.from_time.split(":").map(Number);
        const [h2, m2] = editFormData.to_time.split(":").map(Number);
        const totalMinutes = h2 * 60 + m2 - (h1 * 60 + m1);
        if (totalMinutes > 0) {
          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          updatedDuration = `${hours}h ${mins}m`;
        }
      }

      if (tempPolyline && tempPoints[0] && tempPoints[1]) {
        try {
          const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x400&path=enc:${tempPolyline}&markers=color:red|label:A|${tempPoints[0].lat},${tempPoints[0].lng}&markers=color:blue|label:B|${tempPoints[1].lat},${tempPoints[1].lng}&key=${apiKey}`;
          const response = await fetch(staticMapUrl);
          if (response.ok) {
            const blob = await response.blob();
            const routeRef = ref(storage, `route-images/${Date.now()}.png`);
            const uploadResult = await uploadBytes(routeRef, blob);
            routeImageUrl = await getDownloadURL(uploadResult.ref);
          }
        } catch (mapErr) {
          console.error("Failed to update route image:", mapErr);
        }
      }

      const updatedData = {
        ...editFormData,
        route_image_url: routeImageUrl,
        cost: updatedCost,
        duration: updatedDuration,
      };
      await updateDoc(docRef, updatedData);

      setEditingId(null);
      setEditFormData({});
    } catch (error) {
      console.error("Error updating expense:", error);
      Alert.alert("Error", "Failed to update expense.");
    }
  };

  const handleStatus = async (id: string, status: number) => {
    try {
      const docRef = doc(db, "expenses", id);
      await updateDoc(docRef, { approval_status: status });
    } catch (error) {
      console.error("Error approving expense:", error);
    }
  };

  const format12Hour = (timeStr?: string) => {
    if (!timeStr) return "";
    const [hours24, minutes] = timeStr.split(":").map(Number);
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    const hoursStr = hours12.toString().padStart(2, "0");
    const minutesStr = minutes.toString().padStart(2, "0");
    return `${hoursStr}:${minutesStr} ${period}`;
  };

  const renderFilterPanel = () => (
    <View style={filterStyles.panel}>
      {/* Search */}
      {/* <View style={filterStyles.row}>
        <Text style={filterStyles.label}>🔍 Search</Text>
        <TextInput
          style={filterStyles.searchInput}
          placeholder="Name, company, or purpose…"
          placeholderTextColor="#aaa"
          value={filterSearch}
          onChangeText={setFilterSearch}
        />
      </View> */}

      {/* Date Range */}
      <View style={filterStyles.row}>
        <Text style={filterStyles.label}>Date Range</Text>
        <View style={filterStyles.dateRow}>
          <TextInput
            style={[filterStyles.dateInput, { marginRight: 8 }]}
            placeholder="From (YYYY-MM-DD)"
            placeholderTextColor="#aaa"
            value={startDate}
            onChangeText={setStartDate}
          />
          <TextInput
            style={filterStyles.dateInput}
            placeholder="To (YYYY-MM-DD)"
            placeholderTextColor="#aaa"
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>
      </View>

      {/* Status Filter */}
      {/* <View style={filterStyles.row}>
        <Text style={filterStyles.label}>📋 Status</Text>
        <View style={filterStyles.statusRow}>
          {[
            { label: "All", value: null },
            { label: "Pending", value: 0 },
            { label: "Approved", value: 1 },
            { label: "Rejected", value: 2 },
          ].map((opt) => (
            <TouchableOpacity
              key={String(opt.value)}
              style={[
                filterStyles.statusChip,
                filterStatus === opt.value && filterStyles.statusChipActive,
              ]}
              onPress={() => setFilterStatus(opt.value)}
            >
              <Text
                style={[
                  filterStyles.statusChipText,
                  filterStatus === opt.value &&
                    filterStyles.statusChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View> */}

      {/* Action Buttons */}
      <View style={filterStyles.actionRow}>
        <TouchableOpacity
          style={filterStyles.applyBtn}
          onPress={handleApplyFilter}
        >
          <Text style={filterStyles.applyBtnText}>Apply Filter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={filterStyles.clearBtn}
          onPress={handleClearFilter}
        >
          <Text style={filterStyles.clearBtnText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Active filter summary */}
      {(appliedStartDate ||
        appliedEndDate ||
        filterStatus !== null ||
        filterSearch.trim()) && (
        <View style={filterStyles.summaryRow}>
          <Text style={filterStyles.summaryText}>
            Showing {filteredExpenses.length} of {expenses.length} expenses
          </Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: Expense }) => {
    const isExpanded = expandedId === item.id;
    const isEditing = editingId === item.id;

    const statusColor =
      item.approval_status === 1
        ? "#4CAF50"
        : item.approval_status === 2
          ? "#F44336"
          : "#FF9800";
    const statusLabel =
      item.approval_status === 1
        ? "Approved"
        : item.approval_status === 2
          ? "Rejected"
          : "Pending";

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (isEditing) return;
          setExpandedId(isExpanded ? null : item.id);
        }}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.name} numberOfLines={1}>
            {item.purpose}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "transparent",
              gap: 8,
            }}
          >
            {/* <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor + "22" },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View> */}
            <Text style={styles.cost}>RM {item.cost.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.companyText} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.date}>{item.date || "N/A"}</Text>
        </View>
        <View style={[styles.cardFooter, { marginTop: 2 }]}>
          <Text
            style={[styles.companyText, { fontSize: 13 }]}
            numberOfLines={1}
          >
            {item.company}
          </Text>
          {item.from_time && item.to_time && (
            <Text style={[styles.date, { fontSize: 13 }]}>
              {format12Hour(item.from_time)} - {format12Hour(item.to_time)}
            </Text>
          )}
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.separator} />

            <View style={styles.section}>
              <Text style={styles.descriptionLabel}>Submitted By:</Text>
              <Text style={styles.descriptionText}>
                {item.user_name || "N/A"}
              </Text>
            </View>

            <View style={styles.section}>
              {item.trip_ids && item.trip_ids.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.descriptionLabel}>Trips:</Text>
                  {item.trip_ids.map((tripId) => {
                    const trip = getTripById(tripId);
                    return trip ? (
                      <View key={tripId} style={styles.tripItem}>
                        <Text style={styles.descriptionText}>
                          {trip.from_address} → {trip.to_address} (
                          {trip.distance?.toFixed(2)} km)
                        </Text>
                        <Text style={styles.tripRemark}>{trip.remark}</Text>
                      </View>
                    ) : (
                      <Text key={tripId} style={styles.descriptionText}>
                        Trip data not available
                      </Text>
                    );
                  })}
                </View>
              )}

              <Text style={styles.descriptionLabel}>Date:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormData.date}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, date: text })
                  }
                  placeholder="YYYY-MM-DD"
                  onStartShouldSetResponder={() => true}
                  onTouchStart={(e) => e.stopPropagation()}
                />
              ) : (
                <Text style={styles.descriptionText}>{item.date || "N/A"}</Text>
              )}

              <Text style={styles.descriptionLabel}>Purpose:</Text>
              {isEditing ? (
                <Dropdown
                  label={"Purpose"}
                  mode={"outlined"}
                  visible={showPurposeDropDown}
                  showDropDown={() => setShowPurposeDropDown(true)}
                  onDismiss={() => setShowPurposeDropDown(false)}
                  value={editFormData.purpose}
                  setValue={(val) =>
                    setEditFormData({ ...editFormData, purpose: val })
                  }
                  list={purposeList}
                />
              ) : (
                <Text style={styles.descriptionText}>{item.purpose}</Text>
              )}

              <Text style={styles.descriptionLabel}>Time and Duration:</Text>
              {isEditing ? (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    backgroundColor: "transparent",
                  }}
                >
                  <TextInput
                    style={[styles.inlineInput, { flex: 1 }]}
                    value={editFormData.from_time}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, from_time: text })
                    }
                    placeholder="Start (e.g. 09:00)"
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                  <TextInput
                    style={[styles.inlineInput, { flex: 1 }]}
                    value={editFormData.to_time}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, to_time: text })
                    }
                    placeholder="End (e.g. 17:00)"
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                </View>
              ) : (
                item.from_time &&
                item.to_time && (
                  <Text style={styles.descriptionText}>
                    {format12Hour(item.from_time)} -{" "}
                    {format12Hour(item.to_time)} ({item.duration})
                  </Text>
                )
              )}

              <Text style={styles.descriptionLabel}>Trip Summary:</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.inlineInput, { minHeight: 60 }]}
                  value={editFormData.trip_report}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, trip_report: text })
                  }
                  multiline
                  placeholder="Trip Summary"
                  onStartShouldSetResponder={() => true}
                  onTouchStart={(e) => e.stopPropagation()}
                />
              ) : (
                <Text style={styles.descriptionText}>
                  {item.trip_report || "N/A"}
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.descriptionLabel}>Company/Site:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormData.company}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, company: text })
                  }
                  placeholder="Company/Site"
                  onStartShouldSetResponder={() => true}
                  onTouchStart={(e) => e.stopPropagation()}
                />
              ) : (
                <Text style={styles.descriptionText}>
                  {item.company || "N/A"}
                </Text>
              )}
              <Text style={styles.descriptionLabel}>Name:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormData.name}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, name: text })
                  }
                  placeholder="Name"
                  onStartShouldSetResponder={() => true}
                  onTouchStart={(e) => e.stopPropagation()}
                />
              ) : (
                <Text style={styles.descriptionText}>{item.name || "N/A"}</Text>
              )}

              <Text style={styles.descriptionLabel}>Contact Number:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormData.contact_number}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, contact_number: text })
                  }
                  keyboardType="phone-pad"
                  placeholder="Contact Number"
                  onStartShouldSetResponder={() => true}
                  onTouchStart={(e) => e.stopPropagation()}
                />
              ) : (
                <Text style={styles.descriptionText}>
                  {item.contact_number || "N/A"}
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mileage:</Text>
                <Text style={styles.detailValue}>
                  RM {item.mileage.toFixed(2)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Toll:</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.inlineInput,
                      { width: 100, marginBottom: 0 },
                    ]}
                    value={editFormData.toll?.toString()}
                    onChangeText={(text) =>
                      setEditFormData((prev) => {
                        const toll = parseFloat(text) || 0;
                        return {
                          ...prev,
                          toll,
                          cost:
                            (prev.mileage || 0) + (prev.parking || 0) + toll,
                        };
                      })
                    }
                    keyboardType="numeric"
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                ) : (
                  <Text style={styles.detailValue}>
                    RM {item.toll.toFixed(2)}
                  </Text>
                )}
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Parking:</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.inlineInput,
                      { width: 100, marginBottom: 0 },
                    ]}
                    value={editFormData.parking?.toString()}
                    onChangeText={(text) =>
                      setEditFormData((prev) => {
                        const parking = parseFloat(text) || 0;
                        return {
                          ...prev,
                          parking,
                          cost:
                            (prev.mileage || 0) + parking + (prev.toll || 0),
                        };
                      })
                    }
                    keyboardType="numeric"
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                ) : (
                  <Text style={styles.detailValue}>
                    RM {item.parking.toFixed(2)}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.detailRow,
                  {
                    marginTop: 4,
                    borderTopWidth: 1,
                    borderTopColor: "#eee",
                    paddingTop: 4,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.detailLabel,
                    { fontWeight: "bold", color: "#333" },
                  ]}
                >
                  Total Cost:
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    { fontWeight: "bold", color: "#2196F3" },
                  ]}
                >
                  RM{" "}
                  {isEditing
                    ? (
                        (editFormData.mileage || 0) +
                        (editFormData.parking || 0) +
                        (editFormData.toll || 0)
                      ).toFixed(2)
                    : item.cost.toFixed(2)}
                </Text>
              </View>
            </View>

            {item.trip_ids && item.trip_ids.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Trip Route Maps:</Text>
                {item.trip_ids.map((tripId) => {
                  const trip = getTripById(tripId);
                  if (!trip || !trip.route_image_url) return null;
                  return (
                    <TouchableOpacity
                      key={tripId}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedImage(trip.route_image_url || null);
                      }}
                    >
                      <Image
                        source={{ uri: trip.route_image_url }}
                        style={styles.businessCardImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {item.business_card_url && (
              <>
                <Text style={styles.sectionHeader}>Business Card</Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedImage(item.business_card_url || null);
                  }}
                >
                  <Image
                    source={{ uri: item.business_card_url }}
                    style={styles.businessCardImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </>
            )}

            {/* {item.approval_status === 0 && (
              <View style={styles.actionButtonsContainer}>
                {isEditing ? (
                  <>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleSaveEdit();
                      }}
                    >
                      <Text style={styles.approveButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                    >
                      <Text style={styles.rejectButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleEdit(item);
                    }}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )} */}

            {role === 0 && item.approval_status === 0 && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleStatus(item.id, 1);
                  }}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleStatus(item.id, 2);
                  }}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredExpenses}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <View
            style={[
              styles.reportSummaryCard,
              { padding: isDashboardVisible ? 16 : 12 },
            ]}
          >
            {/* Toggle bar */}
            <TouchableOpacity
              onPress={() => setIsDashboardVisible(!isDashboardVisible)}
              style={filterStyles.toggleBar}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "transparent",
                }}
              >
                {/* <Text style={filterStyles.toggleIcon}>⚙️</Text> */}
                <Text style={filterStyles.toggleLabel}>Filter Expenses</Text>
                {activeFilterCount > 0 && (
                  <View style={filterStyles.badge}>
                    <Text style={filterStyles.badgeText}>
                      {activeFilterCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={filterStyles.toggleChevron}>
                {isDashboardVisible ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {isDashboardVisible && renderFilterPanel()}
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses found.</Text>
        }
      />
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
  );
}

const filterStyles = StyleSheet.create({
  toggleBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  toggleIcon: { fontSize: 16 },
  toggleLabel: { fontSize: 14, fontWeight: "bold", color: "#fff" },
  toggleChevron: { fontSize: 12, color: "#fff", opacity: 0.8 },
  badge: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: { fontSize: 11, fontWeight: "bold", color: "#2196F3" },
  panel: {
    marginTop: 14,
    backgroundColor: "transparent",
    gap: 12,
  },
  row: { backgroundColor: "transparent" },
  label: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#e3f2fd",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  searchInput: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  dateRow: {
    flexDirection: "row",
    backgroundColor: "transparent",
  },
  dateInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "transparent",
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  statusChipActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  statusChipTextActive: {
    color: "#2196F3",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "transparent",
    marginTop: 4,
  },
  applyBtn: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  applyBtnText: {
    color: "#2196F3",
    fontWeight: "bold",
    fontSize: 14,
  },
  clearBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  clearBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  summaryRow: {
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  summaryText: {
    color: "#e3f2fd",
    fontSize: 12,
    fontStyle: "italic",
  },
});

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
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  cost: { fontSize: 16, fontWeight: "bold", color: "#2196F3" },
  statusText: { fontSize: 14, fontWeight: "bold" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  expandedContent: { marginTop: 12, backgroundColor: "transparent" },
  separator: { height: 1, backgroundColor: "#eee", marginBottom: 12 },
  descriptionLabel: { fontSize: 12, color: "#999", fontWeight: "bold" },
  descriptionText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 4,
  },
  businessCardImage: {
    width: "100%",
    height: 200,
    marginTop: 4,
    borderRadius: 4,
    backgroundColor: "#f9f9f9",
  },
  date: { fontSize: 14, color: "#999" },
  companyText: { fontSize: 14, color: "#666", flex: 1, marginRight: 8 },
  section: { marginBottom: 16 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2196F3",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
    backgroundColor: "transparent",
  },
  detailLabel: { fontSize: 14, color: "#777" },
  detailValue: { fontSize: 14, color: "#333" },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  fullImage: { width: "100%", height: "100%" },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  closeButtonText: { color: "white", fontWeight: "bold" },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
    backgroundColor: "transparent",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "transparent",
    gap: 8,
  },
  editButton: {
    backgroundColor: "#FF9800",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    flex: 1,
  },
  editButtonText: { color: "#fff", fontWeight: "bold" },
  deleteButton: {
    backgroundColor: "#F44336",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    flex: 1,
  },
  deleteButtonText: { color: "#fff", fontWeight: "bold" },
  approveButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  approveButtonText: { color: "#fff", fontWeight: "bold" },
  rejectButton: {
    backgroundColor: "#F44336",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    flex: 1,
  },
  rejectButtonText: { color: "#fff", fontWeight: "bold" },
  reportSummaryCard: {
    backgroundColor: "#2196F3",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  reportSummaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  reportSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    marginBottom: 15,
  },
  reportSummaryItem: { backgroundColor: "transparent" },
  reportSummaryLabel: { fontSize: 12, color: "#e3f2fd", marginBottom: 4 },
  reportSummaryValue: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  exportButton: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  filterInput: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 6,
    fontSize: 13,
  },
  inlineInput: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  webTableContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  webTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#ddd",
  },
  webTableHeaderCell: { fontWeight: "bold", color: "#666", fontSize: 14 },
  exportButtonText: { color: "#2196F3", fontWeight: "bold", fontSize: 14 },
});
