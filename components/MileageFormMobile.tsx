import { Text, View } from "@/components/Themed";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { db, storage } from "../firebaseConfig";
import { DatePickerInput } from "./DatePickerInput";
import { TimePickerInput } from "./TimePickerInput";

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

type PickedFile = {
  uri: string;
  name: string;
  type: string;
  size: number;
};

export default function MileageFormMobile() {
  const [homeCoords, setHomeCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distance, setDistance] = useState<string>("0.00");
  const [formPurpose, setFormPurpose] = useState<string>("");

  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Add these state variables
  const [editingCustomerIndex, setEditingCustomerIndex] = useState<
    number | null
  >(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  // For the modal fields
  const [editFormCompany, setEditFormCompany] = useState("");
  const [editFormName, setEditFormName] = useState("");
  const [editFormEmail, setEditFormEmail] = useState("");
  const [editFormContactNumber, setEditFormContactNumber] = useState("");
  const [editFormTime, setEditFormTime] = useState("");
  const [editFormAddress, setEditFormAddress] = useState("");

  const [formFromTime, setFormFromTime] = useState<string>("");
  const [formToTime, setFormToTime] = useState<string>("");
  const [formParking, setFormParking] = useState<string>("0.00");
  const [formToll, setFormToll] = useState<string>("0.00");
  const [formOtherExpense, setFormOtherExpense] = useState<string>("0.00");
  const [formOtherExpenseType, setFormOtherExpenseType] = useState<string>("");
  const [formVendor, setFormVendor] = useState<string>("");
  const [formTripReport, setFormTripReport] = useState<string>("");
  const [formCustomers, setFormCustomers] = useState([
    { name: "", company: "", email: "", number: "", time: "", address: "" },
  ]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [customerIndex, setCustomerIndex] = useState<number>(0);
  const [businessCardFiles, setBusinessCardFiles] = useState<PickedFile[]>([]);
  const [receiptFiles, setReceiptFiles] = useState<PickedFile[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [mileageRate, setMileageRate] = useState<number>(0.8);
  const [mileageRateOutstation, setMileageRateOutstation] =
    useState<number>(0.7);
  const [mileageRateBike, setMileageRateBike] = useState<number>(0.35);
  const [outStationDistance, setOutstationDistance] = useState<number>(50);
  const [officeCoords, setOfficeCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [formMileageRate, setFormMileageRate] = useState<number>(0.8);
  const [allUserTrips, setAllUserTrips] = useState<any[]>([]);
  const [tripsForSelectedDate, setTripsForSelectedDate] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [addedTrips, setAddedTrips] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [fromAddress, setFromAddress] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");
  const [formFromHome, setFormFromHome] = useState<boolean>(false);
  const [formGoingHome, setFormGoingHome] = useState<boolean>(false);
  const [formTripFromTime, setFormTripFromTime] = useState<Date | null>(null);
  const [formTripToTime, setFormTripToTime] = useState<Date | null>(null);
  const [formRemark, setFormRemark] = useState<string>("");
  const [formVehicle, setFormVehicle] = useState<string>("");
  const [originCoord, setOriginCoord] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [destCoord, setDestCoord] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedFromIndex, setSelectedFromIndex] = useState<number>(0);
  const [selectedGoingIndex, setSelectedGoingIndex] = useState<number>(0);

  const [allMileage, setAllMileage] = useState<Expense[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [editingMileage, setEditingMileage] = useState(false);
  const [editMileageId, setEditMileageId] = useState<string>("");

  const skipDateResetRef = useRef(false);

  const router = useRouter();

  const locations = [
    { lat: 3.0409332, lng: 101.5453218 },
    {
      lat: 5.333704064834522,
      lng: 100.29405526266623,
    },
  ];

  const noAddress = [
    "Eydo0UoXD1fyyI7hr5pL8oCMhQ22",
    "fh5YgOEdhmPcs0isuS505MwnB0K3",
    "7vFkURLn0XXfgVuGgjS4qrQGC722",
  ];

  // Fetch all user trips
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "trips"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trips = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllUserTrips(trips);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const selectedDateStr = formDate;
    const filtered = allUserTrips.filter((trip) => {
      if (!trip.created_at) return false;
      const tripDate = trip.created_at.toDate
        ? trip.created_at.toDate()
        : new Date(trip.created_at);
      const tripDateStr = tripDate.toISOString().split("T")[0];
      return tripDateStr === selectedDateStr;
    });
    setTripsForSelectedDate(filtered);
    setSelectedTripId("");
  }, [allUserTrips, formDate]);

  useEffect(() => {
    if (skipDateResetRef.current) {
      skipDateResetRef.current = false;
      return;
    }
    setAddedTrips([]);
    setDistance("0.00");
  }, [formDate]);

  useEffect(() => {
    const totalDist = addedTrips.reduce(
      (sum, trip) => sum + (parseFloat(trip.distance) || 0),
      0,
    );
    setDistance(totalDist.toFixed(2));
  }, [addedTrips]);

  useEffect(() => {
    if (mileageRate !== undefined) setFormMileageRate(mileageRate);
  }, [mileageRate]);

  useEffect(() => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) return;
    const unsubscribe = onSnapshot(doc(db, "config", configId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.mileage_rate) setMileageRate(data.mileage_rate);
        if (data.mileage_rate_bike) setMileageRateBike(data.mileage_rate_bike);
        if (data.mileage_rate_outstation)
          setMileageRateOutstation(data.mileage_rate_oustation);
        if (data.outstation_distance)
          setOutstationDistance(data.outstation_distance);
      }
    });
    return () => unsubscribe();
  }, []);

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
            const displayName =
              userData.name || userData.username || user.displayName || "User";
            setUsername(displayName);
            const homeCoord = userData.home_coordinates;

            if (homeCoord) {
              setHomeCoords({
                lat: homeCoord.latitude,
                lng: homeCoord.longitude,
              });
            }

            const officeLocation = userData.office;

            if (officeLocation === 0) {
              setOfficeCoords(locations[0]);
            } else {
              setOfficeCoords(locations[1]);
            }
          } else {
            setUsername(user.displayName || "User");
          }
        } catch (error) {
          console.error("Error fetching user doc:", error);
          setUsername("");
        }
      } else {
        setUserId("");
        setUsername("");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "expenses"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expenseData: Expense[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 1) {
          expenseData.push({
            id: doc.id,
            ...data,
          } as Expense);
        }
      });
      setAllMileage(expenseData);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const { fromTime, toTime } = getOverallTimes();
    setFormFromTime(fromTime);
    setFormToTime(toTime);
  }, [addedTrips]);

  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split("T")[0];
    return dateString === today;
  };

  const handleAddTrip = (tripId?: string) => {
    const idToAdd = tripId || selectedTripId;
    if (!idToAdd) {
      return;
    }
    const tripToAdd = tripsForSelectedDate.find((t) => t.id === idToAdd);
    if (tripToAdd && !addedTrips.some((t) => t.id === tripToAdd.id)) {
      setAddedTrips((prev) => [...prev, tripToAdd]);
      setSelectedTripId("");
    } else if (tripToAdd) {
      Alert.alert("Info", "This trip has already been added.");
    }
  };

  const handleRemoveTrip = (tripId: string) => {
    setAddedTrips((prev) => prev.filter((t) => t.id !== tripId));
  };

  const getDistanceValue = () =>
    parseFloat(distance.replace(/[^0-9.]/g, "")) || 0;

  const getTotalMileage = () => {
    return addedTrips.reduce(
      (sum, trip) => sum + (parseFloat(trip.mileage) || 0),
      0,
    );
  };

  const calculateMileage = () => getTotalMileage().toFixed(2);

  const calculateCost = () => {
    const travelCost = getTotalMileage();
    const parking = parseFloat(formParking) || 0;
    const toll = parseFloat(formToll);
    const expense = parseFloat(formOtherExpense) || 0;
    return (travelCost + parking + toll + expense).toFixed(2);
  };

  const toTimeString = (value: any): string | null => {
    if (!value) return null;
    if (typeof value.toDate === "function") {
      const date = value.toDate();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    if (typeof value === "string" && value.match(/^\d{2}:\d{2}$/)) {
      return value;
    }
    if (value instanceof Date) {
      const hours = value.getHours().toString().padStart(2, "0");
      const minutes = value.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    return null;
  };

  const to12HourTime = (time24: string): string => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    let hour12 = hours % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return dateString.split("-").reverse().join("/");
  };

  const formatTripTime = (timestamp: any): string => {
    if (!timestamp) return "--:--";

    let date: Date;

    if (typeof timestamp.toDate === "function") {
      date = timestamp.toDate();
    } else if (typeof timestamp.seconds === "number") {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) {
      return "--:--";
    }

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getOverallTimes = () => {
    if (addedTrips.length === 0) {
      return { fromTime: "", toTime: "" };
    }
    let minFromTime = "23:59";
    let maxToTime = "00:00";
    let hasValidTimes = false;

    for (const trip of addedTrips) {
      const fromStr = toTimeString(trip.from_time);
      const toStr = toTimeString(trip.to_time);

      if (fromStr) {
        if (fromStr < minFromTime) minFromTime = fromStr;
        hasValidTimes = true;
      }
      if (toStr) {
        if (toStr > maxToTime) maxToTime = toStr;
        hasValidTimes = true;
      }
    }

    if (!hasValidTimes) {
      return { fromTime: "", toTime: "" };
    }
    return { fromTime: minFromTime, toTime: maxToTime };
  };

  const calculateDuration = () => {
    const { fromTime, toTime } = getOverallTimes();
    if (!fromTime || !toTime) return "0h 0m";
    const [h1, m1] = fromTime.split(":").map(Number);
    const [h2, m2] = toTime.split(":").map(Number);
    let diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 0) diff += 1440;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const addCustomerRow = (
    company: string,
    name: string,
    email: string,
    number: string,
    time: string,
    address: string,
  ) => {
    setFormCustomers([
      ...formCustomers,
      {
        name: name,
        company: company,
        email: email,
        number: number,
        time: time,
        address: address,
      },
    ]);
  };

  const removeCustomerRow = (index: number) => {
    if (formCustomers.length === 1) {
      setFormCustomers([
        { name: "", company: "", email: "", number: "", time: "", address: "" },
      ]);
    } else {
      setFormCustomers(formCustomers.filter((_, i) => i !== index));
    }
  };

  const selectFiles = async () => {
    try {
      const results = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (results.canceled) {
        console.log("User cancelled");
        return;
      }

      if (results.assets && results.assets.length > 0) {
        const files: PickedFile[] = results.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size || 0,
        }));

        setBusinessCardFiles((prev) => [...prev, ...files]);
      }
    } catch (err) {
      console.log("Error: ", err);
      Alert.alert("Error", "Failed to select files");
    }
  };

  const removeFile = (index) => {
    const newFiles = [...businessCardFiles];
    newFiles.splice(index, 1);
    setBusinessCardFiles(newFiles);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (type) => {
    if (type?.includes("pdf")) return "📄";
    if (type?.includes("image")) return "🖼️";
    if (type?.includes("word") || type?.includes("document")) return "📝";
    if (type?.includes("excel") || type?.includes("sheet")) return "📊";
    if (type?.includes("zip") || type?.includes("archive")) return "📦";
    return "📎";
  };

  // Open modal with customer data for editing
  const openEditCustomerModal = (index: number) => {
    const customer = formCustomers[index];
    setEditingCustomerIndex(index);
    setIsEditingCustomer(true);

    setEditFormCompany(customer.company || "");
    setEditFormName(customer.name || "");
    setEditFormEmail(customer.email || "");
    setEditFormContactNumber(customer.number || "");
    setEditFormTime(customer.time || "");
    setEditFormAddress(customer.address || "");

    setShowCustomerModal(true);
  };

  // Function to save edited customer
  const saveEditedCustomer = () => {
    if (editingCustomerIndex === null) return;

    const updatedCustomers = [...formCustomers];
    updatedCustomers[editingCustomerIndex] = {
      company: editFormCompany,
      name: editFormName,
      email: editFormEmail,
      number: editFormContactNumber,
      time: editFormTime,
      address: editFormAddress,
    };

    setFormCustomers(updatedCustomers);

    resetCustomerEditForm();
    setShowCustomerModal(false);
    //Alert.alert("Success", "Customer updated successfully!");
  };

  // Reset edit form
  const resetCustomerEditForm = () => {
    setEditFormCompany("");
    setEditFormName("");
    setEditFormEmail("");
    setEditFormContactNumber("");
    setEditFormTime("");
    setEditFormAddress("");
    setEditingCustomerIndex(null);
    setIsEditingCustomer(false);
  };

  // Open modal for adding new customer
  const openAddCustomerModal = () => {
    setIsEditingCustomer(false);
    setEditingCustomerIndex(null);
    setEditFormCompany("");
    setEditFormName("");
    setEditFormEmail("");
    setEditFormContactNumber("");
    setEditFormTime("");
    setEditFormAddress("");
    setShowCustomerModal(true);
  };

  const getAddressFromCoords = async (
    lat: number,
    lng: number,
  ): Promise<string> => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is undefined");
      const geo = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (geo.length > 0) {
        const g = geo[0];
        return [g.name, g.street, g.city].filter(Boolean).join(", ");
      }
      return "Address not found";
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        return data.results[0].formatted_address
          .replace(/\b\d{5}\b,?\s*/g, "")
          .trim();
      }

      console.warn(
        "Google geocoding failed, falling back to native:",
        data.status,
      );
      const geo = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (geo.length > 0) {
        const g = geo[0];
        return [g.name, g.street, g.city].filter(Boolean).join(", ");
      }

      return "Address not found";
    } catch (error) {
      console.error("Geocoding fetch error:", error);
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        if (geo.length > 0) {
          const g = geo[0];
          return [g.name, g.street, g.city].filter(Boolean).join(", ");
        }
      } catch (nativeError) {
        console.error("Native geocoding also failed:", nativeError);
      }
      return "Address not found";
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    console.log(formCustomers);
    const dist = getDistanceValue();
    const customers = formCustomers.slice(1);
    console.log("customers");
    console.log(customers);

    const otherExpenseValidation = !(
      (parseFloat(formOtherExpense) !== 0 &&
        formOtherExpenseType &&
        formVendor) ||
      (!parseFloat(formOtherExpense) && !formOtherExpenseType && !formVendor)
    );

    if (parseFloat(formOtherExpense) === 0) {
      setFormOtherExpenseType("");
    }

    const otherExpensePurpose =
      parseFloat(formOtherExpense) === 0 ? "" : formOtherExpenseType;

    const isAddressRequired =
      !noAddress.includes(userId || "") && addedTrips.length != 0;

    const isCustomersFormValid =
      customers.every(
        (customer) =>
          customer.name.trim() !== "" &&
          customer.company.trim() !== "" &&
          customer.email.trim() !== "" &&
          customer.number.trim() !== "" &&
          customer.time.trim() !== "",
      ) &&
      (isAddressRequired
        ? customers.some(
            (customer) => customer.address && customer.address.trim() !== "",
          )
        : true);

    if (
      !formPurpose.trim() ||
      !formDate ||
      !formTripReport ||
      !isCustomersFormValid ||
      otherExpenseValidation
    ) {
      if (!formPurpose.trim()) {
        Alert.alert("Error", "Please select a Purpose.");
        console.log("Purpose is missing");
      } else if (!formDate) {
        Alert.alert("Error", "Please select a Date.");
        console.log("Date is missing");
      } else if (!formTripReport) {
        Alert.alert("Error", "Please enter Trip Report.");
        console.log("Trip Report is missing");
      } else if (!isCustomersFormValid) {
        const invalidCustomers = customers.filter(
          (customer) =>
            customer.name.trim() === "" ||
            customer.company.trim() === "" ||
            customer.email.trim() === "" ||
            customer.number.trim() === "" ||
            customer.time.trim() === "",
        );

        if (invalidCustomers.length > 0) {
          Alert.alert(
            "Error",
            "Please ensure all customer fields (Name, Company, Email, Number, Time) are filled for all customers.",
          );
          console.log("Customer fields are incomplete", invalidCustomers);
        } else if (isAddressRequired) {
          const customersMissingAddress = customers.filter(
            (customer) => !customer.address || customer.address.trim() === "",
          );
          if (customersMissingAddress.length > 0) {
            Alert.alert("Error", "Please enter an address for a customers.");
            console.log(
              "Address is missing for some customers",
              customersMissingAddress,
            );
          }
        }
      } else if (otherExpenseValidation) {
        const expenseAmount = parseFloat(formOtherExpense);
        if (expenseAmount !== 0 && (!formOtherExpenseType || !formVendor)) {
          Alert.alert(
            "Error",
            "Please fill in both Other Expense Type and Vendor when Other Expense amount is entered.",
          );
          console.log("Other Expense fields are incomplete");
        } else if (
          expenseAmount === 0 &&
          (formOtherExpenseType || formVendor)
        ) {
          Alert.alert(
            "Error",
            "Please remove Other Expense Type and Vendor when Other Expense amount is 0.",
          );
          console.log("Other Expense fields should be empty when amount is 0");
        } else {
          Alert.alert(
            "Error",
            "Please ensure Other Expense fields are correctly filled.",
          );
          console.log("Other Expense validation failed");
        }
      }
      setIsSaving(false);
      return;
    }

    console.log("All validations passed");

    setIsSaving(true);
    try {
      const businessCardUrls: string[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < businessCardFiles.length; i++) {
        const file = businessCardFiles[i];
        try {
          const response = await fetch(file.uri);
          if (!response.ok) {
            console.warn(`Skipping unreadable file: ${file.name}`);
            continue;
          }
          const blob = await response.blob();

          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const storageRef = ref(
            storage,
            `business-cards/${userId}/${timestamp}_${i}_${safeName}`,
          );

          const uploadResult = await uploadBytes(storageRef, blob, {
            contentType: file.type || "application/octet-stream",
          });

          const url = await getDownloadURL(uploadResult.ref);
          businessCardUrls.push(url);
        } catch (fileErr) {
          console.error(`Error uploading ${file.name}:`, fileErr);
        }
      }

      const { fromTime, toTime } = getOverallTimes();
      const encodedReport = formTripReport.replace(/\n/g, "\\n");

      await addDoc(collection(db, "expenses"), {
        user_id: userId,
        user_name: username,
        date: formDate,
        purpose: formPurpose,
        from_time: fromTime,
        to_time: toTime,
        duration: calculateDuration(),
        distance: dist,
        trip_report: encodedReport,
        business_card_urls: businessCardUrls,
        parking: parseFloat(formParking),
        toll: parseFloat(formToll),
        mileage: parseFloat(calculateMileage()),
        expense: parseFloat(formOtherExpense),
        expense_purpose: otherExpensePurpose,
        vendor: formVendor,
        customers: customers,
        cost: parseFloat(calculateCost()),
        type: 1,
        approval_status: 0,
        created_at: serverTimestamp(),
        trip_ids: addedTrips.map((trip) => trip.id),
      });

      resetForm();
      Alert.alert("Success", "Expense submitted successfully!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save expense.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    setIsSaving(true);
    console.log(formCustomers);
    const dist = getDistanceValue();
    const customers = formCustomers.slice(1);
    console.log("customers");
    console.log(customers);

    const otherExpenseValidation = !(
      (parseFloat(formOtherExpense) !== 0 &&
        formOtherExpenseType &&
        formVendor) ||
      (!parseFloat(formOtherExpense) && !formOtherExpenseType && !formVendor)
    );

    if (parseFloat(formOtherExpense) === 0) {
      setFormOtherExpenseType("");
    }

    const otherExpensePurpose =
      parseFloat(formOtherExpense) === 0 ? "" : formOtherExpenseType;

    const isAddressRequired =
      !noAddress.includes(userId || "") && addedTrips.length != 0;

    const isCustomersFormValid =
      customers.every(
        (customer) =>
          customer.name.trim() !== "" &&
          customer.company.trim() !== "" &&
          customer.email.trim() !== "" &&
          customer.number.trim() !== "" &&
          customer.time.trim() !== "",
      ) &&
      (isAddressRequired
        ? customers.some(
            (customer) => customer.address && customer.address.trim() !== "",
          )
        : true);

    if (
      !formPurpose.trim() ||
      !formDate ||
      !formTripReport ||
      !isCustomersFormValid ||
      otherExpenseValidation
    ) {
      if (!formPurpose.trim()) {
        Alert.alert("Error", "Please select a Purpose.");
        console.log("Purpose is missing");
      } else if (!formDate) {
        Alert.alert("Error", "Please select a Date.");
        console.log("Date is missing");
      } else if (!formTripReport) {
        Alert.alert("Error", "Please enter Trip Report.");
        console.log("Trip Report is missing");
      } else if (!isCustomersFormValid) {
        const invalidCustomers = customers.filter(
          (customer) =>
            customer.name.trim() === "" ||
            customer.company.trim() === "" ||
            customer.email.trim() === "" ||
            customer.number.trim() === "" ||
            customer.time.trim() === "",
        );

        if (invalidCustomers.length > 0) {
          Alert.alert(
            "Error",
            "Please ensure all customer fields (Name, Company, Email, Number, Time) are filled for all customers.",
          );
          console.log("Customer fields are incomplete", invalidCustomers);
        } else if (isAddressRequired) {
          const customersMissingAddress = customers.filter(
            (customer) => !customer.address || customer.address.trim() === "",
          );
          if (customersMissingAddress.length > 0) {
            Alert.alert("Error", "Please enter an address for a customers.");
            console.log(
              "Address is missing for some customers",
              customersMissingAddress,
            );
          }
        }
      } else if (otherExpenseValidation) {
        const expenseAmount = parseFloat(formOtherExpense);
        if (expenseAmount !== 0 && (!formOtherExpenseType || !formVendor)) {
          Alert.alert(
            "Error",
            "Please fill in both Other Expense Type and Vendor when Other Expense amount is entered.",
          );
          console.log("Other Expense fields are incomplete");
        } else if (
          expenseAmount === 0 &&
          (formOtherExpenseType || formVendor)
        ) {
          Alert.alert(
            "Error",
            "Please remove Other Expense Type and Vendor when Other Expense amount is 0.",
          );
          console.log("Other Expense fields should be empty when amount is 0");
        } else {
          Alert.alert(
            "Error",
            "Please ensure Other Expense fields are correctly filled.",
          );
          console.log("Other Expense validation failed");
        }
      }
      setIsSaving(false);
      return;
    }

    console.log("All validations passed");

    setIsSaving(true);
    try {
      const businessCardUrls: string[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < businessCardFiles.length; i++) {
        const file = businessCardFiles[i];
        try {
          const response = await fetch(file.uri);
          if (!response.ok) {
            console.warn(`Skipping unreadable file: ${file.name}`);
            continue;
          }
          const blob = await response.blob();

          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const storageRef = ref(
            storage,
            `business-cards/${userId}/${timestamp}_${i}_${safeName}`,
          );

          const uploadResult = await uploadBytes(storageRef, blob, {
            contentType: file.type || "application/octet-stream",
          });

          const url = await getDownloadURL(uploadResult.ref);
          businessCardUrls.push(url);
        } catch (fileErr) {
          console.error(`Error uploading ${file.name}:`, fileErr);
        }
      }

      const { fromTime, toTime } = getOverallTimes();
      const encodedReport = formTripReport.replace(/\n/g, "\\n");
      const docRef = doc(db, "expenses", editMileageId);

      const expense = {
        date: formDate,
        purpose: formPurpose,
        from_time: fromTime,
        to_time: toTime,
        duration: calculateDuration(),
        distance: dist,
        trip_report: encodedReport,
        business_card_urls: businessCardUrls,
        parking: parseFloat(formParking),
        toll: parseFloat(formToll),
        mileage: parseFloat(calculateMileage()),
        expense: parseFloat(formOtherExpense),
        expense_purpose: otherExpensePurpose,
        vendor: formVendor,
        customers: customers,
        cost: parseFloat(calculateCost()),
        trip_ids: addedTrips.map((trip) => trip.id),
      } as any;

      await updateDoc(docRef, expense);

      resetForm();
      Alert.alert("Success", "Expense updated successfully!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save expense.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormPurpose("");
    setFormTripReport("");
    setFormParking("0.00");
    setAddedTrips([]);
    setFormParking("0.00");
    setFormToll("0.00");
    setFormOtherExpense("0.00");
    setFormOtherExpenseType("");
    setFormVendor("");
    setBusinessCardFiles([]);
    setReceiptFiles([]);
    setFormCustomers([
      { name: "", company: "", email: "", number: "", time: "", address: "" },
    ]);
    setCustomerIndex(0);
    setEditingMileage(false);
    setEditMileageId("");
  };

  const getDisplayText = (item: any) => {
    const company = item.company || item.customers?.[0]?.company || "";
    const name = item.name || item.customers?.[0]?.name || "";

    if (company && name) {
      return `${company} • ${name}`;
    }
    return company || name;
  };

  const setEditMileage = (id: string) => {
    if (!id) {
      console.log("Not a valid expense");
      return;
    }
    setEditingMileage(true);
    setEditMileageId(id.trim());

    const selectedMileage = allMileage.find((e) => e.id === id);

    if (selectedMileage) {
      skipDateResetRef.current = true;
      const formatCurrency = (value: any): string => {
        // Handle null, undefined, or non-numeric values
        const num = typeof value === "number" ? value : parseFloat(value);
        // Check if it's a valid number
        if (isNaN(num) || num === undefined || num === null) {
          return "0.00";
        }
        return num.toFixed(2);
      };

      setFormDate(
        selectedMileage.date || new Date().toISOString().split("T")[0],
      );

      const tripIds = selectedMileage.trip_ids || [];
      const tripIdSet = new Set(tripIds);

      const seen = new Set();
      const matchingTrips = allUserTrips.filter((trip) => {
        if (!tripIdSet.has(trip.id) || seen.has(trip.id)) return false;
        seen.add(trip.id);
        return true;
      });
      console.log(
        allUserTrips
          .filter((t) => tripIdSet.has(t.id))
          .map((t) => `${typeof t.id}: ${String(t.id)}`),
      );
      console.log(matchingTrips);
      setAddedTrips(matchingTrips);

      setFormTripReport(
        (selectedMileage.trip_report || "")
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, ""),
      );
      setFormParking(formatCurrency(selectedMileage.parking));
      setFormToll(formatCurrency(selectedMileage.toll));
      setFormOtherExpense(formatCurrency(selectedMileage.expense));
      setFormOtherExpenseType(selectedMileage.expense_purpose || "");
      setFormVendor(selectedMileage.vendor || "");
      setCustomerIndex(0);

      setFormPurpose(selectedMileage.purpose);

      setFormCustomers(
        selectedMileage.customers?.length > 0
          ? selectedMileage.customers
          : [
              {
                name: "",
                company: "",
                email: "",
                number: "",
                time: "",
                address: "",
              },
            ],
      );
      //addTripsByIds(selectedMileage.trip_ids || []);
    }
  };

  const renderTripAddressModal = () => (
    <Modal
      visible={showAddressModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowAddressModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowAddressModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              Select a Trip from {formatDate(formDate)}
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddressModal(false)}
              style={styles.closeButtonWrapper}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {tripsForSelectedDate.length === 0 && (
              <Text style={styles.noTripsText}>No trips added</Text>
            )}
            {addedTrips.map((trip) => {
              const isAdded = false;
              return (
                <TouchableOpacity
                  key={trip.id}
                  style={[
                    styles.modalTripItem,
                    isAdded && styles.disabledTripItem,
                  ]}
                  onPress={() => {
                    if (isAdded) return;
                    setShowAddressModal(false);
                    console.log(trip.to_address);
                    setEditFormAddress(trip.to_address);
                  }}
                >
                  <Text
                    style={[styles.timeText, isAdded && styles.disabledText]}
                  >
                    {formatTripTime(trip.from_time)} -{" "}
                    {formatTripTime(trip.to_time)}
                  </Text>
                  <Text
                    style={[styles.addressText, isAdded && styles.disabledText]}
                  >
                    <Text style={styles.boldLabel}>Platform: </Text>
                    {trip?.platform === 2 ? "Web" : "Mobile"}
                  </Text>
                  <Text
                    style={[styles.addressText, isAdded && styles.disabledText]}
                  >
                    <Text style={styles.boldLabel}>Remark: </Text>
                    {trip.remark || "No Remark"}
                  </Text>
                  <Text
                    style={[styles.addressText, isAdded && styles.disabledText]}
                  >
                    <Text style={styles.boldLabel}>From: </Text>
                    {trip.from_address}
                  </Text>
                  <Text
                    style={[styles.addressText, isAdded && styles.disabledText]}
                  >
                    <Text style={styles.boldLabel}>To: </Text>
                    {trip.to_address}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const toTrip = () => {
    router.push("/(tabs)/trip");
  };

  const renderEditModal = () => {
    return (
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select an Expense</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {allMileage.length === 0 && (
                <Text style={styles.noTripsText}>No expense found</Text>
              )}
              {allMileage.map((mileage) => {
                return (
                  <TouchableOpacity
                    key={mileage.id}
                    style={styles.mobileTripItem}
                    onPress={() => {
                      setShowEditModal(false);
                      setEditMileage(mileage.id);
                    }}
                  >
                    <Text style={styles.mobileTripRemark}>
                      {mileage?.purpose}
                    </Text>
                    <Text style={styles.mobileTripAddress}>
                      {getDisplayText(mileage)}
                    </Text>
                    <View style={styles.mobileTripHeader}>
                      <Text style={styles.distanceText}>
                        RM {mileage.cost.toFixed(2)}
                      </Text>
                      <Text style={styles.timeText}>
                        {formatDate(mileage?.date || "")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderTripModal = () => (
    <Modal
      visible={isDropdownOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsDropdownOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Select a Trip from {formatDate(formDate)}
            </Text>
            <TouchableOpacity onPress={() => setIsDropdownOpen(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {tripsForSelectedDate.length === 0 && (
              <Text style={styles.noTripsText}>
                No trips found for {formDate.split("-").reverse().join("/")}
              </Text>
            )}
            {tripsForSelectedDate.map((trip) => {
              const isAdded = addedTrips.some((added) => added.id === trip.id);

              return (
                <TouchableOpacity
                  key={trip.id}
                  style={[
                    styles.modalTripItem,
                    isAdded && styles.disabledTripItem,
                  ]}
                  onPress={() => {
                    if (isAdded) return;
                    setSelectedTripId(trip.id);
                    setIsDropdownOpen(false);
                    handleAddTrip(trip.id);
                  }}
                >
                  <Text
                    style={[styles.timeText, isAdded && styles.disabledText]}
                  >
                    {formatTripTime(trip.from_time)} -{" "}
                    {formatTripTime(trip.to_time)}
                  </Text>
                  <Text
                    style={[styles.addressText, isAdded && styles.disabledText]}
                  >
                    <Text style={styles.boldLabel}>Platform: </Text>
                    {trip?.platform === 2 ? "Web" : "Mobile"}
                  </Text>
                  <Text
                    style={[styles.addressText, isAdded && styles.disabledText]}
                  >
                    <Text style={styles.boldLabel}>Remark: </Text>
                    {trip.remark || "No Remark"}
                  </Text>
                  <Text
                    style={[styles.addressText, isAdded && styles.disabledText]}
                  >
                    <Text style={styles.boldLabel}>From: </Text>
                    {trip.from_address}
                  </Text>
                  <Text
                    style={[styles.addressText, isAdded && styles.disabledText]}
                  >
                    <Text style={styles.boldLabel}>To: </Text>
                    {trip.to_address}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderCustomerModal = () => {
    return (
      <Modal
        visible={showCustomerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowCustomerModal(false);
          resetCustomerEditForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent]}>
            <View
              style={[
                styles.modalHeader,
                { borderBottomWidth: 0, marginBottom: 10 },
              ]}
            >
              <Text style={styles.modalTitle}>
                {isEditingCustomer ? "Edit Customer" : "Add Customer"}
              </Text>
            </View>

            <View style={[{ gap: 10, marginVertical: 10 }]}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Company:
                </Text>
                <TextInput
                  placeholder="Company"
                  value={editFormCompany}
                  onChangeText={setEditFormCompany}
                  style={[styles.textInput]}
                  placeholderTextColor="#000"
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Name:
                </Text>
                <TextInput
                  placeholder="Name"
                  value={editFormName}
                  onChangeText={setEditFormName}
                  style={[styles.textInput]}
                  placeholderTextColor="#000"
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Email:
                </Text>
                <TextInput
                  placeholder="Email"
                  value={editFormEmail}
                  onChangeText={setEditFormEmail}
                  style={[styles.textInput]}
                  placeholderTextColor="#000"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Number:
                </Text>
                <TextInput
                  placeholder="Number"
                  value={editFormContactNumber}
                  onChangeText={setEditFormContactNumber}
                  style={[styles.textInput]}
                  placeholderTextColor="#000"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Time:
                </Text>
                <TimePickerInput
                  value={editFormTime}
                  onChange={setEditFormTime}
                  placeholder="Select time"
                  disabled={isSaving}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Address:
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    console.log("address");
                    console.log(editFormAddress);
                    setShowAddressModal(true);
                  }}
                  style={styles.textInput}
                >
                  <Text>
                    {editFormAddress ? editFormAddress : "Select Address"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {renderTripAddressModal()}

            <View
              style={[styles.buttonRow, { marginTop: 10, marginBottom: 10 }]}
            >
              <TouchableOpacity
                style={[styles.dialogButton, styles.cancelButton]}
                onPress={() => {
                  setShowCustomerModal(false);
                  resetCustomerEditForm();
                }}
                disabled={isSaving}
              >
                <Text style={styles.textStyle}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dialogButton,
                  styles.submitButton,
                  isSaving && { opacity: 0.7 },
                ]}
                onPress={() => {
                  if (isEditingCustomer) {
                    saveEditedCustomer();
                  } else {
                    addCustomerRow(
                      editFormCompany,
                      editFormName,
                      editFormEmail,
                      editFormContactNumber,
                      editFormTime,
                      editFormAddress,
                    );
                    resetCustomerEditForm();
                    setShowCustomerModal(false);
                  }
                }}
                disabled={isSaving}
              >
                <Text style={styles.textStyle}>
                  {isEditingCustomer ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const fieldMessage = (
    <Text style={[{ fontSize: 14, fontWeight: "600", width: 500 }]}>
      Required fields in <Text style={{ color: "#2196F3" }}>blue</Text>.
    </Text>
  );

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={64}
    >
      <View style={[styles.mobileContainer, { gap: 10 }]}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              setShowEditModal(true);
            }}
            style={[
              styles.button,
              {
                backgroundColor: "#FFA500",
                padding: 12,
                marginTop: 0,
              },
            ]}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>Edit Mileage Expense</Text>
          </TouchableOpacity>
          {editingMileage && (
            <TouchableOpacity
              onPress={() => {
                setEditingMileage(false);
                resetForm();
              }}
              style={[styles.button, { padding: 12, marginTop: 0 }]}
              disabled={isSaving}
            >
              <Text style={styles.buttonText}>Cancel Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderEditModal()}

        {fieldMessage}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.fieldLabel}>Date:</Text>
          <DatePickerInput
            value={formDate}
            onChange={setFormDate}
            placeholder="Select your date"
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              setIsDropdownOpen(true);
            }}
            style={[
              styles.dropdownInput,
              {
                opacity: tripsForSelectedDate.length > 0 ? 1 : 0.5,
              },
            ]}
            disabled={tripsForSelectedDate.length == 0}
          >
            <Text style={styles.buttonText}>
              {selectedTripId
                ? (() => {
                    const selected = tripsForSelectedDate.find(
                      (t) => t.id === selectedTripId,
                    );
                    return selected
                      ? `${selected.remark || "No Remark"} (${(parseFloat(selected.distance) || 0).toFixed(2)} km)`
                      : "Select Trips";
                  })()
                : tripsForSelectedDate.length > 0
                  ? "Select Trips"
                  : "No Trips"}
            </Text>
          </TouchableOpacity>
          {renderTripModal()}
          <TouchableOpacity
            onPress={() => toTrip()}
            style={[
              styles.dropdownInput,
              {
                opacity: isToday(formDate) ? 1 : 0.5,
              },
            ]}
            disabled={!isToday(formDate)}
          >
            <Text style={styles.buttonText}>Add Trip</Text>
          </TouchableOpacity>
        </View>

        {addedTrips.length > 0 && (
          <View style={styles.addedTripsContainer}>
            <Text style={styles.subsectionTitle}>Selected Trips:</Text>
            {addedTrips.map((trip) => (
              <View key={trip.id} style={styles.addedTripItem}>
                <View style={styles.addedTripDetails}>
                  <Text style={styles.timeText}>
                    {formatTripTime(trip.from_time)} -{" "}
                    {formatTripTime(trip.to_time)}
                  </Text>
                  <Text style={styles.tripRemark}>
                    {trip.remark || "No Remark"} (
                    {parseFloat(trip.distance || 0).toFixed(2)} km)
                  </Text>
                  <Text style={styles.tripAddress} numberOfLines={1}>
                    {trip.from_address} → {trip.to_address}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveTrip(trip.id)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.totalSummary}>
              <Text style={styles.summaryText}>
                Total Distance: {getDistanceValue().toFixed(2)} km
              </Text>
              <Text style={styles.summaryText}>
                Total Mileage: RM {calculateMileage()}
              </Text>
            </View>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.fieldLabel}>Distance:</Text>
          <Text style={styles.fieldValue}>{distance} km</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Purpose:
          </Text>
          <View style={styles.inputContainer}>
            <Picker
              selectedValue={formPurpose}
              onValueChange={(itemValue) => setFormPurpose(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              dropdownIconColor="#666"
              mode="dropdown"
            >
              <Picker.Item label="Select a purpose..." value="" />
              <Picker.Item
                label="Application support"
                value="Application support"
              />
              <Picker.Item
                label="Attending seminar/training"
                value="Attending seminar/training"
              />
              <Picker.Item
                label="Breakfast/Lunch/Dinner meeting"
                value="Breakfast/Lunch/Dinner meeting"
              />
              <Picker.Item
                label="Documents submission"
                value="Documents submission"
              />
              <Picker.Item label="Door knocking" value="Door knocking" />
              <Picker.Item
                label="Meeting and follow-up"
                value="Meeting and follow-up"
              />
              <Picker.Item label="Presentation" value="Presentation" />
              <Picker.Item
                label="Service and support"
                value="Service and support"
              />
              <Picker.Item label="Site inspection" value="Site inspection" />
              <Picker.Item label="Site visitation" value="Site visitation" />
            </Picker>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.fieldLabel}>Start Trip Time:</Text>
          <Text style={styles.fieldValue}>
            {to12HourTime(formFromTime) || "N/A"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.fieldLabel}>End Trip Time:</Text>
          <Text style={styles.fieldValue}>
            {to12HourTime(formToTime) || "N/A"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.fieldLabel}>Duration:</Text>
          <Text style={styles.fieldValue}>{calculateDuration()}</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.fieldLabel}>Mileage (RM):</Text>
          <Text style={styles.fieldValue}>RM {calculateMileage()}</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={[styles.fieldLabel]}>Toll (RM):</Text>
          <TextInput
            value={formToll}
            onChangeText={setFormToll}
            keyboardType="numeric"
            style={[styles.textInput, { maxWidth: 80 }]}
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={[styles.fieldLabel]}>Parking (RM):</Text>
          <TextInput
            value={formParking}
            onChangeText={setFormParking}
            keyboardType="numeric"
            style={[styles.textInput, { maxWidth: 80 }]}
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={[styles.fieldLabel]}>Other Expenses (RM):</Text>
          <TextInput
            value={formOtherExpense}
            onChangeText={setFormOtherExpense}
            keyboardType="numeric"
            style={[styles.textInput, { marginRight: 0, maxWidth: 80 }]}
          />
          <View style={styles.inputContainer}>
            <Picker
              selectedValue={formOtherExpenseType}
              onValueChange={(itemValue) => setFormOtherExpenseType(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              dropdownIconColor="#666"
              mode="dropdown"
            >
              <Picker.Item label="Select a purpose..." value="" />
              <Picker.Item
                label="Meal with customer"
                value="Meal with customer"
              />
              <Picker.Item
                label="Meal with supplier"
                value="Meal with supplier"
              />
              <Picker.Item
                label="Purchase of goods"
                value="Purchase of goods"
              />
              <Picker.Item label="Staff benefits" value="Staff benefits" />
              <Picker.Item label="Others" value="Others" />
            </Picker>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={[styles.fieldLabel]}>Vendor:</Text>
          <TextInput
            value={formVendor}
            onChangeText={setFormVendor}
            style={[styles.textInput, { flex: 1 }]}
            placeholder="Vendor"
            placeholderTextColor="#000"
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.fieldLabel}>Cost (RM):</Text>
          <Text style={styles.fieldValue}>RM {calculateCost()}</Text>
        </View>

        <View
          style={{
            marginTop: 15,
            borderTopWidth: 1,
            borderTopColor: "#ccc",
            paddingTop: 10,
          }}
        >
          <Text style={[styles.formLabel, { fontSize: 16 }]}>
            Customer Details:
          </Text>
          {formCustomers.map((customer, index) => {
            if (index === 0) return null;

            return (
              <TouchableOpacity
                key={index}
                style={styles.customerCard}
                onPress={() => openEditCustomerModal(index)}
                activeOpacity={0.7}
              >
                <View style={styles.customerHeader}>
                  <Text style={styles.customerIndex}>Customer #{index}</Text>
                  <View style={styles.customerHeaderActions}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        removeCustomerRow(index);
                      }}
                      style={styles.removeCustomerButton}
                    >
                      <Text style={styles.removeCustomerText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.customerDetails}>
                  <Text style={styles.customerDetailText}>
                    <Text style={styles.customerDetailLabel}>Company: </Text>
                    {customer.company || "N/A"}
                  </Text>
                  <Text style={styles.customerDetailText}>
                    <Text style={styles.customerDetailLabel}>Name: </Text>
                    {customer.name || "N/A"}
                  </Text>
                  <Text style={styles.customerDetailText}>
                    <Text style={styles.customerDetailLabel}>Email: </Text>
                    {customer.email || "N/A"}
                  </Text>
                  <Text style={styles.customerDetailText}>
                    <Text style={styles.customerDetailLabel}>Number: </Text>
                    {customer.number || "N/A"}
                  </Text>
                  <Text style={styles.customerDetailText}>
                    <Text style={styles.customerDetailLabel}>Time: </Text>
                    {customer.time || "N/A"}
                  </Text>
                  <Text style={styles.customerDetailText}>
                    <Text style={styles.customerDetailLabel}>Address: </Text>
                    {customer.address || "N/A"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => {
              console.log(formCustomers);
              setShowCustomerModal(true);
            }}
            style={[
              {
                backgroundColor: "#2196F3",
                borderRadius: 5,
                paddingVertical: 8,
                paddingHorizontal: 12,
                justifyContent: "center",
                minHeight: 36,
                alignItems: "center",
              },
            ]}
          >
            <Text style={styles.buttonText}>+ Add Customer</Text>
          </TouchableOpacity>

          {renderCustomerModal()}
        </View>

        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        ></View>

        <View style={{ alignItems: "flex-start", gap: 10 }}>
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Trip Report:
          </Text>
          <TextInput
            value={formTripReport}
            onChangeText={setFormTripReport}
            multiline
            style={[
              styles.textInput,
              {
                minHeight: 200,
                width: "100%",
                textAlignVertical: "top",
                textAlign: "left",
              },
            ]}
            placeholderTextColor="#000"
            placeholder="Trip Report"
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.fieldLabel}>Business Cards:</Text>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={selectFiles}
            activeOpacity={0.7}
          >
            <Text style={styles.uploadButtonText}>
              📎{" "}
              {businessCardFiles.length > 0
                ? `${businessCardFiles.length} file(s) selected`
                : "Tap to select files"}
            </Text>
          </TouchableOpacity>
        </View>
        {businessCardFiles.length > 0 && (
          <View style={styles.fileListContainer}>
            <Text style={styles.fileListTitle}>
              Selected Files ({businessCardFiles.length})
            </Text>

            {businessCardFiles.map((file, index) => (
              <View key={`${file.uri}-${index}`} style={styles.fileItem}>
                <View style={styles.filePreview}>
                  {file.type?.startsWith("image/") ? (
                    <Image
                      source={{ uri: file.uri }}
                      style={styles.fileThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.fileIcon}>
                      {getFileIcon(file.type)}
                    </Text>
                  )}
                </View>

                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.name || "Unnamed file"}
                  </Text>
                  <Text style={styles.fileMeta}>
                    {formatFileSize(file.size || 0)} • {file.type || "unknown"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={() => removeFile(index)}
                >
                  <Text style={styles.removeFileText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={editingMileage ? handleEdit : handleSubmit}
          style={[styles.button, { opacity: isSaving ? 0.5 : 1 }]}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>
              {editingMileage
                ? "Edit Mileage Expense"
                : "Submit Mileage Expense"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  // Mobile Container
  mobileContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginVertical: 10,
  },

  // Shared Text
  timeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2196F3",
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4caf50",
  },
  noTripsText: {
    padding: 20,
    textAlign: "center",
    color: "#888",
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2e7d32",
  },
  disabledTripItem: {
    opacity: 0.6,
  },
  disabledText: {
    color: "#9e9e9e",
  },
  boldLabel: { fontWeight: "bold", color: "#333" },
  addressText: { fontSize: 13, color: "#444", marginTop: 2 },

  // Field Styles
  fieldLabel: { fontSize: 14, fontWeight: "600", width: 100 },
  fieldValue: { fontSize: 14, width: 120, paddingVertical: 10 },
  fieldLabelMandatory: { color: "#2196F3" },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  formLabel: { fontSize: 18, fontWeight: "bold" },

  // Input Styles
  textInput: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    zIndex: 1,
    position: "relative",
    marginRight: 10,
  },
  inputContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#eee",
    height: 48,
  },
  picker: {
    width: "100%",
    color: "#000",
    fontSize: 14,
  },
  pickerItem: {
    fontSize: 14,
  },

  // Buttons
  dropdownInput: {
    backgroundColor: "#2196F3",
    borderRadius: 5,
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    minHeight: 36,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold" },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  button: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  dialogButton: {
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    flex: 1,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#2196F3",
  },
  cancelButton: {
    backgroundColor: "#f44336",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
  },

  // Added Trips
  addedTripsContainer: { marginTop: 5 },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#555",
  },
  addedTripItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  addedTripDetails: { flex: 1 },
  tripRemark: { fontWeight: "bold", fontSize: 14 },
  removeButton: {
    backgroundColor: "#f44336",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 10,
  },
  removeButtonText: { color: "white", fontSize: 12, fontWeight: "bold" },
  totalSummary: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#e8f5e9",
    borderLeftWidth: 4,
    borderLeftColor: "#4caf50",
    maxWidth: 400,
  },

  // Modals
  modalOverlay: {
    // overridden by file 2
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 8,
    overflow: "hidden",
    padding: 16,
  },
  modalHeader: {
    // overridden by file 2
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" }, // overridden by file 2
  closeButton: { fontSize: 20, fontWeight: "bold", color: "#999" }, // overridden by file 2
  modalList: { maxHeight: 400 }, // overridden by file 2
  modalTripItem: { padding: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" }, // overridden by file 2
  modalTripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  // Mobile Modal (Edit Modal)
  mobileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  mobileModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  mobileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  mobileModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  mobileModalList: {
    paddingHorizontal: 16,
  },
  mobileTripItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  // Customer Cards
  customerCard: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  customerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  customerIndex: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  customerDetails: {
    gap: 4,
  },
  customerDetailText: {
    fontSize: 13,
    color: "#444",
  },
  customerDetailLabel: {
    fontWeight: "600",
    color: "#666",
  },
  removeCustomerButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f44336",
    alignItems: "center",
    justifyContent: "center",
  },
  removeCustomerText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  customerHeaderActions: {
    flexDirection: "row",
    gap: 8,
  },

  // File Upload
  uploadButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  fileListContainer: {
    gap: 8,
  },
  fileListTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 12,
  },
  filePreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  fileThumbnail: {
    width: "100%",
    height: "100%",
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  fileMeta: {
    fontSize: 12,
    color: "#888",
  },
  removeFileButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f44336",
    alignItems: "center",
    justifyContent: "center",
  },
  removeFileText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 16,
  },
});
