import { exportCustomersToCSV } from "@/components/CustomerExporter";
import PlacesInput from "@/components/PlacesInput";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import {
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  GeoPoint,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { createNewUser, db, storage } from "../../firebaseConfig";

const { height: screenHeight } = Dimensions.get("window");

interface User {
  id: string;
  username: string;
  email: string;
  ess_no: string;
  department: string;
  grade: string;
  cost_center: string;
  role: number;
  office: number;
  active: boolean;
  home_coordinates: {
    latitude: number;
    longitude: number;
  };
  subordinates: string[];
  home_address: string;
}

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

interface Customers {
  name: string;
  company: string;
  email: string;
  number: string;
  time: string;
  address: string;
}

export default function settings() {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<number>(1);
  const [userHomeAddress, setUserHomeAddress] = useState<string>("");

  const [password, setPassword] = useState("");

  // FIX 1: We keep track of BOTH the auth status ID and the physical Firestore document ID
  const [userId, setUserId] = useState<string | null>(null); // Auth user.uid
  const [firestoreDocId, setFirestoreDocId] = useState<string | null>(null); // Random Auto-ID (e.g. Jk8sD92nLmPq)

  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState<string>("");

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState<string>("");

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [homeModalVisible, setHomeModalVisible] = useState(false);
  const [homeAddress, setHomeAddress] = useState<string>("");

  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);

  const [mileageModalVisible, setMileageModalVisible] = useState(false);
  const [mileageRate, setMileageRate] = useState<string>("0.0");
  const [mobileMileageRate, setMobileMileageRate] = useState<string>("0.0");
  const [mileageRateOutstation, setMileageRateOutstation] =
    useState<string>("0.0");
  const [mobileMileageRateOutstation, setMobileMileageRateOutstation] =
    useState<string>("0.0");
  const [mileageBike, setMileageBike] = useState<string>("0.00");
  const [mobileMileageBike, setMobileMileageBikeMobile] =
    useState<string>("0.00");
  const [oustationDistance, setOutstationDistance] = useState<string>("0.0");

  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [officeAddress, setOfficeAddress] = useState<string>("");
  const [officeCoord, setOfficeCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [distance, setDistance] = useState<string>("0.00");

  const [userModalVisible, setUserModalVisible] = useState(false);
  const [formUsername, setFormUsername] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formPassword, setFormPassword] = useState<string>("");
  const [formConfirmPassword, setFormConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [formEssNo, setFormEssNo] = useState<string>("");
  const [formDepartment, setFormDepartment] = useState<string>("");
  const [formGrade, setFormGrade] = useState<string>("");
  const [formCostCenter, setFormCostCenter] = useState<string>("");
  const [formRole, setFormRole] = useState<string>("");
  const [formOffice, setFormOffice] = useState<string>("");
  const [formSubordinates, setFormSubordinates] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);

  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [allMileage, setAllMileage] = useState<Expense[]>([]);
  const [allGeneral, setAllGeneral] = useState<GeneralExpense[]>([]);
  const [allOutstation, setAllOutstation] = useState<OutstationExpense[]>([]);

  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectUserModalVisible, setSelectUserModalVisible] = useState(false);
  const [selectSubModalVIsible, selectSelectSubModalVisible] = useState(false);
  const [addedUsers, setAddedUsers] = useState<any[]>([]);
  const [addedSub, setAddedSub] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();

  const roles = [
    { value: "0", label: "Admin" },
    { value: "2", label: "Manager" },
    { value: "3", label: "Supervisor" },
    { value: "1", label: "User" },
  ];

  const roleMap = {
    0: "Admin",
    1: "User",
    2: "Manager",
    3: "Supervisor",
  };

  const officeMap = {
    0: "HQ",
    1: "Penang",
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();

          setUsername(userData.username);
          setEmail(userData.email);
          setRole(userData.role);
          const homeCoord = userData.home_coordinates;

          if (homeCoord) {
            try {
              const address = await getAddressFromCoords(
                homeCoord.latitude,
                homeCoord.longitude,
              );
              setUserHomeAddress(address || "");
            } catch (error) {
              console.log("Error fetching home address");
              console.log(error);
            }
          }

          // FIX 2: Save the actual Firestore document auto-generated key name
          setFirestoreDocId(userDoc.id);
        } else {
          console.log("Still no document found with that UID field");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) {
      console.error("No Config ID found in environment variables");
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "config", configId),
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.mileage_rate) setMileageRate(data.mileage_rate.toString());
          if (data.mileage_rate_mobile)
            setMobileMileageRate(data.mileage_rate_mobile.toString());
          if (data.mileage_rate_outstation)
            setMileageRateOutstation(data.mileage_rate_outstation.toString());
          if (data.mileage_rate_outstation_mobile)
            setMobileMileageRateOutstation(
              data.mileage_rate_outstation_mobile.toString(),
            );
          if (data.mileage_rate_bike) {
            setMileageBike(data.mileage_rate_bike.toString());
          }
          if (data.mileage_rate_bike_mobile) {
            setMobileMileageBikeMobile(
              data.mileage_rate_bike_mobile.toString(),
            );
          }
          if (data.outstation_distance)
            setOutstationDistance(data.outstation_distance.toString());
          if (data.arrival_distance)
            setDistance((data.arrival_distance * 1000).toString());
          const officeCoord = data.office_coordinates;

          if (officeCoord) {
            try {
              const address = await getAddressFromCoords(
                officeCoord.latitude,
                officeCoord.longitude,
              );
              console.log("address");
              console.log(address);
              setOfficeAddress(address || "");
            } catch (error) {
              console.log("Error fetching office address");
              console.log(error);
            }
          }

          console.log("Office coords");
          console.log(officeCoord);
        }
      },
    );
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
      setAllMileage(expensesData);
      setAllGeneral(generalExpenseData);
      setAllOutstation(outstationExpenseData);
    });

    return () => unsubscribe();
  }, [userId, role]);

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

      // ── Fallback to native if Google fails ────────────────────────
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
      // ── Fallback to native on network error ───────────────────────
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

  const getUserById = (userId: string): User | undefined => {
    return allUsers.find((user) => user.id === userId);
  };

  const changeUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    // FIX 3: Change check to verify we found the database document reference string
    if (!firestoreDocId) {
      Alert.alert(
        "Error",
        "User document record not found. Try logging in again.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const userDocRef = doc(db, "users", firestoreDocId);

      await updateDoc(userDocRef, {
        username: newUsername.trim(),
      });

      setUsername(newUsername.trim());
      Alert.alert("Success", "Username updated successfully!");
      setUsernameModalVisible(false);
      setNewUsername("");
    } catch (error) {
      console.error("Error updating username: ", error);
      Alert.alert("Error", "Failed to update username. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const changeEmail = async () => {
    if (!newEmail.trim() || !password) {
      Alert.alert("Error", "Please fill in both email and password.");
      return;
    }

    setIsSaving(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user && user.email) {
        // Re-authenticate
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);

        // Request email change
        await verifyBeforeUpdateEmail(user, newEmail.trim());

        // Update Firestore
        const userDocRef = doc(db, "users", firestoreDocId);
        await updateDoc(userDocRef, { email: newEmail.trim() });

        Alert.alert("Success", "Verification email sent to " + newEmail);
        setEmailModalVisible(false);
        setPassword(""); // Clear password
        setNewEmail("");
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      alert("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      alert("Ppasswords do not match.");
      return;
    }

    setIsSaving(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user && user.email) {
        // 1. Re-authenticate
        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword,
        );
        await reauthenticateWithCredential(user, credential);

        // 2. Update Password
        await updatePassword(user, newPassword);

        alert("Password updated successfully!");
        setPasswordModalVisible(false);

        // Reset fields
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setShowPassword(false);
      }
    } catch (error: any) {
      const err = error as any;
      console.error("Signup error:", err.code, err.message);
      let errorMessage = "An error occurred during signup.";

      if (err.code === "auth/weak-password") {
        errorMessage = "Password must be at least 6 characters.";
      } else if (err.code === "auth/configuration-not-found") {
        errorMessage =
          "Firebase Auth is not configured. Please enable Email/Password provider in the Firebase Console.";
      }

      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const updateHomeAddress = async () => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("Google Maps API Key is missing");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Encode the address string to make it URL-safe
      const encodedAddress = encodeURIComponent(homeAddress);
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

      // 2. Call the Google Geocoding API
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      // 3. Check if Google successfully found the address
      if (data.status !== "OK" || !data.results.length) {
        Alert.alert("Error", `Geocoding failed: ${data.status}`);
        return;
      }

      // 4. Extract latitude and longitude
      const { lat, lng } = data.results[0].geometry.location;

      console.log("Coordinates found:", lat, lng);

      const userDocRef = doc(db, "users", firestoreDocId);

      await updateDoc(userDocRef, {
        home_coordinates: new GeoPoint(lat, lng),
      });

      Alert.alert(
        "Success",
        "Home address and coordinates updated successfully!",
      );
      setHomeModalVisible(false);
    } catch (error) {
      console.error("Error updating document or fetching coordinates:", error);
      alert("An error occurred while updating the address.");
    } finally {
      setIsSaving(false);
    }
  };

  const uploadDocuments = async () => {
    if (documentFiles.length === 0) {
      alert("Please select a document to upload");
    }

    try {
      const documentUrls: string[] = [];
      for (const file of documentFiles) {
        const storageRef = ref(
          storage,
          `documents/${userId}/${Date.now()}_${file.name}`,
        );
        const uploadResult = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(uploadResult.ref);
        documentUrls.push(url);
      }

      await addDoc(collection(db, "documents"), {
        user_id: userId,
        user_name: username,
        document_urls: documentUrls,
        created_at: serverTimestamp(),
      });
      setDocumentFiles([]);
      setDocumentModalVisible(false);
      alert("Documents submitted successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save documents.");
    }
  };

  const updateMileageRate = async () => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) {
      console.error("No Config ID found in environment variables");
      return;
    }

    setIsSaving(true);

    const docRef = doc(db, "config", configId);
    try {
      await updateDoc(docRef, {
        mileage_rate: parseFloat(mileageRate),
        mileage_rate_mobile: parseFloat(mobileMileageRate),
        mileage_rate_outstation: parseFloat(mileageRateOutstation),
        mileage_rate_outstation_mobile: parseFloat(mobileMileageRateOutstation),
        mileage_rate_bike: parseFloat(mileageBike),
        mileage_rate_bike_mobile: parseFloat(mobileMileageBike),
        outstation_distance: parseFloat(oustationDistance),
      });
      Alert.alert("Success", "Mileage rate updated successfully!");
      setMileageModalVisible(false);
    } catch (error) {
      console.error("Error updating document:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateOfficeAddress = async () => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY; // Your Google API Key

    if (!configId) {
      console.error("No Config ID found in environment variables");
      return;
    }

    if (!apiKey) {
      console.error("Google Maps API Key is missing");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Encode the address string to make it URL-safe
      const encodedAddress = encodeURIComponent(officeAddress);
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

      // 2. Call the Google Geocoding API
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      // 3. Check if Google successfully found the address
      if (data.status !== "OK" || !data.results.length) {
        Alert.alert("Error", `Geocoding failed: ${data.status}`);
        return;
      }

      // 4. Extract latitude and longitude
      const { lat, lng } = data.results[0].geometry.location;

      console.log("Coordinates found:", lat, lng);

      // 5. Update Firebase with the address AND coordinates
      /* const docRef = doc(db, "config", configId);
      await updateDoc(docRef, {
        office_address: officeAddress,
        office_location: {
          latitude: lat,
          longitude: lng,
        },
      }); */

      const docRef = doc(db, "config", configId);
      await updateDoc(docRef, {
        office_coordinates: new GeoPoint(lat, lng),
      });

      Alert.alert(
        "Success",
        "Office address and coordinates updated successfully!",
      );
      setAddressModalVisible(false);
    } catch (error) {
      console.error("Error updating document or fetching coordinates:", error);
      alert("An error occurred while updating the address.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateArrivalDistance = async () => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) {
      console.error("No Config ID found in environment variables");
      return;
    }

    setIsSaving(true);
    const docRef = doc(db, "config", configId);
    try {
      console.log(distance);
      await updateDoc(docRef, {
        arrival_distance: parseFloat(distance) / 1000,
      });
      Alert.alert("Success", "Arrival distance updated successfully!");
      setDistanceModalVisible(false);
    } catch (error) {
      console.error("Error updating document:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignup = async () => {
    if (
      formUsername.trim() === "" ||
      formEmail.trim() === "" ||
      formPassword.trim() === "" ||
      formConfirmPassword.trim() === "" ||
      formEssNo.trim() === "" ||
      formDepartment.trim() === "" ||
      formGrade.trim() === "" ||
      formCostCenter.trim() === "" ||
      formOffice.trim() === "" ||
      homeAddress.trim() === ""
    ) {
      alert("Please fill in all fields.");
      return;
    }

    if (formPassword !== formConfirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      // createUserWithEmailAndPassword automatically signs the user in
      /* const userCredential = await createUserWithEmailAndPassword(
        auth,
        formEmail.trim(),
        formPassword,
      ); */
      const coordinates = await getCoordinatesFromAddress(homeAddress);
      if (!coordinates) {
        alert(
          "Could not find coordinates for the home address. Please check the address and try again.",
        );
        setIsSaving(false);
        return;
      }

      const newUid = await createNewUser(formEmail.trim(), formPassword);

      const role = parseInt(formRole);

      await setDoc(doc(db, "users", newUid), {
        uid: newUid,
        username: formUsername.trim(),
        email: formEmail.trim(),
        created_at: serverTimestamp(),
        role: role,
        ess_no: formEssNo.trim(),
        department: formDepartment.trim(),
        grade: formGrade.trim(),
        cost_center: formCostCenter.trim(),
        office: parseInt(formOffice),
        home_coordinates: new GeoPoint(coordinates.lat, coordinates.lng),
        home_address: homeAddress,
        active: true,
        permission: 0,
        subordinates: formSubordinates,
      });

      clearUserForm();
      setUserModalVisible(false);
    } catch (error) {
      const err = error as any;
      console.error("Signup error:", err.code, err.message);
      let errorMessage = "An error occurred during signup.";

      if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password must be at least 6 characters.";
      } else if (err.code === "auth/configuration-not-found") {
        errorMessage =
          "Firebase Auth is not configured. Please enable Email/Password provider in the Firebase Console.";
      }

      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const clearUserForm = () => {
    setShowPassword(false);
    setFormUsername("");
    setFormEmail("");
    setFormPassword("");
    setFormConfirmPassword("");
    setFormEssNo("");
    setFormGrade("");
    setFormDepartment("");
    setFormCostCenter("");
    setFormRole("");
    setFormActive(true);
    setFormOffice("");
    setHomeAddress("");
    setFormSubordinates([]);
    setAddedSub([]);
  };

  const getAddress = async (coords) => {
    try {
      const address = await getAddressFromCoords(
        coords.latitude,
        coords.longitude,
      );
      return address;
    } catch (error) {
      return "";
    }
  };

  const handleSelectUser = async (userId: string) => {
    console.log(userId);
    const idToAdd = userId || selectedUserId;
    if (!idToAdd) {
      return;
    }

    const userToAdd = allUsers.find((u) => u.id === idToAdd);
    if (userToAdd && !addedUsers.some((u) => u.id === userToAdd.id)) {
      setFormUsername(userToAdd.username || "");
      setFormEmail(userToAdd.email || "");
      setFormCostCenter(userToAdd.cost_center || "");
      setFormEssNo(userToAdd.ess_no || "");
      setFormGrade(userToAdd.grade || "");
      setFormActive(userToAdd.active || true);
      setFormRole(userToAdd.role.toString() || "");
      setFormDepartment(userToAdd.department || "");
      setFormOffice(userToAdd.office?.toString() || "");
      setFormSubordinates(userToAdd.subordinates || []);
      const homeCoord = userToAdd.home_coordinates;

      if (homeCoord) {
        try {
          const address = await getAddressFromCoords(
            homeCoord.latitude,
            homeCoord.longitude,
          );
          setHomeAddress(address || "");
        } catch (error) {
          console.log("Error fetching home address");
          console.log(error);
        }
      }
    }
  };

  const getCoordinatesFromAddress = async (
    address: string,
  ): Promise<{ lat: number; lng: number } | null> => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("Google Maps API Key is missing");
      return null;
    }

    if (!address || address.trim() === "") {
      console.error("Address is empty");
      return null;
    }

    try {
      // Encode the address string to make it URL-safe
      const encodedAddress = encodeURIComponent(address);
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

      // Call the Google Geocoding API
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      // Check if Google successfully found the address
      if (data.status !== "OK" || !data.results.length) {
        console.error(`Geocoding failed: ${data.status}`);
        return null;
      }

      // Extract and return latitude and longitude
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      return null;
    }
  };

  const editUser = async () => {
    if (
      !formUsername.trim() ||
      !formEmail.trim() ||
      !formEssNo.trim() ||
      !homeAddress.trim()
    ) {
      Alert.alert("Error", "Field cannot be empty");
      return;
    }

    setIsSaving(true);

    try {
      const coordinates = await getCoordinatesFromAddress(homeAddress);
      if (!coordinates) {
        Alert.alert(
          "Error",
          "Could not find coordinates for the home address. Please check the address and try again.",
        );
        setIsSaving(false);
        return;
      }

      const userDocRef = doc(db, "users", selectedUserId);

      await updateDoc(userDocRef, {
        username: formUsername.trim(),
        email: formEmail.trim(),
        ess_no: formEssNo.trim(),
        department: formDepartment.trim(),
        grade: formGrade.trim(),
        cost_center: formCostCenter.trim(),
        role: parseInt(formRole.trim()),
        office: parseInt(formOffice.trim()),
        active: formActive,
        home_coordinates: new GeoPoint(coordinates.lat, coordinates.lng),
        home_address: homeAddress,
        subordinates: formSubordinates,
      });

      Alert.alert("Success", "User updated successfully!");
      setEditUserModalVisible(false);
      clearUserForm();
      setSelectedUserId("");
    } catch (error) {
      console.error("Error updating user: ", error);
      Alert.alert("Error", "Failed to update user. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderSelectUserModal = () => {
    return (
      <Modal
        visible={selectUserModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectUserModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectUserModalVisible(false)}
        >
          <View style={[styles.modalContent, { maxHeight: 900 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a User</Text>
              <TouchableOpacity
                onPress={() => setSelectUserModalVisible(false)}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View
                  style={{ flex: 0.5, backgroundColor: "transparent" }}
                ></View>
                <View style={{ flex: 3, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Username</Text>
                </View>
                <View style={{ flex: 2, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Email</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Department</Text>
                </View>
                <View style={{ flex: 0.5, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Grade</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Cost Center</Text>
                </View>
                <View style={{ flex: 0.5, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Office</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Role</Text>
                </View>
                <View style={{ flex: 2, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Home Address</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Active</Text>
                </View>
              </View>

              {/* Table Body */}
              <ScrollView style={styles.modalList}>
                {allUsers.map((user, index) => {
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
                        setSelectedUserId(user.id);
                        setSelectedUser(user.username);
                        setSelectUserModalVisible(false);
                        handleSelectUser(user.id);
                      }}
                    >
                      <View style={{ flex: 0.5 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      {/* Username */}
                      <View style={{ flex: 3 }}>
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
                      <View style={{ flex: 1 }}>
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
                      <View style={{ flex: 0.5 }}>
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
                      <View style={{ flex: 1 }}>
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

                      {/* Office */}
                      <View style={{ flex: 0.5 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {officeMap[user.office] || "N/A"}
                        </Text>
                      </View>

                      {/* Role */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {roleMap[user.role] || "N/A"}
                        </Text>
                      </View>

                      <View style={{ flex: 2 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {user.home_address}
                        </Text>
                      </View>

                      {/* Active */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tableCell,
                            isAdded && styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {user.active === undefined
                            ? "N/A"
                            : user.active
                              ? "True"
                              : "False"}
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

  const renderSelectSubModal = () => {
    return (
      <Modal
        visible={selectSubModalVIsible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => selectSelectSubModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => selectSelectSubModalVisible(false)}
        >
          <View style={[styles.modalContent, { maxHeight: 900 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a User</Text>
              <TouchableOpacity
                onPress={() => selectSelectSubModalVisible(false)}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View
                  style={{ flex: 0.5, backgroundColor: "transparent" }}
                ></View>
                <View style={{ flex: 3, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Username</Text>
                </View>
                <View style={{ flex: 2, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Email</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Department</Text>
                </View>
                <View style={{ flex: 0.5, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Grade</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Cost Center</Text>
                </View>
                <View style={{ flex: 0.5, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Office</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Role</Text>
                </View>
                <View style={{ flex: 2, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Home Address</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Active</Text>
                </View>
              </View>

              {/* Table Body */}
              <ScrollView style={styles.modalList}>
                {allUsers
                  .filter((user) => user.username !== formUsername)
                  .map((user, index) => {
                    const isAdded = addedSub.some(
                      (added) => added.id === user.id,
                    );

                    return (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.tableRow,
                          isAdded && styles.disabledUserItem,
                        ]}
                        onPress={() => {
                          if (!isAdded) {
                            setFormSubordinates((prev) => [...prev, user.id]);
                            setAddedSub((prev) => [...prev, user]);
                          } else {
                            setFormSubordinates((prev) =>
                              prev.filter((id) => id !== user.id),
                            );
                            setAddedSub((prev) =>
                              prev.filter((item) => item.id !== user.id),
                            );
                          }
                        }}
                      >
                        <View style={{ flex: 0.5 }}>
                          <Text
                            style={[
                              styles.tableCell,
                              isAdded && styles.disabledText,
                            ]}
                            numberOfLines={1}
                          >
                            {index + 1}
                          </Text>
                        </View>
                        {/* Username */}
                        <View style={{ flex: 3 }}>
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
                        <View style={{ flex: 1 }}>
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
                        <View style={{ flex: 0.5 }}>
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
                        <View style={{ flex: 1 }}>
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

                        {/* Office */}
                        <View style={{ flex: 0.5 }}>
                          <Text
                            style={[
                              styles.tableCell,
                              isAdded && styles.disabledText,
                            ]}
                            numberOfLines={1}
                          >
                            {officeMap[user.office] || "N/A"}
                          </Text>
                        </View>

                        {/* Role */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.tableCell,
                              isAdded && styles.disabledText,
                            ]}
                            numberOfLines={1}
                          >
                            {roleMap[user.role] || "N/A"}
                          </Text>
                        </View>

                        <View style={{ flex: 2 }}>
                          <Text
                            style={[
                              styles.tableCell,
                              isAdded && styles.disabledText,
                            ]}
                            numberOfLines={1}
                          >
                            {user.home_address}
                          </Text>
                        </View>

                        {/* Active */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.tableCell,
                              isAdded && styles.disabledText,
                            ]}
                            numberOfLines={1}
                          >
                            {user.active === undefined
                              ? "N/A"
                              : user.active
                                ? "True"
                                : "False"}
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

  const userMap = useMemo(() => {
    const map = new Map();
    allUsers.forEach((user) => {
      map.set(user.username, user);
    });
    return map;
  }, [allUsers]);

  const filteredMileage = allMileage.filter((e) => {
    const user = userMap.get(e.user_name);
    if (!user) return false;

    if (selectedUser && e.user_name !== selectedUser) {
      return false;
    }

    return true;
  });

  const filteredGeneral = allGeneral.filter((e) => {
    const user = userMap.get(e.user_name);
    if (!user) return false;

    if (selectedUser && e.user_name !== selectedUser) {
      return false;
    }

    return true;
  });

  const filteredOutstation = allOutstation.filter((e) => {
    const user = userMap.get(e.user_name);
    if (!user) return false;

    if (selectedUser && e.user_name !== selectedUser) {
      return false;
    }

    return true;
  });

  const handleExport = async () => {
    if (selectedUser === "" || selectedUserId === "") {
      console.log("stop");
      return;
    }
    console.log("exporting");
    await exportCustomersToCSV(
      filteredMileage,
      filteredGeneral,
      filteredOutstation,
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Username:{" "}
        <Text style={styles.details}>{username || "Fetching username..."}</Text>
      </Text>
      <Text style={styles.label}>
        Email:{" "}
        <Text style={styles.details}>{email || "Fetching email..."}</Text>
      </Text>
      <Text style={styles.label}>
        Home Address:{" "}
        <Text style={styles.details}>
          {userHomeAddress || "Fetching home address..."}
        </Text>
      </Text>
      {/* <TouchableOpacity
        onPress={() => setUsernameModalVisible(true)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Change Username</Text>
      </TouchableOpacity> */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={usernameModalVisible}
        statusBarTranslucent={true}
        onRequestClose={() => !isSaving && setUsernameModalVisible(false)}
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
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalView}>
                <Text style={styles.modalTitle}>Change Username</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>New username:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter New Username"
                    placeholderTextColor="#999999"
                    value={newUsername}
                    onChangeText={setNewUsername}
                    editable={!isSaving}
                    keyboardType="default"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={() => setUsernameModalVisible(false)}
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
                    onPress={changeUsername}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.textStyle}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* Change Email */}
      {/* <TouchableOpacity
        onPress={() => setEmailModalVisible(true)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Change Email</Text>
      </TouchableOpacity>
      <Modal
        animationType="fade"
        transparent={true}
        visible={emailModalVisible}
        statusBarTranslucent={true}
        onRequestClose={() => !isSaving && setEmailModalVisible(false)}
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
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalView}>
                <Text style={styles.modalTitle}>Change Email</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>New email:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter New Email"
                    placeholderTextColor="#999999"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    editable={!isSaving}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>Current Password:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Password to Confirm"
                    placeholderTextColor="#999999"
                    value={password}
                    onChangeText={setPassword}
                    editable={!isSaving}
                    secureTextEntry={true} // Hides the password
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={() => {
                      setEmailModalVisible(false);
                      setPassword(""); // Clear password on cancel
                    }}
                    disabled={isSaving}
                  >
                    <Text style={styles.textStyle}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dialogButton, styles.submitButton, isSaving && { opacity: 0.7 }]}
                    onPress={changeEmail}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.textStyle}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal> */}
      <TouchableOpacity
        onPress={() => setPasswordModalVisible(true)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Change Password</Text>
      </TouchableOpacity>
      <Modal
        animationType="fade"
        transparent={true}
        visible={passwordModalVisible}
        statusBarTranslucent={true}
        onRequestClose={() => !isSaving && setPasswordModalVisible(false)}
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
                <Text style={styles.modalTitle}>Change Password</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>Current Password:</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Current Password"
                      placeholderTextColor="#999999"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showPassword}
                      editable={!isSaving}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Icon
                        name={showPassword ? "eye" : "eye-off"}
                        size={24}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>New Password:</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="New Password"
                      placeholderTextColor="#999999"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      editable={!isSaving}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Icon
                        name={showPassword ? "eye" : "eye-off"}
                        size={24}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>
                    Confirm New Password:
                  </Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm New Password"
                      placeholderTextColor="#999999"
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      secureTextEntry={!showPassword}
                      editable={!isSaving}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Icon
                        name={showPassword ? "eye" : "eye-off"}
                        size={24}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={() => {
                      setPasswordModalVisible(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                      setShowPassword(false);
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
                    onPress={changePassword}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.textStyle}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* <TouchableOpacity
        onPress={() => setHomeModalVisible(true)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Set Home Address</Text>
      </TouchableOpacity> */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={homeModalVisible}
        statusBarTranslucent={true}
        onRequestClose={() => !isSaving && setHomeModalVisible(false)}
      >
        <View style={styles.screenOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardContainer}
          >
            <ScrollView
              style={[styles.modalScrollWrapper, { overflow: "visible" }]}
              contentContainerStyle={[
                styles.modalScrollContent,
                { overflow: "visible" },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalView}>
                <Text style={styles.modalTitle}>Set Home Address</Text>

                <View
                  style={[
                    styles.formGroup,
                    { position: "relative", zIndex: 10, elevation: 10 },
                  ]}
                >
                  <Text style={styles.modalSubtitle}>Home Address:</Text>
                  <View style={{ width: "100%" }}>
                    <PlacesInput
                      value={homeAddress}
                      placeholder="Search home..."
                      onPlaceSelected={(address, location) => {
                        setHomeAddress(address);
                      }}
                    />
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={() => setHomeModalVisible(false)}
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
                    onPress={updateHomeAddress}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.textStyle}>Set</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* <TouchableOpacity
        onPress={() => setDocumentModalVisible(true)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Add Documents</Text>
      </TouchableOpacity> */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={documentModalVisible}
        statusBarTranslucent={true}
        onRequestClose={() => !isSaving && setDocumentModalVisible(false)}
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
                <Text style={styles.modalTitle}>Upload Document</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.modalSubtitle}>Documents:</Text>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setDocumentFiles(Array.from(e.target.files));
                      }
                    }}
                    style={htmlInputStyle}
                  />
                  {documentFiles.length > 0 && (
                    <View style={styles.documentList}>
                      <Text style={styles.documentLabel}>Selected files:</Text>
                      {documentFiles.map((file, idx) => (
                        <Text key={idx} style={styles.documentFileName}>
                          {file.name}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={() => {
                      setDocumentFiles([]);
                      setDocumentModalVisible(false);
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
                    onPress={uploadDocuments}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.textStyle}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {role === 0 && (
        <>
          <TouchableOpacity
            onPress={() => setMileageModalVisible(true)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Set Mileage</Text>
          </TouchableOpacity>

          <Modal
            animationType="fade"
            transparent={true}
            visible={mileageModalVisible}
            statusBarTranslucent={true}
            onRequestClose={() => !isSaving && setMileageModalVisible(false)}
          >
            <View style={styles.screenOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[styles.keyboardContainer]}
              >
                <ScrollView
                  style={styles.modalScrollWrapper}
                  contentContainerStyle={styles.modalScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Set Mileage</Text>

                    <View style={styles.formGroup}>
                      <Text style={styles.modalSubtitle}>
                        Web Mileage (Local):
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999999"
                        value={mileageRate}
                        onChangeText={setMileageRate}
                        editable={!isSaving}
                        keyboardType="decimal-pad"
                      />

                      <Text style={styles.modalSubtitle}>
                        Mobile Mileage (Local):
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999999"
                        value={mobileMileageRate}
                        onChangeText={setMobileMileageRate}
                        editable={!isSaving}
                        keyboardType="decimal-pad"
                      />

                      <Text style={styles.modalSubtitle}>
                        Web Mileage (Motorbike):
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999999"
                        value={mileageBike}
                        onChangeText={setMileageBike}
                        editable={!isSaving}
                        keyboardType="decimal-pad"
                      />

                      <Text style={styles.modalSubtitle}>
                        Mobile Mileage (Motorbike):
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999999"
                        value={mobileMileageBike}
                        onChangeText={setMobileMileageBikeMobile}
                        editable={!isSaving}
                        keyboardType="decimal-pad"
                      />

                      <Text style={styles.modalSubtitle}>
                        Web Mileage (Outstation):
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999999"
                        value={mileageRateOutstation}
                        onChangeText={setMileageRateOutstation}
                        editable={!isSaving}
                        keyboardType="decimal-pad"
                      />

                      <Text style={styles.modalSubtitle}>
                        Mobile Mileage (Outstation):
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999999"
                        value={mobileMileageRateOutstation}
                        onChangeText={setMobileMileageRateOutstation}
                        editable={!isSaving}
                        keyboardType="decimal-pad"
                      />

                      <Text style={styles.modalSubtitle}>
                        Outstation Distance:
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999999"
                        value={oustationDistance}
                        onChangeText={setOutstationDistance}
                        editable={!isSaving}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.dialogButton, styles.cancelButton]}
                        onPress={() => setMileageModalVisible(false)}
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
                        onPress={updateMileageRate}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.textStyle}>Set</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        </>
      )}
      {role === 0 && (
        <>
          {/*<TouchableOpacity
            onPress={() => setAddressModalVisible(true)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Set Office Address</Text>
          </TouchableOpacity>*/}
          <Modal
            animationType="fade"
            transparent={true}
            visible={addressModalVisible}
            statusBarTranslucent={true}
            onRequestClose={() => !isSaving && setAddressModalVisible(false)}
          >
            <View style={styles.screenOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardContainer}
              >
                <ScrollView
                  style={[styles.modalScrollWrapper, { overflow: "visible" }]}
                  contentContainerStyle={[
                    styles.modalScrollContent,
                    { overflow: "visible" },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Set Office Address</Text>

                    <View
                      style={[
                        styles.formGroup,
                        { position: "relative", zIndex: 10, elevation: 10 },
                      ]}
                    >
                      <Text style={styles.modalSubtitle}>Office Address:</Text>
                      <View style={{ width: "100%" }}>
                        <PlacesInput
                          value={officeAddress}
                          placeholder="Search office..."
                          onPlaceSelected={(address, location) => {
                            setOfficeAddress(address);
                          }}
                        />
                      </View>
                    </View>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.dialogButton, styles.cancelButton]}
                        onPress={() => setAddressModalVisible(false)}
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
                        onPress={updateOfficeAddress}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.textStyle}>Set</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        </>
      )}
      {role === 0 && (
        <>
          <TouchableOpacity
            onPress={() => setDistanceModalVisible(true)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Set Arrival Distance</Text>
          </TouchableOpacity>
          <Modal
            animationType="fade"
            transparent={true}
            visible={distanceModalVisible}
            statusBarTranslucent={true}
            onRequestClose={() => !isSaving && setDistanceModalVisible(false)}
          >
            <View style={styles.screenOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardContainer}
              >
                <ScrollView
                  style={[styles.modalScrollWrapper, { overflow: "visible" }]}
                  contentContainerStyle={[
                    styles.modalScrollContent,
                    { overflow: "visible" },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Set Arrival Distance</Text>

                    <View style={styles.formGroup}>
                      <Text style={styles.modalSubtitle}>
                        Arrival Distance (m):
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999999"
                        value={distance}
                        onChangeText={setDistance}
                        editable={!isSaving}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.dialogButton, styles.cancelButton]}
                        onPress={() => setDistanceModalVisible(false)}
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
                        onPress={updateArrivalDistance}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.textStyle}>Set</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        </>
      )}
      {role === 0 && (
        <>
          <TouchableOpacity
            onPress={() => {
              setUserModalVisible(true);
              console.log("home address");
              console.log(homeAddress);
              console.log("office address");
              console.log(officeAddress);
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Create User</Text>
          </TouchableOpacity>
          <Modal
            animationType="fade"
            transparent={true}
            visible={userModalVisible}
            statusBarTranslucent={true}
            onRequestClose={() => !isSaving && setUserModalVisible(false)}
          >
            <View style={styles.screenOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardContainer}
              >
                <ScrollView
                  style={[styles.modalScrollWrapper, { overflow: "visible" }]}
                  contentContainerStyle={[
                    styles.modalScrollContent,
                    { overflow: "visible" },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Create User</Text>

                    <View style={[styles.formGroup, { marginBottom: 0 }]}>
                      <Text style={styles.modalSubtitle}>Username:</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter Username"
                        placeholderTextColor="#999999"
                        value={formUsername}
                        onChangeText={setFormUsername}
                        editable={!isSaving}
                        keyboardType="default"
                        autoComplete="off"
                      />

                      <Text style={styles.modalSubtitle}>Email:</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter Email"
                        placeholderTextColor="#999999"
                        value={formEmail}
                        onChangeText={setFormEmail}
                        editable={!isSaving}
                        keyboardType="email-address"
                      />

                      <Text style={styles.modalSubtitle}>Password:</Text>
                      <View style={styles.passwordContainer}>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter Password"
                          placeholderTextColor="#999999"
                          value={formPassword}
                          onChangeText={setFormPassword}
                          editable={!isSaving}
                          keyboardType="default"
                          secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <Icon
                            name={showPassword ? "eye" : "eye-off"}
                            size={24}
                            color="#888"
                          />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.modalSubtitle}>
                        Confirm Password:
                      </Text>
                      <View style={styles.passwordContainer}>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter Password"
                          placeholderTextColor="#999999"
                          value={formConfirmPassword}
                          onChangeText={setFormConfirmPassword}
                          editable={!isSaving}
                          keyboardType="default"
                          secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <Icon
                            name={showPassword ? "eye" : "eye-off"}
                            size={24}
                            color="#888"
                          />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.modalSubtitle}>ESS No.:</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter ESS No."
                        placeholderTextColor="#999999"
                        value={formEssNo}
                        onChangeText={setFormEssNo}
                        editable={!isSaving}
                        keyboardType="default"
                      />

                      <View style={styles.modalRow}>
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>Department:</Text>
                          <select
                            value={formDepartment}
                            onChange={(e) => setFormDepartment(e.target.value)}
                            style={dropdownInput}
                          >
                            <option value="" disabled>
                              Select a department...
                            </option>
                            <option value="CSD">CSD</option>
                            <option value="FINANCE">FINANCE</option>
                            <option value="MARKETING">MARKETING</option>
                            <option value="MD OFFICE">MD OFFICE</option>
                            <option value="OPERATIONS">OPERATIONS</option>
                            <option value="OPERATIONS PNG">
                              OPERATIONS PNG
                            </option>
                            <option value="PRODUCT MGMT.">PRODUCT MGMT.</option>
                            <option value="PROJECT">PROJECT</option>
                            <option value="SALES PL1">SALES PL1</option>
                            <option value="SALES PL2">SALES PL2</option>
                            <option value="SALES PL3">SALES PL3</option>
                            <option value="SALES PL4">SALES PL4</option>
                            <option value="SC">SC</option>
                          </select>
                        </View>
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>Grade:</Text>
                          <select
                            value={formGrade}
                            onChange={(e) => setFormGrade(e.target.value)}
                            style={dropdownInput}
                          >
                            <option value="" disabled>
                              Select a grade...
                            </option>
                            <option value="S4">S4</option>
                            <option value="S3">S3</option>
                            <option value="S2">S2</option>
                            <option value="S1">S1</option>
                            <option value="B4">B4</option>
                            <option value="B3">B3</option>
                            <option value="B2">B2</option>
                            <option value="B1">B1</option>
                            <option value="A4">A4</option>
                            <option value="A3">A3</option>
                            <option value="A2">A2</option>
                            <option value="A1">A1</option>
                            <option value="M4">M4</option>
                            <option value="M3">M3</option>
                            <option value="M2">M2</option>
                          </select>
                        </View>
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>Cost Center:</Text>
                          <select
                            value={formCostCenter}
                            onChange={(e) => setFormCostCenter(e.target.value)}
                            style={dropdownInput}
                          >
                            <option value="" disabled>
                              Select a cost center...
                            </option>
                            <option value="HQ">HQ</option>
                            <option value="P_LINE1">P_LINE1</option>
                            <option value="P_LINE2">P_LINE2</option>
                            <option value="P_LINE3">P_LINE3</option>
                            <option value="P_LINE4">P_LINE4</option>
                            <option value="SVC_REP">SVC_REP</option>
                          </select>
                        </View>
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>Role:</Text>
                          <select
                            value={formRole}
                            onChange={(e) => setFormRole(e.target.value)}
                            style={dropdownInput}
                          >
                            <option value="" disabled>
                              Select a Role...
                            </option>
                            <option value="0">Admin</option>
                            <option value="2">Manager</option>
                            <option value="3">Supervisor</option>
                            <option value="1">User</option>
                          </select>
                        </View>
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>Office:</Text>
                          <select
                            value={formOffice}
                            onChange={(e) => setFormOffice(e.target.value)}
                            style={dropdownInput}
                          >
                            <option value="" disabled>
                              Select an Office...
                            </option>
                            <option value="0">HQ</option>
                            <option value="1">Penang</option>
                          </select>
                        </View>
                      </View>
                      {(formRole === "2" || formRole === "3") && (
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>
                            Subordinates:
                          </Text>
                          <TouchableOpacity
                            style={[styles.input, { width: "100%" }]}
                            onPress={() => {
                              selectSelectSubModalVisible(true);
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  formSubordinates.length === 0
                                    ? "#999999"
                                    : "#000000",
                                fontSize: 16,
                                fontFamily: "System",
                                fontWeight: "400",
                                opacity: 0.7,
                              }}
                            >
                              {formSubordinates.length === 0
                                ? "Select Subordinates"
                                : allUsers
                                    .filter((user) =>
                                      formSubordinates.includes(user.id),
                                    )
                                    .map((user) => user.username)
                                    .join(", ")}
                            </Text>
                          </TouchableOpacity>
                          {renderSelectSubModal()}
                        </View>
                      )}
                      {/* <View style={styles.modalRow}>
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>Role:</Text>
                          <select
                            value={formRole}
                            onChange={(e) => setFormRole(e.target.value)}
                            style={dropdownInput}
                          >
                            <option value="" disabled>
                              Select a Role...
                            </option>
                            <option value="0">Admin</option>
                            <option value="2">Manager</option>
                            <option value="3">Supervisor</option>
                            <option value="1">User</option>
                          </select>
                        </View>
                      </View> */}
                    </View>

                    <Text style={styles.modalSubtitle}>Home Address:</Text>
                    <View
                      style={{
                        width: "100%",
                        position: "relative",
                        zIndex: 100,
                        elevation: 10,
                        marginBottom: 20,
                      }}
                    >
                      <PlacesInput
                        value={homeAddress}
                        placeholder="Search home..."
                        onPlaceSelected={(address, location) => {
                          setHomeAddress(address);
                        }}
                      />
                    </View>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.dialogButton, styles.cancelButton]}
                        onPress={() => {
                          clearUserForm();
                          setUserModalVisible(false);
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
                        onPress={handleSignup}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.textStyle}>Create User</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        </>
      )}

      {role === 0 && (
        <>
          <TouchableOpacity
            onPress={() => {
              setEditUserModalVisible(true);
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Edit User</Text>
          </TouchableOpacity>
          <Modal
            animationType="fade"
            transparent={true}
            visible={editUserModalVisible}
            statusBarTranslucent={true}
            onRequestClose={() => !isSaving && setEditUserModalVisible(false)}
          >
            <View style={styles.screenOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardContainer}
              >
                <ScrollView
                  style={[styles.modalScrollWrapper, { overflow: "visible" }]}
                  contentContainerStyle={[
                    styles.modalScrollContent,
                    { overflow: "visible" },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Edit User</Text>
                    <TouchableOpacity
                      style={styles.selectUserButton}
                      onPress={() => {
                        setSelectUserModalVisible(true);
                      }}
                    >
                      <Text style={styles.buttonText}>Select User</Text>
                    </TouchableOpacity>

                    <View style={[styles.formGroup, { marginBottom: 0 }]}>
                      <Text style={styles.modalSubtitle}>Username:</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter Username"
                        placeholderTextColor="#999999"
                        value={formUsername}
                        onChangeText={setFormUsername}
                        editable={!isSaving}
                        keyboardType="default"
                      />

                      <Text style={styles.modalSubtitle}>Email:</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter Email"
                        placeholderTextColor="#999999"
                        value={formEmail}
                        onChangeText={setFormEmail}
                        editable={!isSaving}
                        keyboardType="email-address"
                      />

                      <Text style={styles.modalSubtitle}>ESS No.:</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter ESS No."
                        placeholderTextColor="#999999"
                        value={formEssNo}
                        onChangeText={setFormEssNo}
                        editable={!isSaving}
                        keyboardType="default"
                      />

                      <View style={styles.modalRow}>
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>Department:</Text>
                          <select
                            value={formDepartment}
                            onChange={(e) => setFormDepartment(e.target.value)}
                            style={dropdownInput}
                          >
                            <option value="" disabled>
                              Select a department...
                            </option>
                            <option value="CSD">CSD</option>
                            <option value="FINANCE">FINANCE</option>
                            <option value="MARKETING">MARKETING</option>
                            <option value="MD OFFICE">MD OFFICE</option>
                            <option value="OPERATIONS">OPERATIONS</option>
                            <option value="OPERATIONS PNG">
                              OPERATIONS PNG
                            </option>
                            <option value="PRODUCT MGMT.">PRODUCT MGMT.</option>
                            <option value="PROJECT">PROJECT</option>
                            <option value="SALES PL1">SALES PL1</option>
                            <option value="SALES PL2">SALES PL2</option>
                            <option value="SALES PL3">SALES PL3</option>
                            <option value="SALES PL4">SALES PL4</option>
                            <option value="SC">SC</option>
                          </select>
                        </View>
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>Grade:</Text>
                          <select
                            value={formGrade}
                            onChange={(e) => setFormGrade(e.target.value)}
                            style={dropdownInput}
                          >
                            <option value="" disabled>
                              Select a grade...
                            </option>
                            <option value="S4">S4</option>
                            <option value="S3">S3</option>
                            <option value="S2">S2</option>
                            <option value="S1">S1</option>
                            <option value="B4">B4</option>
                            <option value="B3">B3</option>
                            <option value="B2">B2</option>
                            <option value="B1">B1</option>
                            <option value="A4">A4</option>
                            <option value="A3">A3</option>
                            <option value="A2">A2</option>
                            <option value="A1">A1</option>
                            <option value="M4">M4</option>
                            <option value="M3">M3</option>
                            <option value="M2">M2</option>
                          </select>
                        </View>
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>Cost Center:</Text>
                          <select
                            value={formCostCenter}
                            onChange={(e) => setFormCostCenter(e.target.value)}
                            style={dropdownInput}
                          >
                            <option value="" disabled>
                              Select a cost center...
                            </option>
                            <option value="HQ">HQ</option>
                            <option value="P_LINE1">P_LINE1</option>
                            <option value="P_LINE2">P_LINE2</option>
                            <option value="P_LINE3">P_LINE3</option>
                            <option value="P_LINE4">P_LINE4</option>
                            <option value="SVC_REP">SVC_REP</option>
                          </select>
                        </View>
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>Role:</Text>
                          <select
                            value={formRole}
                            onChange={(e) => setFormRole(e.target.value)}
                            style={dropdownInput}
                          >
                            <option value="" disabled>
                              Select a Role...
                            </option>
                            <option value="0">Admin</option>
                            <option value="1">User</option>
                            <option value="2">Manager</option>
                            <option value="3">Supervisor</option>
                          </select>
                        </View>
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>Office:</Text>
                          <select
                            value={formOffice}
                            onChange={(e) => setFormOffice(e.target.value)}
                            style={dropdownInput}
                          >
                            <option value="" disabled>
                              Select an Office...
                            </option>
                            <option value="0">HQ</option>
                            <option value="1">Penang</option>
                          </select>
                        </View>
                      </View>
                      {(formRole === "2" || formRole === "3") && (
                        <View style={styles.modalUser}>
                          <Text style={styles.modalSubtitle}>
                            Subordinates:
                          </Text>
                          <TouchableOpacity
                            style={[styles.input, { width: "100%" }]}
                            onPress={() => {
                              selectSelectSubModalVisible(true);
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  formSubordinates.length === 0
                                    ? "#999999"
                                    : "#000000",
                                fontSize: 16,
                                fontFamily: "System",
                                fontWeight: "400",
                                opacity: 0.7,
                              }}
                            >
                              {formSubordinates.length === 0
                                ? "Select Subordinates"
                                : allUsers
                                    .filter((user) =>
                                      formSubordinates.includes(user.id),
                                    )
                                    .map((user) => user.username)
                                    .join(", ")}
                            </Text>
                          </TouchableOpacity>
                          {renderSelectSubModal()}
                        </View>
                      )}

                      <Text style={styles.modalSubtitle}>Active:</Text>
                      <Switch
                        trackColor={{ false: "#767577", true: "#81b0ff" }}
                        thumbColor="#2196F3"
                        ios_backgroundColor="#3e3e3e"
                        value={formActive}
                        onValueChange={(newValue) => setFormActive(newValue)}
                      />
                    </View>
                    <Text style={styles.modalSubtitle}>Home Address:</Text>
                    <View
                      style={{
                        width: "100%",
                        position: "relative",
                        zIndex: 100,
                        elevation: 10,
                        marginBottom: 20,
                      }}
                    >
                      <PlacesInput
                        value={homeAddress}
                        placeholder="Search home..."
                        onPlaceSelected={(address, location) => {
                          setHomeAddress(address);
                        }}
                      />
                    </View>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.dialogButton, styles.cancelButton]}
                        onPress={() => {
                          setEditUserModalVisible(false);
                          clearUserForm();
                          setSelectedUserId("");
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
                        onPress={editUser}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.textStyle}>Confirm</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>
          {renderSelectUserModal()}
        </>
      )}

      {role === 0 && (
        <>
          <TouchableOpacity
            onPress={() => {
              setCustomerModalVisible(true);
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Export Customers</Text>
          </TouchableOpacity>
          <Modal
            animationType="fade"
            transparent={true}
            visible={customerModalVisible}
            statusBarTranslucent={true}
            onRequestClose={() => !isSaving && setCustomerModalVisible(false)}
          >
            <View style={styles.screenOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardContainer}
              >
                <ScrollView
                  style={[styles.modalScrollWrapper, { overflow: "visible" }]}
                  contentContainerStyle={[
                    styles.modalScrollContent,
                    { overflow: "visible" },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Export Customers</Text>
                    <TouchableOpacity
                      style={styles.selectUserButton}
                      onPress={() => {
                        setSelectUserModalVisible(true);
                        //console.log(selectedUser);
                      }}
                    >
                      <Text style={styles.buttonText}>
                        {selectedUser === "" ? " Select User" : selectedUser}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.dialogButton, styles.cancelButton]}
                        onPress={() => {
                          setCustomerModalVisible(false);
                          setSelectedUserId("");
                          clearUserForm();
                          setSelectedUser("");
                        }}
                        disabled={isSaving}
                      >
                        <Text style={styles.textStyle}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.dialogButton,
                          styles.submitButton,
                          (isSaving || selectedUser === "") && { opacity: 0.7 },
                        ]}
                        onPress={handleExport}
                        disabled={isSaving || selectedUser === ""}
                      >
                        {isSaving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.textStyle}>Download</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>
          {renderSelectUserModal()}
        </>
      )}
      <Text style={styles.bottomScrollText}>v1.2.4</Text>
    </View>
  );
}

const htmlInputStyle = {
  padding: "10px",
  border: "1px solid #ccc",
  width: "100%",
  maxWidth: "200px",
  minHeight: "36px",
  boxSizing: "border-box" as const,
  backgroundColor: "#fff",
  marginRight: "10px",
};
const htmlSelectStyle = { ...htmlInputStyle, height: "auto" };

const dropdownInput = {
  width: "100%",
  backgroundColor: "#f9f9f9",
  borderWidth: 0,
  borderColor: "#eee",
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
  color: "#333",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  label: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 5,
    marginTop: 10,
  },
  details: {
    fontSize: 16,
    fontWeight: "normal",
    color: "#000",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  selectUserButton: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
    minWidth: 150,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  screenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    ...StyleSheet.absoluteFillObject,
  },
  keyboardContainer: {
    flex: 1,
    width: "100%",
  },
  modalScrollWrapper: {
    flex: 1,
    width: "100%",
  },
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
  formGroup: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: 2,
  },
  modalUser: {
    flexDirection: "column",
    marginRight: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: "normal",
    marginBottom: 8,
    color: "#666",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    elevation: 0,
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
  selectUser: {
    marginRight: 10,
  },
  boldLabel: { fontWeight: "bold", color: "#333" },
  userInfoText: { fontSize: 13, color: "#444", marginTop: 2 },
  modalOverlay: {
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
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  closeButton: { fontSize: 20, fontWeight: "bold", color: "#999" },
  disabledText: {
    color: "#9e9e9e", // grey text
    backgroundColor: "#e0e0e0",
  },
  modalList: { maxHeight: 400 },
  modalUserItem: { padding: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  disabledUserItem: {
    backgroundColor: "#e0e0e0",
    opacity: 0.6,
  },
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
    textAlign: "center",
  },
  tableCell: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  bottomScrollText: {
    textAlign: "right",
    color: "#999",
    fontSize: 12,
    fontStyle: "italic",
    paddingTop: 20,
    paddingBottom: 10,
    paddingRight: 10,
  },
  documentList: { marginTop: 5, marginBottom: 10 },
  documentLabel: { fontSize: 12, fontWeight: "500", color: "#555" },
  documentFileName: { fontSize: 11, color: "#666", marginLeft: 10 },
  passwordContainer: {
    position: "relative",
    width: "100%",
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 2,
  },
});
