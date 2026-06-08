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
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
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

export default function ExpensesWebScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [essNo, setEssNo] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [costCenter, setCostCenter] = useState<string>("");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [generalExpense, setGeneralExpense] = useState<GeneralExpense[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [role, setRole] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [usernameFilter, setUsenameFilter] = useState<string>("");
  const [expenseType, setExpenseType] = useState<string>("All");
  const [expensePurpose, setExpensePurpose] = useState<string>("");
  const [appliedStartDate, setAppliedStartDate] = useState<string>("");
  const [appliedEndDate, setAppliedEndDate] = useState<string>("");
  const [appliedUsername, setAppliedUsername] = useState<string>("");
  const [appliedExpenseType, setAppliedExpenseType] = useState<string>("All");
  const [appliedExpensePurpose, setAppliedExpensePurpose] =
    useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Expense>>({});
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
    { label: "Meal with customer", value: "Meal with customer" },
    { label: "Meal with supplier", value: "Meal with supplier" },
    { label: "Medical", value: "Medical" },
    { label: "Purchase of goods", value: "Purchase of goods" },
    { label: "Staff benefits", value: "Staff benefits" },
    { label: "Others", value: "Others" },
  ];

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
      setGeneralExpense(generalExpenseData);
    });

    return () => unsubscribe();
  }, [userId, role]);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "trips"), orderBy("created_at", "desc"));
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

  const filteredExpenses = expenses.filter((e) => {
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

  const handleEdit = async (expense: Expense) => {
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

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      let routeImageUrl = editFormData.route_image_url || "";
      const updatedCost =
        (editFormData.mileage || 0) +
        (editFormData.parking || 0) +
        (editFormData.toll || 0);
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

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
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

  const exportToHTML = () => {
    if (Platform.OS !== "web") return;

    const filteredExpenses = expenses.filter((e) => {
      if (!e.date) return true;
      const dateVal = e.date;
      if (appliedStartDate && dateVal < appliedStartDate) return false;
      if (appliedEndDate && dateVal > appliedEndDate) return false;
      return true;
    });

    if (filteredExpenses.length === 0) {
      alert("No expenses found for the selected date range.");
      return;
    }

    // 1. Updated Headers Order
    const headers = [
      "Date",
      "From",
      "To",
      "Submitted By",
      "Purpose",
      "Company/Site",
      "Name",
      "Contact No.",
      "From Time",
      "To Time",
      "Duration",
      "Parking (RM)",
      "Toll (RM)",
      "Mileage (RM)",
      "Cost (RM)",
    ];

    // 2. Updated Row Mapping Order
    const rows = filteredExpenses
      .map(
        (e) => `
      <tr>
        <td>${e.date}</td>
        <td>${e.user_name || ""}</td>
        <td>${e.purpose}</td>
        <td>${e.company || ""}</td>
        <td>${e.name}</td>
        <td>${e.contact_number || ""}</td>
        <td>${e.from_time || ""}</td>
        <td>${e.to_time || ""}</td>
        <td>${e.duration || ""}</td>
        <td>${e.parking.toFixed(2)}</td>
        <td>${e.toll.toFixed(2)}</td>
        <td>${e.mileage.toFixed(2)}</td>
        <td>${e.cost.toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    const totalParking = filteredExpenses.reduce(
      (sum, e) => sum + (e.parking || 0),
      0,
    );
    const totalToll = filteredExpenses.reduce(
      (sum, e) => sum + (e.toll || 0),
      0,
    );
    const totalMileage = filteredExpenses.reduce(
      (sum, e) => sum + (e.mileage || 0),
      0,
    );
    const totalCost = filteredExpenses.reduce(
      (sum, e) => sum + (e.cost || 0),
      0,
    );

    const footerRow = `
      <tr style="font-weight: bold; background-color: #eee;">
        <td colspan="11" style="text-align: right;">TOTAL:</td>
        <td>${totalParking.toFixed(2)}</td>
        <td>${totalToll.toFixed(2)}</td>
        <td>${totalMileage.toFixed(2)}</td>
        <td>${totalCost.toFixed(2)}</td>
      </tr>
    `;

    const detailsHtml = filteredExpenses
      .map(
        (e) => `
      <div class="expense-detail">
        <h3>${e.company}, ${e.name} - ${e.purpose} (${e.date || "N/A"} ${e.from_time}-${e.to_time})</h3>
        <p><strong>Purpose:</strong> ${e.purpose}</p>
        <p><strong>Company/Site:</strong> ${e.company}</p>
        <p><strong>Name:</strong> ${e.name}</p>
        <p><strong>Contact No.:</strong> ${e.contact_number}</p>
        <p><strong>From Time:</strong> ${e.from_time}</p>
        <p><strong>To Time:</strong> ${e.to_time}</p>
        <p><strong>Duration:</strong> ${e.duration}</p>
        <p><strong>Parking (RM):</strong> ${e.parking.toFixed(2)}</p>
        <p><strong>Toll (RM):</strong> ${e.toll.toFixed(2)}</p>
        <p><strong>Mileage (RM):</strong> ${e.mileage.toFixed(2)}</p>
        <p><strong>Cost (RM):</strong> ${e.cost.toFixed(2)}</p>
        <p><strong>Trip Report:</strong> ${e.trip_report}</p>
        ${
          e.route_image_url
            ? `
          <div class="image-container">
            <strong>Route Map:</strong><br/>
            <img src="${e.route_image_url}" alt="Route Map" />
          </div>
        `
            : ""
        }
        ${
          e.business_card_url
            ? `
          <div class="image-container">
            <strong>Business Card:</strong><br/>
            <img src="${e.business_card_url}" alt="Business Card" />
          </div>
        `
            : "<p><em>No business card attached</em></p>"
        }
      </div>
    `,
      )
      .join(
        "<hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;' />",
      );

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Expense Report</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 40px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #808080; color: white; text-transform: uppercase; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          h2 { color: #808080; }
          .expense-detail { margin-top: 20px; page-break-inside: avoid; }
          .expense-detail h3 { border-bottom: 2px solid #808080; padding-bottom: 5px; color: #808080; }
          .image-container img { max-width: 100%; max-height: 400px; border: 1px solid #ddd; border-radius: 4px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <h2>Expense Report - Generated on ${new Date().toLocaleDateString()}</h2>
        <table>
          <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows}
            ${footerRow}
          </tbody>
        </table>

        <h2 style="margin-top: 60px;">Detailed Records</h2>
        ${detailsHtml}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `expenses_report_${new Date().toISOString().split("T")[0]}.html`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toDataURL = (url) =>
    fetch(url)
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          }),
      );

  const generatePDF = () => {
    // Normalize a mileage expense
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
    });

    // Normalize a general expense
    const normalizeGeneral = (item) => ({
      date: item.date || "",
      typeOfExpense: "General Expense",
      purpose: item.expense_purpose || "",
      name: item.name || "",
      email: item.email || "",
      contactNumber: item.contact_number || "",
      parking: 0,
      toll: 0,
      mileage: 0,
      expense: item.expense || 0,
      expensePurpose: item.expense_type || "",
      subTotal: item.cost || 0,
    });

    const combinedData = [
      ...filteredExpenses.map(normalizeMileage),
      ...filteredGeneralExpense.map(normalizeGeneral),
    ];

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
              position: absolute;
              top: 0;
              left: 0;
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
              border-left: none;
              border-right: none;
              border-bottom: none;
              border-top: 2px solid #0f172a;
              font-weight: bold;
              font-size: 13px;
              padding: 3px;
            }
            .signature-container {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
              padding-left: 10px;
              padding-right: 10px;
              page-break-inside: avoid;
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
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="report-header">
              <div class="header-logo">
                <img src="data:image/jpeg;base64,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pZozcdGzT3WmGTJSyBvxEbQzPIEYEuSHdNAd20AO7IsSi2mG4xd4XLWjL3eMXuf070aDHsr4dmGn1buGk1uktkl48V2PVeO0o3PBPSzyU1TC+KaJ5ZJG9pa5jgcEEHsEH6l81bbXe1Wmddxmaph+BuQyW11Oxoe88OIEox+MaMN6JBAbgObk5rdrLb7U2haryb1R8oHcRHWQBzqeQuBPEPIGHel3pIB6zjGCbLwnMFtiqUF7tT8r+T4/HsKGzJku/wAvSdRrr0eE1/mX4fh2mNIiLekOC7bS+qLxo+8Q3uyVPlTxelzXdslYfdjx9bTgfnBAIIIBHUovipThVg6dRap70etGtUtqka1GTjKL1TWxpotZtvu1Zdc00NDVSRUV84kS0hJDZS0ZL4ifcEZPHPIYd7gcjnio3T1E9LPHVUs0kM0LxJHJG4tcxwOQ4Edgg9gqf9q98Y7pysmu6+CnqxyfBcJOMUUo9yyTGGscPqPQI66djlXWO5Wlba3NktYcY8V3c16rt4XjlDpChfONjirUam5T3KX6uUn5PsemsyoiKFFqhERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAFimu9ydO6CpT84z+dcJIjJTUMeecveAScEMbnPqP1NdgOIwuJududbtvrcGRiOqvFUwmlpSegPbzZMdhgOevdxGBjDnNqxdrtcb5cai7Xarkqquqfzllee3H+4ADAAHQAAGAFK8v5cliX/iLnVU+HOX+nN+C5quc555hgWtlY6SrvfxUO/nLkuG97NE+XqjVF41heJr3e6nzZ5fS1remRMHsxg+poyfzkkkkkknqURWfTpwpQVOmtEtyOf61apc1JVq0nKUnq29rbYREX2eQXdaW0hf9ZXFlusVBJMS9rZZi0iGAHJ5SPxhow135zjABPSyTbfaO965nguFUx9FYi93mVZID5eJALYmnsknrkRxGHe5bxNmNP6csmlbc202C3x0dKHuk4NJcXOPu5znEucfYZJPQA9gAovjeZaWHa0aHvVPSPf29nnpxsLKeQ7nHNLq81p0P70v068P4vJPbpi+3+0WndCcK7/CN3bzHx0jC3g13XFkeSGdDGe3HLu8HiM6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0fcEEj6s5BAyFVvWo1LebpVVpJb0y9bW6o3tGNe3kpQlua2phEReR7hERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBEX4qKiClgkqqqaOGGFhkkkkcGtY0DJcSegAOyV+pNvRH42orVn7Ufbk7wWfQvmWmkj+OvRi5MhH8FATjiZjkEZB5Bo7IAzxDg5YLuTv5JU+ZZdBTcaaSLjLcix7JSXY6hBwWYGQXEZyTx44DjCSnGCZTlV0r360XCPF9/Lu389CpM19I8LfrWeDNSludTel+ng3/ABbuWuuq596vt41FXPuV8uU9bUvyOcr88QSXcWj2a3LjhowBnoLttCaEvGvrwLbbW+VBFh1XVubllOw/WftccHi33JB9gCR3u22z94115d1q5PgbKJeL5j/CzgZ5CEYIOCOJcegScci0tVlrHp+y6aoG2uxW6GjpmnlwjH0nYA5OJ7c7AAyST0FuMazFRwyLtbTR1Fs2bo/69nnycZyrki6x+osQxJtUW9duvWn3cdHxlx4c11uiNCWPQVrNus8bnSSu51FTLgyzuHtkj2AyQGjod/WSTkSIqzrVqlxUdWq9ZPe2X3a2tGyoxt7eKjCK0SW5f16hF+KiogpYJKqqmjhhhYZJJJHBrWNAyXEnoADslV03R3vqdSxVOnNLh9NanuMctUctlq2exAH8Rh76+k4YzgFzVn4XhNxi1XqUVsW98F9XyRpsw5kssuW/tbl6yevVit8n8lzb2LteifM3j3j+dvP0jpKq/eHcdbWxu/2z9RjjI/4P7Xfx/Yen6cMoitzD8PoYbQVCgtnF8W+bOasaxq7x67ld3ctW9y4RXJdnx3vaERFmmpClbZPa92pa9up9QW8PstMT5DJfo1cwOPo/xo2nOfqLgG+ocgOl2n22rNdXllTV05FkopAayVxLRKR35LCOy49ZwRxac5BLQbU09PBSwR0tLDHDDCwRxxxtDWsaBgNAHQAHQChuZ8f+yRdnbP32tr/KuXe/Rd5aWQMm/tKaxS+X7qL92LX32uL1/CvV7Nyev7REVaF8hERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAR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BERAEREAXTag0ZpbVTHNv9ipKx5Y2PznM4zNaHcg1sjcPaM56BHuftK7lF906s6MlOnJprinozxr29K6g6VeKlF700mvJkGak8NQ9EmkL99gfDcv58uEkbf+iOPD7Ty+pRXqDb/WelmOmvmnaunhaxr3TtaJYWAu4jlIwlrTnrBOex9oVx0Uoss331t7tbSou3Y/NfNMgGK9GmEX2s7VujLs2x/lfyaKLoraah2d2/1HzkmsbKKoe0NE9CfIc31ZzxHoLjkglzScfoGI7v8A4aagPdLpbUcb2l4DYLgwtLWceyZGA8jn6uA6Pv13K7TNuH3Gyo3B9q2ea19dCucR6NsastZUUqsf4Xo/KWnpqQeiyW9bb670/wA3XTS9eyOOIzvlij86JjBnJc+Pk1uMEkE5A79isaUipV6VePWpSUl2NP4EHubS4s5+zuIOEuUk0/JhERepjhERAEREAREQBERAEREAREQBERAEREAREQBERAEREARF9Kennqp46WlhkmmmeI4442lznuJwGgDsknoBG0lqz9Scnoj5os7seye4l88mT5l+b4JuX42ukEXDGfpR9yDJGB6PrB9u1JGnfDbZqUsn1Pe6iuePLeYKZohjyO3sc45c9p6GRwOM/WetNd5gw6z2TqJvlHa/TYvFolOG5LxvFGnToOMXxn7q79u1ruTIAp6eeqnjpaWGSaaZ4jjjjaXOe4nAaAOySegFIOltitcaiaypraZlmpXObl1aC2Ut5EOLYgOWRjOH8AcjBwcqxmntIaZ0pD5On7LTUfpLXSNbyleCc4dI7L3DJ6yTjrHsu3UTvs6VZ6xs4dVc3tfluXqWNhPRXb0tKmJ1XN/ljsXm9rXcokdaW2K0Pp17Kqtp5LzVBjQTWhroQ7iQ4tiA44Oc4fzxgYORkyFT08FLBHS0sMcMMLBHHHG0NaxoGA0AdAAdAL9oojdXtxey69xNyfb8luRZeH4VZYVT9lZUlBdi2vve9+LCIixTYBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAXRXzQujtSee69acoKiWo4+bP5QZO7jjH41uHjpoHR9hj26XeovSlVqUZdelJp809DxuLajdQ9nXgpR5NJryZEd78N2lqznJY7xXW2R8nINkDaiJjO/S1p4u+zBLz/OsKvfhz1lQieWz11Bc4oy3ymB5hmkBwD6XehuMk9v9h9vSsii3lvmjE7fRe06y5SSfrv8AUiN90f4De6tUeo3xg2vTbH09CnF2291xZH1DbjpW5MZSs8yaZkDpIWt48i7zGZZgD3OesHPsVjyvQuDdLDY735Xz1ZaCv8nl5XxVMyXhnGePIHGcDOPsC3lDO8lsr0fFPT0evxIledE1N6uzuWuyUdfVNcP4dvYUlRW0uWzW21zmlqZtMxQyzDGaaWSFrTjALWMcGA9f4vZ7OclYrXeGrSklK9ltv12gqTjhJOY5WN7Gcsa1hPWR9Id99+y21HOOH1Pv9aPetfg38PAjd10YY3Q1dJwmtu6Wj7PvJLV9+naV1RTbXeGSujpXvtur4J6kY4Rz0ZiY7sZy9r3kdZP0T3117rqH+G/XTGOe25WR5aCQ1s8uXfmGYwP85Wxp5iwuotVWXjqvikaStkjMFB6StpeDjL4N+RFKLOv3D90PyY/77T/rFwbptTuLaBGavSVdJ5uePwrRU4xjOfKLuPv9eM949is2GJ2VR9WNaDf6l9TV1MAxajFzqWtRJcXCSXwMTRd79weufyMvv9HTf6qfcHrn8jL7/R03+qvb7Xb/AJ15oxf2bef9GX8r+h0SLvfuD1z+Rl9/o6b/AFU+4PXP5GX3+jpv9VPtdv8AnXmh+zbz/oy/lf0OiRZHSbca+ramOlh0dd2vkOGmakfEwfpe8Brf5yF2/wC4fuh+TH/faf8AWLyniNnSek60V3yX1MilgeKV11qVtUkuyEn8EYKiky2+HrcKugdNVC2254eWiKpqS5xGB6h5TXtx3j3z0evbPc2vw0X6UyfPOpqClAx5fwsT6jl75zy8vH1fbn8yw6mP4ZS161ZbOW34a6myoZMx6406lrJa89I+fWa08SGkVgbZ4Z7NE95vOqK2qYQOApYGQFp+vJcZM/5gsgtnh/26oGyCqpK65F5Baaqqc0sx9nlcPf8APn2WBVzdhlPXqty7l9dDc23Rpj1fTrxjD9Uls/l63oVeXLttout5ndS2e2VddM1hkdHTQulcGggFxDQTjJAz+cK3NDttoC3UrKSn0faXMjzh09M2Z/ZJ7fIC4+/1nodewWSLV187wWyhRb73p6LX4kgtOiaq9Hd3KW7ZGLfftbXg9NvJFTrTsxuRdmU8zNOSUsM7+PmVcrITGOWC58bj5gA7P0ckdgHIWZW3wzXWWBzrxqukpZg8hrKamdO0twOy5xYQc56x9Q77wJ/Raa4zfiNX/h6Q7lr8dfgSiz6MsDtv+MpVH/FLReHV6r9WRva/D/t1b/N+Lpq65eZx4/FVRb5eM54+UGe+e859hjHec9ttotVmgdS2e2UlDC55kdHTQtiaXEAFxDQBnAAz+YLlotDc391ef8eo5d72eW4mNjg2H4Z/+joxg+aS18XvfiwiIsQ2QREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAf//Z" alt="" width="1080" height="902" />
              </div>
              <div class="header-title">
                <p class="report-title"><strong>KUMPULAN ABEX SDN BHD</strong></p>
                <strong><p class="report-title">MONTHLY LOCAL TRAVELLING CLAIM</p></strong>
                <p class="report-due">DUE IN <u><strong>3 WORKING DAYS</strong></u> AFTER EXPENSES INCURRED</p>
              </div>
              <div class="header-empty"></div>
            </div>
            <h1>Expense Report from ${formatDateString(startDate)} - ${formatDateString(endDate)} </h1>
            <div class="employee-info-section">
            <div class="employee-info">Name: <u>${username}</u></div>
            <div class="employee-info">ESS No: <u>${essNo}</u></div>
            <div class="employee-info">Department: <u>${department}</u></div>
            <div class="employee-info">Grade: <u>${grade}</u></div>
            <div class="employee-info">Cost Center: <u>${costCenter}</u></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type of Expense</th>
                  <th>Purpose</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Contact Number</th>
                  <th>Expense Purpose</th>
                  <th>Expense</th>
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
                        <td>${item.typeOfExpense}</td>
                        <td>${item.purpose}</td>
                        <td>${item.name}</td>
                        <td>${item.email}</td>
                        <td>${item.contactNumber}</td>
                        <td>${item.expensePurpose}</td>
                        <td class="amount">${item.expense.toFixed(2)}</td>
                        <td class="amount">${item.parking.toFixed(2)}</td>
                        <td class="amount">${item.toll.toFixed(2)}</td>
                        <td class="amount">${item.mileage.toFixed(2)}</td>
                        <td class="amount">${item.subTotal.toFixed(2)}</td>
                      </tr>
                    `,
                  )
                  .join("")}
                  
                <tr class="total-row">
                  <td colspan="7" class="total-label">Total:</td>
                  <td style="font-weight: bold;">${formattedParking}</td>
                  <td style="font-weight: bold;">${formattedToll}</td>
                  <td style="font-weight: bold;">${formattedMileage}</td>
                  <td style="font-weight: bold;">${formattedExpense}</td>
                  <td style="font-weight: bold;">${formattedTotal}</td>
                </tr>
              </tbody>
              
            </table>
            <div class="signature-container">
              <div class="signature-block">
                <p class="signature-label">Requested By:</p>
                <div class="signature-line"></div>
                <p class="signature-date">Name: ${username}</p>
                <p class="signature-date">Date: ${getCurrentDate()}</p>
              </div>

              <div class="signature-block">
                <p class="signature-label">Approved By:</p>
                <div class="signature-line"></div>
                <p class="signature-date">Name: </p>
                <p class="signature-date">Date: </p>
              </div>
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

  const exportToPdf = () => {
    /* const config = {
      html: createHTML,
      fileName: `Report`,
      directory: "Downloads",
    }; */
    generatePDF();
  };

  const columns = [
    { header: "Date", dataKey: "date" },
    { header: "Type", dataKey: "type" },
    { header: "Email", dataKey: "email" },
    { header: "Role", dataKey: "role" },
  ];

  const handleExport = async () => {
    console.log("exporting");
    /* if (Platform.OS === "web") {
      // Dynamic import stops node-specific dependencies from breaking Webpack/Vite bundles
      const { pdf } = await import("@react-pdf/renderer");

      // Convert the component layout dynamically into a browser file blob
      const blob = await pdf(<PdfReport data={expenses} />).toBlob();

      // Create a virtual download link in the browser DOM
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ExportedData.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // For Native Mobile Apps (iOS/Android):
      // Use expo-print (if using Expo) or react-native-html-to-pdf
      alert(
        "Mobile export triggered (Implement using Native FS / Print layout API)",
      );
    } */
  };

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

  const format12Hour = (timeStr?: string) => {
    if (!timeStr) return "";
    const [hours24, minutes] = timeStr.split(":").map(Number);
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    const hoursStr = hours12.toString().padStart(2, "0");
    const minutesStr = minutes.toString().padStart(2, "0");
    return `${hoursStr}:${minutesStr} ${period}`;
  };

  const renderItem = ({ item }: { item: Expense }) => {
    const isExpanded = expandedId === item.id;
    const isEditing = editingId === item.id;

    if (Platform.OS === "web") {
      return (
        <React.Fragment key={item.id}>
          <tr
            style={{ cursor: "pointer", borderBottom: "1px solid #eee" }}
            onClick={() => {
              console.log(role);
              setExpandedId(isExpanded ? null : item.id);
            }}
          >
            <td style={webTableStyles.td}>{item.user_name || "N/A"}</td>
            <td style={webTableStyles.td}>
              {formatDateString(item.date) || "N/A"}
            </td>
            <td style={webTableStyles.td}>
              {format12Hour(item.from_time)} - {format12Hour(item.to_time)} (
              {item.duration})
            </td>
            <td style={webTableStyles.td}>{item.purpose}</td>
            <td style={webTableStyles.td}>{item.company}</td>
            <td style={webTableStyles.td}>{item.name}</td>
            {/* <td style={webTableStyles.td}>{item.id}</td> */}
            <td
              style={{
                ...webTableStyles.td,
                fontWeight: "bold",
                color: "#2196F3",
              }}
            >
              RM{" "}
              {isEditing
                ? (editFormData.cost || 0).toFixed(2)
                : item.cost.toFixed(2)}
            </td>
          </tr>
          {isExpanded && (
            <tr>
              <td
                colSpan={7}
                style={{ padding: "20px", backgroundColor: "#f9f9f9" }}
              >
                <View style={styles.expandedContent}>
                  <View style={styles.section}>
                    <Text style={styles.descriptionLabel}>Submitted By:</Text>
                    <Text style={styles.descriptionText}>
                      {item.user_name || "N/A"}
                    </Text>
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
                      />
                    ) : (
                      <Text style={styles.descriptionText}>{item.date}</Text>
                    )}

                    {isEditing ? (
                      <Text style={styles.descriptionLabel}>Purpose:</Text>
                    ) : (
                      <></>
                    )}
                    {isEditing ? (
                      <select
                        value={editFormData.purpose}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            purpose: e.target.value,
                          })
                        }
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          backgroundColor: "#f9f9f9",
                          fontSize: "14px",
                          width: "100%",
                          maxWidth: 400,
                          marginBottom: 10,
                          height: "auto",
                        }}
                      >
                        <option value="" disabled>
                          Select a purpose...
                        </option>
                        {purposeList.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <></>
                    )}

                    {isEditing ? (
                      <Text style={styles.descriptionLabel}>Company:</Text>
                    ) : (
                      <></>
                    )}
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
                      <></>
                    )}

                    {isEditing ? (
                      <Text style={styles.descriptionLabel}>Name:</Text>
                    ) : (
                      <></>
                    )}
                    {isEditing ? (
                      <TextInput
                        style={styles.inlineInput}
                        value={editFormData.name}
                        onChangeText={(text) =>
                          setEditFormData({ ...editFormData, name: text })
                        }
                        placeholder="Name"
                      />
                    ) : (
                      <></>
                    )}

                    <Text style={styles.descriptionLabel}>
                      Time and Duration:
                    </Text>
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
                            setEditFormData({
                              ...editFormData,
                              from_time: text,
                            })
                          }
                          placeholder="Start (e.g. 09:00)"
                        />
                        <TextInput
                          style={[styles.inlineInput, { flex: 1 }]}
                          value={editFormData.to_time}
                          onChangeText={(text) =>
                            setEditFormData({ ...editFormData, to_time: text })
                          }
                          placeholder="End (e.g. 17:00)"
                        />
                      </View>
                    ) : (
                      <Text style={styles.descriptionText}>
                        {format12Hour(item.from_time)} -{" "}
                        {format12Hour(item.to_time)} ({item.duration})
                      </Text>
                    )}

                    <Text style={styles.descriptionLabel}>Parking:</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.inlineInput, { width: 100 }]}
                        value={editFormData.parking?.toString()}
                        onChangeText={(text) =>
                          setEditFormData((prev) => {
                            const parking = parseFloat(text) || 0;
                            return {
                              ...prev,
                              parking,
                              cost:
                                (prev.mileage || 0) +
                                parking +
                                (prev.toll || 0),
                            };
                          })
                        }
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={styles.descriptionText}>
                        RM {item.parking.toFixed(2)}
                      </Text>
                    )}

                    <Text style={styles.descriptionLabel}>Toll:</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.inlineInput, { width: 100 }]}
                        value={editFormData.toll?.toString()}
                        onChangeText={(text) =>
                          setEditFormData((prev) => {
                            const toll = parseFloat(text) || 0;
                            return {
                              ...prev,
                              toll,
                              cost:
                                (prev.mileage || 0) +
                                (prev.parking || 0) +
                                toll,
                            };
                          })
                        }
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={styles.descriptionText}>
                        RM {item.toll.toFixed(2)}
                      </Text>
                    )}

                    <Text style={styles.descriptionLabel}>Mileage:</Text>
                    <Text style={styles.descriptionText}>
                      RM{" "}
                      {isEditing
                        ? (editFormData.mileage || 0).toFixed(2)
                        : item.mileage.toFixed(2)}
                    </Text>

                    <Text style={styles.descriptionLabel}>Trip Report:</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.inlineInput, { minHeight: 60 }]}
                        value={editFormData.trip_report}
                        onChangeText={(text) =>
                          setEditFormData({
                            ...editFormData,
                            trip_report: text,
                          })
                        }
                        multiline
                        placeholder="Trip Summary"
                      />
                    ) : (
                      <Text style={styles.descriptionText}>
                        {item.trip_report || "N/A"}
                      </Text>
                    )}

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
                              <Text style={styles.tripRemark}>
                                {trip.remark}
                              </Text>
                              <Text style={styles.tripRemark}>
                                {trip.platform === 1 ? "Web" : "Mobile"}
                              </Text>
                              <Text style={styles.tripRemark}>
                                {trip.to_home === true ? "Going Home" : ""}
                              </Text>
                            </View>
                          ) : (
                            <Text key={tripId} style={styles.descriptionText}>
                              Trip data not available
                            </Text>
                          );
                        })}
                      </View>
                    )}

                    {item.receipt_urls && item.receipt_urls?.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.descriptionLabel}>Receipts:</Text>
                        {item.receipt_urls.map((receiptUrl) => (
                          <TouchableOpacity
                            key={receiptUrl}
                            style={[{ marginBottom: 10 }]}
                            onPress={(e) => {
                              console.log(receiptUrl);
                              handleOpenLink(receiptUrl);
                            }}
                          >
                            <Text
                              style={[
                                styles.descriptionText,
                                { color: "#2196F3", fontWeight: "semibold" },
                              ]}
                            >
                              {receiptUrl}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {item.trip_ids && item.trip_ids.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.descriptionLabel}>
                          Trip Route Maps:
                        </Text>
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
                        <Text style={styles.descriptionLabel}>
                          Business Card:
                        </Text>
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
                  </View>
                  {item.user_id === userId && (
                    <>
                      <View style={styles.actionButtonsContainer}>
                        {isEditing ? (
                          <>
                            <TouchableOpacity
                              style={styles.approveButton}
                              onPress={() => handleSaveEdit()}
                            >
                              <Text style={styles.approveButtonText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.rejectButton}
                              onPress={() => handleCancelEdit()}
                            >
                              <Text style={styles.rejectButtonText}>
                                Cancel
                              </Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          item.approval_status === 0 && (
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={() => handleEdit(item)}
                            >
                              <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                          )
                        )}
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDelete(item.id)}
                        >
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* <View style={styles.actionButtonsContainer}>
                    {role === 0 && item.approval_status === 0 && (
                      <>
                        <TouchableOpacity
                          style={styles.approveButton}
                          onPress={() => handleStatus(item.id, 1)}
                        >
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => handleStatus(item.id, 2)}
                        >
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View> */}
                </View>
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (isEditing) {
            return;
          }
          setExpandedId(isExpanded ? null : item.id);
        }}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.name} numberOfLines={1}>
            {item.purpose}
          </Text>
          <Text style={styles.cost}>RM {item.cost.toFixed(2)}</Text>
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

            {item.route_image_url && !isEditing && (
              <>
                <Text style={styles.sectionHeader}>Route Map</Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedImage(item.route_image_url || null);
                  }}
                >
                  <Image
                    source={{ uri: item.route_image_url }}
                    style={styles.businessCardImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </>
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

            {item.approval_status === 0 && (
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
            )}

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
                    <option value="All">All</option>
                    <option value="Mileage">Mileage Expense</option>
                    <option value="General">General Expense</option>
                  </select>
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
                    Expense Purpose
                  </Text>
                  <select
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
                  </select>
                </View>
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
                    console.log(appliedExpensePurpose);
                    console.log(appliedExpenseType);
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
                    setExpensePurpose("");
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
              <TouchableOpacity
                style={styles.exportButton}
                onPress={exportToPdf}
              >
                <Text style={styles.exportButtonText}>Generate PDF Report</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {Platform.OS === "web" ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {renderHeader()}
          <div style={webTableStyles.container}>
            <table style={webTableStyles.table}>
              <thead>
                <tr style={webTableStyles.headerRow}>
                  <th style={{ ...webTableStyles.th, width: "10%" }}>
                    Submitted by
                  </th>
                  <th style={{ ...webTableStyles.th, width: "10%" }}>Date</th>
                  <th style={{ ...webTableStyles.th, width: "15%" }}>Time</th>
                  <th style={{ ...webTableStyles.th, width: "15%" }}>
                    Purpose
                  </th>
                  <th style={{ ...webTableStyles.th, width: "20%" }}>
                    Company
                  </th>
                  <th style={{ ...webTableStyles.th, width: "20%" }}>Name</th>
                  <th style={{ ...webTableStyles.th, width: "10%" }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((item) => renderItem({ item }))}
              </tbody>
            </table>
          </div>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredExpenses}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>No expenses submitted yet.</Text>
          }
        />
      )}
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

const htmlSelectStyle = {
  padding: "8px 12px",
  border: "1px solid #ccc",
  borderRadius: "4px",
  backgroundColor: "#f9f9f9",
  fontSize: "14px",
  width: "100%",
  maxWidth: 400,
  marginBottom: 10,
  height: "auto",
};

const filterInputStyle = {
  backgroundColor: "rgba(255,255,255,0.1)",
  color: "#fff",
  borderRadius: 6,
  paddingVertical: 8,
  paddingHorizontal: 12,
  fontSize: 14,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.2)",
  height: 40, // explicit height for consistency
  lineHeight: 20, // for text vertical centering
};

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
  btn: { backgroundColor: "#10b981", padding: 14, borderRadius: 6 },
  disabled: { backgroundColor: "#a7f3d0" },
  btnText: { color: "#fff", fontWeight: "600" },
});

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
