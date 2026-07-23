import { Text, View } from "@/components/Themed";
import { Picker } from "@react-native-picker/picker";
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
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { db, storage } from "../firebaseConfig";
import { useGoogleMapsDistance } from "./DistanceCalculator";
import PlacesInput from "./PlacesInput";

type Grade =
  | "S4"
  | "S3"
  | "S2"
  | "S1"
  | "B4"
  | "B3"
  | "B2"
  | "B1"
  | "A4"
  | "A3"
  | "A2"
  | "A1"
  | "M3"
  | "M2";

type Country =
  | "West Malaysia"
  | "East Malaysia"
  | "Singapore"
  | "Brunei"
  | "Thailand"
  | "Vietnam"
  | "Philippines"
  | "Indonesia"
  | "Myanmar"
  | "Cambodia/Laos"
  | "Japan"
  | "Korea"
  | "China"
  | "Hong Kong"
  | "Taiwan"
  | "India"
  | "Pakistan"
  | "USA"
  | "Canada"
  | "Europe"
  | "UK"
  | "Australia"
  | "New Zealand"
  | "Lebanon"
  | "Brazil";

type CountryRates = Record<Grade, number>;
type MealExpense = Record<Country, CountryRates>;

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
  office: number;
  active: boolean;
  home_coordinates: {
    latitude: number;
    longitude: number;
  };
}

export default function OutstationExpenseForm() {
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [formDepartureDate, setFormDepartureDate] = useState<string>("");
  const [formArrivalDate, setFormArrivalDate] = useState<string>("");
  const [formStartDate, setFormStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [formEndDate, setFormEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [formTravelPurposes, setFormTravelPurposes] = useState<string[]>([]);
  const [formTransportMode, setFormTransportMode] = useState<string>("");
  const [formRequestOwnAcc, setFormRequestOwnAcc] = useState(false);
  const [formAdvance, setFormAdvance] = useState<string>("0.00");
  const [formAdvanceRemark, setFormAdvanceRemark] = useState<string>("");
  const [formRequestVisitation, setFormRequestVisitation] =
    useState<string>("");
  const [otherTravelPurpose, setOtherTravelPurpose] = useState("");
  const [formRequestOthers, setFormRequestOthers] = useState<string>("");
  const [formRequestCountry, setFormRequestCountry] = useState<string>("");
  const [formSelectedCountry, setFormSelectedCountry] = useState<string[]>([]);
  const [formRequestLocation, setFormRequestLocation] = useState<string>("");
  const [formRequestPlaces, setFormRequestPlaces] = useState([
    { country: "", location: "" },
  ]);
  const [editRequestId, setEditRequestId] = useState<string>("");
  const [editingRequest, setEditingRequest] = useState(false);
  //const [addedPlace, setFormAddedPlace] = useState({})

  const [editTripId, setEditTripId] = useState<string>("");
  const [allRequests, setAllRequest] = useState<any[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [selectedTripTitle, setSelectedTripTitle] = useState<string>("");
  const [formTripDate, setFormTripDate] = useState<string>("");
  const [formTripPurposes, setFormTripPurposes] = useState<string[]>([]);
  const [formTripCountry, setFormTripCountry] = useState<string>("");
  const [formTripLocation, setFormTripLocation] = useState<string>("");
  const [formTripPlaces, setFormTripPlaces] = useState<any[]>([]);
  const [formAirfare, setFormAirfare] = useState<string>("0.00");
  const [formAirfareRemark, setFormAirfareRemark] = useState<string>("");
  const [formToll, setFormToll] = useState<string>("0.00");
  const [formTollRemark, setFormTollRemark] = useState<string>("");
  const [formParking, setFormParking] = useState<string>("0.00");
  const [formParkingRemark, setFormParkingRemark] = useState<string>("");
  const [formTransport, setFormTransport] = useState<string>("0.00");
  const [formTransportRemark, setFormTransportRemark] = useState<string>("");
  const [formHotel, setFormHotel] = useState<string>("0.00");
  const [formHotelRemark, setFormHotelRemark] = useState<string>("");
  const [formOwnAcc, setFormOwnAcc] = useState<string>("0.00");
  const [formOwnAccSelect, setFormOwnAccSelect] = useState<string>("");
  const [ownAccType, setOwnAccType] = useState("");
  const [formOwnAccRemark, setFormOwnAccRemark] = useState<string>("");

  const [formDepartureTime, setFormDepartureTime] = useState<Date | null>(null);
  const [formArrivalTime, setFormArrivalTime] = useState<Date | null>(null);

  const [formBreakfast, setFormBreakfast] = useState(false);
  const [formLunch, setFormLunch] = useState(false);
  const [formDinner, setFormDinner] = useState(false);

  const [lockBreakfast, setLockBreakfast] = useState(false);
  const [lockLunch, setLockLunch] = useState(false);
  const [lockDinner, setLockDinner] = useState(false);

  const [formEntertainment, setFormEntertainment] = useState<string>("0.00");
  const [formEntertainmentRemark, setFormEntertainmentRemark] =
    useState<string>("");
  const [formLaundry, setFormLaundry] = useState<string>("0.00");
  const [formLaundryRemark, setFormLaundryRemark] = useState<string>("");
  const [formOthers, setFormOthers] = useState<string>("0.00");
  const [formOthersRemark, setFormOthersRemark] = useState<string>("");
  const [formTotal, setFormTotal] = useState<string>("0.00");
  const [formTripReport, setFormTripReport] = useState<string>("");
  const [formCustomers, setFormCustomers] = useState([
    { name: "", company: "", email: "", number: "", time: "", address: "" },
  ]);
  const [businessCardFiles, setBusinessCardFiles] = useState<File[]>([]);
  const [allDays, setAllDays] = useState<any[]>([]);

  const { calculateDistance, getRouteImageUrl, sdkLoaded } =
    useGoogleMapsDistance();
  const [officeCoords, setOfficeCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [homeCoords, setHomeCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mileageRate, setMileageRate] = useState<number>(0.8);
  const [mileageRateOutstation, setMileageRateOutstation] =
    useState<number>(0.7);
  const [outStationDistance, setOutstationDistance] = useState<number>(50);

  const [allUserTrips, setAllUserTrips] = useState<any[]>([]);
  const [addedTrips, setAddedTrips] = useState<any[]>([]);
  const [tripsForSelectedDate, setTripsForSelectedDate] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedFromIndex, setSelectedFromIndex] = useState<number>(0);
  const [selectedGoingIndex, setSelectedGoingIndex] = useState<number>(0);
  const [fromAddress, setFromAddress] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");
  const [formFromHome, setFormFromHome] = useState<boolean>(false);
  const [formGoingHome, setFormGoingHome] = useState<boolean>(false);
  const [formTripFromTime, setFormTripFromTime] = useState<Date | null>(null);
  const [formTripToTime, setFormTripToTime] = useState<Date | null>(null);
  const [formRemark, setFormRemark] = useState<string>("");
  const [originCoord, setOriginCoord] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [destCoord, setDestCoord] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distance, setDistance] = useState<string>("0.00");

  const [customerIndex, setCustomerIndex] = useState<number>(0);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const [outstationExpense, setOutstationExpense] = useState<
    OutstationExpense[]
  >([]);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [tabIndex, setTabIndex] = useState<number>(1);

  const locations = [
    { lat: 3.0409332, lng: 101.5453218 },
    {
      lat: 5.333704064834522,
      lng: 100.29405526266623,
    },
  ];

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData: User[] = [];
      snapshot.forEach((doc) => {
        userData.push({ id: doc.id, ...doc.data() } as User);
      });
      userData.sort((a, b) => a.username.localeCompare(b.username));

      // Remove the user with id === userId
      const filteredUsers = userData.filter((user) => user.id !== userId);
      setAllUsers(filteredUsers);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    setAddedTrips([]);
    setDistance("0.00");
  }, [formTripDate]);

  useEffect(() => {
    const totalDist = addedTrips.reduce(
      (sum, trip) => sum + (parseFloat(trip.distance) || 0),
      0,
    );
    setDistance(totalDist.toFixed(2));
  }, [addedTrips]);

  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth * 0.9, 1200);

  const expenseType = {
    "1": "Meal with customer",
    "2": "Meal with supplier",
    "3": "Medical",
    "4": "Purchase of goods",
    "5": "Staff benefits",
    "6": "Others",
  };

  const travelPurposes = [
    "App. support",
    "Doc. submission",
    "Door knocking",
    "Events",
    "Goods delivery",
    "Local sourcing",
    "Meeting",
    "Presentation",
    "Product demo.",
    "Service & support",
    "Site inspection",
    "Site survey",
    "Site visitation",
    "Tender submission",
    "Training & comm.",
  ];

  const countryList = [
    { label: "West Malaysia", value: "West Malaysia" },
    { label: "East Malaysia", value: "East Malaysia" },
    { label: "Singapore", value: "Singapore" },
    { label: "Brunei", value: "Brunei" },
    { label: "Thailand", value: "Thailand" },
    { label: "Vietnam", value: "Vietnam" },
    { label: "Philippines", value: "Philippines" },
    { label: "Indonesia", value: "Indonesia" },
    { label: "Myanmmar", value: "Myanmmar" },
    { label: "Cambodia/Laos", value: "Cambodia/Laos" },
    { label: "Japan", value: "Japan" },
    { label: "Korea", value: "Korea" },
    { label: "China", value: "China" },
    { label: "Hong Kong", value: "Hong Kong" },
    { label: "Taiwan", value: "Taiwan" },
    { label: "India", value: "India" },
    { label: "Pakistan", value: "Pakistan" },
    { label: "USA", value: "USA" },
    { label: "Canada", value: "Canada" },
    { label: "Europe", value: "Europe" },
    { label: "UK", value: "UK" },
    { label: "Australia", value: "Australia" },
    { label: "New Zealand", value: "New Zealand" },
    { label: "Lebanon", value: "Lebanon" },
    { label: "Brazil", value: "Brazil" },
  ];

  const mealExpense: MealExpense = {
    "West Malaysia": {
      S4: 45,
      S3: 45,
      S2: 50,
      S1: 50,
      B4: 55,
      B3: 55,
      B2: 55,
      B1: 60,
      A4: 70,
      A3: 70,
      A2: 75,
      A1: 80,
      M3: 90,
      M2: 100,
    },
    "East Malaysia": {
      S4: 54,
      S3: 54,
      S2: 60,
      S1: 60,
      B4: 66,
      B3: 66,
      B2: 66,
      B1: 72,
      A4: 84,
      A3: 84,
      A2: 90,
      A1: 96,
      M3: 108,
      M2: 120,
    },
    Singapore: {
      S4: 153,
      S3: 153,
      S2: 170,
      S1: 170,
      B4: 187,
      B3: 187,
      B2: 187,
      B1: 204,
      A4: 238,
      A3: 238,
      A2: 255,
      A1: 272,
      M3: 306,
      M2: 340,
    },
    Brunei: {
      S4: 135,
      S3: 135,
      S2: 150,
      S1: 150,
      B4: 165,
      B3: 165,
      B2: 165,
      B1: 180,
      A4: 210,
      A3: 210,
      A2: 225,
      A1: 240,
      M3: 270,
      M2: 300,
    },
    Thailand: {
      S4: 117,
      S3: 117,
      S2: 130,
      S1: 130,
      B4: 143,
      B3: 143,
      B2: 143,
      B1: 156,
      A4: 182,
      A3: 182,
      A2: 195,
      A1: 208,
      M3: 234,
      M2: 260,
    },
    Vietnam: {
      S4: 108,
      S3: 108,
      S2: 120,
      S1: 120,
      B4: 132,
      B3: 132,
      B2: 132,
      B1: 144,
      A4: 168,
      A3: 168,
      A2: 180,
      A1: 192,
      M3: 216,
      M2: 240,
    },
    Philippines: {
      S4: 108,
      S3: 108,
      S2: 120,
      S1: 120,
      B4: 132,
      B3: 132,
      B2: 132,
      B1: 144,
      A4: 168,
      A3: 168,
      A2: 180,
      A1: 192,
      M3: 216,
      M2: 240,
    },
    Indonesia: {
      S4: 108,
      S3: 108,
      S2: 120,
      S1: 120,
      B4: 132,
      B3: 132,
      B2: 132,
      B1: 144,
      A4: 168,
      A3: 168,
      A2: 180,
      A1: 192,
      M3: 216,
      M2: 240,
    },
    Myanmar: {
      S4: 90,
      S3: 90,
      S2: 100,
      S1: 100,
      B4: 110,
      B3: 110,
      B2: 110,
      B1: 120,
      A4: 140,
      A3: 140,
      A2: 150,
      A1: 160,
      M3: 180,
      M2: 200,
    },
    "Cambodia/Laos": {
      S4: 90,
      S3: 90,
      S2: 100,
      S1: 100,
      B4: 110,
      B3: 110,
      B2: 110,
      B1: 120,
      A4: 140,
      A3: 140,
      A2: 150,
      A1: 160,
      M3: 180,
      M2: 200,
    },
    Japan: {
      S4: 252,
      S3: 252,
      S2: 280,
      S1: 280,
      B4: 308,
      B3: 308,
      B2: 308,
      B1: 336,
      A4: 392,
      A3: 392,
      A2: 420,
      A1: 448,
      M3: 504,
      M2: 560,
    },
    Korea: {
      S4: 198,
      S3: 198,
      S2: 220,
      S1: 220,
      B4: 242,
      B3: 242,
      B2: 242,
      B1: 264,
      A4: 308,
      A3: 308,
      A2: 330,
      A1: 352,
      M3: 396,
      M2: 440,
    },
    China: {
      S4: 225,
      S3: 225,
      S2: 250,
      S1: 250,
      B4: 275,
      B3: 275,
      B2: 275,
      B1: 300,
      A4: 350,
      A3: 350,
      A2: 375,
      A1: 400,
      M3: 450,
      M2: 500,
    },
    "Hong Kong": {
      S4: 225,
      S3: 225,
      S2: 250,
      S1: 250,
      B4: 275,
      B3: 275,
      B2: 275,
      B1: 300,
      A4: 350,
      A3: 350,
      A2: 375,
      A1: 400,
      M3: 450,
      M2: 500,
    },
    Taiwan: {
      S4: 180,
      S3: 180,
      S2: 200,
      S1: 200,
      B4: 220,
      B3: 220,
      B2: 220,
      B1: 240,
      A4: 280,
      A3: 280,
      A2: 300,
      A1: 320,
      M3: 360,
      M2: 400,
    },
    India: {
      S4: 135,
      S3: 135,
      S2: 150,
      S1: 150,
      B4: 165,
      B3: 165,
      B2: 165,
      B1: 180,
      A4: 210,
      A3: 210,
      A2: 225,
      A1: 240,
      M3: 270,
      M2: 300,
    },
    Pakistan: {
      S4: 135,
      S3: 135,
      S2: 150,
      S1: 150,
      B4: 165,
      B3: 165,
      B2: 165,
      B1: 180,
      A4: 210,
      A3: 210,
      A2: 225,
      A1: 240,
      M3: 270,
      M2: 300,
    },
    USA: {
      S4: 315,
      S3: 315,
      S2: 350,
      S1: 350,
      B4: 385,
      B3: 385,
      B2: 385,
      B1: 420,
      A4: 490,
      A3: 490,
      A2: 525,
      A1: 560,
      M3: 630,
      M2: 700,
    },
    Canada: {
      S4: 243,
      S3: 243,
      S2: 270,
      S1: 270,
      B4: 297,
      B3: 297,
      B2: 297,
      B1: 324,
      A4: 378,
      A3: 378,
      A2: 405,
      A1: 432,
      M3: 486,
      M2: 540,
    },
    Europe: {
      S4: 324,
      S3: 324,
      S2: 360,
      S1: 360,
      B4: 396,
      B3: 396,
      B2: 396,
      B1: 432,
      A4: 504,
      A3: 504,
      A2: 540,
      A1: 576,
      M3: 648,
      M2: 720,
    },
    UK: {
      S4: 315,
      S3: 315,
      S2: 350,
      S1: 350,
      B4: 385,
      B3: 385,
      B2: 385,
      B1: 420,
      A4: 490,
      A3: 490,
      A2: 525,
      A1: 560,
      M3: 630,
      M2: 700,
    },
    Australia: {
      S4: 225,
      S3: 225,
      S2: 250,
      S1: 250,
      B4: 275,
      B3: 275,
      B2: 275,
      B1: 300,
      A4: 350,
      A3: 350,
      A2: 375,
      A1: 400,
      M3: 450,
      M2: 500,
    },
    "New Zealand": {
      S4: 198,
      S3: 198,
      S2: 220,
      S1: 220,
      B4: 242,
      B3: 242,
      B2: 242,
      B1: 264,
      A4: 308,
      A3: 308,
      A2: 330,
      A1: 352,
      M3: 396,
      M2: 440,
    },
    Lebanon: {
      S4: 162,
      S3: 180,
      S2: 200,
      S1: 200,
      B4: 220,
      B3: 220,
      B2: 220,
      B1: 240,
      A4: 280,
      A3: 280,
      A2: 300,
      A1: 320,
      M3: 360,
      M2: 400,
    },
    Brazil: {
      S4: 162,
      S3: 180,
      S2: 200,
      S1: 200,
      B4: 220,
      B3: 220,
      B2: 220,
      B1: 240,
      A4: 280,
      A3: 280,
      A2: 300,
      A1: 320,
      M3: 360,
      M2: 400,
    },
  };
  const ownAccCost = 100;

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

            const grade = userData.grade;
            setGrade(grade || "S4");
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
      collection(db, "travel_requests"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trips = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllRequest(trips);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "expenses"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const outstationExpenseData: OutstationExpense[] = [];
      /* querySnapshot.forEach((doc) =>
          expensesData.push({ id: doc.id, ...doc.data() } as Expense),
        ); */
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 3) {
          outstationExpenseData.push({
            id: doc.id,
            ...data,
          } as OutstationExpense);
        }
      });
      setOutstationExpense(outstationExpenseData);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (formDepartureTime) {
      const eightAM = new Date(formDepartureTime);
      eightAM.setHours(8, 0, 0, 0);

      const tenAM = new Date(formDepartureTime);
      tenAM.setHours(10, 0, 0, 0);

      const twoPM = new Date(formDepartureTime);
      twoPM.setHours(14, 0, 0, 0);

      setFormBreakfast(!(formDepartureTime <= eightAM));
      setLockBreakfast(!(formDepartureTime <= eightAM));

      setFormLunch(!(formDepartureTime <= tenAM));
      setLockLunch(!(formDepartureTime <= tenAM));

      setFormDinner(!(formDepartureTime <= twoPM));
      setLockDinner(!(formDepartureTime <= twoPM));
    }
  }, [formDepartureTime]);

  useEffect(() => {
    if (formArrivalTime) {
      const tenAM = new Date(formArrivalTime);
      tenAM.setHours(10, 0, 0, 0);

      const twoPM = new Date(formArrivalTime);
      twoPM.setHours(14, 0, 0, 0);

      const eightPM = new Date(formArrivalTime);
      eightPM.setHours(20, 0, 0, 0);

      setFormBreakfast(formArrivalTime < tenAM);
      setLockBreakfast(formArrivalTime < tenAM);

      setFormLunch(formArrivalTime < twoPM);
      setLockLunch(formArrivalTime < twoPM);

      setFormDinner(formArrivalTime < eightPM);
      setLockDinner(formArrivalTime < eightPM);
    }
  }, [formArrivalTime]);

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
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) return;
    const unsubscribe = onSnapshot(doc(db, "config", configId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.mileage_rate) setMileageRate(data.mileage_rate);
        if (data.mileage_rate_outstation)
          setMileageRateOutstation(data.mileage_rate_outstation);
        if (data.outstation_disance)
          setOutstationDistance(data.outstation_distance);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const selectedDateStr = formTripDate;
    const filtered = allUserTrips.filter((trip) => {
      if (!trip.date) return false;
      const tripDate = trip.date.toDate
        ? trip.date.toDate()
        : new Date(trip.date);
      const tripDateStr = tripDate.toISOString().split("T")[0];
      return tripDateStr === selectedDateStr;
    });
    setTripsForSelectedDate(filtered);
    setSelectedTripId("");
    // Do NOT reset addedTrips here
  }, [allUserTrips, formTripDate]);

  const fieldMessage = (
    <Text
      style={[{ fontSize: 14, fontWeight: "600", marginTop: 10, width: 500 }]}
    >
      Required fields in <Text style={{ color: "#2196F3" }}>blue</Text>.
    </Text>
  );

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

  const groupedExpenses = groupedExpense(outstationExpense);

  const getDaysDifference = (startStr: string, endStr: string): number => {
    const start = new Date(startStr);
    const end = new Date(endStr);

    // Calculate the difference in milliseconds
    const diffInMs = end.getTime() - start.getTime();

    // Convert milliseconds to days and round it to avoid Daylight Saving Time (DST) bugs
    const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

    return diffInDays + 1;
  };

  // Usage inside your component:
  const daysDifference = getDaysDifference(formStartDate, formEndDate);

  const changeForm = (index: number) => {
    resetRequestForm();
    setTabIndex(index);
  };

  const handleSelectPurpose = (purpose: string) => {
    if (purpose === "Others") {
      setFormTravelPurposes((prev) => {
        // Check if "Others" or "Others: something" is already in the array
        const hasOthers = prev.some((item) => item.startsWith("Others"));

        if (hasOthers) {
          // If "Others" is already selected, remove it
          setOtherTravelPurpose("");
          return prev.filter((item) => !item.startsWith("Others"));
        } else {
          // If "Others" is not selected, add it with the text
          // If otherTravelPurpose has text, use it; otherwise just use "Others"
          const newEntry = otherTravelPurpose.trim()
            ? `Others: ${otherTravelPurpose.trim()}`
            : "Others";
          return [...prev, newEntry];
        }
      });
    } else {
      // For other purposes, use the existing toggle logic
      setFormTravelPurposes((prev) => {
        if (prev.includes(purpose)) {
          return prev.filter((item) => item !== purpose);
        } else {
          return [...prev, purpose];
        }
      });
    }
  };

  // Handle text input change - updates the array in real-time
  const handleOtherTextChange = (text: string) => {
    setOtherTravelPurpose(text);

    setFormTravelPurposes((prev) => {
      // Remove any existing "Others" entry
      const withoutOthers = prev.filter((item) => !item.startsWith("Others"));

      if (text.trim()) {
        // If there's text, add "Others: {text}"
        return [...withoutOthers, `Others: ${text.trim()}`];
      } else {
        // If text is empty, add just "Others"
        return [...withoutOthers, "Others"];
      }
    });
  };

  const handleSelectRequest = (requestId?: string) => {
    const idToAdd = requestId || selectedRequestId;
    if (!idToAdd) {
      console.log(idToAdd);
      console.log("No Trip");
      return;
    }
    const selectedRequest = allRequests.find((r) => r.id === idToAdd);
    setFormTripDate(selectedRequest.start_date);
    setFormTripPlaces(selectedRequest.places || []);
    setFormTripPurposes(selectedRequest.travel_purposes);
    setFormDepartureDate(selectedRequest.start_date);
    setFormArrivalDate(selectedRequest.end_date);
    setSelectedTripTitle(selectedRequest.trip_title);
  };

  const handleSubmit = () => {
    console.log("submitting");
  };

  const handleRequestEdit = async () => {
    console.log("editing");
  };

  const handleRequestSubmit = async () => {
    console.log("submitting request");
    console.log(formRequestPlaces);

    const isPlacesFormValid = formRequestPlaces.every(
      (place) => place.country.trim() !== "" && place.location.trim() !== "",
    );

    const ownAccValid = !formRequestOwnAcc || selectedUser !== null;

    if (
      !formStartDate.trim() ||
      !formEndDate.trim() ||
      !isPlacesFormValid ||
      formTravelPurposes.length === 0 ||
      !formTransportMode.trim()
    ) {
      alert("Please ensure all required fields are filled.");
      return;
    }

    try {
      const dayCount = getDaysDifference(formStartDate, formEndDate);
      const placesString = formRequestPlaces
        .filter((place) => place.country && place.location) // Both must exist
        .map((place) => `${place.country} (${place.location})`)
        .join(", ");
      const tripTitle = `${dayCount} day trip to ${placesString}`;
      if (editingRequest) {
        const docRef = doc(db, "travel_requests", editRequestId);

        await updateDoc(docRef, {
          user_id: userId,
          user_name: username,
          start_date: formStartDate,
          end_date: formEndDate,
          days: dayCount,
          trip_title: tripTitle,
          travel_purposes: formTravelPurposes,
          places: formRequestPlaces,
          locked: false,
          transport_mode: formTransportMode,
          own_acc: formRequestOwnAcc,
          room_sharing: selectedUser?.id || "",
          room_sharing_name: selectedUser?.username || "",
          advance_allowance: parseFloat(formAdvance),
          advance_allowance_remark: formAdvanceRemark,
          visitation_plan: formRequestVisitation,
          approval_status: 0,
        });
      } else {
        await addDoc(collection(db, "travel_requests"), {
          user_id: userId,
          user_name: username,
          start_date: formStartDate,
          end_date: formEndDate,
          days: dayCount,
          trip_title: tripTitle,
          travel_purposes: formTravelPurposes,
          places: formRequestPlaces,
          locked: false,
          transport_mode: formTransportMode,
          own_acc: formRequestOwnAcc,
          room_sharing: selectedUser?.id || "",
          room_sharing_name: selectedUser?.username || "",
          advance_allowance: parseFloat(formAdvance),
          advance_allowance_remark: formAdvanceRemark,
          visitation_plan: formRequestVisitation,
          approval_status: 0,
          created_at: serverTimestamp(),
        });
      }
      resetRequestForm();
      alert("Trip request submitted successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save trip.");
    }
  };

  const changeDate = (day: number) => {
    setFormTripDate((prevDate) => {
      const date = new Date(prevDate);
      date.setUTCDate(date.getUTCDate() + day);
      return date.toISOString().split("T")[0];
    });
  };

  const isFirstDay = () => {
    if (!formTripDate || !formArrivalDate || !selectedRequestId) {
      return true;
    }
    return formTripDate === formDepartureDate;
  };

  const isFinalDay = () => {
    if (!formTripDate || !formArrivalDate || !selectedRequestId) {
      return false;
    }
    return formTripDate === formArrivalDate;
  };

  const getMealExpense = (country: string, grade: string): number => {
    if (!(country in mealExpense)) {
      return 0;
    }

    const countryRates = mealExpense[country as Country];

    // Check if grade exists
    if (!(grade in countryRates)) {
      return 0;
    }

    return countryRates[grade as Grade];
  };

  const getMealCost = () => {
    let mealExpense = getMealExpense(formTripCountry, grade);
    const totalMeal = getMealExpense(formTripCountry, grade);

    if (formBreakfast) {
      mealExpense = mealExpense - totalMeal * 0.2;
    }
    if (formLunch) {
      mealExpense = mealExpense - totalMeal * 0.3;
    }
    if (formDinner) {
      mealExpense = mealExpense - totalMeal * 0.5;
    }

    return mealExpense;
  };

  const getTotal = () => {
    const mealExpense = getMealCost();

    const total =
      parseFloat(formAirfare) +
      parseFloat(formToll) +
      parseFloat(formParking) +
      parseFloat(formTransport) +
      parseFloat(formHotel) +
      parseFloat(formOwnAcc) +
      parseFloat(formEntertainment) +
      parseFloat(formLaundry) +
      parseFloat(formOthers) +
      getOwnAccExpense() +
      getTotalMileage() +
      mealExpense;

    return total.toFixed(2);
  };

  const getOwnAccExpense = () => {
    let ownAccExpense = ownAccCost;

    if (formOwnAccSelect === "") {
      ownAccExpense = 0;
    } else if (formOwnAccSelect == "Duo") {
      ownAccExpense = ownAccExpense / 2;
    }

    return ownAccExpense;
  };

  const handleNextDay = async () => {
    console.log("next day");

    const isCustomersFormValid =
      formCustomers.every(
        (customer) =>
          customer.name.trim() !== "" &&
          customer.company.trim() !== "" &&
          customer.email.trim() !== "" &&
          customer.number.trim() !== "" &&
          customer.time.trim() !== "",
      ) &&
      (addedTrips.length === 0 ||
        formCustomers.some(
          (customer) => customer.address && customer.address.trim() !== "",
        ));

    const timeEmpty =
      (formTripDate === formDepartureDate && !formDepartureTime) ||
      (formTripDate === formArrivalDate && !formArrivalTime);
    if (
      !selectedRequestId.trim() ||
      !formTripReport.trim() ||
      !formTripCountry.trim() ||
      !formTripLocation.trim() ||
      !isCustomersFormValid ||
      timeEmpty
    ) {
      alert("Please ensure all required fields are filled.");
      console.log("not valid");
      console.log(selectedRequestId);
      console.log(formTripReport);
      console.log(isCustomersFormValid);
      console.log(formCustomers);
      return;
    }

    let ownAccExpense = ownAccCost;

    if (formOwnAccSelect === "") {
      ownAccExpense = 0;
    } else if (formOwnAccSelect == "Duo") {
      ownAccExpense = ownAccExpense / 2;
    }

    const updatedAllDays = [
      ...allDays,
      {
        date: formTripDate,
        country: formTripCountry,
        location: formTripLocation,
        airfare: formAirfare,
        airfare_remark: formAirfareRemark,
        mileage: getTotalMileage().toFixed(2),
        trip_ids: addedTrips.map((trip) => trip.id),
        toll: formToll,
        toll_remark: formTollRemark,
        parking: formParking,
        parking_remark: formParkingRemark,
        transport: formTransport,
        transport_remark: formTransportRemark,
        hotel: formHotel,
        hotel_remark: formHotelRemark,
        own_acc: getOwnAccExpense(),
        own_acc_sharing: formOwnAccSelect,
        own_acc_remark: formOwnAccRemark,
        entertainment: formEntertainment,
        entertainment_remark: formEntertainmentRemark,
        laundry: formLaundry,
        laundry_remark: formLaundryRemark,
        others: formOthers,
        others_remark: formOthersRemark,
        total: getTotal(),
        departure_time: formDepartureTime,
        arrival_time: formArrivalTime,
        breakfast: formBreakfast,
        lunch: formLunch,
        dinner: formDinner,
        meal: getMealCost(),
        trip_report: formTripReport,
        customers: formCustomers,
        business_card_files: businessCardFiles,
      },
    ];

    setAllDays(updatedAllDays);

    resetNextDay();
    if (isFinalDay()) {
      handleTripSubmit(updatedAllDays);
      resetTripForm();
    } else {
      changeDate(1);
    }

    /* try {
      console.log("submitting");
      const businessCardUrls: string[] = [];
      for (const file of businessCardFiles) {
        const storageRef = ref(
          storage,
          `business-cards/${userId}/${Date.now()}_${file.name}`,
        );
        const uploadResult = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(uploadResult.ref);
        businessCardUrls.push(url);
      }

      const expense = {
        user_id: userId,
        user_name: username,
        request_id: selectedRequestId,
        start_date: formDepartureDate,
        end_date: formArrivalDate,
        trip_title: selectedTripTitle,
        date: formTripDate,
        country: formTripCountry,
        location: formTripLocation,
        airfare: formAirfare,
        airfare_remark: formAirfareRemark,
        parking: formParking,
        parking_remark: formParkingRemark,
        transport: formTransport,
        transport_remark: formTransportRemark,
        hotel: formHotel,
        hotel_remark: formHotelRemark,
        own_acc: ownAccExpense,
        own_acc_sharing: formOwnAccSelect,
        own_acc_remark: formOwnAccRemark,
        entertainment: formEntertainment,
        entertainment_remark: formEntertainmentRemark,
        laundry: formLaundry,
        laundry_remark: formLaundryRemark,
        others: formOthers,
        others_remark: formOthersRemark,
        total: getTotal(),
        departure_time: formDepartureTime,
        arrival_time: formArrivalTime,
        breakfast: formBreakfast,
        lunch: formLunch,
        dinner: formDinner,
        trip_report: formTripReport,
        customers: formCustomers,
        business_card_urls: businessCardUrls,
        type: 3, // 1 mileage, 2 general, 3 outstation
        approval_status: 0,
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "expenses"), expense);

      console.log("Document written with ID: ", docRef.id);
      console.log(expense);

      resetNextDay();
      if (isFinalDay()) {
        resetTripForm();
      } else {
        changeDate(1);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save expense.");
    } */
  };

  const addTripsByIds = (tripIds: string[]) => {
    const tripsToAdd = allUserTrips.filter(
      (trip) =>
        tripIds.includes(trip.id) &&
        !addedTrips.some((added) => added.id === trip.id),
    );
    setAddedTrips((prev) => [...prev, ...tripsToAdd]);
  };

  const handlePreviousDay = () => {
    const lastDay = removeLastDay();
    console.log(lastDay);
    console.log(allDays);
    resetNextDay();
    if (isFirstDay()) {
      return;
    } else {
      changeDate(-1);
    }
    if (lastDay !== null) {
      setFormAirfare(lastDay.airfare || "0.00");
      setFormAirfareRemark(lastDay.airfare_remark || "");
      addTripsByIds(lastDay.trip_ids || []);
      setFormToll(lastDay.toll || "0.00");
      setFormTollRemark(lastDay.toll_remark || "");
      setFormParking(lastDay.parking || "0.00");
      setFormParkingRemark(lastDay.parking_remark || "");
      setFormTransport(lastDay.transport || "0.00");
      setFormTransportRemark(lastDay.transport_remark || "");
      setFormHotel(lastDay.hotel || "0.00");
      setFormHotelRemark(lastDay.hotel_remark || "");
      setFormOwnAcc(lastDay.own_acc || "0.00");
      setFormOwnAccSelect(lastDay.own_acc_sharing || "");
      setFormOwnAccRemark(lastDay.own_acc_remark || "");
      setFormDepartureTime(lastDay.departure_time || null);
      setFormArrivalTime(lastDay.arrival_time || null);
      setFormBreakfast(lastDay.breakfast || false);
      setFormLunch(lastDay.lunch || false);
      setFormDinner(lastDay.dinner || false);
      setFormEntertainment(lastDay.entertainment || "0.00");
      setFormEntertainmentRemark(lastDay.entertainment_remark || "");
      setFormLaundry(lastDay.laundry || "0.00");
      setFormLaundryRemark(lastDay.laundry_remark || "");
      setFormOthers(lastDay.others || "0.00");
      setFormOthersRemark(lastDay.others_remark || "");
      setFormCustomers(
        lastDay.customers || [
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
      setBusinessCardFiles(lastDay.business_card_files || []);
      setFormTripReport(lastDay.trip_report || "");
    }
  };

  const removeLastDay = () => {
    if (allDays.length === 0) {
      console.warn("Array is empty");
      return null;
    }

    let poppedValue = null;
    setAllDays((prev) => {
      const newDays = [...prev];
      poppedValue = newDays.pop();
      return newDays;
    });
    return poppedValue;
  };

  const handleRemoveTrip = (tripId: string) => {
    setAddedTrips((prev) => prev.filter((t) => t.id !== tripId));
  };

  const getDistanceValue = () =>
    parseFloat(distance.replace(/[^0-9.]/g, "")) || 0;

  const calculateMileage = () => getTotalMileage().toFixed(2);

  const formatTripTime = (timestamp: any): string => {
    if (!timestamp) return "--:--";

    let date: Date;

    // 1. Check if it's a Firestore-style Timestamp object (your 2nd case)
    if (typeof timestamp.toDate === "function") {
      date = timestamp.toDate();
    }
    // 2. Check if it's an object with seconds/nanoseconds (raw Firestore data)
    else if (typeof timestamp.seconds === "number") {
      date = new Date(timestamp.seconds * 1000);
    }
    // 3. Handle Date objects or Date strings (your 1st case, e.g., "Mon Jun 22 2026...")
    else {
      date = new Date(timestamp);
    }

    // Fallback if the date turns out to be invalid
    if (isNaN(date.getTime())) {
      return "--:--";
    }

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
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
      alert("This trip has already been added.");
    }
  };

  const saveRouteImageToFirebase = async (origin, destination) => {
    try {
      // 1. Get the Google Static Map URL with the polyline
      const googleMapUrl = await getRouteImageUrl(origin, destination);

      // 2. Fetch the actual image data as a Blob (binary data)
      // NOTE: Ensure your Google Cloud Console allows your domain to fetch Static Map blobs
      const response = await fetch(googleMapUrl);
      const blob = (await response.json)
        ? await response.blob()
        : await response.blob();

      // 3. Initialize Firebase Storage and create a unique file path
      const storage = getStorage();
      const fileName = `route-images/trip_${Date.now()}.png`;
      const storageRef = ref(storage, fileName);

      // 4. Upload the raw blob to Firebase Storage
      const uploadResult = await uploadBytes(storageRef, blob, {
        contentType: "image/png",
      });

      // 5. Grab the secure Firebase download URL (No Google API keys inside this!)
      const firebaseDownloadUrl = await getDownloadURL(uploadResult.ref);

      return firebaseDownloadUrl;
    } catch (error) {
      console.error(
        "Failed to process and save route image to Firebase:",
        error,
      );
      throw error;
    }
  };

  const fetchTollCost = async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ) => {
    return 0;
  };

  const getDrivingDistance = async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ) => {
    try {
      const data = await calculateDistance(origin, destination);
      console.log(":Type of data");
      console.log(typeof data);
      return data || 0;
    } catch (error) {
      console.log(error);
      alert("Error calculating distance");
      return 0;
    }
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

  const saveTrip = async () => {
    if (!selectedRequestId.trim()) {
      alert("Please select a trip request.");
      return;
    }
    if (!fromAddress.trim() || !toAddress.trim()) {
      alert("Please fill in both 'From' and 'To' addresses.");
      return;
    }
    if (!originCoord || !destCoord) {
      alert("Please select valid locations from the suggestions.");
      return;
    }
    if (!formRemark.trim()) {
      alert("Please fill in a remark.");
      return;
    }
    if (!formTripFromTime || !formTripToTime) {
      alert("Please fill in both 'Departure' and 'Arrival' times.");
      return;
    }
    if (!userId) {
      alert("You must be logged in.");
      return;
    }

    setIsSaving(true);

    try {
      let subToAddress = toAddress;
      const distanceResult = await getDrivingDistance(originCoord, destCoord);
      let subDistance = 0;
      if (distanceResult) {
        subDistance = parseFloat(distanceResult.toFixed(2));
      }
      let subToll = await fetchTollCost(originCoord, destCoord);
      if (formGoingHome) {
        const distToCurrent = await getDrivingDistance(originCoord, destCoord);
        const distToOffice = await getDrivingDistance(
          originCoord,
          officeCoords || { lat: 0, lng: 0 },
        );
        console.log(distToOffice);
        console.log(distToCurrent);

        if (distToOffice > distToCurrent) {
          console.log(`Route Comparison: Using Current.`);
        } else {
          console.log(`Route Comparison: Using Office.`);
          const distanceValue = await distToOffice;
          if (distanceValue !== undefined) {
            console.log("updating subdistance");
            console.log(distanceValue);
            console.log(distanceValue.toFixed(2));
            subDistance = parseFloat(distanceValue.toFixed(2));
            console.log("subdistance");
            console.log(subDistance);
          }
          subToll = await fetchTollCost(
            originCoord,
            officeCoords || { lat: 0, lng: 0 },
          );
          if (officeCoords) {
            subToAddress = await getAddressFromCoords(
              officeCoords.lat,
              officeCoords.lng,
            );
            /* if (currentLocation) {
                finalToll = await fetchTollCost(currentLocation, officeCoords);
              } */
          }

          console.log(subToAddress);
        }
      } else if (formFromHome) {
        const distToCurrent = await getDrivingDistance(originCoord, destCoord);
        const distToOffice = await getDrivingDistance(
          officeCoords || { lat: 0, lng: 0 },
          destCoord,
        );
        console.log(distToOffice);
        console.log(distToCurrent);

        if (distToOffice > distToCurrent) {
          console.log(`Route Comparison: Using Current.`);
        } else {
          console.log(`Route Comparison: Using Office.`);
          const distanceValue = await distToOffice;
          if (distanceValue !== undefined) {
            console.log("updating subdistance");
            console.log(distanceValue);
            console.log(distanceValue.toFixed(2));
            subDistance = parseFloat(distanceValue.toFixed(2));
            console.log("subdistance");
            console.log(subDistance);
          }
          subToll = await fetchTollCost(
            originCoord,
            officeCoords || { lat: 0, lng: 0 },
          );
          if (officeCoords) {
            subToAddress = await getAddressFromCoords(
              officeCoords.lat,
              officeCoords.lng,
            );
            /* if (currentLocation) {
                finalToll = await fetchTollCost(currentLocation, officeCoords);
              } */
          }

          console.log(subToAddress);
        }
      }
      //const distanceData = getDrivingDistance(originCoord, destCoord);
      if (!subDistance) {
        console.log("from", originCoord, "to", destCoord);
        console.log("from", fromAddress, "to", toAddress);
        alert("Could not calculate driving distance. Please try again.");
        return;
      }

      let routeImageUrl = "";
      try {
        routeImageUrl = await saveRouteImageToFirebase(originCoord, destCoord);
      } catch (imageError) {
        console.error("Error generating route image:", imageError);
      }

      let mileageRateTemp = mileageRate;

      if (subDistance > outStationDistance) {
        mileageRateTemp = mileageRateOutstation;
      }

      let mileage = (subDistance ?? 0) * mileageRateTemp;

      console.log("distance");
      console.log(subDistance);
      console.log(subToAddress);
      console.log(mileage);

      const tripToSave = {
        user_id: userId,
        from_address: fromAddress,
        to_address: subToAddress,
        distance: parseFloat(subDistance.toFixed(2)),
        mileage: parseFloat(mileage.toFixed(2)),
        toll: parseFloat(subToll.toFixed(2)),
        total: (mileage + subToll).toFixed(2),
        remark: formRemark.trim() || "",
        from_time: formTripFromTime,
        to_time: formTripToTime,
        from_home: formFromHome,
        to_home: formGoingHome,
        route_image_url: routeImageUrl,
        date: formTripDate,
        platform: 2,
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "trips"), tripToSave);
      console.log("Trip saved with ID:", docRef.id);
      console.log(tripToSave);

      // --- Create a local trip object for immediate addition ---
      const newTrip = {
        id: docRef.id,
        ...tripToSave,
        created_at: new Date(), // local timestamp for display; Firestore will have serverTimestamp
      };

      console.log("new trip");
      console.log(newTrip);

      // Add to addedTrips directly
      setAddedTrips((prev) => [...prev, newTrip]);

      // Reset the trip form and close modal
      resetMileageTripForm();
      setShowAddTripModal(false);
    } catch (error) {
      console.error("Save error:", error);
      console.log(error);
      alert("Failed to save trip.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectDefault = async (index: number, direction: number) => {
    if (index === 0) {
      return;
    }

    /* if (officeLocation === 0) {
      setOfficeCoords({ lat: 3.0409332, lng: 101.5453218 });
    } else {
      setOfficeCoords({
        lat: 5.4144228421944005,
        lng: 100.31619126878057,
      });
    } */

    if (direction === 0) {
      setFormFromHome(false);
      if (selectedFromIndex === index) {
        setSelectedFromIndex(0);
        clearAddress(0);
      } else if (index === 1) {
        setSelectedFromIndex(index);
        const location = locations[0];
        let address = await getAddressFromCoords(location.lat, location.lng);
        setFromAddress(address);
        setOriginCoord(location);
      } else if (index === 2) {
        setSelectedFromIndex(index);
        const location = locations[1];
        let address = await getAddressFromCoords(location.lat, location.lng);

        setFromAddress(address);
        setOriginCoord(location);
      } else if (index === 3) {
        setFormFromHome(true);
        setSelectedFromIndex(index);
        const location = locations[1];
        let homeAddress = await getAddressFromCoords(
          homeCoords.lat,
          homeCoords.lng,
        );
        console.log("home address");
        console.log(homeAddress);
        console.log(homeCoords);
        setFromAddress(homeAddress);
        setOriginCoord(homeCoords);
      }
    } else if (direction === 1) {
      setFormGoingHome(false);
      if (selectedGoingIndex === index) {
        setSelectedGoingIndex(0);
        clearAddress(0);
      } else if (index === 1) {
        setSelectedGoingIndex(index);
        const location = locations[0];
        let address = await getAddressFromCoords(location.lat, location.lng);
        setToAddress(address);
        setDestCoord(location);
      } else if (index === 2) {
        setSelectedGoingIndex(index);
        const location = locations[1];
        let address = await getAddressFromCoords(location.lat, location.lng);

        setToAddress(address);
        setDestCoord(location);
      } else if (index === 3) {
        setFormGoingHome(true);
        setSelectedGoingIndex(index);
        let homeAddress = await getAddressFromCoords(
          homeCoords.lat,
          homeCoords.lng,
        );
        setToAddress(homeAddress);
        setDestCoord(homeCoords);
      }
    }
  };

  const clearAddress = (direction: number) => {
    if (direction === 0) {
      setFromAddress("");
      setOriginCoord(null);
    } else if (direction === 1) {
      setToAddress("");
      setDestCoord(null);
    }
  };

  const renderAddTripModal = () => {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showAddTripModal}
        statusBarTranslucent={true}
        onRequestClose={() => !isSaving && setShowAddTripModal(false)}
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
                <Text style={styles.modalTitle}>Add Trip</Text>

                <View style={styles.formGroup}>
                  <Text
                    style={[styles.modalSubtitle, styles.fieldLabelMandatory]}
                  >
                    From (Starting location):
                  </Text>
                  <PlacesInput
                    value={fromAddress}
                    placeholder="Search starting location"
                    onPlaceSelected={(address, location) => {
                      setFromAddress(address);
                      setOriginCoord(location);
                    }}
                    disabled={selectedFromIndex !== 0}
                  />
                  <View style={[{ flexDirection: "row", marginTop: 5 }]}>
                    <TouchableOpacity
                      style={[
                        styles.dialogButton,
                        selectedFromIndex === 1
                          ? styles.submitButtonActive
                          : styles.submitButton,
                        { marginLeft: 0 },
                      ]}
                      onPress={() => {
                        selectDefault(1, 0);
                      }}
                    >
                      <Text
                        style={[
                          selectedFromIndex === 1
                            ? styles.textStyleActive
                            : styles.textStyle,
                          { fontWeight: "normal" },
                        ]}
                      >
                        HQ
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dialogButton,
                        selectedFromIndex === 2
                          ? styles.submitButtonActive
                          : styles.submitButton,
                        { marginLeft: 15 },
                      ]}
                      onPress={() => {
                        selectDefault(2, 0);
                      }}
                    >
                      <Text
                        style={[
                          selectedFromIndex === 2
                            ? styles.textStyleActive
                            : styles.textStyle,
                          { fontWeight: "normal" },
                        ]}
                      >
                        Penang
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dialogButton,
                        selectedFromIndex === 3
                          ? styles.submitButtonActive
                          : styles.submitButton,
                        { marginLeft: 15 },
                      ]}
                      onPress={() => {
                        selectDefault(3, 0);
                      }}
                    >
                      <Text
                        style={[
                          selectedFromIndex === 3
                            ? styles.textStyleActive
                            : styles.textStyle,
                          { fontWeight: "normal" },
                        ]}
                      >
                        Home
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      styles.fieldLabelMandatory,
                      { marginTop: 10 },
                    ]}
                  >
                    To (Destination):
                  </Text>
                  <PlacesInput
                    value={toAddress}
                    placeholder="Search destination…"
                    onPlaceSelected={(address, location) => {
                      setToAddress(address);
                      setDestCoord(location);
                    }}
                    disabled={selectedGoingIndex !== 0}
                  />
                  <View style={[{ flexDirection: "row", marginTop: 5 }]}>
                    <TouchableOpacity
                      style={[
                        styles.dialogButton,
                        selectedGoingIndex === 1
                          ? styles.submitButtonActive
                          : styles.submitButton,
                        { marginLeft: 0 },
                      ]}
                      onPress={() => {
                        selectDefault(1, 1);
                      }}
                    >
                      <Text
                        style={[
                          selectedGoingIndex === 1
                            ? styles.textStyleActive
                            : styles.textStyle,
                          { fontWeight: "normal" },
                        ]}
                      >
                        HQ
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dialogButton,
                        selectedGoingIndex === 2
                          ? styles.submitButtonActive
                          : styles.submitButton,
                        { marginLeft: 15 },
                      ]}
                      onPress={() => {
                        selectDefault(2, 1);
                      }}
                    >
                      <Text
                        style={[
                          selectedGoingIndex === 2
                            ? styles.textStyleActive
                            : styles.textStyle,
                          { fontWeight: "normal" },
                        ]}
                      >
                        Penang
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dialogButton,
                        selectedGoingIndex === 3
                          ? styles.submitButtonActive
                          : styles.submitButton,
                        { marginLeft: 15 },
                      ]}
                      onPress={() => {
                        selectDefault(3, 1);
                      }}
                    >
                      <Text
                        style={[
                          selectedGoingIndex === 3
                            ? styles.textStyleActive
                            : styles.textStyle,
                          { fontWeight: "normal" },
                        ]}
                      >
                        Home
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={[
                      styles.modalSubtitle,
                      styles.fieldLabelMandatory,
                      { marginTop: 10 },
                    ]}
                  >
                    Departure Time:
                  </Text>
                  <input
                    type="time"
                    value={dateToTimeString(formTripFromTime)}
                    onChange={(e) =>
                      setFormTripFromTime(timeStringToDate(e.target.value))
                    }
                    style={styles.timeInput}
                    disabled={isSaving}
                  />

                  <Text
                    style={[styles.modalSubtitle, styles.fieldLabelMandatory]}
                  >
                    Arrival Time:
                  </Text>
                  <input
                    type="time"
                    value={dateToTimeString(formTripToTime)}
                    onChange={(e) =>
                      setFormTripToTime(timeStringToDate(e.target.value))
                    }
                    style={styles.timeInput}
                    disabled={isSaving}
                  />
                  <Text
                    style={[styles.modalSubtitle, styles.fieldLabelMandatory]}
                  >
                    Remark:
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { minHeight: 80, textAlignVertical: "top" },
                    ]}
                    placeholder="Trip Remark..."
                    placeholderTextColor="#999999"
                    value={formRemark}
                    onChangeText={setFormRemark}
                    editable={!isSaving}
                    keyboardType="default"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAddTripModal(false);
                      resetMileageTripForm();
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
                    onPress={saveTrip}
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
      </Modal>
    );
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
            <Text style={styles.modalTitle}>
              Select a Trip from {formatDate(formTripDate)}
            </Text>
            <TouchableOpacity onPress={() => setShowAddressModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {tripsForSelectedDate.length === 0 && (
              <Text style={styles.noTripsText}>No trips added</Text>
            )}
            {addedTrips.map((trip) => {
              //const isAdded = addedTrips.some(  (added) => added.id === trip.id);
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
                    handleCustomerChange(
                      customerIndex,
                      "address",
                      trip.to_address,
                    );
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

  const renderMileageModal = () => (
    <Modal
      visible={showMileageModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowMileageModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowMileageModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Select a Trip from {formatDate(formTripDate)}
            </Text>
            <TouchableOpacity onPress={() => setShowMileageModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {tripsForSelectedDate.length === 0 && (
              <Text style={styles.noTripsText}>
                No trips found for {formTripDate.split("-").reverse().join("-")}
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
                    setShowMileageModal(false);
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
      </TouchableOpacity>
    </Modal>
  );

  const getTotalMileage = () => {
    return addedTrips.reduce(
      (sum, trip) => sum + (parseFloat(trip.mileage) || 0),
      0,
    );
  };

  /* const calculateCost = () => {
    const travelCost = getTotalMileage();
    const parking = parseFloat(formParking) || 0;
    //const toll = getTotalToll();
    const toll = parseFloat(formToll);
    const expense = parseFloat(formOtherExpense) || 0;
    return (travelCost + parking + toll + expense).toFixed(2);
  }; */

  const handleTripSubmit = async (tripDays: any[]) => {
    console.log("submitting trip");
    console.log(formCustomers);

    const isCustomersFormValid = formCustomers.every(
      (customer) =>
        customer.name.trim() !== "" &&
        customer.email.trim() !== "" &&
        customer.number.trim() !== "" &&
        customer.time.trim() !== "",
    );

    console.log(tripDays.length);

    let errorEncountered = false;

    // Use for...of instead of forEach
    for (const day of tripDays) {
      try {
        console.log("submitting");
        const businessCardUrls: string[] = [];
        for (const file of day.business_card_files) {
          const storageRef = ref(
            storage,
            `business-cards/${userId}/${Date.now()}_${file.name}`,
          );
          const uploadResult = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(uploadResult.ref);
          businessCardUrls.push(url);
        }

        const expense = {
          user_id: userId,
          username: username,
          request_id: selectedRequestId,
          trip_title: selectedTripTitle,
          start_date: formDepartureDate,
          end_date: formArrivalDate,
          travel_purposes: formTripPurposes,
          date: day.date,
          country: day.country,
          location: day.location,
          mileage: parseFloat(day.mileage) || 0,
          trip_ids: day.trip_ids || [],
          toll: parseFloat(day.toll) || 0,
          toll_remark: day.toll_remark,
          airfare: parseFloat(day.airfare) || 0,
          airfare_remark: day.airfare_remark,
          parking: parseFloat(day.parking) || 0,
          parking_remark: day.parking_remark,
          transport: parseFloat(day.transport) || 0,
          transport_remark: day.transport_remark,
          hotel: parseFloat(day.hotel) || 0,
          hotel_remark: day.hotel_remark,
          own_acc: parseFloat(day.own_acc) || 0,
          own_acc_sharing: day.own_acc_sharing,
          own_acc_remark: day.own_acc_remark,
          entertainment: parseFloat(day.entertainment) || 0,
          entertainment_remark: day.entertainment_remark,
          laundry: parseFloat(day.laundry) || 0,
          laundry_remark: day.laundry_remark,
          others: parseFloat(day.others) || 0,
          others_remark: day.others_remark,
          total: parseFloat(day.total) || 0,
          departure_time: day.departure_time,
          arrival_time: day.arrival_time,
          breakfast: day.breakfast,
          lunch: day.lunch,
          dinner: day.dinner,
          meal: day.meal,
          trip_report: day.trip_report,
          customers: day.customers,
          business_card_urls: businessCardUrls,
          type: 3, // 1 mileage, 2 general, 3 outstation
          approval_status: 0,
          created_at: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "expenses"), expense);

        console.log("Document written with ID: ", docRef.id);
        console.log(expense);
      } catch (e) {
        errorEncountered = true;
        console.error(e);
        alert("Failed to save expense.");
        break; // Optional: stop processing more days if one fails
      }
    }

    // Now this runs after all days are processed
    if (!errorEncountered) {
      console.log("Request ID: ", selectedRequestId);
      const docRef = doc(db, "travel_requests", selectedRequestId);
      await updateDoc(docRef, {
        locked: true,
      });
      console.log("Travel request locked successfully!");
    }

    /* try {
      console.log("submitting");
      const businessCardUrls: string[] = [];
      for (const file of businessCardFiles) {
        const storageRef = ref(
          storage,
          `business-cards/${userId}/${Date.now()}_${file.name}`,
        );
        const uploadResult = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(uploadResult.ref);
        businessCardUrls.push(url);
      }

      const expense = {
        user_id: userId,
        user_name: username,
        request_id: selectedRequestId,
        start_date: formDepartureDate,
        end_date: formArrivalDate,
        trip_title: selectedTripTitle,
        date: formTripDate,
        country: formTripCountry,
        location: formTripLocation,
        airfare: formAirfare,
        airfare_remark: formAirfareRemark,
        parking: formParking,
        parking_remark: formParkingRemark,
        transport: formTransport,
        transport_remark: formTransportRemark,
        hotel: formHotel,
        hotel_remark: formHotelRemark,
        own_acc: ownAccExpense,
        own_acc_sharing: formOwnAccSelect,
        own_acc_remark: formOwnAccRemark,
        entertainment: formEntertainment,
        entertainment_remark: formEntertainmentRemark,
        laundry: formLaundry,
        laundry_remark: formLaundryRemark,
        others: formOthers,
        others_remark: formOthersRemark,
        total: getTotal(),
        departure_time: formDepartureTime,
        arrival_time: formArrivalTime,
        breakfast: formBreakfast,
        lunch: formLunch,
        dinner: formDinner,
        trip_report: formTripReport,
        customers: formCustomers,
        business_card_urls: businessCardUrls,
        type: 3, // 1 mileage, 2 general, 3 outstation
        approval_status: 0,
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "expenses"), expense);

      console.log("Document written with ID: ", docRef.id);
      console.log(expense);

      resetNextDay();
      if (isFinalDay()) {
        resetTripForm();
      } else {
        changeDate(1);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save expense.");
    } */
  };

  const resetNextDay = () => {
    setFormAirfare("0.00");
    setFormAirfareRemark("");
    setAddedTrips([]);
    setFormToll("0.00");
    setFormTollRemark("");
    setFormParking("0.00");
    setFormParkingRemark("");
    setFormTransport("0.00");
    setFormTransportRemark("");
    setFormHotel("0.00");
    setFormHotelRemark("");
    setFormOwnAcc("0.00");
    setFormOwnAccRemark("");
    setFormEntertainment("0.00");
    setFormEntertainmentRemark("");
    setFormLaundry("0.00");
    setFormLaundryRemark("");
    setFormOthers("0.00");
    setFormOthersRemark("");
    setFormBreakfast(false);
    setFormLunch(false);
    setFormDinner(false);
    setLockBreakfast(false);
    setLockLunch(false);
    setLockDinner(false);
    setFormTripReport("");
    setBusinessCardFiles([]);
    setFormArrivalTime(null);
    setFormDepartureTime(null);
    setFormCustomers([
      { name: "", company: "", email: "", number: "", time: "", address: "" },
    ]);
  };

  const resetRequestForm = () => {
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormEndDate(new Date().toISOString().split("T")[0]);
    setFormTravelPurposes([]);
    setFormRequestOthers("");
    setFormRequestCountry("");
    setFormRequestLocation("");
    setFormRequestPlaces([{ country: "", location: "" }]);
    setEditingRequest(false);
    setEditRequestId("");
    setFormTransportMode("");
    setFormRequestOwnAcc(false);
    setSelectedUser(null);
    setFormAdvance("0.00");
    setFormAdvanceRemark("");
    setFormRequestVisitation("");
  };

  const resetTripForm = () => {
    resetNextDay();
    setSelectedRequestId("");
    setSelectedTripTitle("");

    setFormTripDate("");
    setFormTripCountry("");
    setFormTripLocation("");
    setFormArrivalDate("");
    setFormTripPurposes([]);
    setAllDays([]);
    setEditTripId("");
    console.log("resetting all days");
  };

  const resetMileageTripForm = () => {
    setFromAddress("");
    setToAddress("");
    setFormRemark("");
    setFormTripFromTime(null);
    setFormTripToTime(null);
    setFormFromHome(false);
    setFormGoingHome(false);
    setOriginCoord(null);
    setDestCoord(null);
    setSelectedFromIndex(0);
    setSelectedGoingIndex(0);
  };

  const addPlaceRow = () => {
    setFormRequestPlaces([...formRequestPlaces, { country: "", location: "" }]);
  };

  // Remove a specific row by index
  const removePlaceRow = (index: number) => {
    if (formCustomers.length === 1) {
      // Keep at least one row, just reset it
      setFormRequestPlaces([{ country: "", location: "" }]);
    } else {
      setFormRequestPlaces(formRequestPlaces.filter((_, i) => i !== index));
    }
  };

  // Update a specific field for a specific place row
  const handlePlaceChange = (index: number, field: string, value: string) => {
    const updatedPlaces = [...formRequestPlaces];
    updatedPlaces[index][field] = value;
    setFormRequestPlaces(updatedPlaces);
  };

  // Add a new empty customer row
  const addCustomerRow = () => {
    setFormCustomers([
      ...formCustomers,
      { name: "", company: "", email: "", number: "", time: "", address: "" },
    ]);
  };

  // Remove a specific row by index
  const removeCustomerRow = (index: number) => {
    if (formCustomers.length === 1) {
      // Keep at least one row, just reset it
      setFormCustomers([
        { name: "", company: "", email: "", number: "", time: "", address: "" },
      ]);
    } else {
      setFormCustomers(formCustomers.filter((_, i) => i !== index));
    }
  };

  // Update a specific field for a specific customer row
  const handleCustomerChange = (
    index: number,
    field: string,
    value: string,
  ) => {
    const updatedCustomers = [...formCustomers];
    updatedCustomers[index][field] = value;
    setFormCustomers(updatedCustomers);
  };

  // Helper to convert Firestore Timestamp to Date
  const convertTimestampToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;

    // If it's a Firestore Timestamp object
    if (timestamp.seconds !== undefined) {
      return new Date(
        timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000,
      );
    }

    // If it's already a Date or can be converted
    if (timestamp instanceof Date) return timestamp;

    // If it's a string, try to parse it
    if (typeof timestamp === "string") {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  };

  const editTrip = async () => {
    console.log("form others");
    console.log(formOthers);
    console.log(editTripId);
    console.log(getTotal());
    const isCustomersFormValid =
      formCustomers.every(
        (customer) =>
          customer.name.trim() !== "" &&
          customer.company.trim() !== "" &&
          customer.email.trim() !== "" &&
          customer.number.trim() !== "" &&
          customer.time.trim() !== "",
      ) &&
      (addedTrips.length === 0 ||
        formCustomers.some(
          (customer) => customer.address && customer.address.trim() !== "",
        ));

    const timeEmpty =
      (formTripDate === formDepartureDate && !formDepartureTime) ||
      (formTripDate === formArrivalDate && !formArrivalTime);
    if (
      !selectedRequestId.trim() ||
      !formTripReport.trim() ||
      !formTripCountry.trim() ||
      !formTripLocation.trim() ||
      !isCustomersFormValid ||
      timeEmpty
    ) {
      alert("Please ensure all required fields are filled.");
      console.log("not valid");
      console.log(selectedRequestId);
      console.log(formTripReport);
      console.log(isCustomersFormValid);
      console.log(formCustomers);
      return;
    }

    let ownAccExpense = ownAccCost;

    if (formOwnAccSelect === "") {
      ownAccExpense = 0;
    } else if (formOwnAccSelect == "Duo") {
      ownAccExpense = ownAccExpense / 2;
    }
    try {
      const businessCardUrls: string[] = [];
      for (const file of businessCardFiles) {
        const storageRef = ref(
          storage,
          `business-cards/${userId}/${Date.now()}_${file.name}`,
        );
        const uploadResult = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(uploadResult.ref);
        businessCardUrls.push(url);
      }
      const docRef = doc(db, "expenses", editTripId);
      const expense = {
        user_id: userId,
        username: username,
        request_id: selectedRequestId,
        trip_title: selectedTripTitle,
        start_date: formDepartureDate,
        end_date: formArrivalDate,
        travel_purposes: formTripPurposes,
        date: formDate,
        country: formTripCountry,
        location: formTripLocation,
        mileage: getTotalMileage().toFixed(2),
        trip_ids: addedTrips.map((trip) => trip.id),
        toll: parseFloat(formToll),
        toll_remark: formTollRemark,
        airfare: parseFloat(formAirfare),
        airfare_remark: formAirfareRemark,
        parking: parseFloat(formParking),
        parking_remark: formParkingRemark,
        transport: parseFloat(formTransport),
        transport_remark: formTransportRemark,
        hotel: parseFloat(formHotel),
        hotel_remark: formHotelRemark,
        own_acc: parseFloat(formOwnAcc),
        own_acc_sharing: formOwnAccSelect,
        own_acc_remark: formOwnAccRemark,
        entertainment: parseFloat(formEntertainment),
        entertainment_remark: formEntertainmentRemark,
        laundry: parseFloat(formLaundry),
        laundry_remark: formLaundryRemark,
        others: parseFloat(formOthers),
        others_remark: formOthersRemark,
        total: parseFloat(getTotal()),
        departure_time: formDepartureTime,
        arrival_time: formArrivalTime,
        breakfast: formBreakfast,
        lunch: formLunch,
        dinner: formDinner,
        meal: getMealCost(),
        trip_report: formTripReport,
        customers: formCustomers,
      } as any; // Type assertion

      if (businessCardUrls && businessCardUrls.length > 0) {
        expense.business_card_urls = businessCardUrls;
      }

      console.log("expense");
      console.log(expense);

      await updateDoc(docRef, expense);

      resetTripForm();
    } catch (e) {
      console.error(e);
      alert("Failed to save trip.");
    }
  };

  const setEditTrip = (id: string) => {
    if (!id) {
      console.log("No Trip");
      return;
    }
    setEditingRequest(true);
    setEditTripId(id.trim());

    const selectedTrip = outstationExpense.find((e) => e.id === id);

    if (selectedTrip) {
      // Helper to format currency
      // Helper to format currency - with proper type checking
      const formatCurrency = (value: any): string => {
        // Handle null, undefined, or non-numeric values
        const num = typeof value === "number" ? value : parseFloat(value);
        // Check if it's a valid number
        if (isNaN(num) || num === undefined || num === null) {
          return "0.00";
        }
        return num.toFixed(2);
      };
      // Helper to safely parse JSON
      const safeParseJSON = (value) => {
        if (!value) return [];
        try {
          return typeof value === "string" ? JSON.parse(value) : value;
        } catch {
          return [];
        }
      };

      console.log(selectedTrip.arrival_time);
      console.log(new Date(selectedTrip.arrival_time));
      console.log(selectedTrip.breakfast);
      console.log(selectedTrip.lunch);
      console.log(selectedTrip.dinner);

      // Basic trip information
      setFormDepartureDate(selectedTrip.start_date.trim() || "");
      setFormArrivalDate(selectedTrip.end_date.trim() || "");
      setFormTripDate(selectedTrip.date.trim() || "");
      setSelectedRequestId(selectedTrip.request_id || "");
      setSelectedTripTitle(selectedTrip.trip_title || "");
      setFormTripCountry(selectedTrip.country || "");
      setFormTripLocation(selectedTrip.location || "");
      setFormTripPurposes(selectedTrip.travel_purposes || []);

      // Financial fields
      setFormAirfare(formatCurrency(selectedTrip.airfare));
      setFormAirfareRemark(selectedTrip.airfare_remark || "");
      setFormToll(formatCurrency(selectedTrip.toll));
      setFormTollRemark(selectedTrip.toll_remark || "");
      setFormParking(formatCurrency(selectedTrip.parking));
      setFormParkingRemark(selectedTrip.parking_remark || "");
      setFormTransport(formatCurrency(selectedTrip.transport));
      setFormTransportRemark(selectedTrip.transport_remark || "");
      setFormHotel(formatCurrency(selectedTrip.hotel));
      setFormHotelRemark(selectedTrip.hotel_remark || "");
      setFormOwnAcc(formatCurrency(selectedTrip.own_acc));
      setFormOwnAccRemark(selectedTrip.own_acc_remark || "");
      setFormEntertainment(formatCurrency(selectedTrip.entertainment));
      setFormEntertainmentRemark(selectedTrip.entertainment_remark || "");
      setFormLaundry(formatCurrency(selectedTrip.laundry));
      setFormLaundryRemark(selectedTrip.laundry_remark || "");
      setFormOthers(formatCurrency(selectedTrip.others));
      setFormOthersRemark(selectedTrip.others_remark || "");

      // Meal flags
      setTimeout(() => {
        setFormBreakfast(selectedTrip.breakfast || false);
        setFormLunch(selectedTrip.lunch || false);
        setFormDinner(selectedTrip.dinner || false);
      }, 0);

      // Trip report
      setFormTripReport(selectedTrip.trip_report || "");

      // Business cards
      //setBusinessCardFiles(safeParseJSON(selectedTrip.business_card_urls));

      // Time fields - Convert string to Date
      setFormArrivalTime(convertTimestampToDate(selectedTrip.arrival_time));
      setFormDepartureTime(convertTimestampToDate(selectedTrip.departure_time));

      // Customers
      setFormCustomers(
        selectedTrip.customers?.length > 0
          ? selectedTrip.customers
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

      addTripsByIds(selectedTrip.trip_ids || []);

      // Days between start and end date
      if (selectedTrip.start_date && selectedTrip.end_date) {
        const start = new Date(selectedTrip.start_date);
        const end = new Date(selectedTrip.end_date);
        const days = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          days.push(new Date(d));
        }
        setAllDays(days);
      } else {
        setAllDays([]);
      }
    }
  };

  const setEditRequest = (id: string) => {
    if (!id) {
      console.log("No Request");
      return;
    }
    setEditingRequest(true);
    setEditRequestId(id);
    const selectedRequest = allRequests.find((r) => r.id === id);
    setFormStartDate(selectedRequest.start_date);
    setFormEndDate(selectedRequest.end_date);
    setFormTravelPurposes(selectedRequest.travel_purposes || []);
    setFormRequestPlaces(
      selectedRequest.places || [{ country: "", location: "" }],
    );
    const description = selectedRequest.travel_purposes
      .find((p) => p.startsWith("Others:"))
      ?.replace(/^Others:\s*/, "");

    if (description) {
      setOtherTravelPurpose(description);
    }
    setFormTransportMode(selectedRequest.transport_mode);
    setFormRequestOwnAcc(selectedRequest.transport_mode);

    setFormAdvance(selectedRequest.advance_allowance);
    setFormAdvanceRemark(selectedRequest.advance_allowance_remark);

    setSelectedUser(
      allUsers.find((user) => user.id === selectedRequest.room_sharing) || null,
    );
    setFormRequestVisitation(selectedRequest.visitation_plan);

    setEditingRequest(true);
  };

  const renderRequestsModal = () => {
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Trip</Text>
              <TouchableOpacity onPress={() => setShowTripModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {allRequests.length === 0 && (
                <Text style={styles.noTripsText}>No trips found</Text>
              )}
              {allRequests.map((trip) => {
                const isAdded = selectedRequestId == trip.id || trip.locked;

                return (
                  <TouchableOpacity
                    key={trip.id}
                    style={[
                      styles.modalTripItem,
                      isAdded && styles.disabledTripItem,
                    ]}
                    onPress={() => {
                      if (isAdded) return;
                      resetTripForm();
                      setSelectedRequestId(trip.id);
                      setShowTripModal(false);
                      handleSelectRequest(trip.id);
                      //handleAddTrip(trip.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.tripRemark,
                        isAdded && styles.disabledText,
                      ]}
                    >
                      {trip?.trip_title}
                    </Text>
                    <Text
                      style={[
                        styles.addressText,
                        isAdded && styles.disabledText,
                      ]}
                    >
                      {trip?.travel_purposes?.join(", ") || ""}
                    </Text>
                    <Text
                      style={[styles.timeText, isAdded && styles.disabledText]}
                    >
                      {formatDate(trip?.start_date)} -{" "}
                      {formatDate(trip?.end_date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderEditTripModal = () => {
    return (
      <Modal
        visible={showEditTripModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditTripModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditTripModal(false)}
          disabled={true}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Trip</Text>
              <TouchableOpacity onPress={() => setShowEditTripModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {groupedExpenses.length === 0 && (
                <Text style={styles.noTripsText}>No trips found</Text>
              )}
              {groupedExpenses.map((trip) => {
                const isAdded = false;

                return (
                  <View key={trip.request_id} style={styles.tripGroupContainer}>
                    {/* Trip Header */}
                    <View style={styles.tripHeader}>
                      <Text style={styles.tripTitle}>{trip.trip_title}</Text>
                      <Text style={styles.tripDates}>
                        {formatDate(trip.start_date)} -{" "}
                        {formatDate(trip.end_date)}
                      </Text>
                      <Text style={styles.tripPurposes}>
                        {trip.travel_purposes?.join(", ") || ""}
                      </Text>
                      <Text style={[styles.timeText, { fontSize: 14 }]}>
                        Total: RM {trip.total_amount.toFixed(2)}
                      </Text>
                    </View>

                    {/* Loop through data array */}
                    {trip.data.map((expense) => (
                      <TouchableOpacity
                        key={expense.id || Math.random().toString()}
                        style={[
                          styles.modalTripItem,
                          isAdded && styles.disabledTripItem,
                        ]}
                        onPress={() => {
                          console.log(expense.id);
                          //setShowEditModal(false);
                          setShowEditTripModal(false);
                          setEditTrip(expense.id);
                          //setEditRequest(trip.id);
                        }}
                      >
                        <Text
                          style={[
                            styles.tripRemark,
                            isAdded && styles.disabledText,
                          ]}
                        >
                          {formatDate(expense?.date)}
                        </Text>
                        <Text
                          style={[
                            styles.addressText,
                            isAdded && styles.disabledText,
                          ]}
                        >
                          {expense?.country}, {expense?.location}
                        </Text>
                        <Text
                          style={[
                            styles.timeText,
                            isAdded && styles.disabledText,
                          ]}
                        >
                          RM{" "}
                          {expense?.total
                            ? `${parseFloat(expense.total).toFixed(2)}`
                            : "0.00"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderEditModal = () => {
    return (
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Trip</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {allRequests.length === 0 && (
                <Text style={styles.noTripsText}>No trips found</Text>
              )}
              {allRequests.map((trip) => {
                const isAdded = trip.locked;

                return (
                  <TouchableOpacity
                    key={trip.id}
                    style={[
                      styles.modalTripItem,
                      isAdded && styles.disabledTripItem,
                    ]}
                    onPress={() => {
                      if (isAdded) return;
                      /* resetTripForm();
                      setSelectedRequestId(trip.id); */
                      setShowEditModal(false);
                      setEditRequest(trip.id);
                      //handleSelectRequest(trip.id);
                      //handleAddTrip(trip.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.tripRemark,
                        isAdded && styles.disabledText,
                      ]}
                    >
                      {trip?.trip_title}
                    </Text>
                    <Text
                      style={[
                        styles.addressText,
                        isAdded && styles.disabledText,
                      ]}
                    >
                      {trip?.travel_purposes?.join(", ") || ""}
                    </Text>
                    <Text
                      style={[styles.timeText, isAdded && styles.disabledText]}
                    >
                      {formatDate(trip?.start_date)} -{" "}
                      {formatDate(trip?.end_date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return dateString.split("-").reverse().join("-");
  };

  const dateToTimeString = (date: Date | null): string => {
    if (!date) return "";
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const timeStringToDate = (timeString: string): Date | null => {
    if (!formTripDate || !timeString) return null;
    const [year, month, day] = formTripDate.split("-").map(Number);
    const [hours, minutes] = timeString.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0);
  };

  const handleAddPlace = (country: string, location: string) => {
    setFormTripCountry(country);
    setFormTripLocation(location);
  };

  const renderPlaceModal = () => {
    console.log(formTripPlaces);
    return (
      <Modal
        visible={showPlaceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPlaceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPlaceModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Place</Text>
              <TouchableOpacity onPress={() => setShowPlaceModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Country</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Location</Text>
                </View>
              </View>

              <ScrollView style={styles.modalList}>
                {formTripPlaces.map((place) => {
                  /* const isAdded =
                    formTripCountry === place.country &&
                    formTripLocation === place.location; */

                  const isAdded = false;

                  return (
                    <TouchableOpacity
                      key={place.country}
                      style={[
                        styles.tableRow,
                        isAdded && styles.disabledPlaceItem,
                      ]}
                      disabled={isAdded}
                      onPress={() => {
                        setShowPlaceModal(false);
                        handleAddPlace(place.country, place.location);
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
                          {place.country}
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
                          {place.location}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Travelmate</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableContainer}>
              {/* Table Body */}
              <ScrollView style={styles.modalList}>
                {allUsers.map((user) => {
                  const isAdded = false;

                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[styles.tableRow]}
                      disabled={isAdded}
                      onPress={() => {
                        setShowUserModal(false);
                        setSelectedUser(user);
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

  const renderTripForm = () => {
    return (
      <View>
        <Text style={styles.formLabel}>
          {editingRequest ? "Edit Outstation Trip" : "Submit Outstation Trip"}
        </Text>

        <View style={{ flexDirection: "row", marginBottom: 10, gap: 15 }}>
          <TouchableOpacity
            onPress={() => {
              setShowEditTripModal(true);
            }}
            style={[styles.button, { backgroundColor: "#FFA500" }]}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>Edit Outstation Trip</Text>
          </TouchableOpacity>
          {editingRequest && (
            <TouchableOpacity
              onPress={() => {
                setEditingRequest(false);
                resetTripForm();
              }}
              style={styles.button}
              disabled={isSaving}
            >
              <Text style={styles.buttonText}>Cancel Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        {renderEditTripModal()}
        {fieldMessage}
        <View style={[styles.dropdownInput, { marginTop: 10 }]}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              console.log(allRequests);
              console.log(userId);
              setShowTripModal(true);
            }}
          >
            <Text style={styles.buttonText}>Select Outstation Trip</Text>
          </TouchableOpacity>
        </View>
        {renderRequestsModal()}
        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>Trip Title:</Text>
          <Text style={styles.fieldValue}>{selectedTripTitle || "N/A"}</Text>
        </View>
        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>Date:</Text>
          <Text style={styles.fieldValue}>
            {formatDate(formTripDate) || "N/A"}
          </Text>
        </View>
        <View
          style={[
            styles.inputRow,
            {
              marginTop: 10,
              flexDirection: "row",
              justifyContent: "flex-start",
              gap: 50,
            },
          ]}
        >
          <Text style={styles.fieldLabel}>Country:</Text>
          <Text style={styles.fieldValue}>{formTripCountry || "N/A"}</Text>
          <Text style={styles.fieldLabel}>Location:</Text>
          <Text style={styles.fieldValue}>{formTripLocation || "N/A"}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setShowPlaceModal(true);
            }}
          >
            <Text style={styles.buttonText}>Select Place</Text>
          </TouchableOpacity>
          {renderPlaceModal()}
        </View>
        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel]}>Mileage:</Text>
          <Text style={styles.fieldValue}>
            RM {getTotalMileage().toFixed(2)}
          </Text>

          <View style={[styles.dropdownInput, { marginLeft: 20 }]}>
            <TouchableOpacity
              style={{ opacity: tripsForSelectedDate.length > 0 ? 1 : 0.5 }}
              onPress={() => {
                setShowMileageModal(true);

                console.log(addedTrips);
              }}
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
          </View>

          {renderMileageModal()}

          <TouchableOpacity
            onPress={() => setShowAddTripModal(true)}
            style={[
              styles.dropdownInput,
              {
                marginLeft: 10,
                opacity: selectedRequestId ? 1 : 0.5,
              },
            ]}
            disabled={!selectedRequestId}
          >
            <Text style={styles.buttonText}>Add Trip</Text>
          </TouchableOpacity>
          {renderAddTripModal()}
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
                  {/* <Text style={styles.tripRemark}>
                                {trip.id || "No Remark"} (
                                {parseFloat(trip.distance || 0).toFixed(2)} km)
                              </Text> */}
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

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel]}>Toll:</Text>
          <TextInput
            value={formToll}
            onChangeText={setFormToll}
            keyboardType="decimal-pad"
            style={styles.webTextInput}
            editable={!isSaving}
          />
          <Text style={[styles.fieldLabel]}>Remark:</Text>
          <TextInput
            placeholder="Remark"
            value={formTollRemark}
            onChangeText={setFormTollRemark}
            style={styles.webTextInput}
            editable={!isSaving}
          />
        </View>

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel]}>Parking:</Text>
          <TextInput
            value={formParking}
            onChangeText={setFormParking}
            keyboardType="decimal-pad"
            style={styles.webTextInput}
            editable={!isSaving}
          />
          <Text style={[styles.fieldLabel]}>Remark:</Text>
          <TextInput
            placeholder="Remark"
            value={formParkingRemark}
            onChangeText={setFormParkingRemark}
            style={styles.webTextInput}
            editable={!isSaving}
          />
        </View>

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel]}>Airfare:</Text>
          <TextInput
            value={formAirfare}
            onChangeText={setFormAirfare}
            keyboardType="decimal-pad"
            style={styles.webTextInput}
            editable={!isSaving}
          />
          <Text style={[styles.fieldLabel]}>Remark:</Text>
          <TextInput
            placeholder="Remark"
            value={formAirfareRemark}
            onChangeText={setFormAirfareRemark}
            style={styles.webTextInput}
            editable={!isSaving}
          />
        </View>

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel]}>Transport:</Text>
          <TextInput
            value={formTransport}
            onChangeText={setFormTransport}
            keyboardType="decimal-pad"
            style={styles.webTextInput}
            editable={!isSaving}
          />
          <Text style={[styles.fieldLabel]}>Remark:</Text>
          <TextInput
            placeholder="Remark"
            value={formTransportRemark}
            onChangeText={setFormTransportRemark}
            style={styles.webTextInput}
            editable={!isSaving}
          />
        </View>

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel]}>Hotel:</Text>
          <TextInput
            value={formHotel}
            onChangeText={(text) => {
              setFormHotel(text);
              // Clear Hotel Remark and both Own Acc fields when Hotel is filled
              if (text.trim() !== "") {
                setFormOwnAcc("0.00");
                setFormOwnAccRemark("");
              }
            }}
            keyboardType="decimal-pad"
            style={styles.webTextInput}
            editable={!isSaving}
          />
          <Text style={[styles.fieldLabel]}>Remark:</Text>
          <TextInput
            placeholder="Remark"
            value={formHotelRemark}
            onChangeText={(text) => {
              setFormHotelRemark(text);
              // Clear Hotel and both Own Acc fields when Hotel Remark is filled
              if (text.trim() !== "") {
                setFormOwnAcc("0.00");
                setFormOwnAccRemark("");
              }
            }}
            style={styles.webTextInput}
            editable={!isSaving}
          />
        </View>

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel]}>Own Acc (Select One):</Text>
          {/* <TextInput
            value={formOwnAccSelect}
            onChangeText={(text) => {
              setFormOwnAcc(text);
              // Clear Own Acc Remark and both Hotel fields when Own Acc is filled
              if (text.trim() !== "") {
                setFormHotel("0.00");
                setFormHotelRemark("");
              }
            }}
            keyboardType="decimal-pad"
            style={styles.webTextInput}
            editable={!isSaving}
          /> */}

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                formOwnAccSelect === "Solo" && styles.optionButtonSelected,
              ]}
              onPress={() => {
                if (formOwnAccSelect === "Solo") {
                  setFormOwnAccSelect(""); // Deselect if already selected
                } else {
                  setFormOwnAccSelect("Solo");
                  // Clear Hotel section when selecting an option
                  setFormHotel("0.00");
                  setFormHotelRemark("");
                }
              }}
              disabled={isSaving}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  formOwnAccSelect === "Solo" &&
                    styles.optionButtonTextSelected,
                ]}
              >
                Solo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                formOwnAccSelect === "Duo" && styles.optionButtonSelected,
              ]}
              onPress={() => {
                if (formOwnAccSelect === "Duo") {
                  setFormOwnAccSelect(""); // Deselect if already selected
                } else {
                  setFormOwnAccSelect("Duo");
                  // Clear Hotel section when selecting an option
                  setFormHotel("0.00");
                  setFormHotelRemark("");
                }
              }}
              disabled={isSaving}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  formOwnAccSelect === "Duo" && styles.optionButtonTextSelected,
                ]}
              >
                Duo
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.fieldLabel]}>Remark:</Text>
          <TextInput
            placeholder="Remark"
            value={formOwnAccRemark}
            onChangeText={(text) => {
              setFormOwnAccRemark(text);
              // Clear Own Acc and both Hotel fields when Own Acc Remark is filled
              if (text.trim() !== "") {
                setFormHotel("0.00");
                setFormHotelRemark("");
              }
            }}
            style={styles.webTextInput}
            editable={!isSaving}
          />
        </View>

        {selectedRequestId && (
          <View
            style={[
              styles.inputRow,
              { marginTop: 10, alignItems: "flex-start" },
            ]}
          >
            {formTripDate === formDepartureDate && (
              <View style={[styles.inputRow, { alignItems: "flex-start" }]}>
                <Text
                  style={[
                    styles.fieldLabel,
                    styles.fieldLabelMandatory,
                    { width: 150 },
                  ]}
                >
                  Departure Time:
                </Text>

                <input
                  type="time"
                  value={dateToTimeString(formDepartureTime)}
                  onChange={(e) =>
                    setFormDepartureTime(timeStringToDate(e.target.value))
                  }
                  style={styles.timeInput}
                  disabled={isSaving || formTripDate !== formDepartureDate}
                />
              </View>
            )}

            {formTripDate === formArrivalDate && (
              <View style={[styles.inputRow, { alignItems: "flex-start" }]}>
                <Text
                  style={[
                    styles.fieldLabel,
                    styles.fieldLabelMandatory,
                    { width: 150 },
                  ]}
                >
                  Arrival Time:{" "}
                </Text>

                <input
                  type="time"
                  value={dateToTimeString(formArrivalTime)}
                  onChange={(e) =>
                    setFormArrivalTime(timeStringToDate(e.target.value))
                  }
                  style={styles.timeInput}
                  disabled={isSaving || formTripDate !== formArrivalDate}
                />
              </View>
            )}
          </View>
        )}

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel, { width: 80 }]}>Breakfast</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor="#2196F3"
            ios_backgroundColor="#3e3e3e"
            value={formBreakfast}
            onValueChange={setFormBreakfast}
            disabled={lockBreakfast}
          />
          <Text style={[styles.fieldLabel, { marginLeft: 30, width: 80 }]}>
            Lunch
          </Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor="#2196F3"
            ios_backgroundColor="#3e3e3e"
            value={formLunch}
            onValueChange={setFormLunch}
            disabled={lockLunch}
          />
          <Text style={[styles.fieldLabel, { marginLeft: 30, width: 80 }]}>
            Dinner
          </Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor="#2196F3"
            ios_backgroundColor="#3e3e3e"
            value={formDinner}
            onValueChange={setFormDinner}
            disabled={lockDinner}
          />
        </View>

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel]}>Entertainment:</Text>
          <TextInput
            value={formEntertainment}
            onChangeText={setFormEntertainment}
            keyboardType="decimal-pad"
            style={styles.webTextInput}
            editable={!isSaving}
          />
          <Text style={[styles.fieldLabel]}>Remark:</Text>
          <TextInput
            placeholder="Remark"
            value={formEntertainmentRemark}
            onChangeText={setFormEntertainmentRemark}
            style={styles.webTextInput}
            editable={!isSaving}
          />
        </View>

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel]}>Laundry:</Text>
          <TextInput
            value={formLaundry}
            onChangeText={setFormLaundry}
            keyboardType="decimal-pad"
            style={styles.webTextInput}
            editable={!isSaving}
          />
          <Text style={[styles.fieldLabel]}>Remark:</Text>
          <TextInput
            placeholder="Remark"
            value={formLaundryRemark}
            onChangeText={setFormLaundryRemark}
            style={styles.webTextInput}
            editable={!isSaving}
          />
        </View>

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel]}>Others:</Text>
          <TextInput
            value={formOthers}
            onChangeText={setFormOthers}
            keyboardType="decimal-pad"
            style={styles.webTextInput}
            editable={!isSaving}
          />
          <Text style={[styles.fieldLabel]}>Remark:</Text>
          <TextInput
            placeholder="Remark"
            value={formOthersRemark}
            onChangeText={setFormOthersRemark}
            style={styles.webTextInput}
            editable={!isSaving}
          />
        </View>
        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>Total:</Text>
          <Text style={styles.fieldValue}>RM {getTotal()}</Text>
        </View>
        {/* --- Dynamic Customer Section --- */}
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

          {formCustomers.map((customer, index) => (
            <View key={index} style={{ marginBottom: 10 }}>
              <View style={[styles.inputRow, { alignItems: "center" }]}>
                <Text
                  style={[
                    styles.fieldLabel,
                    styles.fieldLabelMandatory,
                    { width: 70 },
                  ]}
                >
                  Company:
                </Text>
                <TextInput
                  placeholder="Company"
                  value={customer.company}
                  onChangeText={(text) =>
                    handleCustomerChange(index, "company", text)
                  }
                  style={[styles.webTextInput, { maxWidth: 150 }]}
                  editable={!isSaving}
                />
                <Text
                  style={[
                    styles.fieldLabel,
                    styles.fieldLabelMandatory,
                    { width: 70 },
                  ]}
                >
                  Name:
                </Text>
                <TextInput
                  placeholder="Name"
                  value={customer.name}
                  onChangeText={(text) =>
                    handleCustomerChange(index, "name", text)
                  }
                  style={[styles.webTextInput, { maxWidth: 150 }]}
                  editable={!isSaving}
                />

                <Text
                  style={[
                    styles.fieldLabel,
                    styles.fieldLabelMandatory,
                    { width: 70 },
                  ]}
                >
                  Email:
                </Text>
                <TextInput
                  placeholder="Email"
                  value={customer.email}
                  onChangeText={(text) =>
                    handleCustomerChange(index, "email", text)
                  }
                  keyboardType="email-address"
                  style={[styles.webTextInput, { maxWidth: 150 }]}
                  editable={!isSaving}
                />

                <Text
                  style={[
                    styles.fieldLabel,
                    styles.fieldLabelMandatory,
                    { width: 70 },
                  ]}
                >
                  Number:
                </Text>
                <TextInput
                  placeholder="Number"
                  value={customer.number}
                  onChangeText={(text) =>
                    handleCustomerChange(index, "number", text)
                  }
                  keyboardType="phone-pad"
                  style={[styles.webTextInput, { maxWidth: 150 }]}
                  editable={!isSaving}
                />
              </View>
              <View style={[styles.inputRow, { alignItems: "center" }]}>
                <View style={[{ alignItems: "center", flexDirection: "row" }]}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      styles.fieldLabelMandatory,
                      { width: 70 },
                    ]}
                  >
                    Time:
                  </Text>
                  <input
                    type="time"
                    value={customer.time}
                    onChange={(e) =>
                      handleCustomerChange(index, "time", e.target.value)
                    }
                    style={{
                      maxWidth: 150,
                      backgroundColor: "#f9f9f9",
                      border: "1px solid #eee",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "16px",
                      color: "#333",
                      boxSizing: "border-box",
                      height: "40px",
                      margin: 0,
                    }}
                    disabled={isSaving}
                  />
                </View>

                {addedTrips.length !== 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={[styles.fieldLabel, { width: 70, marginLeft: 10 }]}
                    >
                      Address:
                    </Text>
                    <TextInput
                      placeholder="Address"
                      value={customer.address}
                      onChangeText={(text) =>
                        handleCustomerChange(index, "address", text)
                      }
                      style={[styles.webTextInput, { maxWidth: 150 }]}
                      editable={false}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        setShowAddressModal(true);
                        setCustomerIndex(index);
                        console.log(index);
                      }}
                      style={[
                        styles.dropdownInput,
                        { marginLeft: 10, paddingVertical: 10, maxWidth: 130 },
                      ]}
                      disabled={isSaving}
                    >
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>
                        Select Address
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {renderTripAddressModal()}

                {/* Remove Button for this row */}
                <TouchableOpacity
                  onPress={() => removeCustomerRow(index)}
                  style={{ marginLeft: 10, padding: 5 }}
                  disabled={isSaving}
                >
                  <Text style={{ color: "red", fontWeight: "bold" }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Button to add another customer row */}
          <TouchableOpacity
            onPress={addCustomerRow}
            style={{
              marginTop: 10,
              alignSelf: "flex-start",
              backgroundColor: "#2196F3",
              padding: 8,
              borderRadius: 4,
            }}
            disabled={isSaving}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              + Add Customer
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.inputRow, { marginTop: 10, alignItems: "flex-start" }]}
        >
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Trip Report:
          </Text>
          <TextInput
            value={formTripReport}
            onChangeText={setFormTripReport}
            multiline
            style={[
              styles.webTextInput,
              { minHeight: 200, width: "100%", maxWidth: maxWidth },
            ]}
            placeholder="Trip Report"
          />
        </View>

        <View style={{ flexDirection: "column" }}>
          <View style={[styles.inputRow, { marginTop: 10 }]}>
            <Text style={styles.fieldLabel}>Business Cards:</Text>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  Array.from(e.target.files);
                }
              }}
              style={htmlInputStyle}
            />
          </View>
          {businessCardFiles.length > 0 && (
            <View style={styles.receiptList}>
              <Text style={styles.receiptLabel}>Selected files:</Text>
              {businessCardFiles.map((file, idx) => (
                <Text key={idx} style={styles.receiptFileName}>
                  {file.name}
                </Text>
              ))}
            </View>
          )}
        </View>
        {editingRequest ? (
          <TouchableOpacity
            onPress={editTrip}
            style={[styles.button, { marginRight: 10 }, { marginBottom: 20 }]}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>Submit Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={handlePreviousDay}
              style={[
                styles.button,
                { marginRight: 10 },
                { opacity: isFirstDay() ? 0.5 : 1 },
                { marginBottom: 20 },
              ]}
              disabled={isSaving || isFirstDay()}
            >
              <Text style={styles.buttonText}>Previous Day </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNextDay}
              style={[
                styles.button,
                { opacity: selectedRequestId ? 1 : 0.5, marginBottom: 20 },
              ]}
              disabled={isSaving || !selectedRequestId}
            >
              <Text style={styles.buttonText}>
                {isFinalDay() ? "Finish" : "Next Day"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* <TouchableOpacity
          onPress={handleTripSubmit}
          style={styles.button}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Submit Trip</Text>
          )}
        </TouchableOpacity> */}
      </View>
    );
  };

  const renderRequestForm = () => {
    return (
      <View>
        <Text style={styles.formLabel}>
          {editingRequest ? "Edit Travel Request" : "Submit Travel Request"}
        </Text>
        <View style={{ flexDirection: "row", marginBottom: 10, gap: 15 }}>
          <TouchableOpacity
            onPress={() => {
              setShowEditModal(true);
            }}
            style={[styles.button, { backgroundColor: "#FFA500" }]}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>Edit Travel Request</Text>
          </TouchableOpacity>
          {editingRequest && (
            <TouchableOpacity
              onPress={() => {
                setEditingRequest(false);
                resetRequestForm();
              }}
              style={styles.button}
              disabled={isSaving}
            >
              <Text style={styles.buttonText}>Cancel Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        {fieldMessage}

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Start Date:
          </Text>
          <input
            type="date"
            value={formStartDate}
            onChange={(e) => setFormStartDate(e.target.value)}
            style={htmlInputStyle}
          />
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            End Date:
          </Text>
          <input
            type="date"
            value={formEndDate}
            onChange={(e) => setFormEndDate(e.target.value)}
            style={htmlInputStyle}
          />
          <Text style={styles.fieldLabel}>
            Number of days: {getDaysDifference(formStartDate, formEndDate)}
          </Text>
        </View>

        <View style={[styles.inputRow, { marginTop: 10, maxWidth: 1200 }]}>
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Travel Purpose:
          </Text>

          {travelPurposes.map((purpose) => {
            const isSelected = formTravelPurposes.includes(purpose);

            return (
              <TouchableOpacity
                key={purpose}
                style={styles.radioContainer}
                onPress={() => handleSelectPurpose(purpose)}
              >
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>{purpose}</Text>
              </TouchableOpacity>
            );
          })}

          {/* "Others" option */}
          <TouchableOpacity
            style={styles.radioContainer}
            onPress={() => handleSelectPurpose("Others")}
          >
            <View
              style={[
                styles.radioOuter,
                formTravelPurposes.some((item) => item.startsWith("Others")) &&
                  styles.radioOuterSelected,
              ]}
            >
              {formTravelPurposes.some((item) => item.startsWith("Others")) && (
                <View style={styles.radioInner} />
              )}
            </View>
            <Text style={styles.radioText}>Others:</Text>
          </TouchableOpacity>

          {/* Text input for "Others" */}
          {formTravelPurposes.some((item) => item.startsWith("Others")) && (
            <TextInput
              style={styles.webTextInput}
              placeholder="Other purpose"
              value={otherTravelPurpose}
              onChangeText={handleOtherTextChange}
            />
          )}
        </View>

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Mode of Transport:
          </Text>

          <TouchableOpacity
            style={styles.radioContainer}
            onPress={() => setFormTransportMode("Air")}
          >
            <View
              style={[
                styles.radioOuter,
                formTransportMode === "Air" && styles.radioOuterSelected,
              ]}
            >
              {formTransportMode === "Air" && (
                <View style={styles.radioInner} />
              )}
            </View>
            <Text style={styles.radioText}>Air</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioContainer}
            onPress={() => setFormTransportMode("Rail")}
          >
            <View
              style={[
                styles.radioOuter,
                formTransportMode === "Rail" && styles.radioOuterSelected,
              ]}
            >
              {formTransportMode === "Rail" && (
                <View style={styles.radioInner} />
              )}
            </View>
            <Text style={styles.radioText}>Rail</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioContainer}
            onPress={() => setFormTransportMode("Road")}
          >
            <View
              style={[
                styles.radioOuter,
                formTransportMode === "Road" && styles.radioOuterSelected,
              ]}
            >
              {formTransportMode === "Road" && (
                <View style={styles.radioInner} />
              )}
            </View>
            <Text style={styles.radioText}>Road</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioContainer}
            onPress={() => setFormTransportMode("Sea")}
          >
            <View
              style={[
                styles.radioOuter,
                formTransportMode === "Sea" && styles.radioOuterSelected,
              ]}
            >
              {formTransportMode === "Sea" && (
                <View style={styles.radioInner} />
              )}
            </View>
            <Text style={styles.radioText}>Sea</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Own Accommodation:
          </Text>

          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor="#2196F3"
            ios_backgroundColor="#3e3e3e"
            value={formRequestOwnAcc}
            onValueChange={(newValue) => setFormRequestOwnAcc(newValue)}
          />
        </View>

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
              Room Sharing:
            </Text>
            <Text>{selectedUser?.username}</Text>
            <TouchableOpacity
              style={[styles.button, { marginLeft: 20 }]}
              onPress={() => {
                setShowUserModal(true);
              }}
            >
              <Text style={styles.buttonText}>Select Travelmate</Text>
            </TouchableOpacity>
          </View>
        </View>
        {renderSelectUserModal()}

        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel]}>Travel Advance Allowance:</Text>
          <TextInput
            value={formAdvance}
            onChangeText={setFormAdvance}
            keyboardType="decimal-pad"
            style={styles.webTextInput}
            editable={!isSaving}
          />
          <Text style={[styles.fieldLabel]}>Remark:</Text>
          <TextInput
            placeholder="Remark"
            value={formAdvanceRemark}
            onChangeText={setFormAdvanceRemark}
            style={styles.webTextInput}
            editable={!isSaving}
          />
        </View>

        <View
          style={[styles.inputRow, { marginTop: 10, alignItems: "flex-start" }]}
        >
          <Text style={[styles.fieldLabel]}>Visitation Plan:</Text>
          <TextInput
            value={formRequestVisitation}
            onChangeText={setFormRequestVisitation}
            multiline
            style={[
              styles.webTextInput,
              { minHeight: 200, width: "100%", maxWidth: maxWidth },
            ]}
            placeholder="Visitation Plan"
          />
        </View>

        {/* <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Country:
          </Text>
          <Picker
            selectedValue={formRequestCountry}
            onValueChange={(itemValue) => {
              setFormRequestCountry(itemValue);
            }}
            style={styles.select}
          >
            <Picker.Item
              key="default"
              label="Select a country..."
              value=""
              enabled={false}
            />

            {countryList.map((p) => (
              <Picker.Item key={p.value} label={p.label} value={p.value} />
            ))}
          </Picker>
        </View>
        <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Location:
          </Text>

          <TextInput
            value={formRequestLocation}
            onChangeText={setFormRequestLocation}
            style={styles.webTextInput}
            editable={!isSaving}
            placeholder="Location"
          />
        </View> */}

        <View
          style={{
            marginTop: 15,
            borderTopWidth: 1,
            borderTopColor: "#ccc",
            paddingTop: 10,
          }}
        >
          <Text style={[styles.formLabel, { fontSize: 16 }]}>Places:</Text>

          {formRequestPlaces.map((place, index) => (
            <View
              key={index}
              style={[styles.inputRow, { marginTop: 10, alignItems: "center" }]}
            >
              <Text
                style={[
                  styles.fieldLabel,
                  styles.fieldLabelMandatory,
                  { width: 90 },
                ]}
              >
                #{index + 1} Country:
              </Text>
              <Picker
                selectedValue={place.country}
                onValueChange={(itemValue) => {
                  setFormRequestCountry(itemValue);
                  handlePlaceChange(index, "country", itemValue);
                }}
                style={styles.select}
              >
                <Picker.Item
                  key="default"
                  label="Select a country..."
                  value=""
                  enabled={false}
                />

                {countryList.map((p) => (
                  <Picker.Item key={p.value} label={p.label} value={p.value} />
                ))}
              </Picker>

              <Text
                style={[
                  styles.fieldLabel,
                  styles.fieldLabelMandatory,
                  { width: 90, marginLeft: 20 },
                ]}
              >
                Location:
              </Text>
              <TextInput
                placeholder="Location"
                value={place.location}
                onChangeText={(text) =>
                  handlePlaceChange(index, "location", text)
                }
                style={styles.webTextInput}
                editable={!isSaving}
              />

              <TouchableOpacity
                onPress={() => removePlaceRow(index)}
                style={{ marginLeft: 10, padding: 5 }}
                disabled={isSaving}
              >
                <Text style={{ color: "red", fontWeight: "bold" }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            onPress={addPlaceRow}
            style={{
              marginTop: 10,
              marginBottom: 20,
              alignSelf: "flex-start",
              backgroundColor: "#2196F3",
              padding: 8,
              borderRadius: 4,
            }}
            disabled={isSaving}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              + Add Place
            </Text>
          </TouchableOpacity>
        </View>

        {/* <View style={[styles.inputRow, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Others:
          </Text>

          <TextInput
            value={formRequestOthers}
            onChangeText={setFormRequestOthers}
            style={styles.webTextInput}
            editable={!isSaving}
            placeholder="Others"
          />
        </View> */}
        {renderEditModal()}

        <TouchableOpacity
          onPress={handleRequestSubmit}
          style={[styles.button, { marginBottom: 20 }]}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              {editingRequest ? "Submit Edit" : "Submit Request"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.detailsContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.wrapper}>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={true}
              style={styles.horizontalScrollView}
              contentContainerStyle={styles.horizontalContent}
            >
              <View style={styles.formContainer}>
                <View style={styles.tabRow}>
                  <TouchableOpacity
                    onPress={() => changeForm(1)}
                    style={[
                      styles.tabButton,
                      { marginRight: 10 },
                      tabIndex === 1
                        ? styles.activeTabButton
                        : styles.inactiveTabButton,
                    ]}
                  >
                    <Text
                      style={
                        tabIndex === 1
                          ? styles.activeButtonText
                          : styles.inactiveButtonText
                      }
                    >
                      Travel Request
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => changeForm(2)}
                    style={[
                      styles.tabButton,
                      { marginRight: 10 },
                      tabIndex === 2
                        ? styles.activeTabButton
                        : styles.inactiveTabButton,
                    ]}
                  >
                    <Text
                      style={
                        tabIndex === 2
                          ? styles.activeButtonText
                          : styles.inactiveButtonText
                      }
                    >
                      Outstation Trip
                    </Text>
                  </TouchableOpacity>
                </View>

                {tabIndex === 1 && renderRequestForm()}
                {tabIndex === 2 && renderTripForm()}

                {/* <TouchableOpacity
                  onPress={handleSubmit}
                  style={styles.button}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Submit Expense</Text>
                  )}
                </TouchableOpacity> */}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const htmlInputStyle = {
  padding: "8px 12px",
  border: "1px solid #ccc",
  width: "100%",
  maxWidth: "220px",
  minHeight: "36px",
  boxSizing: "border-box" as const,
  backgroundColor: "#fff",
  marginRight: "10px",
};
const htmlSelectStyle = { ...htmlInputStyle, height: "auto" };

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
  boldLabel: { fontWeight: "bold", color: "#333" },
  tabRow: {
    marginBottom: 10,
    flexDirection: "row",
  },
  container: { flex: 1, backgroundColor: "#fff" },
  detailsContainer: { flex: 1 },
  scrollContent: { padding: 20 },
  formContainer: { flex: 1 },
  dropdownInput: {
    backgroundColor: "#2196F3",
    borderRadius: 5,
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    minHeight: 36,
    maxWidth: 200,
    alignItems: "center",
  },
  webTextInput: {
    flex: 1,
    maxWidth: 200,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    zIndex: 1,
    position: "relative",
    marginRight: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  fieldLabel: { fontSize: 14, fontWeight: "600", width: 120 },
  fieldValue: { fontSize: 14 },
  button: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    maxWidth: 200,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  formLabel: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  addedTripsContainer: { marginTop: 16 },
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
  tripAddress: { fontSize: 12, color: "#666" },
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
  summaryText: { fontSize: 14, fontWeight: "500", color: "#2e7d32" },
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
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  closeButton: { fontSize: 20, fontWeight: "bold", color: "#999" },
  modalList: { maxHeight: 400 },
  modalTripItem: { padding: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  modalTripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  timeText: { fontSize: 12, fontWeight: "bold", color: "#2196F3" },
  distanceText: { fontSize: 12, fontWeight: "bold", color: "#4caf50" },
  addressText: { fontSize: 13, color: "#444", marginTop: 2 },
  noTripsText: { padding: 20, textAlign: "center", color: "#888" },
  receiptList: { marginLeft: 120, marginTop: 5, marginBottom: 10 },
  receiptLabel: { fontSize: 12, fontWeight: "500", color: "#555" },
  receiptFileName: { fontSize: 11, color: "#666", marginLeft: 10 },
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
    justifyContent: "center",
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
  modalSubtitle: {
    fontSize: 16,
    fontWeight: "normal",
    marginBottom: 8,
    color: "#666",
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
  timePickerButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  timePickerText: {
    fontSize: 16,
    color: "#333",
  },
  timeInput: {
    maxWidth: 300,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    boxSizing: "border-box",
    marginBottom: 16,
    marginRight: 10,
  },
  disabledTripItem: {
    backgroundColor: "#e0e0e0",
    opacity: 0.6,
  },
  disabledText: {
    color: "#9e9e9e",
  },
  fieldLabelMandatory: { color: "#2196F3" },
  tabButton: {
    borderRadius: 5,
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    minHeight: 36,
    maxWidth: 200,
    alignItems: "center",
  },
  inactiveTabButton: {
    backgroundColor: "#2196F3",
  },
  activeTabButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  inactiveButtonText: { color: "white", fontWeight: "bold" },
  activeButtonText: { color: "#2196F3", fontWeight: "bold" },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    marginVertical: 5,
  },
  radioOuter: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioOuterSelected: { borderColor: "#007AFF" },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: "#007AFF",
  },
  radioText: { fontSize: 16 },
  select: {
    paddingVertical: 6, // matches "6px 10px"
    paddingHorizontal: 10, // matches "6px 10px"
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    fontSize: 14,
    backgroundColor: "#fff",
    height: 40, // adjust based on your needs
    color: "#000",
  },
  buttonGroup: {
    flexDirection: "row",
    marginRight: 15,
    alignItems: "center",
  },

  optionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    marginHorizontal: 4,
  },

  optionButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },

  optionButtonText: {
    color: "#333",
    fontSize: 14,
  },

  optionButtonTextSelected: {
    color: "#fff",
  },
  otherInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    marginTop: 8,
    marginLeft: 30, // Align with the radio options
    fontSize: 14,
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
  },
  tableCell: {
    fontSize: 13,
    color: "#666",
  },
  disabledPlaceItem: {
    backgroundColor: "#e0e0e0",
    opacity: 0.6,
  },
  submitButtonActive: {
    backgroundColor: "transparent",
    borderColor: "#2196F3",
    borderWidth: 1,
  },
  textStyleActive: {
    color: "#2196F3",
  },
  wrapper: {
    flex: 1,
  },
  horizontalScrollView: {
    flex: 1,
  },
  horizontalContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  tripGroupContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Trip Header Section
  tripHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 8,
  },

  tripTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },

  tripDates: {
    fontSize: 13,
    color: "#666666",
    marginBottom: 2,
  },

  tripPurposes: {
    fontSize: 13,
    color: "#666666",
    marginBottom: 2,
  },

  tripTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
    marginTop: 4,
  },
});
