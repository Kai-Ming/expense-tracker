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
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { db, storage } from "../firebaseConfig";

type Grade =
  | "S4"
  | "S3"
  | "S2"
  | "S1"
  | "B4"
  | "B3"
  | "B2"
  | "B1"
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

export default function OutstationExpenseForm() {
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
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

  const [formBrakfast, setFormBreakfast] = useState(false);
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
    { name: "", company: "", email: "", number: "", time: "" },
  ]);
  const [businessCardFiles, setBusinessCardFiles] = useState<File[]>([]);
  const [allDays, setAllDays] = useState<any[]>([]);

  const [showTripModal, setShowTripModal] = useState(false);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [tabIndex, setTabIndex] = useState<number>(1);

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

  const fieldMessage = (
    <Text
      style={[{ fontSize: 14, fontWeight: "600", marginTop: 10, width: 500 }]}
    >
      Required fields in <Text style={{ color: "#2196F3" }}>blue</Text>.
    </Text>
  );

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
    setFormTripPlaces(selectedRequest.places);
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

    if (
      !formStartDate.trim() ||
      !formEndDate.trim() ||
      !isPlacesFormValid ||
      formTravelPurposes.length === 0
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

    if (formBrakfast) {
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
      parseFloat(formParking) +
      parseFloat(formTransport) +
      parseFloat(formHotel) +
      parseFloat(formOwnAcc) +
      parseFloat(formEntertainment) +
      parseFloat(formLaundry) +
      parseFloat(formOthers) +
      getOwnAccExpense() +
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

    const isCustomersFormValid = formCustomers.every(
      (customer) =>
        customer.name.trim() !== "" &&
        customer.company.trim() !== "" &&
        customer.email.trim() !== "" &&
        customer.number.trim() !== "" &&
        customer.time.trim() !== "",
    );

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
        breakfast: formBrakfast,
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
        breakfast: formBrakfast,
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
          { name: "", company: "", email: "", number: "", time: "" },
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
        breakfast: formBrakfast,
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
      { name: "", company: "", email: "", number: "", time: "" },
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
    console.log("resetting all days");
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
      { name: "", company: "", email: "", number: "", time: "" },
    ]);
  };

  // Remove a specific row by index
  const removeCustomerRow = (index: number) => {
    if (formCustomers.length === 1) {
      // Keep at least one row, just reset it
      setFormCustomers([
        { name: "", company: "", email: "", number: "", time: "" },
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

  const setEditTrip = (id: string) => {
    if (!id) {
      console.log("No Trip");
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
                      setEditTrip(trip.id);
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
    if (!formDate || !timeString) return null;
    const [year, month, day] = formDate.split("-").map(Number);
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

  const renderTripForm = () => {
    return (
      <View>
        <Text style={styles.formLabel}>Submit Outstation Trip</Text>
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
            <Text style={styles.buttonText}>Select Trip</Text>
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
            value={formBrakfast}
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
          <Text style={styles.fieldValue}>RM {getMealCost()}</Text>
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
                Company:
              </Text>
              <TextInput
                placeholder="Company"
                value={customer.company}
                onChangeText={(text) =>
                  handleCustomerChange(index, "company", text)
                }
                style={styles.webTextInput}
                editable={!isSaving}
              />
              <Text
                style={[
                  styles.fieldLabel,
                  styles.fieldLabelMandatory,
                  { width: 90 },
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
                style={styles.webTextInput}
                editable={!isSaving}
              />

              <Text
                style={[
                  styles.fieldLabel,
                  styles.fieldLabelMandatory,
                  { width: 90 },
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
                style={styles.webTextInput}
                editable={!isSaving}
              />

              <Text
                style={[
                  styles.fieldLabel,
                  styles.fieldLabelMandatory,
                  { width: 90 },
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
                style={styles.webTextInput}
                editable={!isSaving}
              />

              <View style={[{ alignItems: "center", flexDirection: "row" }]}>
                <Text
                  style={[
                    styles.fieldLabel,
                    styles.fieldLabelMandatory,
                    { width: 90 },
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

              {/* Remove Button for this row */}
              <TouchableOpacity
                onPress={() => removeCustomerRow(index)}
                style={{ marginLeft: 10, padding: 5 }}
                disabled={isSaving}
              >
                <Text style={{ color: "red", fontWeight: "bold" }}>✕</Text>
              </TouchableOpacity>
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
              { minHeight: 200, width: "100%", maxWidth: "100%" },
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
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity
            onPress={handlePreviousDay}
            style={[
              styles.button,
              { marginRight: 10 },
              { opacity: isFirstDay() ? 0.5 : 1 },
            ]}
            disabled={isSaving || isFirstDay()}
          >
            <Text style={styles.buttonText}>Previous Day </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNextDay}
            style={[styles.button, { opacity: selectedRequestId ? 1 : 0.5 }]}
            disabled={isSaving || !selectedRequestId}
          >
            <Text style={styles.buttonText}>
              {isFinalDay() ? "Finish" : "Next Day"}
            </Text>
          </TouchableOpacity>
        </View>

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

        <View style={[styles.inputRow, { marginTop: 10 }]}>
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

        <View style={{ flexDirection: "row", marginBottom: 10, gap: 15 }}>
          <TouchableOpacity
            onPress={() => {
              setShowEditModal(true);
            }}
            style={styles.button}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>Edit Request</Text>
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

        <TouchableOpacity
          onPress={handleRequestSubmit}
          style={styles.button}
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
  formLabel: { fontSize: 20, fontWeight: "bold" },
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
});
