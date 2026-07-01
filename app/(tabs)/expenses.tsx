/* import MapDisplay from "@/components/MapDisplay"; */
import { Text, View } from "@/components/Themed";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
  Image,
  Modal,
  Pressable,
  ScrollView,
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
  purpose: string;
  from_time?: string;
  to_time?: string;
  duration?: string;
  company: string;
  name: string;
  trip_report?: string;
  contact_number: string;
  email: string;
  parking: number;
  toll: number;
  mileage: number;
  expense: number;
  expense_purpose: string;
  cost: number;
  user_id: string;
  user_name?: string;
  business_card_url?: string;
  route_image_url?: string;
  receipt_urls?: string[];
  approval_status: number;
  type: number;
  created_at: any;
}

interface GeneralExpense {
  id: string;
  distance: number;
  date?: string;
  expense_type: string;
  amount: number;
  company?: string;
  name?: string;
  contact_number?: string;
  user_id: string;
  user_name?: string;
  email?: string;
  expense_report?: string;
  type: number;
  approval_status: number;
  created_at: any;
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
  platform: number;
  created_at: any;
}

interface User {
  id: string;
  username: string;
  email: string;
  ess_no: string;
  department: string;
  grade: string;
  cost_center: string;
  role: number;
  active: boolean;
}

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [generalExpense, setGeneralExpense] = useState<GeneralExpense[]>([]);
  const [allTripIds, setAllTripIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [usernameFilter, setUsenameFilter] = useState<string>("");
  const [expenseType, setExpenseType] = useState<string>("All");
  const [expensePurpose, setExpensePurpose] = useState<string>("");
  const [appliedStartDate, setAppliedStartDate] = useState<string>("");
  const [appliedEndDate, setAppliedEndDate] = useState<string>("");
  const [appliedUsername, setAppliedUsername] = useState<string>("");
  const [appliedEssNo, setAppliedEssNo] = useState<string>("");
  const [appliedDepartment, setAppliedDepartment] = useState<string>("");
  const [appliedGrade, setAppliedGrade] = useState<string>("");
  const [appliedCostCenter, setAppliedCostCenter] = useState<string>("");
  const [appliedExpenseType, setAppliedExpenseType] = useState<string>("All");
  const [appliedExpensePurpose, setAppliedExpensePurpose] =
    useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Expense>>({});
  const [mileageRate, setMileageRate] = useState<number>(0.8);
  const [mileageRateOutstation, setMileageRateOutstation] =
    useState<number>(0.7);
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const [showPurposeDropDown, setShowPurposeDropDown] = useState(false);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [tempPoints, setTempPoints] = useState<(any | null)[]>([null, null]);
  const [tempPolyline, setTempPolyline] = useState<string | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [filterSearch, setFilterSearch] = useState<string>("");

  const [showUserModal, setShowUserModal] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [addedUsers, setAddedUsers] = useState<any[]>([]);

  const router = useRouter();
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const editInputARef = useRef<any>(null);
  const editInputBRef = useRef<any>(null);

  const expenseTypeMap = {
    "1": "Mileage",
    "2": "General",
    "3": "Outstation",
  };

  const mileageExpensePurpose = [
    { label: "Meal with customer", value: "Meal with customer" },
    { label: "Meal with supplier", value: "Meal with supplier" },
    { label: "Purchase of goods", value: "Purchase of goods" },
    { label: "Staff benefits", value: "Staff benefits" },
    { label: "Others", value: "Others" },
  ];

  const generalExpensePurpose = [
    { label: "Meal with customer", value: "Meal with customer", id: "1" },
    { label: "Meal with supplier", value: "Meal with supplier", id: "2" },
    { label: "Medical", value: "Medical", id: "3" },
    { label: "Purchase of goods", value: "Purchase of goods", id: "4" },
    { label: "Staff benefits", value: "Staff benefits", id: "5" },
    { label: "Others", value: "Others", id: "6" },
  ];

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
    if (!userId) return;
    // Wait until role is determined (not null)
    if (role === null) return;

    let q;
    if (role === 0) {
      // Admin: fetch all expenses (no user_id filter)
      q = query(collection(db, "expenses"), orderBy("created_at", "desc"));
    } else {
      // Regular user: fetch only their own expenses
      q = query(
        collection(db, "expenses"),
        where("user_id", "==", userId),
        orderBy("created_at", "desc"),
      );
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = [];
      const generalExpenseData: GeneralExpense[] = [];
      /* querySnapshot.forEach((doc) =>
        expensesData.push({ id: doc.id, ...doc.data() } as Expense),
      ); */
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 1) {
          expensesData.push({ id: doc.id, ...data } as Expense);
        } else if (data.type === 2) {
          generalExpenseData.push({ id: doc.id, ...data } as GeneralExpense);
        }
      });
      setExpenses(expensesData);
      const allTripIds = expensesData.flatMap((item) => item.trip_ids);
      setAllTripIds([...new Set(allTripIds)]);

      setGeneralExpense(generalExpenseData);
    });

    return () => unsubscribe();
  }, [userId, role]);

  useEffect(() => {
    if (role !== 0) return;
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData: User[] = [];
      snapshot.forEach((doc) => {
        userData.push({ id: doc.id, ...doc.data() } as User);
      });
      setAllUsers(userData);
    });
    return () => unsubscribe();
  }, [role]);

  /* useEffect(() => {
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
  }, [userId]); */

  useEffect(() => {
    if (!userId) return;
    // Wait until role is determined (not null)
    if (role === null) return;

    const q = query(collection(db, "trips"), orderBy("created_at", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tripData: Trip[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tripData.push({ id: doc.id, ...data } as Trip);
      });
      setAllTrips(tripData);
    });

    return () => unsubscribe();
  }, [userId, role]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "config", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.mileage_rate) {
          setMileageRate(data.mileage_rate);
        }
        if (data.mileage_rate_outstation) {
          setMileageRateOutstation(data.mileage_rate_outstation);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const getTripById = (tripId: string): Trip | undefined => {
    return allTrips.find((trip) => trip.id === tripId);
  };

  const test = () => {
    //console.log(allTrips);
    const tripIds = allTrips.map((trip) => trip.id);
    console.log(tripIds);
  };

  const handleApplyFilter = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedExpenseType(expenseType);
    setAppliedExpensePurpose(expensePurpose);
    setAppliedUsername(usernameFilter);
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setFilterStatus(null);
    setFilterSearch("");
    setExpensePurpose("");
    setAppliedExpensePurpose("");
    setExpenseType("");
    setAppliedExpenseType("");
    setAppliedUsername("");
    setAppliedCostCenter("");
    setAppliedEssNo("");
    setAppliedDepartment("");
    setAppliedGrade("");
    setUsenameFilter("");
  };

  const updateUserFilter = async (username: string) => {
    if (username === "") return;
    const q = query(collection(db, "users"), where("username", "==", username));

    const querySnapshot = await getDocs(q);

    // Check if anything was found
    if (querySnapshot.empty) {
      console.log("No matching user found.");
      return null;
    }

    // Pull out exactly ONE document
    const docSnapshot = querySnapshot.docs[0];
    const user = docSnapshot.data();
    setAppliedEssNo(user.ess_no);
    setAppliedDepartment(user.department);
    setAppliedCostCenter(user.cost_center);
    setAppliedGrade(user.grade);
  };

  const activeFilterCount = [
    appliedStartDate || appliedEndDate,
    filterStatus !== null,
    filterSearch.trim() !== "",
  ].filter(Boolean).length;

  const filteredExpenses = expenses.filter((e) => {
    if (appliedExpenseType == "General") return false;
    if (
      !e.date ||
      (!appliedStartDate &&
        !appliedEndDate &&
        !usernameFilter &&
        (expenseType != "Mileage" || !appliedExpensePurpose))
    )
      return true;
    return (
      !(appliedStartDate && e.date < appliedStartDate) &&
      !(appliedEndDate && e.date > appliedEndDate) &&
      !(appliedUsername && e.user_name != appliedUsername) &&
      !(appliedExpensePurpose && e.expense_purpose != appliedExpensePurpose)
    );
  });

  const filteredGeneralExpense = generalExpense.filter((e) => {
    if (appliedExpenseType == "Mileage") return false;
    if (
      !e.date ||
      (!appliedStartDate &&
        !appliedEndDate &&
        !usernameFilter &&
        (expenseType != "General" || !appliedExpensePurpose))
    )
      return true;
    return (
      !(appliedStartDate && e.date < appliedStartDate) &&
      !(appliedEndDate && e.date > appliedEndDate) &&
      !(appliedUsername && e.user_name != appliedUsername) &&
      !(appliedExpensePurpose && e.expense_type != appliedExpensePurpose)
    );
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

  const renderSelectUserModal = () => {
    return (
      <Modal
        visible={showUserModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlayUser}
          activeOpacity={1}
          onPress={() => setShowUserModal(false)}
        >
          <View style={styles.userModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a User</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            {/* <ScrollView style={styles.modalList}>
                {allUsers.map((user) => {
                  const isAdded = addedUsers.some(
                    (added) => added.id === user.id,
                  );
  
                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[
                        styles.modalUserItem,
                        isAdded && styles.disabledUserItem,
                      ]}
                      onPress={() => {
                        if (isAdded) return;
                        setUsenameFilter(user.username);
                        setShowUserModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.userInfoText,
                          isAdded && styles.disabledText,
                        ]}
                      >
                        <Text style={styles.boldLabel}>Username: </Text>
                        {user.username}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView> */}

            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={{ flex: 1.5, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Username</Text>
                </View>
                <View style={{ flex: 2, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Email</Text>
                </View>
                <View style={{ flex: 1.5, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Department</Text>
                </View>
                <View style={{ flex: 1.5, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Grade</Text>
                </View>
                <View style={{ flex: 1.5, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Cost Center</Text>
                </View>
              </View>

              {/* Table Body */}
              <ScrollView style={styles.modalList}>
                {allUsers.map((user) => {
                  const isAdded = addedUsers.some(
                    (added) => added.id === user.id,
                  );

                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[
                        styles.tableRow,
                        isAdded && styles.disabledUserItem,
                      ]}
                      disabled={isAdded}
                      onPress={() => {
                        if (isAdded) return;
                        setUsenameFilter(user.username);
                        setShowUserModal(false);
                      }}
                    >
                      {/* Username */}
                      <View style={{ flex: 1.5 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {user.username}
                        </Text>
                      </View>

                      {/* Email */}
                      <View style={{ flex: 2 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {user.email}
                        </Text>
                      </View>

                      {/* Department */}
                      <View style={{ flex: 1.5 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {user.department}
                        </Text>
                      </View>

                      {/* Grade */}
                      <View style={{ flex: 1.5 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {user.grade}
                        </Text>
                      </View>

                      {/* Cost Center */}
                      <View style={{ flex: 1.5 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {user.cost_center}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
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
      <View style={filterStyles.row}>
        <View
          style={{
            flex: 1,
            marginRight: 12,
            backgroundColor: "transparent",
          }}
        >
          <Text style={filterStyles.label}>Expense Type</Text>
          <View style={styles.inputContainer}>
            <Picker
              selectedValue={expenseType}
              onValueChange={(itemValue) => setExpenseType(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              mode="dropdown"
            >
              <Picker.Item label="All" value="All" />
              <Picker.Item label="Mileage Expense" value="Mileage" />
              <Picker.Item label="General Expense" value="General" />
            </Picker>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            marginRight: 12,
            backgroundColor: "transparent",
          }}
        >
          <Text style={[filterStyles.label, { marginTop: 10 }]}>
            Expense Purpose
          </Text>
          <View style={styles.inputContainer}>
            <Picker
              selectedValue={expensePurpose}
              onValueChange={(itemValue) => setExpensePurpose(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              mode="dropdown"
              enabled={expenseType !== "All"}
            >
              <Picker.Item label="Select a purpose..." value="" />

              {expenseType === "Mileage"
                ? mileageExpensePurpose.map((p) => (
                    <Picker.Item
                      key={p.value}
                      label={p.label}
                      value={p.value}
                    />
                  ))
                : generalExpensePurpose.map((p) => (
                    <Picker.Item
                      key={p.value}
                      label={p.label}
                      value={p.value}
                    />
                  ))}
            </Picker>
          </View>
          {/* <select
            value={expensePurpose}
            onChange={(e) => setExpensePurpose(e.target.value)}
            style={inputBase}
            disabled={expenseType === "All"}
          >
            <option value="" disabled>
              Select a purpose...
            </option>

            {expenseType === "Mileage"
              ? mileageExpensePurpose.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))
              : generalExpensePurpose.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
          </select> */}
        </View>

        {role === 0 && (
          <View
            style={{
              flex: 1,
              marginRight: 12,
              backgroundColor: "transparent",
            }}
          >
            <Text style={[filterStyles.label, { marginTop: 10 }]}>User</Text>
            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={styles.customPicker}
                onPress={() => {
                  console.log("aa");
                  setShowUserModal(true);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.customPickerText,
                    !usernameFilter && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {usernameFilter || "Select a user..."}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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

      {renderSelectUserModal()}

      {/* Action Buttons */}
      <View style={filterStyles.actionRow}>
        <TouchableOpacity
          style={filterStyles.applyBtn}
          onPress={() => {
            handleApplyFilter();
            test();
          }}
        >
          <Text style={filterStyles.applyBtnText}>Apply</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={filterStyles.clearBtn}
          onPress={handleClearFilter}
        >
          <Text style={filterStyles.clearBtnText}>Reset</Text>
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

  const renderMileage = ({ item }: { item: Expense }) => {
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
            {expenseTypeMap[String(item.type) as keyof typeof expenseTypeMap]}
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
            {item.user_name || "N/A"}
          </Text>
          {/* {item.from_time && item.to_time && (
            <Text style={[styles.date, { fontSize: 13 }]}>
              {format12Hour(item.from_time)} - {format12Hour(item.to_time)}
            </Text>
          )} */}
        </View>
        <View style={[styles.cardFooter, { marginTop: 2 }]}>
          <Text
            style={[styles.companyText, { fontSize: 13 }]}
            numberOfLines={1}
          >
            {item.purpose}
          </Text>
          <Text style={styles.date}>{item.date || "N/A"}</Text>
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
              <Text style={styles.descriptionLabel}>Company:</Text>
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

              <Text style={styles.descriptionLabel}>Time:</Text>
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

              <Text style={styles.descriptionLabel}>Trip Report:</Text>
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
              {item.trip_ids && item.trip_ids.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.descriptionLabel}>Trips:</Text>
                  {item.trip_ids.map((tripId) => {
                    const trip = getTripById(tripId);
                    return trip ? (
                      <View key={tripId} style={styles.tripItem}>
                        <Text style={styles.descriptionText}>
                          {trip.platform === 1 ? "Web" : "Mobile"}
                        </Text>
                        <Text style={styles.tripDetail}>
                          <Text style={styles.boldText}>Remark: </Text>
                          {trip.remark}
                        </Text>
                        <Text style={styles.tripDetail}>
                          <Text style={styles.boldText}>Trip: </Text>
                          {trip.from_address} → {trip.to_address} (
                          {trip.distance?.toFixed(2)} km)
                        </Text>
                        <Text style={styles.tripDetail}>
                          <Text style={styles.boldText}>Going Home: </Text>
                          {trip.to_home === true ? "True" : "False"}
                        </Text>
                      </View>
                    ) : (
                      <Text key={tripId} style={styles.descriptionText}>
                        Trip data not available {tripId}
                      </Text>
                    );
                  })}
                </View>
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
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expense:</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.inlineInput,
                      { width: 100, marginBottom: 0 },
                    ]}
                    value={editFormData.parking?.toString()}
                    onChangeText={(text) =>
                      setEditFormData((prev) => {
                        const expense = parseFloat(text) || 0;
                        return {
                          ...prev,
                          expense,
                          cost:
                            (prev.mileage || 0) + expense + (prev.toll || 0),
                        };
                      })
                    }
                    keyboardType="numeric"
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                ) : (
                  <Text style={styles.detailValue}>
                    RM {item.expense.toFixed(2)}
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

            {/* {item.trip_ids && item.trip_ids.length > 0 && (
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
            )} */}

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

            {/* {role === 0 && item.approval_status === 0 && (
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
            )} */}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderGeneral = ({ item }: { item: GeneralExpense }) => {
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
            {expenseTypeMap[String(item.type) as keyof typeof expenseTypeMap]}
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
            <Text style={styles.cost}>
              RM{" "}
              {typeof item.amount === "number"
                ? item.amount.toFixed(2)
                : item.amount}
            </Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.companyText} numberOfLines={1}>
            {item.user_name || "N/A"}
          </Text>
        </View>
        <View style={[styles.cardFooter, { marginTop: 2 }]}>
          <Text
            style={[styles.companyText, { fontSize: 13 }]}
            numberOfLines={1}
          >
            {item.expense_type}
          </Text>
          <Text style={styles.date}>{item.date || "N/A"}</Text>
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
              <Text style={styles.descriptionLabel}>Company:</Text>
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
              <Text style={styles.descriptionLabel}>Customer Name:</Text>
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
              <Text style={styles.descriptionLabel}>Email:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormData.contact_number}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, email: text })
                  }
                  keyboardType="email-address"
                  placeholder="Email"
                  onStartShouldSetResponder={() => true}
                  onTouchStart={(e) => e.stopPropagation()}
                />
              ) : (
                <Text style={styles.descriptionText}>
                  {item.email || "N/A"}
                </Text>
              )}
            </View>

            <View style={styles.section}>
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
                  {typeof item.amount === "number"
                    ? item.amount.toFixed(2)
                    : item.amount}
                </Text>
              </View>
            </View>

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

            {/* {role === 0 && item.approval_status === 0 && (
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
            )} */}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* <FlatList
        data={filteredExpenses}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <View
            style={[
              styles.reportSummaryCard,
              { padding: isDashboardVisible ? 16 : 12 },
            ]}
          >
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
      /> */}
      <ScrollView
        style={{
          borderRightWidth: 1,
          borderRightColor: "#e0e0e0",
          backgroundColor: "#fafafa",
        }}
      >
        <View style={{ padding: 16 }}>
          <View
            style={[
              styles.reportSummaryCard,
              { padding: isDashboardVisible ? 16 : 12 },
            ]}
          >
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
          {filteredExpenses.map((item) => (
            <View>{renderMileage({ item })}</View>
          ))}
          {filteredGeneralExpense.map((item) => (
            <View>{renderGeneral({ item })}</View>
          ))}
        </View>
      </ScrollView>
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
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 6,
    flex: 1,
    height: 40,
    justifyContent: "center",
    borderWidth: 0,
  },
  picker: {
    width: "100%",
    color: "#000",
    fontSize: 14,
  },
  pickerItem: {
    fontSize: 14,
    height: 40,
  },
  customPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 40,
    width: "100%",
    backgroundColor: "transparent",
  },
  customPickerText: {
    fontSize: 14,
    color: "#000",
    flex: 1,
  },
  customPickerIcon: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  placeholderText: {
    color: "#000",
  },
  tableHeader: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#ccc",
    backgroundColor: "#f5f5f5",
    paddingRight: 12,
  },
  tableRow: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  headerCell: {
    fontWeight: "bold",
    fontSize: 13,
    color: "#333",
  },
  tableCell: {
    fontSize: 13,
    color: "#666",
  },
  userModalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "95%", // Take 95% of screen width
    maxWidth: 700, // But max 700px
    maxHeight: "80%", // Max 80% of screen height
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlayUser: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center", // ← Add this
    alignItems: "center", // ← Add this
    padding: 20, // ← Add this
  },
  tableContainer: {
    maxHeight: "70%", // ← Add this or use a fixed height like 400
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
  modalList: { maxHeight: 200 },
  disabledUserItem: {
    backgroundColor: "#e0e0e0",
    opacity: 0.6,
  },
  disabledText: {
    color: "#9e9e9e", // grey text
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  tripItem: {
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 4,
  },
  tripDetail: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  tripAddress: {
    fontSize: 12,
    color: "#000",
    marginTop: 2,
  },
  boldText: {
    fontWeight: "600",
  },
  modalCloseButton: { fontSize: 20, fontWeight: "bold", color: "#999" },
});
