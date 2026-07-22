// FIX User Filters
import { Text, View } from "@/components/Themed";
/* import {
  StyleSheet as PdfStyle
} from "@react-pdf/renderer"; */
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
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
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
  customers: any[];
  parking: number;
  toll: number;
  mileage: number;
  expense: number;
  expense_purpose: string;
  vendor: string;
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
  customers: any[];
  vendor: string;
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
  from_home: boolean;
  to_home: boolean;
  platform: number;
  created_at: any;
}

interface OutstationExpense {
  id: string;
  user_id: string;
  username: string;
  user_name: string;
  request_id: string;
  start_date: string;
  end_date: string;
  travel_purposes: string[];
  trip_title: string;
  date: string;
  country: string;
  location: string;
  airfare: number;
  airfare_remark: string;
  mileage: number;
  trip_ids: string[];
  toll: number;
  toll_remark: string;
  parking: number;
  parking_remark: string;
  transport: number;
  transport_remark: string;
  hotel: number;
  hotel_remark: string;
  own_acc: number;
  own_acc_sharing: string;
  own_acc_remark: string;
  entertainment: number;
  entertainment_remark: string;
  laundry: number;
  laundry_remark: string;
  others: number;
  others_remark: string;
  total: number;
  departure_time: string;
  arrival_time: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  meal: number;
  trip_report: string;
  customers: any[];
  business_card_urls: string;
  type: number;
  approval_status: number;
  created_at: any;
}

interface ExpenseGroup {
  request_id: string;
  user_id: string;
  user_name: string;
  trip_title: string;
  start_date: string;
  end_date: string;
  travel_purposes: string[];
  data: OutstationExpense[];
  total_amount: number;
  type: number;
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

export default function ExpensesWebScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [essNo, setEssNo] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [costCenter, setCostCenter] = useState<string>("");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [generalExpense, setGeneralExpense] = useState<GeneralExpense[]>([]);
  const [oustationExpense, setOutstationExpense] = useState<
    OutstationExpense[]
  >([]);

  const [allRequests, setAllRequest] = useState<any[]>([]);
  const [allTripIds, setAllTripIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [role, setRole] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [usernameFilter, setUsenameFilter] = useState<string>("");
  const [expenseType, setExpenseType] = useState<string>("All");
  const [expensePurpose, setExpensePurpose] = useState<string>("");
  const [requestId, setRequestId] = useState<string>("");
  const [printRequestId, setPrintRequestId] = useState<string>("");

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
  const [appliedRequestId, setAppliedRequestId] = useState<string>("");

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Expense>>({});
  const [editFormDataGeneral, setEditFormDataGeneral] = useState<
    Partial<GeneralExpense>
  >({});
  const [mileageRate, setMileageRate] = useState<number>(0.8);
  const [isDashboardVisible, setIsDashboardVisible] = useState(true);
  const [tempPoints, setTempPoints] = useState<
    (google.maps.LatLngLiteral | null)[]
  >([null, null]);
  const [tempPolyline, setTempPolyline] = useState<string | null>(null);
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const editInputARef = useRef<any>(null);
  const editInputBRef = useRef<any>(null);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [addedUsers, setAddedUsers] = useState<any[]>([]);

  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(
    null,
  );
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [selectedTripIndex, setSelectedTripIndex] = useState(0);
  const [selectedOutstationId, setSelectedOutstationId] = useState<
    string | null
  >(null);
  const [selectedExpenseType, setSelectedExpenseType] = useState<number>(1);

  const [showTripModal, setShowTripModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

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

  const expenseTypeMap = {
    "1": "Mileage",
    "2": "General",
    "3": "Outstation",
  };

  const { height, width } = useWindowDimensions();

  const skipDates = false;

  const generalExpensePurposeMap = Object.fromEntries(
    generalExpensePurpose.map((p) => [p.id, p.value]),
  );

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role);
            const displayName =
              userData.name || userData.username || user.displayName || "User";
            setUsername(displayName);
            setEssNo(userData.ess_no || "N/A");
            setDepartment(userData.department || "N/A");
            setGrade(userData.grade || "N/A");
            setCostCenter(userData.cost_center || "N/A");
          } else {
            console.warn("User document does NOT exist for uid:", user.uid);
            setRole(null);
          }
        } catch (error) {
          console.error("Error fetching user doc:", error);
          setRole(null);
        }
      } else {
        setUserId(null);
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (role !== 0) return;
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData: User[] = [];
      snapshot.forEach((doc) => {
        userData.push({ id: doc.id, ...doc.data() } as User);
      });
      userData.sort((a, b) => a.username.localeCompare(b.username));
      setAllUsers(userData);
    });
    return () => unsubscribe();
  }, [role]);

  useEffect(() => {
    if (!userId) return;
    if (role === null) return;

    let q;
    if (role === 0) {
      q = query(
        collection(db, "travel_requests"),
        orderBy("created_at", "desc"),
      );
    } else {
      q = query(
        collection(db, "travel_requests"),
        where("user_id", "==", userId),
        orderBy("created_at", "desc"),
      );
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trips = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllRequest(trips);
    });
    return () => unsubscribe();
  }, [userId, role]);

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
      const outstationExpenseData: OutstationExpense[] = [];
      /* querySnapshot.forEach((doc) =>
        expensesData.push({ id: doc.id, ...doc.data() } as Expense),
      ); */
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 1) {
          expensesData.push({ id: doc.id, ...data } as Expense);
        } else if (data.type === 2) {
          generalExpenseData.push({ id: doc.id, ...data } as GeneralExpense);
        } else if (data.type === 3) {
          outstationExpenseData.push({
            id: doc.id,
            ...data,
          } as OutstationExpense);
        }
      });
      setExpenses(expensesData);
      const allTripIds = expensesData.flatMap((item) => item.trip_ids);
      setAllTripIds([...new Set(allTripIds)]);

      setGeneralExpense(generalExpenseData);
      setOutstationExpense(outstationExpenseData);
    });

    return () => unsubscribe();
  }, [userId, role]);

  // Fetch all trips once, filter client-side
  /* useEffect(() => {
    if (!userId) return;
    if (role === null) return;
    const q = query(collection(db, "trips"), orderBy("created_at", "desc"));
    return onSnapshot(q, (snapshot) => {
      const trips = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Trip,
      );
      setAllTrips(trips);
    });
  }, [userId, role]) */

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

  const filteredTrips = useMemo(() => {
    if (!allTripIds?.length) return [];
    const idSet = new Set(allTripIds);
    return allTrips.filter((trip) => idSet.has(trip.id));
  }, [allTrips, allTripIds]);

  useEffect(() => {
    return onSnapshot(doc(db, "config", "settings"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().mileage_rate)
        setMileageRate(docSnap.data().mileage_rate);
    });
  }, []);

  useEffect(() => {
    if (!apiKey || (window as any).google) return;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.onload = () =>
      (directionsService.current = new (
        window as any
      ).google.maps.DirectionsService());
    document.head.appendChild(script);
  }, []);

  const test = () => {
    console.log(allTrips.map((trip) => trip.user_id));
    console.log(allTrips.map((trips) => trips.id === "Td8rQR2LTFOWFzUgYHqI"));
    console.log(expenses.length);
    console.log("all trip ids");
    console.log(allTripIds);
    console.log(allTripIds.includes("opRvURa2sOLbLVRqDDib"));
    console.log(filteredTrips.map((trip) => trip.user_id));
    console.log(allTrips);
    console.log(selectedExpenseType);
  };

  const calculateRoute = (
    p1: google.maps.LatLngLiteral,
    p2: google.maps.LatLngLiteral,
    parking: number,
    toll: number,
  ) => {
    if (!directionsService.current) return;
    directionsService.current.route(
      {
        origin: p1,
        destination: p2,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          const distNum = parseFloat(
            (result.routes[0].legs[0].distance?.text || "0").replace(
              /[^0-9.]/g,
              "",
            ),
          );
          const mileage = parseFloat((distNum * mileageRate).toFixed(2));
          const polyline = result.routes[0].overview_polyline;
          setTempPolyline(
            typeof polyline === "string"
              ? polyline
              : (polyline as any)?.points || null,
          );
          setEditFormData((prev) => ({
            ...prev,
            distance: distNum,
            mileage,
            cost: parseFloat((mileage + parking + toll).toFixed(2)),
          }));
        }
      },
    );
  };

  useEffect(() => {
    if (!editingId) return;
    const timer = setTimeout(() => {
      const setup = (
        ref: any,
        key: "from_address" | "to_address",
        index: number,
      ) => {
        const inputElement =
          ref.current instanceof HTMLInputElement
            ? ref.current
            : ref.current?.querySelector?.("input");
        if (!inputElement || !(window as any).google) return;
        const autocomplete = new (
          window as any
        ).google.maps.places.Autocomplete(inputElement, {
          fields: ["formatted_address", "geometry"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address && place.geometry?.location) {
            const latLng = place.geometry.location.toJSON();
            setTempPoints((prev) => {
              const next = [...prev];
              next[index] = latLng;
              setEditFormData((f) => {
                const nextForm = { ...f, [key]: place.formatted_address };
                if (next[0] && next[1])
                  calculateRoute(
                    next[0],
                    next[1],
                    nextForm.parking || 0,
                    nextForm.toll || 0,
                  );
                return nextForm;
              });
              return next;
            });
          }
        });
      };
      setup(editInputARef, "from_address", 0);
      setup(editInputBRef, "to_address", 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [editingId]);

  const handleOpenLink = async (url) => {
    try {
      // Check if the device has an app that can handle the URL
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        // Open the link in the default browser
        await Linking.openURL(url);
      } else {
        Alert.alert(`Don't know how to open this URL: ${url}`);
      }
    } catch (error) {
      Alert.alert(`An error occurred: ${error.message}`);
    }
  };

  const getTripById = (tripId: string): Trip | undefined => {
    return allTrips.find((trip) => trip.id === tripId);
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

  const filteredExpenses = expenses
    .filter((e) => {
      if (appliedExpenseType == "General" || appliedExpenseType == "Outstation")
        return false;
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
    })
    .sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""));

  const filteredGeneralExpenses = generalExpense
    .filter((e) => {
      if (appliedExpenseType == "Mileage" || appliedExpenseType == "Outstation")
        return false;
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
    })
    .sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""));

  const filteredOutstationExpense = oustationExpense
    .filter((e) => {
      // Start with all items
      let include = true;

      // Exclude Mileage and General
      if (appliedExpenseType == "Mileage" || appliedExpenseType == "General") {
        include = false;
      }

      // Filter by request_id
      if (appliedRequestId && e.request_id !== appliedRequestId) {
        include = false;
      }

      // Filter by start date
      if (appliedStartDate && e.date < appliedStartDate) {
        include = false;
      }

      // Filter by end date
      if (appliedEndDate && e.date > appliedEndDate) {
        include = false;
      }

      // Filter by username
      if (
        appliedUsername &&
        e.user_name !== appliedUsername &&
        e.username !== appliedUsername
      ) {
        include = false;
      }

      // If no filters are applied, include all
      if (
        !appliedRequestId &&
        !appliedStartDate &&
        !appliedEndDate &&
        !appliedUsername
      ) {
        include = true;
      }

      return include;
    })
    .sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""));

  const groupedExpense = (outstationExpense: OutstationExpense[]) => {
    return outstationExpense.reduce<ExpenseGroup[]>((acc, expense) => {
      const requestId =
        expense.request_id || `temp_${Date.now()}_${Math.random()}`;
      const existingGroup = acc.find((group) => group.request_id === requestId);

      const tripTitle = expense.trip_title || "Untitled Trip";
      const userId = expense.user_id || "";
      const username = expense.user_name || expense.username || "";
      const type = expense.type || 3;
      const startDate = expense.start_date || "N/A";
      const endDate = expense.end_date || "N/A";
      const travelPurposes = expense.travel_purposes || [];

      const expenseTotal =
        typeof expense.total === "string"
          ? parseFloat(expense.total) || 0
          : Number(expense.total) || 0;

      if (existingGroup) {
        existingGroup.data.push(expense);
        existingGroup.total_amount =
          (Number(existingGroup.total_amount) || 0) + expenseTotal;
      } else {
        acc.push({
          request_id: requestId,
          user_id: userId,
          user_name: username,
          start_date: startDate,
          end_date: endDate,
          travel_purposes: travelPurposes,
          trip_title: tripTitle,
          data: [expense],
          total_amount: expenseTotal,
          type: type,
        });
      }
      return acc;
    }, []);
  };

  const groupedExpenses = groupedExpense(filteredOutstationExpense);

  const sortExpensesByDate = (
    expenses: OutstationExpense[],
  ): OutstationExpense[] => {
    return [...expenses].sort((a, b) => {
      // Handle null/undefined/empty dates
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;

      // Try to parse dates
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      // Handle invalid dates
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;

      // Ascending order
      return dateA.getTime() - dateB.getTime();
    });
  };

  groupedExpenses.forEach((group) => {
    group.data = sortExpensesByDate(group.data);
  });

  const handleDelete = async (id: string) => {
    const performDelete = async () => {
      try {
        await deleteDoc(doc(db, "expenses", id));
      } catch (error) {
        console.error("Error deleting expense:", error);
        if (Platform.OS === "web") {
          window.alert("Error deleting expense. Please try again.");
        } else {
          Alert.alert("Error", "Could not delete the expense.");
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

  const handleEditMileage = async (expense: Expense) => {
    setEditingId(expense.id);
    setEditFormData({ ...expense });
    /* setTempPolyline(null);
    if ((window as any).google) {
      const geocoder = new (window as any).google.maps.Geocoder();
      const geocode = (addr: string) =>
        new Promise<google.maps.LatLngLiteral | null>((res) =>
          geocoder.geocode({ address: addr }, (r, s) =>
            res(
              s === "OK" ? r?.[0]?.geometry?.location?.toJSON() || null : null,
            ),
          ),
        );
      const [p0, p1] = await Promise.all([
        geocode(expense.from_address),
        geocode(expense.to_address),
      ]);
      setTempPoints([p0, p1]);
    } */
  };

  const handleEditGeneral = async (expense: GeneralExpense) => {
    setEditingId(expense.id);
    setEditFormDataGeneral({ ...expense });
    /* setTempPolyline(null);
    if ((window as any).google) {
      const geocoder = new (window as any).google.maps.Geocoder();
      const geocode = (addr: string) =>
        new Promise<google.maps.LatLngLiteral | null>((res) =>
          geocoder.geocode({ address: addr }, (r, s) =>
            res(
              s === "OK" ? r?.[0]?.geometry?.location?.toJSON() || null : null,
            ),
          ),
        );
      const [p0, p1] = await Promise.all([
        geocode(expense.from_address),
        geocode(expense.to_address),
      ]);
      setTempPoints([p0, p1]);
    } */
  };

  const handleSaveEditMileage = async () => {
    if (!editingId) return;
    try {
      let routeImageUrl = editFormData.route_image_url || "";
      const updatedCost =
        (editFormData.mileage || 0) +
        (editFormData.parking || 0) +
        (editFormData.toll || 0) +
        (editFormData.expense || 0);

      if (tempPolyline && tempPoints[0] && tempPoints[1]) {
        const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x400&path=enc:${tempPolyline}&markers=color:red|label:A|${tempPoints[0].lat},${tempPoints[0].lng}&markers=color:blue|label:B|${tempPoints[1].lat},${tempPoints[1].lng}&key=${apiKey}`;
        const res = await fetch(staticMapUrl);
        if (res.ok) {
          const routeRef = ref(storage, `route-images/${Date.now()}.png`);
          routeImageUrl = await getDownloadURL(
            (await uploadBytes(routeRef, await res.blob())).ref,
          );
        }
      }

      const otherExpenseValidation =
        editFormData.expense !== 0 && !editFormData.expense_purpose;
      if (otherExpenseValidation) {
        alert("Missing expense purpose");
        return;
      }

      if (editFormData.expense === 0) {
        editFormData.expense_purpose = "";
      }

      await updateDoc(doc(db, "expenses", editingId), {
        ...editFormData,
        route_image_url: routeImageUrl,
        cost: updatedCost,
      });
      setEditingId(null);
    } catch (err) {
      Alert.alert("Error", "Failed to update expense.");
    }
  };
  const handleSaveEditGeneral = async () => {
    if (!editingId) return;
    try {
      await updateDoc(doc(db, "expenses", editingId), {
        ...editFormDataGeneral,
      });
      setEditingId(null);
    } catch (err) {
      Alert.alert("Error", "Failed to update expense.");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
    setEditFormDataGeneral({});
  };

  const handleStatus = async (id: string, status: number) => {
    try {
      const docRef = doc(db, "expenses", id);
      await updateDoc(docRef, { approval_status: status });
    } catch (error) {
      console.error("Error approving expense:", error);
    }
  };

  const getCurrentDate = () => {
    const today = new Date();

    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const year = today.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const exportRequestToPdf = (requestId: string) => {
    // Normalize a mileage expense
    console.log("export");
    console.log(requestId);

    const selectedRequest =
      allRequests.length > 0
        ? requestId
          ? allRequests.find((item) => item.id == requestId) || allRequests[0]
          : allRequests[0]
        : null;

    const user = allUsers.find((user) => user.id === selectedRequest.user_id);
    let reportUsername = user?.username;
    let reportEssNo = user?.ess_no;
    let reportDepartment = user?.department;
    let reportGrade = user?.grade;
    let reportCostCenter = user?.cost_center;

    if (!user) {
      reportUsername = appliedUsername;
      reportEssNo = appliedEssNo;
      reportDepartment = appliedDepartment;
      reportGrade = appliedGrade;
      reportCostCenter = appliedCostCenter;
    }

    const htmlContent = `
      <html>
        <head>
          <style>
            @page {
              size: A4 landscape;
              margin: 15mm 10mm 15mm 10mm;
              margin-trim: ahead behind;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
            }

            .print-container {
              width: 100%;
              box-sizing: border-box;
            }

            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .header-logo {
              flex: 1;
              text-align: left;
            }
            .header-logo img {
              max-height: 60px;
              width: auto;
            }
            .header-title {
              flex: 2;
              text-align: center;
            }
            .header-title h1 {
              color: #0284c7;
              font-size: 24px;
              margin: 0;
              border-bottom: none;
              padding-bottom: 0;
            }
            .header-empty {
              flex: 1;
            }
            
            h1 { color: #0284c7; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 3px; text-align: left; font-size: 9px; }
            th { background-color: #f1f5f9; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            
            /* Prevent rows from splitting cleanly down the middle across pages */
            tr { page-break-inside: avoid; } 
            td.amount {
              text-align: right;
            }

            td.total-label {
              border: none;
              text-align: right;
              font-weight: bold;
              font-size: 13px;
              padding: 3px;
              background-color: transparent;
            }
            td.total-amount {
              font-weight: bold;
              text-align: right;
            }
            .signature-container {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
              padding-left: 10px;
              padding-right: 10px;
              page-break-inside: avoid;
              page-break-after: always;
              break-after: page;
            }

            .signature-block {
              width: 30%;
              display: flex;
              flex-direction: column;
            }

            .signature-line {
              border-bottom: 1.5px solid #0f172a;
              margin-bottom: 8px;
              margin-top: 50px;
            }

            .signature-label {
              font-size: 12px;
              font-weight: bold;
              color: #1e293b;
              margin: 0;
            }

            .signature-date {
              font-size: 11px;
              color: #64748b;
              margin-top: 6px;
              margin-bottom: 0;
            }

            .report-title {
              margin-bottom: 0;
              margin-top: 0;
            }

            .report-due {
              margin-bottom: 5;
              margin-top: 0;
            }

            .employee-info-section {
              display: flex;
              flex-direction: row;
              justify-content: space-between;
            }

            .employee-info {
              display: flex;
              flex-direction: row;
              margin-right: 20px;
            }

            .page-break {
              page-break-before: always;
              break-before: page;
            }

            .details-container {
              display: flex;
              flex-direction: column;
              padding: 10px 0;
              border-bottom: 1.5px solid #e2e8f0;
            }

            .details-row {
              display: flex;
              flex-direction: row;
              flex-wrap: wrap;
            }

            .details {
              display: flex;
              flex-direction: column;
              margin-right: 30px;
              margin-bottom: 5px;
            }

            .details-label {
              color: #cccccc;
              font-size: 9px;
              font-weight: bold;
            }

            .details-value {  
              font-size: 9px;
            }

            .trip-details-container {
              width: 100%;
              margin-top: 5px;
            }

            .trip-item {
              margin-bottom: 8px;
              padding: 5px 0;
              border-bottom: 1px solid #f0f0f0;
            }

            .trip-item:last-child {
              border-bottom: none;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="report-header">
              <div class="header-logo">
                <img src="data:image/png;base64,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" alt="" width="100" height="71" />
              </div>
              <div class="header-title">
                <p class="report-title"><strong>KUMPULAN ABEX SDN BHD</strong></p>
                <strong><p class="report-title">LOCAL MILEAGE</p></strong>
                <p class="report-due">DUE IN <u><strong>3 WORKING DAYS</strong></u> AFTER RETURN FROM TRIP</p>
                
              </div>
              <div class="header-empty"></div>
            </div>
            <h1>${selectedRequest?.trip_title || ""}</h1>
            <div class="employee-info-section">
            <div class="employee-info">Name: <u>${reportUsername}</u></div>
            <div class="employee-info">ESS No: <u>${reportEssNo}</u></div>
            <div class="employee-info">Department: <u>${reportDepartment}</u></div>
            <div class="employee-info">Grade: <u>${reportGrade}</u></div>
            <div class="employee-info">Cost Center: <u>${reportCostCenter}</u></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Trip Title</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Country</th>
                  <th>Location</th>
                  <th>Travel Purpose</th>
                  <th>Mode of Transport</th>
                  <th>Own Accommodation</th>
                  <th>Room Sharing</th>
                  <th>Advance Allowance</th>
                </tr>
              </thead>
              <tbody>
                ${allRequests
                  .map((item) => {
                    if (requestId == "" || requestId === item.id) {
                      return `
                            <tr>
                              <td>${item.trip_title}</td>
                              <td>${formatDateString(item.start_date)}</td>
                              <td>${formatDateString(item.end_date)}</td>
                              <td>${item.country || item.places[0].country || "N/A"}</td>
                              <td>${item.location || item.places[0].location || "N/A"}</td>
                              <td>${(item.travel_purposes || []).join(", ")}</td>
                              <td>${item.transport_mode || "N/A"}</td>
                              <td>${item.own_acc ? "Yes" : "No"}</td>
                              <td>${item.room_sharing_name || "N/A"}</td>
                              <td class="amount">${(item.advance_allowance || 0).toFixed(2)}</td>
                            </tr>
                          `;
                    }
                  })
                  .join("")}  
              </tbody>
              
            </table>
            <div class="signature-container">
              <div class="signature-block">
                <p class="signature-label">Claimed By:</p>
                <div class="signature-line"></div>
                <p class="signature-date">Name: ${reportUsername}</p>
                <p class="signature-date">Date: ${getCurrentDate()}</p>
              </div>

              <div class="signature-block">
                <p class="signature-label">Approved By:</p>
                <div class="signature-line"></div>
                <p class="signature-date">Name: </p>
                <p class="signature-date">Date: </p>
              </div>
            </div>
            
            <div>
              <h1>Detailed Report for ${selectedRequest?.trip_title || ""}</h1>
              ${allRequests
                .map((item) => {
                  if (requestId == "" || requestId === item.id) {
                    return `
                      <div class="details-container">
                        <div class="details-row">
                          <div class="details">
                            <div class="details-label">Username: </div>
                            <div class="details-value">${item.user_name}</div>
                          </div>
                          <div class="details">
                            <div class="details-label">Start Date: </div>
                            <div class="details-value">${item.start_date}</div>
                          </div>
                          <div class="details">
                            <div class="details-label">End Date: </div>
                            <div class="details-value">${item.end_date}</div>
                          </div>
                          <div class="details">
                            <div class="details-label">Country: </div>
                            <div class="details-value">${item.country || item.places[0].country || "N/A"}</div>
                          </div>
                          <div class="details">
                            <div class="details-label">Location: </div>
                            <div class="details-value">${item.location || item.places[0].location || "N/A"}</div>
                          </div>
                        </div>
                        
                        <div class="details-row">
                          <div class="details">
                            <div class="details-label">Travel Purposes: </div>
                            <div class="details-value">${(item.travel_purposes || []).join(", ")}</div>
                          </div>
                          <div class="details">
                            <div class="details-label">Transport Mode: </div>
                            <div class="details-value">${item.start_date}</div>
                          </div>
                          <div class="details">
                            <div class="details-label">Own Accommodation: </div>
                            <div class="details-value">${item.own_acc ? "Yes" : "No"}</div>
                          </div>
                          <div class="details">
                            <div class="details-label">Room Sharing: </div>
                            <div class="details-value">${item.room_sharing_name || "N/A"}</div>
                          </div>
                          <div class="details">
                            <div class="details-label">Advance Allowance: </div>
                            <div class="details-value">RM ${(item.advance_allowance || 0).toFixed(2)}, ${item.advance_allowance_remark || "N/A"}</div>
                          </div>
                        </div>

                        <div class="details-row" style="margin-top: 10px;">
                          <div class="details">
                            <div class="details-label">Visitation Plan: </div>
                            <div class="details-value">${item.visitation_plan || "N/A"}</div>
                          </div>
                        </div>

                      </div>
                    `;
                  }
                })
                .join("")}          
           </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  const exportMileageToPdf = () => {
    // Normalize a mileage expense
    console.log("export");

    if ((!appliedStartDate || !appliedEndDate) && !skipDates) {
      alert("Please ensure the dates are added.");
      return;
    }

    let reportUsername = username;
    let reportEssNo = essNo;
    let reportDepartment = department;
    let reportGrade = grade;
    let reportCostCenter = costCenter;

    if (appliedUsername != "") {
      reportUsername = appliedUsername;
      reportEssNo = appliedEssNo;
      reportDepartment = appliedDepartment;
      reportGrade = appliedGrade;
      reportCostCenter = appliedCostCenter;
    }

    // Convert allTrips array to a map for easy lookup
    const tripsMap = {};
    allTrips.forEach((trip) => {
      tripsMap[trip.id] = trip;
    });

    const normalizeMileage = (item) => ({
      date: item.date || "",
      typeOfExpense: "Local Mileage",
      purpose: item.purpose || "",
      company: item.company || "",
      name: item.name || "",
      email: item.email || "",
      contactNumber: item.contact_number || "",
      parking: item.parking || 0,
      toll: item.toll || 0,
      mileage: item.mileage || 0,
      expense: item.expense || 0,
      expensePurpose: item.expense_purpose || "",
      subTotal: item.cost || 0,
      trip_ids: item.trip_ids || [],
      customers: item.customers || [],
      vendor: item.vendor || "",
    });

    // Normalize a general expense
    const normalizeGeneral = (item) => ({
      date: item.date || "",
      typeOfExpense: "General Expense",
      purpose: item.purpose || "",
      name: item.name || "",
      email: item.email || "",
      contactNumber: item.contact_number || "",
      parking: 0,
      toll: 0,
      mileage: 0,
      expense: parseFloat(item.amount) || 0,
      expensePurpose: item.expense_type || "",
      subTotal: parseFloat(item.amount) || 0,
      trip_ids: [],
    });

    // Function to get trip by ID from the tripsMap
    const getTripById = (tripId) => {
      return tripsMap[tripId] || null;
    };

    // Function to format Firebase timestamp to 12-hour time format
    const formatFirebaseTime = (timestamp) => {
      if (!timestamp) return "N/A";

      // If it's a Firebase timestamp object with seconds and nanoseconds
      if (timestamp.seconds !== undefined) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      // If it's a string, try to parse it
      if (typeof timestamp === "string") {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        }
        return timestamp; // Return as is if not a valid date
      }

      // If it's a Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      return "N/A";
    };

    // Function to generate trip details HTML
    const generateTripDetails = (tripIds) => {
      if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
        return "";
      }

      return tripIds
        .map((tripId) => {
          const trip = getTripById(tripId);

          if (trip) {
            const distance = trip.distance?.toFixed(2) || "0.00";
            const platform = trip.platform === 2 ? "Web" : "Mobile";
            const goingHome = trip.to_home === true ? "Yes" : "No";
            const fromHome = trip.from_home ? "Yes" : "No";

            const fromTime = formatFirebaseTime(trip.from_time);
            const toTime = formatFirebaseTime(trip.to_time);

            return `
            <div style="margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #f0f0f0;">
              <div style="font-size: 9px; color: #888;"><strong>Platform: </strong>${platform}</div>
              ${trip.remark ? `<div style="font-size: 9px; color: #666;"><strong>Remark: </strong>${trip.remark}</div>` : ""}
              <div style="font-size: 9px; color: #888;"><strong>Time: </strong>${fromTime} - ${toTime}</div>
              <div style="font-size: 10px; color: #333; margin-bottom: 2px;">
                <strong>Trip: </strong>${trip.from_address || "N/A"} → ${trip.to_address || "N/A"} (${distance} km)
              </div>
              
              
              <strong>From Home: </strong>${fromHome ? `<div style="font-size: 9px; color: #888;">${fromHome}</div>` : ""}
              <strong>To Home: </strong>${goingHome ? `<div style="font-size: 9px; color: #888;">${goingHome}</div>` : ""}
              
              
            </div>
          `;
          } else {
            return `
            <div style="font-size: 9px; color: #999; padding: 3px 0;">
              Trip data not available (ID: ${tripId})
            </div>
          `;
          }
        })
        .join("");
    };

    const generateCustomerDetails = (customers: any[]) => {
      return customers.map((customer) => {
        return `
          <div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 20px; margin-bottom: 1px; padding: 1px 0; font-size: 9px; color: #888;">
            <div style="font-size: 9px; color: #888;"><strong>Company: </strong>${customer.company || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Customer Name: </strong>${customer.name || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Emali: </strong>${customer.email || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Contact Number: </strong>${customer.number || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Time: </strong>${customer.time || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Address: </strong>${customer.address || "N/A"}</div>
          </div>
        `;
      });
    };

    const generateOldCustomer = (item: any) => {
      return `
        <div class="details-row" style="margin-top: 10px;">
          <div class="details">
            <div class="details-label">Company: </div>
            <div class="details-value">${item.company}</div>
          </div>
          <div class="details">
            <div class="details-label">Customer Name: </div>
            <div class="details-value">${item.name}</div>
          </div>
          <div class="details">
            <div class="details-label">Email: </div>
            <div class="details-value">${item.email}</div>
          </div>
          <div class="details">
            <div class="details-label">Contact Number: </div>
            <div class="details-value">${item.contact_number}</div>
          </div>
        </div>
      `;
    };

    const combinedData = [...filteredExpenses.map(normalizeMileage)];

    const totalParking = combinedData.reduce(
      (sum, item) => sum + item.parking,
      0,
    );
    const totalToll = combinedData.reduce((sum, item) => sum + item.toll, 0);
    const totalMileage = combinedData.reduce(
      (sum, item) => sum + item.mileage,
      0,
    );
    const totalExpense = combinedData.reduce(
      (sum, item) => sum + item.expense,
      0,
    );
    const totalAmount = combinedData.reduce(
      (sum, item) => sum + item.subTotal,
      0,
    );

    const formattedParking = totalParking.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedToll = totalToll.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedMileage = totalMileage.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedExpense = totalExpense.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedTotal = totalAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const htmlContent = `
      <html>
        <head>
          <style>
            @page {
              size: A4 landscape;
              margin: 15mm 10mm 15mm 10mm;
              margin-trim: ahead behind;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
            }

            .print-container {
              width: 100%;
              box-sizing: border-box;
            }

            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .header-logo {
              flex: 1;
              text-align: left;
            }
            .header-logo img {
              max-height: 60px;
              width: auto;
            }
            .header-title {
              flex: 2;
              text-align: center;
            }
            .header-title h1 {
              color: #0284c7;
              font-size: 24px;
              margin: 0;
              border-bottom: none;
              padding-bottom: 0;
            }
            .header-empty {
              flex: 1;
            }
            
            h1 { color: #0284c7; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 3px; text-align: left; font-size: 9px; }
            th { background-color: #f1f5f9; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            
            /* Prevent rows from splitting cleanly down the middle across pages */
            tr { page-break-inside: avoid; } 
            td.amount {
              text-align: right;
            }

            td.total-label {
              border: none;
              text-align: right;
              font-weight: bold;
              font-size: 13px;
              padding: 3px;
              background-color: transparent;
            }
            td.total-amount {
              font-weight: bold;
              text-align: right;
            }
            .signature-container {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
              padding-left: 10px;
              padding-right: 10px;
              page-break-inside: avoid;
              page-break-after: always;
              break-after: page;
            }

            .signature-block {
              width: 30%;
              display: flex;
              flex-direction: column;
            }

            .signature-line {
              border-bottom: 1.5px solid #0f172a;
              margin-bottom: 8px;
              margin-top: 50px;
            }

            .signature-label {
              font-size: 12px;
              font-weight: bold;
              color: #1e293b;
              margin: 0;
            }

            .signature-date {
              font-size: 11px;
              color: #64748b;
              margin-top: 6px;
              margin-bottom: 0;
            }

            .report-title {
              margin-bottom: 0;
              margin-top: 0;
            }

            .report-due {
              margin-bottom: 5;
              margin-top: 0;
            }

            .employee-info-section {
              display: flex;
              flex-direction: row;
              justify-content: space-between;
            }

            .employee-info {
              display: flex;
              flex-direction: row;
              margin-right: 20px;
            }

            .page-break {
              page-break-before: always;
              break-before: page;
            }

            .details-container {
              display: flex;
              flex-direction: column;
              padding: 10px 0;
              border-bottom: 1.5px solid #e2e8f0;
            }

            .details-row {
              display: flex;
              flex-direction: row;
              flex-wrap: wrap;
            }

            .details {
              display: flex;
              flex-direction: column;
              margin-right: 30px;
              margin-bottom: 5px;
            }

            .details-label {
              color: #cccccc;
              font-size: 9px;
              font-weight: bold;
            }

            .details-value {  
              font-size: 9px;
            }

            .trip-details-container {
              width: 100%;
              margin-top: 5px;
            }

            .trip-item {
              margin-bottom: 8px;
              padding: 5px 0;
              border-bottom: 1px solid #f0f0f0;
            }

            .trip-item:last-child {
              border-bottom: none;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="report-header">
              <div class="header-logo">
                <img src="data:image/png;base64,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" alt="" width="100" height="71" />
              </div>
              <div class="header-title">
                <p class="report-title"><strong>KUMPULAN ABEX SDN BHD</strong></p>
                <strong><p class="report-title">LOCAL MILEAGE</p></strong>
                
              </div>
              <div class="header-empty"></div>
            </div>
            <h1>Mileage Expense Report from ${formatDateString(startDate)} - ${formatDateString(endDate)} </h1>
            <div class="employee-info-section">
            <div class="employee-info">Name: <u>${reportUsername}</u></div>
            <div class="employee-info">ESS No: <u>${reportEssNo}</u></div>
            <div class="employee-info">Department: <u>${reportDepartment}</u></div>
            <div class="employee-info">Grade: <u>${reportGrade}</u></div>
            <div class="employee-info">Cost Center: <u>${reportCostCenter}</u></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Company Name</th>
                  <th>Purpose</th>
                  <th>Expense Purpose</th>
                  <th>Vendor Name</th>
                  <th>Expenses Amount</th>
                  <th>Parking</th>
                  <th>Toll</th>
                  <th>Mileage</th>
                  <th>Sub Total</th>
                </tr>
              </thead>
              <tbody>
                ${combinedData
                  .map(
                    (item) => `
                      <tr>
                        <td>${formatDateString(item.date)}</td>
                        <td>${item.company || item.customers[0].company}</td>
                        <td>${item.purpose}</td>
                        <td>${item.expensePurpose || "-"}</td>
                        <td>${item.vendor || "-"}
                        <td class="amount">${item.expense.toFixed(2) || "-"}</td>
                        <td class="amount">${item.parking.toFixed(2)}</td>
                        <td class="amount">${item.toll.toFixed(2)}</td>
                        <td class="amount">${item.mileage.toFixed(2)}</td>
                        <td class="amount">${item.subTotal.toFixed(2)}</td>
                      </tr>
                    `,
                  )
                  .join("")}
                  
                <tr class="total-row">
                  <td colspan="5" class="total-label">Total:</td>
                  <td class="total-amount">${formattedExpense}</td>
                  <td class="total-amount">${formattedParking}</td>
                  <td class="total-amount">${formattedToll}</td>
                  <td class="total-amount">${formattedMileage}</td>
                  <td class="total-amount">${formattedTotal}</td>
                </tr>
              </tbody>
              
            </table>
            <div class="signature-container">
              <div class="signature-block">
                <p class="signature-label">Claimed By:</p>
                <div class="signature-line"></div>
                <p class="signature-date">Name: ${reportUsername}</p>
                <p class="signature-date">Date: ${getCurrentDate()}</p>
              </div>

              <div class="signature-block">
                <p class="signature-label">Approved By:</p>
                <div class="signature-line"></div>
                <p class="signature-date">Name: </p>
                <p class="signature-date">Date: </p>
              </div>
            </div>
            <div>
              <h1>Detailed Reports from ${formatDateString(startDate)} - ${formatDateString(endDate)} </h1>
              ${filteredExpenses
                .map(
                  (item) => `
                  <div class="details-container">
                    <div class="details-row">
                      <div class="details">
                        <div class="details-label">Username: </div>
                        <div class="details-value">${item.user_name}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Date: </div>
                        <div class="details-value">${item.date}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Type: </div>
                        <div class="details-value">Mileage Expense</div>
                      </div>
                    </div>
                    <div class="details-row" style="margin-top: 10px;">
                      <div class="details">
                        <div class="details-label">Purpose: </div>
                        <div class="details-value">${item.purpose}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Distance: </div>
                        <div class="details-value">${item.distance} km</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Time: </div>
                        <div class="details-value">${item.from_time} - ${item.to_time} (${item.duration})</div>
                      </div>
                    </div>

                    <div class="details-row" style="margin-top: 10px;">
                      <div class="details">
                        <div class="details-label">Parking: </div>
                        <div class="details-value">RM ${item.parking}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Toll: </div>
                        <div class="details-value">RM ${item.toll}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Mileage: </div>
                        <div class="details-value">RM ${item.mileage}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Expense: </div>
                        <div class="details-value">RM ${item.expense}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Expense Purpose: </div>
                        <div class="details-value">${item.expense_purpose || "N/A"}</div>
                      </div>
                    </div>

                    <div class="details-row" style="margin-top: 10px; flex-direction: column;">
                      <div class="details" style="flex: 1; width: 100%;">
                        <div class="details-label">Customers: </div>
                        <div class="details-value trip-details-container">

                          ${!item.customers ? generateOldCustomer(item) : generateCustomerDetails(item.customers || [])}
                        </div>
                      </div>
                    </div>

                    <div class="details-row" style="margin-top: 10px;">
                      <div class="details">
                        <div class="details-label">Trip Report: </div>
                        <div class="details-value">${item.trip_report}</div>
                      </div>
                    </div>
                    
                    <div class="details-row" style="margin-top: 10px; flex-direction: column;">
                      <div class="details" style="flex: 1; width: 100%;">
                        <div class="details-label">Trip Details: </div>
                        <div class="details-value trip-details-container">
                          ${generateTripDetails(item.trip_ids || [])}
                        </div>
                      </div>
                    </div>
                  </div>
                `,
                )
                .join("")}
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  const exportGeneralToPdf = () => {
    // Normalize a mileage expense
    console.log("export");

    if ((!appliedStartDate || !appliedEndDate) && !skipDates) {
      alert("Please ensure the dates are added.");
      return;
    }

    let reportUsername = username;
    let reportEssNo = essNo;
    let reportDepartment = department;
    let reportGrade = grade;
    let reportCostCenter = costCenter;

    if (appliedUsername != "") {
      reportUsername = appliedUsername;
      reportEssNo = appliedEssNo;
      reportDepartment = appliedDepartment;
      reportGrade = appliedGrade;
      reportCostCenter = appliedCostCenter;
    }

    // Convert allTrips array to a map for easy lookup
    const tripsMap = {};
    allTrips.forEach((trip) => {
      tripsMap[trip.id] = trip;
    });

    // Normalize a general expense
    const normalizeGeneral = (item) => ({
      date: item.date || "",
      typeOfExpense: "General Expense",
      purpose: item.purpose || "",
      name: item.name || "",
      email: item.email || "",
      contactNumber: item.contact_number || "",
      parking: 0,
      toll: 0,
      mileage: 0,
      vendor: item.vendor || "",
      expense: parseFloat(item.amount) || 0,
      expensePurpose: item.expense_type || "",
      subTotal: parseFloat(item.amount) || 0,
      trip_ids: [],
      customers: item.customers || [],
    });

    // Function to get trip by ID from the tripsMap
    const getTripById = (tripId) => {
      return tripsMap[tripId] || null;
    };

    // Function to format Firebase timestamp to 12-hour time format
    const formatFirebaseTime = (timestamp) => {
      if (!timestamp) return "N/A";

      // If it's a Firebase timestamp object with seconds and nanoseconds
      if (timestamp.seconds !== undefined) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      // If it's a string, try to parse it
      if (typeof timestamp === "string") {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        }
        return timestamp; // Return as is if not a valid date
      }

      // If it's a Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      return "N/A";
    };

    const generateOldCustomer = (item: any) => {
      return `
        <div class="details-row" style="margin-top: 10px;">
          <div class="details">
            <div class="details-label">Company: </div>
            <div class="details-value">${item.company}</div>
          </div>
          <div class="details">
            <div class="details-label">Customer Name: </div>
            <div class="details-value">${item.name}</div>
          </div>
          <div class="details">
            <div class="details-label">Email: </div>
            <div class="details-value">${item.email}</div>
          </div>
          <div class="details">
            <div class="details-label">Contact Number: </div>
            <div class="details-value">${item.contact_number}</div>
          </div>
        </div>
      `;
    };

    const generateCustomerDetails = (customers: any[]) => {
      return customers.map((customer) => {
        return `
          <div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 20px; margin-bottom: 1px; padding: 1px 0; font-size: 9px; color: #888;">
            <div style="font-size: 9px; color: #888;"><strong>Company: </strong>${customer.company || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Customer Name: </strong>${customer.name || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Emali: </strong>${customer.email || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Contact Number: </strong>${customer.number || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Time: </strong>${customer.time || "N/A"}</div>
          </div>
        `;
      });
    };

    const combinedData = [...filteredGeneralExpenses.map(normalizeGeneral)];

    const totalParking = combinedData.reduce(
      (sum, item) => sum + item.parking,
      0,
    );
    const totalToll = combinedData.reduce((sum, item) => sum + item.toll, 0);
    const totalMileage = combinedData.reduce(
      (sum, item) => sum + item.mileage,
      0,
    );
    const totalExpense = combinedData.reduce(
      (sum, item) => sum + item.expense,
      0,
    );
    const totalAmount = combinedData.reduce(
      (sum, item) => sum + item.subTotal,
      0,
    );

    const formattedParking = totalParking.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedToll = totalToll.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedMileage = totalMileage.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedExpense = totalExpense.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedTotal = totalAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const htmlContent = `
      <html>
        <head>
          <style>
            @page {
              size: A4 landscape;
              margin: 15mm 10mm 15mm 10mm;
              margin-trim: ahead behind;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
            }

            .print-container {
              width: 100%;
              box-sizing: border-box;
            }

            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .header-logo {
              flex: 1;
              text-align: left;
            }
            .header-logo img {
              max-height: 60px;
              width: auto;
            }
            .header-title {
              flex: 2;
              text-align: center;
            }
            .header-title h1 {
              color: #0284c7;
              font-size: 24px;
              margin: 0;
              border-bottom: none;
              padding-bottom: 0;
            }
            .header-empty {
              flex: 1;
            }
            
            h1 { color: #0284c7; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 3px; text-align: left; font-size: 9px; }
            th { background-color: #f1f5f9; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            
            /* Prevent rows from splitting cleanly down the middle across pages */
            tr { page-break-inside: avoid; } 
            td.amount {
              text-align: right;
            }

            td.total-label {
              border: none;
              text-align: right;
              font-weight: bold;
              font-size: 13px;
              padding: 3px;
              background-color: transparent;
            }
            td.total-amount {
              font-weight: bold;
              text-align: right;
            }
            .signature-container {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
              padding-left: 10px;
              padding-right: 10px;
              page-break-inside: avoid;
              page-break-after: always;
              break-after: page;
            }

            .signature-block {
              width: 30%;
              display: flex;
              flex-direction: column;
            }

            .signature-line {
              border-bottom: 1.5px solid #0f172a;
              margin-bottom: 8px;
              margin-top: 50px;
            }

            .signature-label {
              font-size: 12px;
              font-weight: bold;
              color: #1e293b;
              margin: 0;
            }

            .signature-date {
              font-size: 11px;
              color: #64748b;
              margin-top: 6px;
              margin-bottom: 0;
            }

            .report-title {
              margin-bottom: 0;
              margin-top: 0;
            }

            .report-due {
              margin-bottom: 5;
              margin-top: 0;
            }

            .employee-info-section {
              display: flex;
              flex-direction: row;
              justify-content: space-between;
            }

            .employee-info {
              display: flex;
              flex-direction: row;
              margin-right: 20px;
            }

            .page-break {
              page-break-before: always;
              break-before: page;
            }

            .details-container {
              display: flex;
              flex-direction: column;
              padding: 10px 0;
              border-bottom: 1.5px solid #e2e8f0;
            }

            .details-row {
              display: flex;
              flex-direction: row;
              flex-wrap: wrap;
            }

            .details {
              display: flex;
              flex-direction: column;
              margin-right: 30px;
              margin-bottom: 5px;
            }

            .details-label {
              color: #cccccc;
              font-size: 9px;
              font-weight: bold;
            }

            .details-value {  
              font-size: 9px;
            }

            .trip-details-container {
              width: 100%;
              margin-top: 5px;
            }

            .trip-item {
              margin-bottom: 8px;
              padding: 5px 0;
              border-bottom: 1px solid #f0f0f0;
            }

            .trip-item:last-child {
              border-bottom: none;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="report-header">
              <div class="header-logo">
                <img src="data:image/png;base64,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" alt="" width="100" height="71" />
              </div>
              <div class="header-title">
                <p class="report-title"><strong>KUMPULAN ABEX SDN BHD</strong></p>
                <strong><p class="report-title">GENERAL EXPENSE</p></strong>
                
              </div>
              <div class="header-empty"></div>
            </div>
            <h1>General Expense Report from ${formatDateString(startDate)} - ${formatDateString(endDate)} </h1>
            <div class="employee-info-section">
            <div class="employee-info">Name: <u>${reportUsername}</u></div>
            <div class="employee-info">ESS No: <u>${reportEssNo}</u></div>
            <div class="employee-info">Department: <u>${reportDepartment}</u></div>
            <div class="employee-info">Grade: <u>${reportGrade}</u></div>
            <div class="employee-info">Cost Center: <u>${reportCostCenter}</u></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Company Name</th>
                  <th>Expense Purpose</th>
                  <th>Vendor Name</th>
                  <th>Expense</th>
                </tr>
              </thead>
              <tbody>
                ${combinedData
                  .map(
                    (item) => `
                      <tr>
                        <td>${formatDateString(item.date)}</td>
                        <td>${item.customers?.[0]?.company || "-"}</td>
                        <td>${item.expensePurpose}</td>
                        <td>${item.vendor || "-"}</td>
                        <td class="amount">${item.expense.toFixed(2)}</td>
                      </tr>
                    `,
                  )
                  .join("")}
                  
                <tr class="total-row">
                  <td colspan="4" class="total-label">Total:</td>
                  <td class="total-amount">${formattedExpense}</td>
                </tr>
              </tbody>
              
            </table>
            <div class="signature-container">
              <div class="signature-block">
                <p class="signature-label">Claimed By:</p>
                <div class="signature-line"></div>
                <p class="signature-date">Name: ${reportUsername}</p>
                <p class="signature-date">Date: ${getCurrentDate()}</p>
              </div>

              <div class="signature-block">
                <p class="signature-label">Approved By:</p>
                <div class="signature-line"></div>
                <p class="signature-date">Name: </p>
                <p class="signature-date">Date: </p>
              </div>
            </div>
            <div>
              <h1>Detailed Reports from ${formatDateString(startDate)} - ${formatDateString(endDate)} </h1>

              ${filteredGeneralExpenses
                .map(
                  (item) => `
                  <div class="details-container">
                    <div class="details-row">
                      <div class="details">
                        <div class="details-label">Username: </div>
                        <div class="details-value">${item.user_name}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Date: </div>
                        <div class="details-value">${item.date}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Type: </div>
                        <div class="details-value">General Expense</div>
                      </div>
                    </div>
                    <div class="details-row" style="margin-top: 10px;">
                      <div class="details">
                        <div class="details-label">Purpose: </div>
                        <div class="details-value">${item.expense_type}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Expense Amount: </div>
                        <div class="details-value">RM ${item.amount}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Vendor : </div>
                        <div class="details-value">${item.vendor || "N/A"}</div>
                      </div>
                    </div>

                    <div class="details-row" style="margin-top: 10px; flex-direction: column;">
                      <div class="details" style="flex: 1; width: 100%;">
                        <div class="details-label">Customers: </div>
                        <div class="details-value trip-details-container">

                          ${!item.customers ? generateOldCustomer(item) : generateCustomerDetails(item.customers || [])}
                        </div>
                      </div>
                    </div>

                    <div class="details-row" style="margin-top: 10px;">
                      <div class="details">
                        <div class="details-label">Trip Report: </div>
                        <div class="details-value">${item.expense_report}</div>
                      </div>
                    </div>
                  </div>
                `,
                )
                .join("")}
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  const exportOutstationToPdf = () => {
    // Normalize a mileage expense
    console.log("export");
    let reportUsername = username;
    let reportEssNo = essNo;
    let reportDepartment = department;
    let reportGrade = grade;
    let reportCostCenter = costCenter;

    if (appliedUsername != "") {
      reportUsername = appliedUsername;
      reportEssNo = appliedEssNo;
      reportDepartment = appliedDepartment;
      reportGrade = appliedGrade;
      reportCostCenter = appliedCostCenter;
    }

    // Convert allTrips array to a map for easy lookup
    const tripsMap = {};
    allTrips.forEach((trip) => {
      tripsMap[trip.id] = trip;
    });

    const normalizeMileage = (item) => ({
      date: item.date || "",
      typeOfExpense: "Local Mileage",
      purpose: item.purpose || "",
      name: item.name || "",
      email: item.email || "",
      contactNumber: item.contact_number || "",
      parking: item.parking || 0,
      toll: item.toll || 0,
      mileage: item.mileage || 0,
      expense: item.expense || 0,
      expensePurpose: item.expense_purpose || "",
      subTotal: item.cost || 0,
      trip_ids: item.trip_ids || [],
    });

    // Normalize a general expense
    const normalizeGeneral = (item) => ({
      date: item.date || "",
      typeOfExpense: "General Expense",
      purpose: item.purpose || "",
      name: item.name || "",
      email: item.email || "",
      contactNumber: item.contact_number || "",
      parking: 0,
      toll: 0,
      mileage: 0,
      expense: parseFloat(item.amount) || 0,
      expensePurpose: item.expense_type || "",
      subTotal: parseFloat(item.amount) || 0,
      trip_ids: [],
    });

    // Function to get trip by ID from the tripsMap
    const getTripById = (tripId) => {
      return tripsMap[tripId] || null;
    };

    // Function to format Firebase timestamp to 12-hour time format
    const formatFirebaseTime = (timestamp) => {
      if (!timestamp) return "N/A";

      // If it's a Firebase timestamp object with seconds and nanoseconds
      if (timestamp.seconds !== undefined) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      // If it's a string, try to parse it
      if (typeof timestamp === "string") {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        }
        return timestamp; // Return as is if not a valid date
      }

      // If it's a Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      return "N/A";
    };

    const generateCustomerDetails = (customers: any[]) => {
      return customers.map((customer) => {
        return `
          <div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 20px; margin-bottom: 1px; padding: 1px 0; font-size: 9px; color: #888;">
            <div style="font-size: 9px; color: #888;"><strong>Company: </strong>${customer.company || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Customer Name: </strong>${customer.name || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Emali: </strong>${customer.email || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Contact Number: </strong>${customer.number || "N/A"}</div>
            <div style="font-size: 9px; color: #888;"><strong>Time: </strong>${customer.time || "N/A"}</div>
            ${
              customer.address &&
              `<div style="font-size: 9px; color: #888;"><strong>Address: </strong>${customer.address || "N/A"}</div>`
            }
          </div>
        `;
      });
    };

    const combinedData = [
      ...filteredExpenses.map(normalizeMileage),
      ...filteredGeneralExpenses.map(normalizeGeneral),
    ];

    const getMealCost = (item: OutstationExpense): number => {
      let mealCost = Number(item.meal) || 0;
      if (!mealCost) {
        mealCost =
          Number(item.total) -
          (Number(item.airfare) +
            Number(item.mileage) +
            Number(item.toll) +
            Number(item.parking) +
            Number(item.transport) +
            Number(item.hotel) +
            Number(item.own_acc) +
            Number(item.entertainment) +
            Number(item.laundry) +
            Number(item.others));
      }
      return mealCost;
    };

    const expenses = groupedExpenses.flatMap((group) => group.data);

    const totals = expenses.reduce(
      (acc, item) => {
        let mealCost = getMealCost(item);

        // Safe number conversion with fallback to 0
        const safeNumber = (value: any) => {
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        };

        const mileage = safeNumber(item.mileage);
        const airfare = safeNumber(item.airfare);
        // ... etc

        return {
          airfare: acc.airfare + airfare,
          mileage: acc.mileage + mileage,
          toll: acc.toll + safeNumber(item.toll),
          parking: acc.parking + safeNumber(item.parking),
          transport: acc.transport + safeNumber(item.transport),
          hotel: acc.hotel + safeNumber(item.hotel),
          own_acc: acc.own_acc + safeNumber(item.own_acc),
          entertainment: acc.entertainment + safeNumber(item.entertainment),
          laundry: acc.laundry + safeNumber(item.laundry),
          others: acc.others + safeNumber(item.others),
          meal: acc.meal + safeNumber(mealCost),
          total: acc.total + safeNumber(item.total),
        };
      },
      {
        mileage: 0,
        toll: 0,
        airfare: 0,
        parking: 0,
        transport: 0,
        hotel: 0,
        own_acc: 0,
        entertainment: 0,
        laundry: 0,
        others: 0,
        meal: 0,
        total: 0,
      },
    );

    const formatAmount = (value: number) => {
      return (Number(value) || 0).toFixed(2);
    };

    const formatCurrency = (value: number): string => {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const htmlContent = `
      <html>
        <head>
          <style>
            @page {
              size: A4 landscape;
              margin: 15mm 10mm 15mm 10mm;
              margin-trim: ahead behind;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
            }

            .print-container {
              width: 100%;
              box-sizing: border-box;
            }

            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .header-logo {
              flex: 1;
              text-align: left;
            }
            .header-logo img {
              max-height: 60px;
              width: auto;
            }
            .header-title {
              flex: 2;
              text-align: center;
            }
            .header-title h1 {
              color: #0284c7;
              font-size: 24px;
              margin: 0;
              border-bottom: none;
              padding-bottom: 0;
            }
            .header-empty {
              flex: 1;
            }
            
            h1 { color: #0284c7; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 3px; text-align: left; font-size: 9px; }
            th { background-color: #f1f5f9; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            
            /* Prevent rows from splitting cleanly down the middle across pages */
            tr { page-break-inside: avoid; } 
            td.amount {
              text-align: right;
            }

            td.total-label {
              border: none;
              text-align: right;
              font-weight: bold;
              font-size: 13px;
              padding: 3px;
              background-color: transparent;
            }
            td.total-amount {
              font-weight: bold;
              text-align: right;
            }
            .signature-container {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
              padding-left: 10px;
              padding-right: 10px;
              page-break-inside: avoid;
              page-break-after: always;
              break-after: page;
            }

            .signature-block {
              width: 30%;
              display: flex;
              flex-direction: column;
            }

            .signature-line {
              border-bottom: 1.5px solid #0f172a;
              margin-bottom: 8px;
              margin-top: 50px;
            }

            .signature-label {
              font-size: 12px;
              font-weight: bold;
              color: #1e293b;
              margin: 0;
            }

            .signature-date {
              font-size: 11px;
              color: #64748b;
              margin-top: 6px;
              margin-bottom: 0;
            }

            .report-title {
              margin-bottom: 0;
              margin-top: 0;
            }

            .report-due {
              margin-bottom: 5;
              margin-top: 0;
            }

            .employee-info-section {
              display: flex;
              flex-direction: row;
              justify-content: space-between;
            }

            .employee-info {
              display: flex;
              flex-direction: row;
              margin-right: 20px;
            }

            .page-break {
              page-break-before: always;
              break-before: page;
            }

            .details-container {
              display: flex;
              flex-direction: column;
              padding: 10px 0;
              border-bottom: 1.5px solid #e2e8f0;
            }

            .details-row {
              display: flex;
              flex-direction: row;
              flex-wrap: wrap;
            }

            .details {
              display: flex;
              flex-direction: column;
              margin-right: 30px;
              margin-bottom: 5px;
            }

            .details-label {
              color: #cccccc;
              font-size: 9px;
              font-weight: bold;
            }

            .details-value {  
              font-size: 9px;
            }

            .trip-details-container {
              width: 100%;
              margin-top: 5px;
            }

            .trip-item {
              margin-bottom: 8px;
              padding: 5px 0;
              border-bottom: 1px solid #f0f0f0;
            }

            .trip-item:last-child {
              border-bottom: none;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="report-header">
              <div class="header-logo">
                <img src="data:image/png;base64,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" alt="" width="100" height="71" />
              </div>
              <div class="header-title">
                <p class="report-title"><strong>KUMPULAN ABEX SDN BHD</strong></p>
                <strong><p class="report-title">OUTSTATION TRAVELLING CLAIM</p></strong>
                <p class="report-due">DUE IN <u><strong>3 WORKING DAYS</strong></u> AFTER RETURN FROM TRIP</p>
              </div>
              <div class="header-empty"></div>
            </div>
            <h1>Expense for ${expenses[0].trip_title}</h1>
            <div class="employee-info-section">
            <div class="employee-info">Name: <u>${reportUsername}</u></div>
            <div class="employee-info">ESS No: <u>${reportEssNo}</u></div>
            <div class="employee-info">Department: <u>${reportDepartment}</u></div>
            <div class="employee-info">Grade: <u>${reportGrade}</u></div>
            <div class="employee-info">Cost Center: <u>${reportCostCenter}</u></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Country</th>
                  <th>Location</th>
                  <th>Meal</th>
                  <th>Airfare</th>
                  <th>Mileage</th>
                  <th>Toll</th>
                  <th>Parking</th>
                  <th>Transport</th>
                  <th>Hotel</th>
                  <th>Own Acc</th>
                  <th>Entertainment</th>
                  <th>Laundry</th>
                  <th>Others</th>
                  <th>Sub Total</th>
                </tr>
              </thead>
              <tbody>
                ${expenses
                  .map(
                    (item) => `
                      <tr>
                        <td>${formatDateString(item.date)}</td>
                        <td>${item.country}</td>
                        <td>${item.location}</td>
                        <td class="amount">${formatAmount(getMealCost(item))}</td>
                        <td class="amount">${formatAmount(item.airfare)}</td>
                        <td class="amount">${formatAmount(item.mileage)}</td>
                        <td class="amount">${formatAmount(item.toll)}</td>
                        <td class="amount">${formatAmount(item.parking)}</td>
                        <td class="amount">${formatAmount(item.transport)}</td>
                        <td class="amount">${formatAmount(item.hotel)}</td>
                        <td class="amount">${formatAmount(item.own_acc)}</td>
                        <td class="amount">${formatAmount(item.entertainment)}</td>
                        <td class="amount">${formatAmount(item.laundry)}</td>
                        <td class="amount">${formatAmount(item.others)}</td>
                        <td class="amount">${formatAmount(item.total)}</td>
                      </tr>
                    `,
                  )
                  .join("")}
                  
                <tr class="total-row">
                  <td colspan="3" class="total-label">Total:</td>
                  <td class="total-amount">${formatCurrency(totals.meal)}</td>
                  <td class="total-amount">${formatCurrency(totals.airfare)}</td>
                  <td class="total-amount">${formatCurrency(totals.mileage)}</td>
                  <td class="total-amount">${formatCurrency(totals.toll)}</td>
                  <td class="total-amount">${formatCurrency(totals.parking)}</td>
                  <td class="total-amount">${formatCurrency(totals.transport)}</td>
                  <td class="total-amount">${formatCurrency(totals.hotel)}</td>
                  <td class="total-amount">${formatCurrency(totals.own_acc)}</td>
                  <td class="total-amount">${formatCurrency(totals.entertainment)}</td>
                  <td class="total-amount">${formatCurrency(totals.laundry)}</td>
                  <td class="total-amount">${formatCurrency(totals.others)}</td>
                  <td class="total-amount">${formatCurrency(totals.total)}</td>
                </tr>
              </tbody>
              
            </table>
            <div class="signature-container">
              <div class="signature-block">
                <p class="signature-label">Claimed By:</p>
                <div class="signature-line"></div>
                <p class="signature-date">Name: ${reportUsername}</p>
                <p class="signature-date">Date: ${getCurrentDate()}</p>
              </div>

              <div class="signature-block">
                <p class="signature-label">Approved By:</p>
                <div class="signature-line"></div>
                <p class="signature-date">Name: </p>
                <p class="signature-date">Date: </p>
              </div>
            </div>
            <div>
              <h1>Detailed Reports for ${expenses[0].trip_title} </h1>
              ${expenses
                .map(
                  (item) => `
                  <div class="details-container">
                    <div class="details-row">
                      <div class="details">
                        <div class="details-label">Username: </div>
                        <div class="details-value">${item.user_name || item.username}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Date: </div>
                        <div class="details-value">${item.date}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Travel Purposes: </div>
                        <div class="details-value">${(item.travel_purposes || []).join(", ")}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Type: </div>
                        <div class="details-value">Outstation Expense</div>
                      </div>
                    </div>
                    <div class="details-row" style="margin-top: 10px;">
                      <div class="details">
                        <div class="details-label">Airfare: </div>
                        <div class="details-value">RM ${formatCurrency(item.airfare)}, ${item.airfare_remark || "N/A"}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Mileage: </div>
                        <div class="details-value">RM ${formatCurrency(item.mileage || 0)}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Toll: </div>
                        <div class="details-value">RM ${formatCurrency(item.toll || 0)}, ${item.toll_remark || "N/A"}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Parking: </div>
                        <div class="details-value">RM ${formatCurrency(item.parking)}, ${item.parking_remark || "N/A"}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Transport: </div>
                        <div class="details-value">RM ${formatCurrency(item.transport)}, ${item.transport_remark || "N/A"}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Hotel: </div>
                        <div class="details-value">RM ${formatCurrency(item.hotel)}, ${item.hotel_remark || "N/A"}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Own Acc: </div>
                        <div class="details-value">RM ${formatCurrency(item.own_acc)}, ${item.own_acc_sharing || "N/A"}, ${item.own_acc_remark || "N/A"}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Entertainment: </div>
                        <div class="details-value">RM ${formatCurrency(item.entertainment)}, ${item.entertainment_remark || "N/A"}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Laundry: </div>
                        <div class="details-value">RM ${formatCurrency(item.laundry)}, ${item.laundry_remark || "N/A"}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Others: </div>
                        <div class="details-value">RM ${formatCurrency(item.others)}, ${item.others_remark || "N/A"}</div>
                      </div>
                    </div>

                    <div class="details-row" style="margin-top: 10px;">
                      <div class="details">
                        <div class="details-label">Breakfast: </div>
                        <div class="details-value">${item.breakfast ? "No" : "Yes"}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Lunch: </div>
                        <div class="details-value">${item.lunch ? "No" : "Yes"}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Dinner: </div>
                        <div class="details-value">${item.dinner ? "No" : "Yes"}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Meal Cost: </div>
                        <div class="details-value">RM ${formatCurrency(getMealCost(item))}</div>
                      </div>
                      <div class="details">
                        <div class="details-label">Total: </div>
                        <div class="details-value">RM ${formatCurrency(item.total)}</div>
                      </div>
                    </div>
                    
                    <div class="details-row" style="margin-top: 10px; flex-direction: column;">
                      <div class="details" style="flex: 1; width: 100%;">
                        <div class="details-label">Customers: </div>
                        <div class="details-value trip-details-container">
                          ${generateCustomerDetails(item.customers || [])}
                        </div>
                      </div>
                    </div>

                    <div class="details-row" style="margin-top: 10px;">
                      <div class="details">
                        <div class="details-label">Trip Report: </div>
                        <div class="details-value">${item.trip_report}</div>
                      </div>
                    </div>
                  </div>
                `,
                )
                .join("")}
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  const columns = [
    { header: "Date", dataKey: "date" },
    { header: "Type", dataKey: "type" },
    { header: "Email", dataKey: "email" },
    { header: "Role", dataKey: "role" },
  ];

  const formatDateString = (dateString?: string) => {
    if (!dateString) return "N/A";

    return dateString.split("-").reverse().join("/");
  };

  // Helper functions
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "";
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
    return new Date(timestamp).toLocaleDateString();
  };

  const formatFirebaseTime = (timestamp: any) => {
    if (!timestamp) return "N/A";

    // 1. Handle standard Firebase Timestamp object
    if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    // 2. Fallback: If it's already a native JS Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    // 3. Fallback: If it's a string or anything else, try to force stringify it safely
    if (typeof timestamp === "string") return timestamp;

    // 4. CRITICAL: Absolute fallback to ensure an object is NEVER returned to React
    return "N/A";
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

  const renderTripModal = () => {
    return (
      <Modal
        visible={showTripModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTripModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTripModal(false)}
        >
          <View style={styles.userModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTripTitle}>Select a Trip</Text>
              <TouchableOpacity onPress={() => setShowTripModal(false)}>
                <Text style={styles.closeModal}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Trip Title</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>User</Text>
                </View>
              </View>

              <ScrollView style={styles.modalList}>
                {groupedExpense(oustationExpense).map((trip) => {
                  /* const isAdded =
                                formTripCountry === place.country &&
                                formTripLocation === place.location; */

                  const isAdded = false;

                  return (
                    <TouchableOpacity
                      key={trip.request_id}
                      style={[
                        styles.tableRow,
                        isAdded && styles.disabledPlaceItem,
                      ]}
                      disabled={isAdded}
                      onPress={() => {
                        setRequestId(trip.request_id);
                        setShowTripModal(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {trip?.trip_title}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {trip?.user_name || "N/A"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* <ScrollView style={styles.modalList}>
              {groupedExpenses.length === 0 && (
                <Text style={styles.noTripsText}>No trips found</Text>
              )}
              {groupedExpenses.map((trip) => {
                //const isAdded = selectedRequestId == trip.id || trip.locked;
                const isAdded = false;

                return (
                  <TouchableOpacity
                    key={trip.trip_title}
                    style={[
                      styles.modalTripItem,
                      isAdded && styles.disabledTripItem,
                    ]}
                    onPress={() => {
                      if (isAdded) return;
                      setShowTripModal(false);
                      //handleAddTrip(trip.id);
                    }}
                  >
                    <Text
                      style={[styles.tripTitle, isAdded && styles.disabledText]}
                    >
                      {trip?.trip_title}
                    </Text>
                    <Text
                      style={[
                        styles.tripPurpose,
                        isAdded && styles.disabledText,
                      ]}
                    >
                      {trip?.user_name || "N/A"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView> */}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderRequestModal = () => {
    return (
      <Modal
        visible={showRequestModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRequestModal(false)}
        >
          <View style={styles.userModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTripTitle}>Select a Trip</Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Text style={styles.closeModal}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Trip Title</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>User</Text>
                </View>
              </View>

              <ScrollView style={styles.modalList}>
                {allRequests.map((trip) => {
                  const isAdded = false;

                  return (
                    <TouchableOpacity
                      key={trip.request_id}
                      style={[
                        styles.tableRow,
                        isAdded && styles.disabledPlaceItem,
                      ]}
                      disabled={isAdded}
                      onPress={() => {
                        //setPrintRequestId(trip.id);
                        setShowRequestModal(false);
                        exportRequestToPdf(trip.id);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {trip?.trip_title}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {trip?.user_name || "N/A"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* <ScrollView style={styles.modalList}>
              {groupedExpenses.length === 0 && (
                <Text style={styles.noTripsText}>No trips found</Text>
              )}
              {groupedExpenses.map((trip) => {
                //const isAdded = selectedRequestId == trip.id || trip.locked;
                const isAdded = false;

                return (
                  <TouchableOpacity
                    key={trip.trip_title}
                    style={[
                      styles.modalTripItem,
                      isAdded && styles.disabledTripItem,
                    ]}
                    onPress={() => {
                      if (isAdded) return;
                      setShowTripModal(false);
                      //handleAddTrip(trip.id);
                    }}
                  >
                    <Text
                      style={[styles.tripTitle, isAdded && styles.disabledText]}
                    >
                      {trip?.trip_title}
                    </Text>
                    <Text
                      style={[
                        styles.tripPurpose,
                        isAdded && styles.disabledText,
                      ]}
                    >
                      {trip?.user_name || "N/A"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView> */}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderHeader = () => (
    <View
      style={[
        styles.reportSummaryCard,
        { padding: isDashboardVisible ? 20 : 10 },
      ]}
    >
      <TouchableOpacity
        onPress={() => setIsDashboardVisible(!isDashboardVisible)}
        style={{
          alignSelf: "flex-end",
          padding: 4,
          marginBottom: isDashboardVisible ? 10 : 0,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 12, opacity: 0.8 }}>
          {isDashboardVisible ? "✕ Hide Filter" : "View Filter"}
        </Text>
      </TouchableOpacity>
      {isDashboardVisible && (
        <>
          {/* <Text style={styles.reportSummaryTitle}>
            {role === 0 ? "Organization" : "My"} Expense Report
          </Text> */}
          {/* <View style={styles.reportSummaryRow}>
            <View style={styles.reportSummaryItem}>
              <Text style={styles.reportSummaryLabel}>Total Reimbursement</Text>
              <Text style={styles.reportSummaryValue}>
                RM {expenses.reduce((sum, e) => sum + e.cost, 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.reportSummaryItem}>
              <Text style={styles.reportSummaryLabel}>Total Distance</Text>
              <Text style={styles.reportSummaryValue}>
                {expenses.reduce((sum, e) => sum + e.distance, 0).toFixed(2)} km
              </Text>
            </View>
          </View> */}
          {Platform.OS === "web" && (
            <View
              style={{
                backgroundColor: "transparent",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginBottom: 16,
                  backgroundColor: "transparent",
                  alignItems: "flex-end",
                }}
              >
                <View
                  style={{
                    flex: 1,
                    marginRight: 12,
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 11,
                      marginBottom: 4,
                      fontWeight: "600",
                    }}
                  >
                    Start Date
                  </Text>
                  {/* <TextInput
                    placeholder="YYYY-MM-DD"
                    value={startDate}
                    onChangeText={setStartDate}
                    style={styles.filterInput}
                  /> */}
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={styles.filterInput}
                  />
                </View>
                <View
                  style={{
                    flex: 1,
                    marginRight: 12,
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 11,
                      marginBottom: 4,
                      fontWeight: "600",
                    }}
                  >
                    End Date
                  </Text>
                  {/* <TextInput
                    placeholder="YYYY-MM-DD"
                    value={endDate}
                    onChangeText={setEndDate}
                    style={styles.filterInput}
                  /> */}
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={styles.filterInput}
                  />
                </View>
                <View
                  style={{
                    flex: 1,
                    marginRight: 12,
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 11,
                      marginBottom: 4,
                      fontWeight: "600",
                    }}
                  >
                    Expense Type
                  </Text>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    style={inputBase}
                  >
                    <option value="All" disabled>
                      All
                    </option>
                    <option value="Mileage">Mileage Expense</option>
                    <option value="General">General Expense</option>
                    <option value="Outstation">Outstation Expense</option>
                  </select>
                </View>

                {expenseType !== "Outstation" ? (
                  <View
                    style={{
                      flex: 1,
                      marginRight: 12,
                      backgroundColor: "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 11,
                        marginBottom: 4,
                        fontWeight: "600",
                      }}
                    >
                      Expense Purpose
                    </Text>
                    <select
                      value={expensePurpose}
                      onChange={(e) => setExpensePurpose(e.target.value)}
                      style={inputBase}
                      disabled={
                        expenseType === "All" || expenseType === "Outstation"
                      }
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
                    </select>
                  </View>
                ) : (
                  <View
                    style={{
                      flex: 1,
                      marginRight: 12,
                      backgroundColor: "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 11,
                        marginBottom: 4,
                        fontWeight: "600",
                      }}
                    >
                      Trip
                    </Text>
                    <View
                      style={{
                        borderRadius: 6,
                        overflow: "hidden",
                      }}
                    >
                      <TouchableOpacity
                        style={styles.tripButton}
                        onPress={() => {
                          setShowTripModal(true);
                          console.log();
                        }}
                      >
                        <Text ellipsizeMode="tail">
                          {requestId === ""
                            ? "Select a Trip"
                            : groupedExpenses.find(
                                (group) => group.request_id === requestId,
                              )?.trip_title || "N/A"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {/* <select
                      value={expensePurpose}
                      onChange={(e) => setExpensePurpose(e.target.value)}
                      style={inputBase}
                    >
                      <option value="" disabled>
                        Select a purpose...
                      </option>

                      {filteredOutstationExpense.length > 0 ? (
                        filteredOutstationExpense.map((e) => (
                          <option key={e.id} value={e.id}>
                            {`${e.trip_title}\n${e.user_name || e.username || "N/A"}`}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          No trips available
                        </option>
                      )}
                    </select> */}
                  </View>
                )}

                {renderTripModal()}

                {role == 0 && (
                  <View
                    style={{
                      flex: 1,
                      marginRight: 12,
                      backgroundColor: "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 11,
                        marginBottom: 4,
                        fontWeight: "600",
                      }}
                    >
                      User
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        console.log("aa");
                        setShowUserModal(true);
                      }}
                    >
                      <Text style={[inputBase, { paddingVertical: 5 }]}>
                        {usernameFilter || "Select a user..."}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* <View
                  style={{
                    flex: 1,
                    marginRight: 12,
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 11,
                      marginBottom: 4,
                      fontWeight: "600",
                    }}
                  >
                    User
                  </Text>
                  <Text style={inputBase}>test</Text>
                </View> */}
                <TouchableOpacity
                  style={{
                    backgroundColor: "rgba(255,255,255,0.15)",
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                  }}
                  onPress={() => {
                    setAppliedStartDate(startDate);
                    setAppliedEndDate(endDate);
                    setAppliedUsername(usernameFilter);
                    setAppliedExpenseType(expenseType);
                    setAppliedExpensePurpose(expensePurpose);
                    updateUserFilter(usernameFilter);
                    setAppliedRequestId(requestId);
                    console.log(requestId);
                    console.log(appliedRequestId);
                    console.log(groupedExpenses);
                    console.log(filteredOutstationExpense);
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}
                  >
                    Apply
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: "rgba(255,255,255,0.15)",
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                  }}
                  onPress={() => {
                    setStartDate("");
                    setEndDate("");
                    setAppliedStartDate("");
                    setAppliedEndDate("");
                    setUsenameFilter("");
                    setAppliedUsername("");
                    setExpenseType("All");
                    setAppliedExpenseType("All");
                    setExpensePurpose("");
                    setAppliedExpensePurpose("");
                    setAppliedCostCenter("");
                    setAppliedEssNo("");
                    setAppliedDepartment("");
                    setAppliedGrade("");
                    setRequestId("");
                    setAppliedRequestId("");
                    updateUserFilter("");
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}
                  >
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginBottom: 16,
                  backgroundColor: "transparent",
                  alignItems: "flex-end",
                }}
              ></View>

              {appliedExpenseType === "Outstation" ? (
                <TouchableOpacity
                  style={[styles.exportButton]}
                  onPress={exportOutstationToPdf}
                >
                  <Text style={styles.exportButtonText}>
                    Generate PDF Report (Outstation)
                  </Text>
                </TouchableOpacity>
              ) : appliedExpenseType === "Mileage" ? (
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={exportMileageToPdf}
                >
                  <Text style={styles.exportButtonText}>
                    Generate PDF Report (Mileage)
                  </Text>
                </TouchableOpacity>
              ) : appliedExpenseType === "General" ? (
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={exportGeneralToPdf}
                >
                  <Text style={styles.exportButtonText}>
                    Generate PDF Report (General)
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.exportButton, { opacity: 0.5 }]}
                  disabled={true}
                >
                  <Text style={styles.exportButtonText}>
                    Generate PDF Report
                  </Text>
                </TouchableOpacity>
              )}

              {appliedExpenseType === "Outstation" && (
                <TouchableOpacity
                  style={[styles.exportButton, { marginTop: 10 }]}
                  onPress={() => {
                    setShowRequestModal(true);
                  }}
                >
                  <Text style={styles.exportButtonText}>
                    Generate PDF Report (Travel Requests)
                  </Text>
                </TouchableOpacity>
              )}

              {renderSelectUserModal()}
              {renderRequestModal()}
            </View>
          )}
        </>
      )}
    </View>
  );

  const renderWebCard = ({ item }: { item: Expense }) => {
    const isExpanded = expandedId === item.id;
    const isEditing = editingId === item.id;

    return (
      <div key={item.id} style={webCardStyles.card}>
        {/* Header (clickable to expand/collapse) */}
        <div
          style={webCardStyles.cardHeader}
          onClick={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <div style={webCardStyles.leftInfo}>
            <div style={webCardStyles.purpose}>{item.purpose}</div>
            <div style={webCardStyles.subInfo}>
              {item.company} • {item.name}
            </div>
          </div>
          <div style={webCardStyles.cost}>RM {item.cost.toFixed(2)}</div>
        </div>

        {/* Expanded detail panel */}
        {isExpanded && (
          <div style={webCardStyles.expandedContent}>
            {/* Same content as mobile expanded section – reuse your existing layout */}
            {/* I'll reuse the same JSX from the mobile `isExpanded` block, just replace React Native components with HTML equivalents */}
            <div style={webCardStyles.section}>
              <div style={webCardStyles.descriptionLabel}>Date:</div>
              {isEditing ? (
                <input
                  type="date"
                  value={editFormData.date || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, date: e.target.value })
                  }
                  style={webCardStyles.input}
                />
              ) : (
                <div style={webCardStyles.descriptionText}>
                  {item.date || "N/A"}
                </div>
              )}

              <div style={webCardStyles.descriptionLabel}>Purpose:</div>
              {isEditing ? (
                <select
                  value={editFormData.purpose || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      purpose: e.target.value,
                    })
                  }
                  style={webCardStyles.select}
                >
                  {purposeList.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={webCardStyles.descriptionText}>{item.purpose}</div>
              )}

              {/* Add all other fields (Company, Name, Time, Parking, Toll, Trip Report, etc.) exactly as in mobile expanded view but using HTML tags */}
              {/* ... (copy the rest of the fields from mobile `isExpanded` block, replacing Text with div, TextInput with input/textarea, etc.) */}
            </div>

            {/* Action buttons (Edit/Delete/Save/Cancel) */}
            <div style={webCardStyles.actionButtons}>
              {isEditing ? (
                <>
                  <button
                    style={webCardStyles.saveBtn}
                    onClick={handleSaveEditMileage}
                  >
                    Save
                  </button>
                  <button
                    style={webCardStyles.cancelBtn}
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                item.approval_status === 0 && (
                  <button
                    style={webCardStyles.editBtn}
                    onClick={() => handleEditMileage(item)}
                  >
                    Edit
                  </button>
                )
              )}
              <button
                style={webCardStyles.deleteBtn}
                onClick={() => handleDelete(item.id)}
              >
                Delete
              </button>
            </div>

            {/* Admin approve/reject if needed */}
            {role === 0 && item.approval_status === 0 && (
              <div style={webCardStyles.adminButtons}>
                <button
                  style={webCardStyles.approveBtn}
                  onClick={() => handleStatus(item.id, 1)}
                >
                  Approve
                </button>
                <button
                  style={webCardStyles.rejectBtn}
                  onClick={() => handleStatus(item.id, 2)}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderExpenseDetail = () => {
    if (selectedExpense && selectedExpenseType === 1) {
      return (
        <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 8 }}>
          {renderMileageDetailView(selectedExpense)}
        </View>
      );
    }

    if (selectedGeneralExpense && selectedExpenseType === 2) {
      return (
        <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 8 }}>
          {renderGeneralDetailView(selectedGeneralExpense)}
        </View>
      );
    }

    if (selectedOutstationTrip && selectedExpenseType === 3) {
      return (
        <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 8 }}>
          {renderOutstationDetailView(selectedOutstationTrip)}
        </View>
      );
    }

    return (
      <Text
        style={{
          textAlign: "center",
          marginTop: 20,
          color: "#999",
          fontSize: 16,
        }}
      >
        Select an expense from the left to view details
      </Text>
    );
  };

  const renderMileageDetailView = (expense: Expense) => {
    const isEditing = editingId === expense.id;

    return (
      <View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
            paddingBottom: 12,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "600" }}>
            Expense Details
          </Text>
          <View style={{ flexDirection: "row" }}>
            {!isEditing &&
              expense.approval_status === 0 &&
              expense.user_id === userId && (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#FF9800",
                    padding: 8,
                    borderRadius: 6,
                    minWidth: 60,
                    alignItems: "center",
                  }}
                  onPress={() => handleEditMileage(expense)}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Edit
                  </Text>
                </TouchableOpacity>
              )}
            {!isEditing && (
              <TouchableOpacity
                style={{
                  backgroundColor: "#F44336",
                  padding: 8,
                  borderRadius: 6,
                  marginLeft: 8,
                  minWidth: 60,
                  alignItems: "center",
                }}
                onPress={() => handleDelete(expense.id)}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          {/* <Text
            style={{
              fontSize: 12,
              color: "#999",
              fontWeight: "bold",
              marginBottom: 4,
            }}
          >
            Date:
          </Text>
          {isEditing ? (
            <TextInput
              style={styles.inlineInput}
              value={editFormData.date}
              onChangeText={(text) =>
                setEditFormData({ ...editFormData, date: text })
              }
              placeholder="YYYY-MM-DD"
            />
          ) : (
            <Text style={{ fontSize: 14, color: "#444" }}>
              {expense.date || "N/A"}
            </Text>
          )} */}

          {!expense.customers && (
            <View style={{ flexDirection: "row", marginBottom: 10 }}>
              <View style={{ flexDirection: "column", marginRight: 20 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#999",
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                >
                  Customer Name:
                </Text>
                {isEditing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={editFormData.name}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, name: text })
                    }
                    placeholder="Customer Name"
                  />
                ) : (
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {expense.name || "N/A"}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: "column", marginRight: 20 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#999",
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                >
                  Company:
                </Text>
                {isEditing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={editFormData.company}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, company: text })
                    }
                    placeholder="Company"
                  />
                ) : (
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {expense.company || "N/A"}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: "column", marginRight: 20 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#999",
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                >
                  Contact Number:
                </Text>
                {isEditing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={editFormData.contact_number}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, contact_number: text })
                    }
                    placeholder="Contact Number"
                  />
                ) : (
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {expense.contact_number || "N/A"}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: "column", marginRight: 20 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#999",
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                >
                  Email:
                </Text>
                {isEditing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={editFormData.email}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, email: text })
                    }
                    placeholder="Email"
                  />
                ) : (
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {expense.email || "N/A"}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: "column", marginRight: 20 }}></View>
            </View>
          )}

          <View style={{ marginBottom: 10 }}>
            {expense.customers?.map((item, index) => (
              <View style={{ marginBottom: 10, flexDirection: "column" }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#999",
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                >
                  Customer #{index + 1}:
                </Text>
                <View style={{ flexDirection: "row" }}>
                  <View style={{ flexDirection: "column", marginRight: 20 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Company:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {item.company}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "column", marginRight: 20 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Customer Name:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "column", marginRight: 20 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Contact Number:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {item.number}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "column", marginRight: 20 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Email:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {item.email}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "column", marginRight: 20 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Time:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {format12Hour(item.time)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", marginBottom: 10 }}>
            <View style={{ flexDirection: "column", marginRight: 30 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Distance:
              </Text>
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.distance} km
              </Text>
            </View>
            <View style={{ flexDirection: "column", marginRight: 30 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Time:
              </Text>
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.from_time} - {expense.to_time} ({expense.duration})
              </Text>
            </View>
            <View style={{ flexDirection: "column", marginRight: 30 }}></View>
          </View>

          <View style={{ flexDirection: "row", marginBottom: 10 }}>
            <View style={{ flexDirection: "column", marginRight: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Parking:
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormData.parking?.toString()}
                  onChangeText={(text) => {
                    const parsedValue = text === "" ? 0 : parseFloat(text);

                    setEditFormData({
                      ...editFormData,
                      parking: isNaN(parsedValue) ? 0 : parsedValue,
                    });
                  }}
                  placeholder="Parking"
                  keyboardType="decimal-pad"
                />
              ) : (
                <Text style={{ fontSize: 14, color: "#444" }}>
                  RM {expense.parking.toFixed(2)}
                </Text>
              )}
              {/* <Text style={{ fontSize: 14, color: "#444" }}>
                RM {expense.parking.toFixed(2)}
              </Text> */}
            </View>
            <View style={{ flexDirection: "column", marginRight: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Toll:
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormData.toll?.toString()}
                  onChangeText={(text) => {
                    const parsedValue = text === "" ? 0 : parseFloat(text);

                    setEditFormData({
                      ...editFormData,
                      toll: isNaN(parsedValue) ? 0 : parsedValue,
                    });
                  }}
                  placeholder="Toll"
                  keyboardType="decimal-pad"
                />
              ) : (
                <Text style={{ fontSize: 14, color: "#444" }}>
                  RM {expense.toll.toFixed(2)}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "column", marginRight: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Mileage:
              </Text>
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {expense.mileage.toFixed(2)}
              </Text>
            </View>
            <View style={{ flexDirection: "column", marginRight: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Expense:
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormData.expense?.toString()}
                  onChangeText={(text) => {
                    const parsedValue = text === "" ? 0 : parseFloat(text);

                    setEditFormData({
                      ...editFormData,
                      expense: isNaN(parsedValue) ? 0 : parsedValue,
                    });
                  }}
                  placeholder="Expense"
                  keyboardType="decimal-pad"
                />
              ) : (
                <Text style={{ fontSize: 14, color: "#444" }}>
                  RM{" "}
                  {typeof expense.expense === "number"
                    ? expense.expense.toFixed(2)
                    : "0.00"}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "column", marginRight: 50 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Expense Purpose:
              </Text>
              {isEditing ? (
                <select
                  value={editFormData.expense_purpose?.toString()}
                  onChange={(e) => {
                    setEditFormData({
                      ...editFormData,
                      expense_purpose: e.target.value,
                    });
                  }}
                  style={htmlSelectStyle}
                >
                  <option value="">Select a purpose...</option>
                  <option value="Meal with customer">Meal with customer</option>
                  <option value="Meal with supplier">Meal with supplier</option>
                  <option value="Purchase of goods">Purchase of goods</option>
                  <option value="Staff benefits">Staff benefits</option>
                  <option value="Others">Others</option>
                </select>
              ) : (
                <Text style={{ fontSize: 14, color: "#444" }}>
                  {expense.expense_purpose || "N/A"}
                </Text>
              )}
              {/* <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.expense_purpose || "N/A"}
              </Text> */}
            </View>
          </View>

          <Text
            style={{
              fontSize: 12,
              color: "#999",
              fontWeight: "bold",
              marginBottom: 4,
            }}
          >
            Trip Report:
          </Text>
          {isEditing ? (
            <TextInput
              style={[
                styles.inlineInput,
                { minHeight: 200, width: "100%", maxWidth: "100%" },
              ]}
              value={editFormData.trip_report}
              multiline
              onChangeText={(text) =>
                setEditFormData({ ...editFormData, trip_report: text })
              }
              placeholder="Trip Report"
            />
          ) : (
            <Text style={{ fontSize: 14, color: "#444" }}>
              {expense.trip_report || "N/A"}
            </Text>
          )}

          {expense.trip_ids && expense.trip_ids.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.descriptionLabel}>Trips:</Text>
              {expense.trip_ids.map((tripId) => {
                const trip = getTripById(tripId);
                return trip ? (
                  <View key={tripId} style={styles.tripItem}>
                    <Text style={styles.descriptionText}>
                      {trip.platform === 2 ? "Web" : "Mobile"}
                    </Text>
                    <Text style={styles.tripDetail}>
                      <strong>Remark: </strong>
                      {trip.remark}
                    </Text>
                    {/* <Text style={styles.tripDetail}>
                      <strong>Time: </strong>
                      {formatFirebaseTime(trip.from_time)} →{" "}
                      {formatFirebaseTime(trip.to_time)}
                    </Text> */}
                    <Text style={styles.tripDetail}>
                      <strong>Trip: </strong>
                      {trip.from_address} →{"\n"}
                      {trip.to_address} {"\n"}({trip.distance?.toFixed(2)} km)
                    </Text>
                    <Text style={styles.tripDetail}>
                      <strong>From Home: </strong>
                      {trip.from_home ? "Yes" : "No"}
                    </Text>
                    <Text style={styles.tripDetail}>
                      <strong>To Home: </strong>
                      {trip.to_home === true ? "Yes" : "No"}
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

        {/* Add all other fields exactly as in your mobile expanded section (Purpose, Company, Name, Contact, Time, Parking, Toll, Mileage, Trip Report, Images, etc.) */}

        {/* Action buttons when editing */}
        {isEditing && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#4CAF50",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={handleSaveEditMileage}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#F44336",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={handleCancelEdit}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Admin approve/reject */}
        {/* {role === 0 && expense.approval_status === 0 && !isEditing && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#4CAF50",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={() => handleStatus(expense.id, 1)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#F44336",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={() => handleStatus(expense.id, 2)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Reject</Text>
            </TouchableOpacity>
          </View>
        )} */}
      </View>
    );
  };

  const renderGeneralDetailView = (expense: GeneralExpense) => {
    const isEditing = editingId === expense.id;

    return (
      <View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
            paddingBottom: 12,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "600" }}>
            Expense Details
          </Text>
          <View style={{ flexDirection: "row" }}>
            {!isEditing &&
              expense.approval_status === 0 &&
              expense.user_id === userId && (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#FF9800",
                    padding: 8,
                    borderRadius: 6,
                    minWidth: 60,
                    alignItems: "center",
                  }}
                  onPress={() => handleEditGeneral(expense)}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Edit
                  </Text>
                </TouchableOpacity>
              )}
            {!isEditing && (
              <TouchableOpacity
                style={{
                  backgroundColor: "#F44336",
                  padding: 8,
                  borderRadius: 6,
                  marginLeft: 8,
                  minWidth: 60,
                  alignItems: "center",
                }}
                onPress={() => handleDelete(expense.id)}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 12,
              color: "#999",
              fontWeight: "bold",
              marginBottom: 4,
            }}
          >
            Date:
          </Text>
          {isEditing ? (
            <TextInput
              style={styles.inlineInput}
              value={editFormData.date}
              onChangeText={(text) =>
                setEditFormData({ ...editFormData, date: text })
              }
              placeholder="YYYY-MM-DD"
            />
          ) : (
            <Text style={{ fontSize: 14, color: "#444" }}>
              {expense.date || "N/A"}
            </Text>
          )}
        </View> */}

        {!expense.customers && (
          <View style={{ flexDirection: "row", marginBottom: 10 }}>
            <View style={{ flexDirection: "column", marginRight: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Customer Name:
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormDataGeneral.name}
                  onChangeText={(text) =>
                    setEditFormDataGeneral({ ...editFormData, name: text })
                  }
                  placeholder="Customer Name"
                />
              ) : (
                <Text style={{ fontSize: 14, color: "#444" }}>
                  {expense.name || "N/A"}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "column", marginRight: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Company:
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormDataGeneral.company}
                  onChangeText={(text) =>
                    setEditFormDataGeneral({ ...editFormData, company: text })
                  }
                  placeholder="Company"
                />
              ) : (
                <Text style={{ fontSize: 14, color: "#444" }}>
                  {expense.company || "N/A"}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "column", marginRight: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Contact Number:
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormDataGeneral.contact_number}
                  onChangeText={(text) =>
                    setEditFormDataGeneral({
                      ...editFormData,
                      contact_number: text,
                    })
                  }
                  placeholder="Contact Number"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={{ fontSize: 14, color: "#444" }}>
                  {expense.contact_number || "N/A"}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "column", marginRight: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Email:
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.inlineInput}
                  value={editFormDataGeneral.email}
                  onChangeText={(text) =>
                    setEditFormDataGeneral({ ...editFormData, email: text })
                  }
                  placeholder="Email"
                />
              ) : (
                <Text style={{ fontSize: 14, color: "#444" }}>
                  {expense.email || "N/A"}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "column", marginRight: 20 }}></View>
          </View>
        )}

        <View style={{ marginBottom: 10 }}>
          {expense.customers?.map((item, index) => (
            <View style={{ marginBottom: 10, flexDirection: "column" }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Customer #{index + 1}:
              </Text>
              <View style={{ flexDirection: "row" }}>
                <View style={{ flexDirection: "column", marginRight: 20 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#999",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Customer Name:
                  </Text>
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {item.name}
                  </Text>
                </View>
                <View style={{ flexDirection: "column", marginRight: 20 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#999",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Company:
                  </Text>
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {item.company}
                  </Text>
                </View>
                <View style={{ flexDirection: "column", marginRight: 20 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#999",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Contact Number:
                  </Text>
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {item.number}
                  </Text>
                </View>
                <View style={{ flexDirection: "column", marginRight: 20 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#999",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Email:
                  </Text>
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {item.email}
                  </Text>
                </View>
                <View style={{ flexDirection: "column", marginRight: 20 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#999",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Time:
                  </Text>
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {format12Hour(item.time)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View
          style={{ flexDirection: "column", marginRight: 20, marginBottom: 10 }}
        >
          <Text
            style={{
              fontSize: 12,
              color: "#999",
              fontWeight: "bold",
              marginBottom: 4,
            }}
          >
            Vendor:
          </Text>
          <Text style={{ fontSize: 14, color: "#444" }}>{expense.vendor}</Text>
        </View>

        <View style={{ marginBottom: 10 }}>
          <Text
            style={{
              fontSize: 12,
              color: "#999",
              fontWeight: "bold",
              marginBottom: 4,
            }}
          >
            Expense Report:
          </Text>
          {isEditing ? (
            <TextInput
              style={[
                styles.inlineInput,
                { minHeight: 200, width: "100%", maxWidth: "100%" },
              ]}
              value={editFormDataGeneral.expense_report}
              multiline
              onChangeText={(text) =>
                setEditFormDataGeneral({
                  ...editFormData,
                  expense_report: text,
                })
              }
              placeholder="Expense Report"
            />
          ) : (
            <Text style={{ fontSize: 14, color: "#444" }}>
              {expense.expense_report || "N/A"}
            </Text>
          )}
        </View>

        {isEditing && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#4CAF50",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={handleSaveEditGeneral}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#F44336",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={handleCancelEdit}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Admin approve/reject */}
        {/* {role === 0 && expense.approval_status === 0 && !isEditing && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#4CAF50",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={() => handleStatus(expense.id, 1)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#F44336",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={() => handleStatus(expense.id, 2)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Reject</Text>
            </TouchableOpacity>
          </View>
        )} */}
      </View>
    );
  };

  const renderOutstationDetailView = (trip: ExpenseGroup) => {
    //const isEditing = editingId === expense.id;
    const isEditing = false;

    let expense = trip.data[selectedTripIndex];

    let mealCost = expense.meal;

    if (!mealCost) {
      mealCost =
        Number(expense.total) -
        (Number(expense.airfare) +
          Number(expense.parking) +
          Number(expense.transport) +
          Number(expense.hotel) +
          Number(expense.own_acc) +
          Number(expense.entertainment) +
          Number(expense.laundry) +
          Number(expense.others));
    }

    return (
      <View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
            paddingBottom: 12,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "600" }}>
            Expense Details
          </Text>
          {/* <View style={{ flexDirection: "row" }}>
            {!isEditing &&
              expense.approval_status === 0 &&
              expense.user_id === userId && (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#FF9800",
                    padding: 8,
                    borderRadius: 6,
                    minWidth: 60,
                    alignItems: "center",
                  }}
                  onPress={() => {
                    test();
                    //handleEditGeneral(expense)
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Edit
                  </Text>
                </TouchableOpacity>
              )}
            {!isEditing && (
              <TouchableOpacity
                style={{
                  backgroundColor: "#F44336",
                  padding: 8,
                  borderRadius: 6,
                  marginLeft: 8,
                  minWidth: 60,
                  alignItems: "center",
                }}
                onPress={() => handleDelete(expense.id)}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View> */}
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row" }}>
            <View style={{ flexDirection: "column", marginRight: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Date:
              </Text>
              <Text style={{ fontSize: 14, color: "#444" }}>
                {formatDate(expense.date)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: "#666", marginRight: 15 }}>
              {selectedTripIndex + 1} / {trip.data.length}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedTripIndex(selectedTripIndex - 1);
              }}
              disabled={selectedTripIndex <= 0}
              style={{
                backgroundColor: selectedTripIndex <= 0 ? "#B0BEC5" : "#2196F3",
                width: 40,
                height: 40,
                borderRadius: 8,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 10,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "bold" }}
              >
                ←
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSelectedTripIndex(selectedTripIndex + 1);
              }}
              disabled={selectedTripIndex >= trip.data.length - 1}
              style={{
                backgroundColor:
                  selectedTripIndex >= trip.data.length - 1
                    ? "#B0BEC5"
                    : "#2196F3",
                width: 40,
                height: 40,
                borderRadius: 8,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "bold" }}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row", marginBottom: 10 }}>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Airfare:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {Number(expense.airfare).toFixed(2) || "0.00"}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Airfare Remark:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.airfare_remark || "N/A"}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Mileage:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {Number(expense.mileage).toFixed(2) || "0.00"}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Toll:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {Number(expense.toll).toFixed(2) || "0.00"}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Toll Remark:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.toll_remark || "N/A"}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Parking:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {Number(expense.parking).toFixed(2) || "0.00"}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Parking Remark:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.parking_remark || "N/A"}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Transport:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {Number(expense.transport).toFixed(2) || "0.00"}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Transport Remark:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.transport_remark || "N/A"}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Hotel:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {Number(expense.hotel).toFixed(2) || "0.00"}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Hotel Remark:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.hotel_remark || "N/A"}
              </Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", marginBottom: 10 }}>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Own Acc:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {Number(expense.own_acc).toFixed(2) || "0.00"}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Solo/Duo:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.own_acc_sharing || "N/A"}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Own Acc Remark:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.own_acc_remark || "N/A"}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Entertainment:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {Number(expense.entertainment).toFixed(2) || "0.00"}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Entertainment Remark:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.entertainment_remark || "N/A"}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Laundry:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {Number(expense.laundry).toFixed(2) || "0.00"}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Laundry Remark:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.laundry_remark || "N/A"}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Others:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {Number(expense.others).toFixed(2) || "0.00"}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Others Remark:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.others_remark || "N/A"}
              </Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", marginBottom: 10 }}>
          {expense.departure_time && (
            <View style={{ flexDirection: "column", marginRight: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Departure Time:
              </Text>
              <Text style={{ fontSize: 14, color: "#444" }}>
                {formatFirebaseTime(expense.departure_time)}
              </Text>
            </View>
          )}

          {expense.arrival_time && (
            <View style={{ flexDirection: "column", marginRight: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Arrival Time:
              </Text>
              <Text style={{ fontSize: 14, color: "#444" }}>
                {formatFirebaseTime(expense.arrival_time)}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Breakfast:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.breakfast ? "No" : "Yes"}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Lunch:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.lunch ? "No" : "Yes"}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Dinner:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                {expense.dinner ? "No" : "Yes"}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "column", marginRight: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Meal Cost:
            </Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormDataGeneral.name}
                onChangeText={(text) =>
                  setEditFormDataGeneral({ ...editFormData, name: text })
                }
                placeholder="Customer Name"
              />
            ) : (
              <Text style={{ fontSize: 14, color: "#444" }}>
                RM {mealCost.toFixed(2) || "0.00"}
              </Text>
            )}
          </View>
        </View>
        <View style={{ marginBottom: 10 }}>
          {expense.customers?.map((item, index) => (
            <View style={{ marginBottom: 10, flexDirection: "column" }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Customer #{index + 1}:
              </Text>
              <View style={{ flexDirection: "row" }}>
                <View style={{ flexDirection: "column", marginRight: 20 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#999",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Name:
                  </Text>
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {item.name}
                  </Text>
                </View>
                <View style={{ flexDirection: "column", marginRight: 20 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#999",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Email:
                  </Text>
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {item.email}
                  </Text>
                </View>
                <View style={{ flexDirection: "column", marginRight: 20 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#999",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Number:
                  </Text>
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {item.number}
                  </Text>
                </View>
                <View style={{ flexDirection: "column", marginRight: 20 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#999",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Time:
                  </Text>
                  <Text style={{ fontSize: 14, color: "#444" }}>
                    {format12Hour(item.time)}
                  </Text>
                </View>
                {item.address && (
                  <View style={{ flexDirection: "column", marginRight: 20 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Address:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {item.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {expense.trip_ids && expense.trip_ids.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.descriptionLabel}>Trips:</Text>
            {expense.trip_ids.map((tripId) => {
              const trip = getTripById(tripId);
              return trip ? (
                <View key={tripId} style={styles.tripItem}>
                  <Text style={styles.descriptionText}>
                    {trip.platform === 2 ? "Web" : "Mobile"}
                  </Text>
                  <Text style={styles.tripDetail}>
                    <strong>Remark: </strong>
                    {trip.remark}
                  </Text>
                  {/* <Text style={styles.tripDetail}>
                      <strong>Time: </strong>
                      {formatFirebaseTime(trip.from_time)} →{" "}
                      {formatFirebaseTime(trip.to_time)}
                    </Text> */}
                  <Text style={styles.tripDetail}>
                    <strong>Trip: </strong>
                    {trip.from_address} →{"\n"}
                    {trip.to_address} {"\n"}({trip.distance?.toFixed(2)} km)
                  </Text>
                  <Text style={styles.tripDetail}>
                    <strong>From Home: </strong>
                    {trip.from_home ? "Yes" : "No"}
                  </Text>
                  <Text style={styles.tripDetail}>
                    <strong>To Home: </strong>
                    {trip.to_home === true ? "Yes" : "No"}
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

        <View style={{ marginBottom: 10 }}>
          <Text
            style={{
              fontSize: 12,
              color: "#999",
              fontWeight: "bold",
              marginBottom: 4,
            }}
          >
            Trip Report:
          </Text>
          {isEditing ? (
            <TextInput
              style={[
                styles.inlineInput,
                { minHeight: 200, width: "100%", maxWidth: "100%" },
              ]}
              value={editFormDataGeneral.expense_report}
              multiline
              onChangeText={(text) =>
                setEditFormDataGeneral({
                  ...editFormData,
                  expense_report: text,
                })
              }
              placeholder="Expense Report"
            />
          ) : (
            <Text style={{ fontSize: 14, color: "#444" }}>
              {expense.trip_report || "N/A"}
            </Text>
          )}
        </View>

        {isEditing && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#4CAF50",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={handleSaveEditGeneral}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#F44336",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={handleCancelEdit}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Admin approve/reject */}
        {/* {role === 0 && expense.approval_status === 0 && !isEditing && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#4CAF50",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={() => handleStatus(expense.id, 1)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#F44336",
                padding: 12,
                borderRadius: 6,
                flex: 1,
                alignItems: "center",
              }}
              onPress={() => handleStatus(expense.id, 2)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Reject</Text>
            </TouchableOpacity>
          </View>
        )} */}
      </View>
    );
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
          style={styles.modalOverlay}
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

  useEffect(() => {
    if (selectedExpenseType != 1) return;
    if (
      selectedExpenseId &&
      !filteredExpenses.some((e) => e.id === selectedExpenseId)
    ) {
      setSelectedExpenseId(null);
    }
  }, [filteredExpenses, selectedExpenseId, selectedExpenseType]);

  useEffect(() => {
    if (selectedExpenseType != 2) return;
    if (
      selectedExpenseId &&
      !filteredGeneralExpenses.some((e) => e.id === selectedExpenseId)
    ) {
      setSelectedExpenseId(null);
    }
  }, [filteredGeneralExpenses, selectedExpenseId, selectedExpenseType]);

  useEffect(() => {
    if (selectedExpenseType != 3) return;
    if (
      selectedRequestId &&
      !groupedExpenses.some((e) => e.request_id === selectedRequestId)
    ) {
      setSelectedRequestId(null);
    }
  }, [groupedExpenses, selectedRequestId, selectedExpenseType]);

  const selectedExpense = filteredExpenses.find(
    (e) => e.id === selectedExpenseId,
  );

  const selectedGeneralExpense = filteredGeneralExpenses.find(
    (e) => e.id === selectedExpenseId,
  );

  const selectedOutstationTrip = groupedExpenses.find(
    (e) => e.request_id === selectedRequestId,
  );

  const getDisplayText = (item: any) => {
    const company = item.company || item.customers?.[0]?.company || "";
    const name = item.name || item.customers?.[0]?.name || "";

    if (company && name) {
      return `${company} • ${name}`;
    }
    return company || name;
  };

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "column",
        padding: 10,
        backgroundColor: "#fff",
      }}
    >
      <View style={{ flexShrink: 0 }}>{renderHeader()}</View>

      <View style={{ flex: 1, flexDirection: "row", minHeight: 0 }}>
        {/* LEFT PANEL: 30% width, scrollable list */}
        <ScrollView
          style={{
            width: "30%",
            borderRightWidth: 1,
            borderRightColor: "#e0e0e0",
            backgroundColor: "#fafafa",
          }}
        >
          <View style={{ padding: 16 }}>
            {filteredExpenses.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={{
                  backgroundColor:
                    selectedExpenseId === item.id ? "#e3f2fd" : "#fff",
                  borderLeftWidth: selectedExpenseId === item.id ? 4 : 0,
                  borderLeftColor: "#2196F3",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                onPress={() => {
                  setSelectedExpenseId(item.id);
                  setSelectedExpenseType(item.type);
                  setSelectedRequestId("");
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 2 }}
                  >
                    {item.purpose}
                  </Text>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 2 }}
                  >
                    {
                      expenseTypeMap[
                        String(item.type) as keyof typeof expenseTypeMap
                      ]
                    }
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 8,
                    fontWeight: "600",
                  }}
                >
                  {item.user_name}
                </Text>
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                  {getDisplayText(item)}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    backgroundColor: "transparent",
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#888" }}>
                    {formatDateString(item.date)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#2196F3",
                    }}
                  >
                    RM {item.cost.toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {filteredGeneralExpenses.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={{
                  backgroundColor:
                    selectedExpenseId === item.id ? "#e3f2fd" : "#fff",
                  borderLeftWidth: selectedExpenseId === item.id ? 4 : 0,
                  borderLeftColor: "#2196F3",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                onPress={() => {
                  setSelectedExpenseId(item.id);
                  setSelectedExpenseType(item.type);
                  setSelectedRequestId("");
                  test();
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 2 }}
                  >
                    {item.expense_type}
                  </Text>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 2 }}
                  >
                    {
                      expenseTypeMap[
                        String(item.type) as keyof typeof expenseTypeMap
                      ]
                    }
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", marginBottom: 2 }}
                ></Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 8,
                    fontWeight: "600",
                  }}
                >
                  {item.user_name}
                </Text>
                {/* <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                  {item.company ||
                    (item.customers?.length && item.customers[0].company) ||
                    ""}{" "}
                  •{" "}
                  {item.name ||
                    (item.customers?.length && item.customers[0].name) ||
                    ""}
                </Text> */}
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                  {getDisplayText(item)}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    backgroundColor: "transparent",
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#888" }}>
                    {formatDateString(item.date)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#2196F3",
                    }}
                  >
                    RM{" "}
                    {typeof item.amount === "number"
                      ? item.amount.toFixed(2)
                      : item.amount}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {groupedExpenses.map((item) => (
              <TouchableOpacity
                key={item.request_id}
                style={{
                  backgroundColor:
                    selectedRequestId === item.request_id ? "#e3f2fd" : "#fff",
                  borderLeftWidth:
                    selectedRequestId === item.request_id ? 4 : 0,
                  borderLeftColor: "#2196F3",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                onPress={() => {
                  setSelectedRequestId(item.request_id);
                  setSelectedExpenseId("");
                  setSelectedExpenseType(item.type);
                  console.log(item.travel_purposes);
                  console.log(item);
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 2 }}
                  >
                    {item.trip_title}
                  </Text>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 2 }}
                  >
                    {expenseTypeMap[String(3) as keyof typeof expenseTypeMap]}
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", marginBottom: 2 }}
                ></Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 8,
                    fontWeight: "600",
                  }}
                >
                  {item.user_name}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 2,
                    fontWeight: "600",
                  }}
                >
                  {item.travel_purposes.join(", ") || ""}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    backgroundColor: "transparent",
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#888" }}>
                    {formatDate(item.start_date || "")} -{" "}
                    {formatDate(item.end_date || "")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#2196F3",
                    }}
                  >
                    RM{" "}
                    {typeof item.total_amount === "number"
                      ? item.total_amount.toFixed(2)
                      : item.total_amount}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* RIGHT PANEL: 70% width, detail view */}
        <ScrollView
          style={{ width: "70%", paddingHorizontal: 24 }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            style={[
              styles.wrapper,
              {
                minHeight: height * 0.8, // 80% of screen height
                minWidth: "100%",
              },
            ]}
          >
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={true}
              style={styles.horizontalScrollView}
              contentContainerStyle={[
                styles.horizontalContent,
                { minWidth: width * 0.7 },
              ]}
            >
              {renderExpenseDetail()}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Image preview modal (unchanged) */}
      <Modal
        visible={!!selectedImage}
        transparent
        onRequestClose={() => setSelectedImage(null)}
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

// Common style object (same as filterInput)
const inputBase = {
  backgroundColor: "#fff",
  padding: 8,
  borderRadius: 6,
  flex: 1,
  fontSize: 14,
  borderWidth: 0,
  outline: "none",
  height: 40,
  lineHeight: 24,
};

const dateField = {
  border: "0px",
};

const webTableStyles = {
  container: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    overflow: "hidden" as const,
    width: "100%",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  table: { width: "100%", borderCollapse: "collapse" as const },
  headerRow: { backgroundColor: "#f5f5f5", textAlign: "left" as const },
  th: {
    padding: "12px 15px",
    borderBottom: "2px solid #ddd",
    color: "#666",
    fontSize: "14px",
    fontWeight: "bold" as const,
  },
  td: { padding: "12px 15px", fontSize: "14px" },
};

const leftPanelStyles = {
  container: {
    width: "30%",
    borderRight: "1px solid #e0e0e0",
    height: "100vh",
    overflowY: "auto",
    backgroundColor: "#fafafa",
    padding: "16px",
    boxSizing: "border-box",
  },
  listContainer: {
    marginTop: "16px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "12px",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    transition: "all 0.2s",
    border: "1px solid #e0e0e0",
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "4px",
  },
  cardSub: {
    fontSize: "12px",
    color: "#666",
    marginBottom: "8px",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "#888",
  },
};

const rightPanelStyles = {
  container: {
    width: "70%",
    padding: "24px",
    overflowY: "auto",
    height: "100vh",
    boxSizing: "border-box",
  },
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  emptyState: {
    textAlign: "center",
    marginTop: "50px",
    color: "#999",
    fontSize: "16px",
  },
};

const detailStyles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid #eee",
    paddingBottom: "12px",
  },
  title: { margin: 0, fontSize: "20px", fontWeight: 600 },
  editBtn: {
    backgroundColor: "#FF9800",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
  },
  deleteBtn: {
    backgroundColor: "#F44336",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    marginLeft: "8px",
  },
  field: { marginBottom: "16px" },
  actionButtons: { display: "flex", gap: "12px", marginTop: "24px" },
  saveBtn: {
    backgroundColor: "#4CAF50",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
  },
  cancelBtn: {
    backgroundColor: "#9e9e9e",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
  },
  adminButtons: { display: "flex", gap: "12px", marginTop: "24px" },
  approveBtn: {
    backgroundColor: "#4CAF50",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
  },
  rejectBtn: {
    backgroundColor: "#F44336",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
  },
};

const webCardListStyles = {
  container: {
    maxHeight: "70vh", // limits height, scrollbar appears on right
    overflowY: "auto" as const,
    paddingRight: "8px",
  },
};

const webCardStyles = {
  card: {
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    marginBottom: "12px",
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    cursor: "pointer",
    borderBottom: "1px solid #f0f0f0",
  },
  leftInfo: { flex: 1 },
  purpose: { fontSize: "15px", fontWeight: 600, color: "#1e293b" },
  subInfo: { fontSize: "13px", color: "#64748b", marginTop: "4px" },
  cost: { fontSize: "16px", fontWeight: 700, color: "#2196F3" },
  expandedContent: { padding: "16px", borderTop: "1px solid #eee" },
  section: { marginBottom: "16px" },
  descriptionLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#94a3b8",
    marginTop: "8px",
  },
  descriptionText: { fontSize: "14px", color: "#334155", marginBottom: "4px" },
  input: {
    width: "100%",
    padding: "6px 10px",
    marginTop: "4px",
    marginBottom: "8px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
  },
  select: {
    width: "100%",
    padding: "6px 10px",
    marginTop: "4px",
    marginBottom: "8px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    backgroundColor: "#fff",
  },
  actionButtons: { display: "flex", gap: "8px", marginTop: "16px" },
  editBtn: {
    backgroundColor: "#FF9800",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  deleteBtn: {
    backgroundColor: "#F44336",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  saveBtn: {
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  cancelBtn: {
    backgroundColor: "#9e9e9e",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  adminButtons: { display: "flex", gap: "8px", marginTop: "12px" },
  approveBtn: {
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  rejectBtn: {
    backgroundColor: "#F44336",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  expandedContent: { marginTop: 12, backgroundColor: "transparent" },
  separator: { height: 1, backgroundColor: "#eee", marginBottom: 12 },
  descriptionLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "bold",
    marginTop: 8,
  },
  descriptionText: { fontSize: 14, color: "#444", marginBottom: 4 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "90%", height: "80%" },
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
    flex: 1,
    alignItems: "center",
  },
  editButtonText: { color: "#fff", fontWeight: "bold" },
  deleteButton: {
    backgroundColor: "#F44336",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  deleteButtonText: { color: "#fff", fontWeight: "bold" },
  detailLabel: { fontSize: 14, color: "#777" },
  detailValue: { fontSize: 14, color: "#333" },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
  modalContent: {
    width: "90%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  userModalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 8,
    overflow: "hidden",
  },
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
    maxWidth: 250,
  },
  approveButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  approveButtonText: { color: "#fff", fontWeight: "bold" },
  rejectButton: {
    backgroundColor: "#F44336",
    padding: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  rejectButtonText: { color: "#fff", fontWeight: "bold" },
  reportSummaryCard: {
    backgroundColor: "#2196F3",
    borderRadius: 12,
    marginBottom: 20,
  },
  exportButton: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  exportButtonText: { color: "#2196F3", fontWeight: "bold" },
  filterInput: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 6,
    flex: 1,
    borderWidth: 0,
  },
  inlineInput: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    fontSize: 14,
    maxWidth: 130,
  },
  businessCardImage: {
    width: "100%",
    height: 200,
    marginTop: 4,
    borderRadius: 4,
    backgroundColor: "#f9f9f9",
  },
  tripItem: {
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 4,
  },
  tripRemark: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  tripDetail: {
    fontSize: 12,
    color: "#000",
    marginTop: 2,
  },
  btn: { backgroundColor: "#10b981", padding: 14, borderRadius: 6 },
  disabled: { backgroundColor: "#a7f3d0" },
  btnText: { color: "#fff", fontWeight: "600" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  modalList: { maxHeight: 400 },
  modalUserItem: { padding: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  disabledUserItem: {
    backgroundColor: "#e0e0e0",
    opacity: 0.6,
  },
  userInfoText: { fontSize: 13, color: "#444", marginTop: 2 },
  disabledText: {
    color: "#9e9e9e", // grey text
  },
  boldLabel: { fontWeight: "bold", color: "#333" },

  modalCloseButton: { fontSize: 20, fontWeight: "bold", color: "#999" },
  tableContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 10,
    paddingBottom: 10,
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
  tripButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 6,
    flex: 1,
    borderWidth: 0,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
    fontFamily: "System",
  },

  addressText: { fontSize: 13, color: "#444", marginTop: 2 },

  disabledTripItem: {
    backgroundColor: "#e0e0e0",
    opacity: 0.6,
  },
  modalTripTitle: { fontSize: 18, fontWeight: "bold" },
  closeModal: { fontSize: 20, fontWeight: "bold", color: "#999" },
  tripTitle: { fontWeight: "bold", fontSize: 14 },
  tripPurpose: { fontSize: 12, color: "#666" },
  modalTripItem: { padding: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  wrapper: {
    flex: 1,
  },
  horizontalScrollView: {
    flex: 1,
  },
  horizontalContent: {
    flexGrow: 1,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
});
