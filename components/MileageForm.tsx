import PlacesInput from "@/components/PlacesInput";
import { Text, View } from "@/components/Themed";
import * as Location from "expo-location";
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
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
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
} from "react-native";
import { db, storage } from "../firebaseConfig";

export default function MileageForm() {
  const [homeCoords, setHomeCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distance, setDistance] = useState<string>("0.00");
  const [formPurpose, setFormPurpose] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [formCompany, setFormCompany] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formContactNumber, setFormContactNumber] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formFromTime, setFormFromTime] = useState<string>("");
  const [formToTime, setFormToTime] = useState<string>("");
  const [formParking, setFormParking] = useState<string>("0.00");
  const [formToll, setFormToll] = useState<string>("0.00");
  const [formOtherExpense, setFormOtherExpense] = useState<string>("0.00");
  const [formOtherExpenseType, setFormOtherExpenseType] = useState<string>("");
  const [formTripReport, setFormTripReport] = useState<string>("");
  const [businessCardFile, setBusinessCardFile] = useState<File | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [mileageRate, setMileageRate] = useState<number>(0.8);
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

  const [showTripModal, setShowTripModal] = useState(false);
  const [fromAddress, setFromAddress] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");
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

  const [showTravelModal, setShowTravelModal] = useState(false);
  const [formAirfare, setFormAirfare] = useState<string>("0.00");
  const [formAirportTax, setFormAirportTax] = useState<string>("0.00");
  const [formCountry, setFormCountry] = useState<string>("");
  const [formLocation, setFormLocation] = useState<string>("");
  const [formTravelParking, setFormTravelParking] = useState<string>("0.00");
  const [formTravelToll, setFormTravelToll] = useState<string>("0.00");
  const [formTransportation, setFormTransportation] = useState<string>("0.00");
  const [formHotel, setFormHotel] = useState<string>("0.00");
  const [formMealAllowance, setFormMealAllowance] = useState<string>("0.00");
  const [formTravelEntertainment, setFormTravelEntertainment] =
    useState<string>("0.00");
  const [formLaundry, setFormLaundry] = useState<string>("0.00");
  const [formTravelOthers, setFormTravelOthers] = useState<string>("0.00");

  const [isSaving, setIsSaving] = useState(false);

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

  // Effect 1: Filter trips when allUserTrips or formDate changes (without resetting addedTrips)
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
    // Do NOT reset addedTrips here
  }, [allUserTrips, formDate]);

  // Effect 2: When date changes, clear the added trips list (since they belong to a different day)
  useEffect(() => {
    setAddedTrips([]);
    setDistance("0.00");
  }, [formDate]);

  // Total distance from added trips
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
    const unsubscribe = onSnapshot(
      doc(db, "config", "7HTZfcBtebPsm0zlZB3c"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.mileage_rate) setMileageRate(data.mileage_rate);
          if (data.office_coordinates) {
            setOfficeCoords({
              lat: data.office_coordinates.latitude,
              lng: data.office_coordinates.longitude,
            });
          }
        }
      },
    );
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
    const { fromTime, toTime } = getOverallTimes();
    setFormFromTime(fromTime);
    setFormToTime(toTime);
  }, [addedTrips]);

  const handleAddTrip = (tripId?: string) => {
    console.log("Handle add trip");
    console.log(tripId);
    const idToAdd = tripId || selectedTripId;
    if (!idToAdd) {
      console.log(idToAdd);
      console.log("No Trip");
      return;
    }
    const tripToAdd = tripsForSelectedDate.find((t) => t.id === idToAdd);
    console.log(tripToAdd);
    if (tripToAdd && !addedTrips.some((t) => t.id === tripToAdd.id)) {
      console.log(tripToAdd);
      console.log("Adding trip");
      setAddedTrips((prev) => [...prev, tripToAdd]);
      setSelectedTripId("");
    } else if (tripToAdd) {
      alert("This trip has already been added.");
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

  const getTotalToll = () => {
    return addedTrips.reduce(
      (sum, trip) => sum + (parseFloat(trip.toll) || 0),
      0,
    );
  };

  const calculateToll = () => getTotalToll().toFixed(2);

  const calculateCost = () => {
    const travelCost = getTotalMileage();
    const parking = parseFloat(formParking) || 0;
    //const toll = getTotalToll();
    const toll = parseFloat(formToll);
    const expense = parseFloat(formOtherExpense) || 0;
    return (travelCost + parking + toll + expense).toFixed(2);
  };

  const toTimeString = (value: any): string | null => {
    if (!value) return null;
    // If it's a Firestore Timestamp (has toDate method)
    if (typeof value.toDate === "function") {
      const date = value.toDate();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    // If it's a string in HH:MM format
    if (typeof value === "string" && value.match(/^\d{2}:\d{2}$/)) {
      return value;
    }
    // If it's a Date object
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
  const timeStringToDate = (timeString: string): Date | null => {
    if (!formDate || !timeString) return null;
    const [year, month, day] = formDate.split("-").map(Number);
    const [hours, minutes] = timeString.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0);
  };

  // Convert Date object to time string "HH:MM" for the input value
  const dateToTimeString = (date: Date | null): string => {
    if (!date) return "";
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatDisplayTime = (date: Date | null) => {
    if (!date) return "Select time";
    const time24 = toTimeString(date) ?? ""; // assuming toTimeString works with Date
    return to12HourTime(time24);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return dateString.split("-").reverse().join("-");
  };

  const formatTripTime = (timestamp: Timestamp | undefined | null): string => {
    if (!timestamp || typeof timestamp.toDate !== "function") {
      return "--:--";
    }

    return timestamp.toDate().toLocaleTimeString("en-US", {
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

  const updateMileageRate = async () => {
    const configId = process.env.EXPO_PUBLIC_FIREBASE_CONFIG_ID;
    if (!configId) return;
    const docRef = doc(db, "config", configId);
    try {
      await updateDoc(docRef, { mileage_rate: formMileageRate });
      alert("Rate updated successfully!");
    } catch (error) {
      console.error(error);
    }
  };

  const getRouteImageUrl = async (origin, destination) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${apiKey}`;

    const response = await fetch(directionsUrl);
    const data = await response.json();

    if (data.status !== "OK" || !data.routes[0]) {
      throw new Error("Failed to fetch route data");
    }

    const routePolyline = data.routes[0].overview_polyline.points;
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&path=enc:${routePolyline}&markers=color:green|label:S|${origin.lat},${origin.lng}&markers=color:red|label:E|${destination.lat},${destination.lng}&key=${apiKey}`;

    return staticMapUrl;
  };

  const fetchTollCost = async (
    origin: { lat: number; lng: number },
    dest: { lat: number; lng: number },
  ): Promise<number> => {
    try {
      const response = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
            "X-Goog-FieldMask": "routes.travelAdvisory.tollInfo",
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: { latitude: origin.lat, longitude: origin.lng },
              },
            },
            destination: {
              location: { latLng: { latitude: dest.lat, longitude: dest.lng } },
            },
            travelMode: "DRIVE",
            extraComputations: ["TOLLS"],
            routeModifiers: { vehicleInfo: { emissionType: "GASOLINE" } },
          }),
        },
      );

      const data = await response.json();
      const tollInfo = data.routes?.[0]?.travelAdvisory?.tollInfo;
      if (tollInfo?.estimatedPrice?.length > 0) {
        const price = tollInfo.estimatedPrice[0];
        return (price.units ?? 0) + (price.nanos ?? 0) / 1e9;
      }
      return 0;
    } catch (error) {
      console.error("Toll fetch error:", error);
      return 0;
    }
  };

  function getHaversineDistance(
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number },
  ) {
    const R = 6371;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

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

  const getDrivingDistance = async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<{ km: number; text: string; duration: string } | null> => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Missing Google Maps API key");
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log("Full API response:", data);

      if (data.status === "OK") {
        const element = data.rows[0].elements[0];
        if (element.status === "OK") {
          return {
            km: element.distance.value / 1000,
            text: element.distance.text,
            duration: element.duration.text,
          };
        } else {
          console.warn("No route:", element.status);
          return null;
        }
      } else {
        console.error("Distance API error:", data.status);
        return null;
      }
    } catch (error) {
      console.error("Network error:", error);
      return null;
    }
  };

  const handleUpdateHome = async (home: boolean) => {
    console.log(home);
    setFormGoingHome(home);
    if (home) {
      if (homeCoords) {
        console.log("home coords");
        console.log(homeCoords);
        console.log(homeCoords.lat);
        console.log(homeCoords.lng);
        let homeAddress = await getAddressFromCoords(
          homeCoords.lat,
          homeCoords.lng,
        );
        console.log(homeAddress);
        setToAddress(homeAddress);
        setDestCoord(homeCoords);
        console.log(homeAddress);
        console.log(destCoord);
      }
    } else {
      setToAddress("");
    }
  };

  const saveTrip = async () => {
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
      let subDistance = getHaversineDistance(originCoord, destCoord);
      let subToll = await fetchTollCost(originCoord, destCoord);
      if (formGoingHome) {
        const distToCurrent = getHaversineDistance(originCoord, destCoord);
        const distToOffice = getHaversineDistance(
          originCoord,
          officeCoords || { lat: 0, lng: 0 },
        );

        if (distToOffice < distToCurrent) {
          console.log(`Route Comparison: Using Current.`);
        } else {
          console.log(`Route Comparison: Using Office.`);
          subDistance = parseFloat(distToOffice.toFixed(2));
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
        }
      }
      //const distanceData = getHaversineDistance(originCoord, destCoord);
      if (!subDistance) {
        console.log("from", originCoord, "to", destCoord);
        console.log("from", fromAddress, "to", toAddress);
        alert("Could not calculate driving distance. Please try again.");
        return;
      }

      let routeImageUrl = "";
      try {
        routeImageUrl = await getRouteImageUrl(originCoord, destCoord);
      } catch (imageError) {
        console.error("Error generating route image:", imageError);
      }

      let mileage = subDistance * mileageRate;

      const tripToSave = {
        user_id: userId,
        from_address: fromAddress,
        to_address: toAddress,
        distance: parseFloat(subDistance.toFixed(2)),
        mileage: parseFloat(mileage.toFixed(2)),
        toll: parseFloat(subToll.toFixed(2)),
        total: (mileage + subToll).toFixed(2),
        remark: formRemark.trim() || "",
        from_time: formTripFromTime,
        to_time: formTripToTime,
        to_home: formGoingHome,
        route_image_url: routeImageUrl,
        date: formDate,
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

      // Add to addedTrips directly
      setAddedTrips((prev) => [...prev, newTrip]);

      // Reset the trip form and close modal
      resetTripForm();
      setShowTripModal(false);
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save trip.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetTripForm = () => {
    setFromAddress("");
    setToAddress("");
    setFormRemark("");
    setFormTripFromTime(null);
    setFormTripToTime(null);
    setFormGoingHome(false);
  };

  const saveTravel = async () => {
    console.log("saveTravelToFirestore");
    resetTravelForm();
  };

  const resetTravelForm = () => {
    console.log("resetTravelForm");
  };

  const handleSubmit = async () => {
    const dist = getDistanceValue();

    const otherExpenseValidation =
      parseFloat(formOtherExpense) !== 0 && !formOtherExpenseType;

    if (parseFloat(formOtherExpense) === 0) {
      setFormOtherExpenseType("");
    }

    if (
      !formPurpose.trim() ||
      !formDate ||
      !formContactNumber.trim() ||
      !formEmail.trim() ||
      !formName.trim() ||
      !formTripReport ||
      !formCompany.trim() ||
      otherExpenseValidation
    ) {
      alert("Please ensure all required fields are filled.");
      return;
    }

    try {
      let businessCardUrl = "";
      if (businessCardFile) {
        const storageRef = ref(
          storage,
          `business-cards/${Date.now()}_${businessCardFile.name}`,
        );
        const uploadResult = await uploadBytes(storageRef, businessCardFile);
        businessCardUrl = await getDownloadURL(uploadResult.ref);
      }

      const receiptUrls: string[] = [];
      for (const file of receiptFiles) {
        const storageRef = ref(
          storage,
          `receipts/${userId}/${Date.now()}_${file.name}`,
        );
        const uploadResult = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(uploadResult.ref);
        receiptUrls.push(url);
      }

      const { fromTime, toTime } = getOverallTimes();

      await addDoc(collection(db, "expenses"), {
        user_id: userId,
        user_name: username,
        date: formDate,
        purpose: formPurpose,
        company: formCompany,
        name: formName,
        contact_number: formContactNumber,
        email: formEmail,
        from_time: fromTime,
        to_time: toTime,
        duration: calculateDuration(),
        distance: dist,
        trip_report: formTripReport,
        business_card_url: businessCardUrl,
        receipt_urls: receiptUrls,
        parking: parseFloat(formParking),
        toll: parseFloat(formToll),
        mileage: parseFloat(calculateMileage()),
        expense: parseFloat(formOtherExpense),
        expense_purpose: formOtherExpenseType,
        cost: parseFloat(calculateCost()),
        type: 1, // 1 mileage, 2 general, 3 outstation
        approval_status: 0,
        created_at: serverTimestamp(),
        trip_ids: addedTrips.map((trip) => trip.id),
      });
      resetForm();
      alert("Expense submitted successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save expense.");
    }
  };

  const resetForm = () => {
    setFormPurpose("");
    setFormCompany("");
    setFormName("");
    setFormContactNumber("");
    setFormTripReport("");
    setFormParking("0.00");
    setAddedTrips([]);
    setFormParking("0.00");
    setFormToll("0.00");
    setFormOtherExpense("0.00");
    setFormOtherExpenseType("");
    setBusinessCardFile(null);
    setReceiptFiles([]);
    setFormEmail("");
  };

  const renderTripModal = () => (
    <Modal
      visible={isDropdownOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsDropdownOpen(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsDropdownOpen(false)}
      >
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
                No trips found for {formDate.split("-").reverse().join("-")}
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
      </TouchableOpacity>
    </Modal>
  );

  const fieldMessage = (
    <Text
      style={[{ fontSize: 14, fontWeight: "600", marginTop: 10, width: 500 }]}
    >
      Required fields in <Text style={{ color: "#2196F3" }}>blue</Text>.
    </Text>
  );

  return (
    <View style={styles.container}>
      <View style={styles.detailsContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Submit Travel Expense</Text>
            {fieldMessage}
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Date:</Text>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                style={htmlInputStyle}
              />
              {/* <Text style={styles.fieldLabel}>Select Trips:</Text> */}
              <View style={styles.dropdownInput}>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setIsDropdownOpen(true)}
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
              {renderTripModal()}

              <TouchableOpacity
                onPress={() => setShowTripModal(true)}
                style={[styles.dropdownInput, { marginLeft: 10 }]}
              >
                <Text style={styles.buttonText}>Add Trip</Text>
              </TouchableOpacity>
              <Modal
                animationType="fade"
                transparent={true}
                visible={showTripModal}
                statusBarTranslucent={true}
                onRequestClose={() => !isSaving && setShowTripModal(false)}
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
                            style={[
                              styles.modalSubtitle,
                              styles.fieldLabelMandatory,
                            ]}
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
                          />
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
                            disabled={formGoingHome}
                          />
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
                              setFormTripFromTime(
                                timeStringToDate(e.target.value),
                              )
                            }
                            style={styles.timeInput}
                            disabled={isSaving}
                          />

                          <Text
                            style={[
                              styles.modalSubtitle,
                              styles.fieldLabelMandatory,
                            ]}
                          >
                            Arrival Time:
                          </Text>
                          <input
                            type="time"
                            value={dateToTimeString(formTripToTime)}
                            onChange={(e) =>
                              setFormTripToTime(
                                timeStringToDate(e.target.value),
                              )
                            }
                            style={styles.timeInput}
                            disabled={isSaving}
                          />

                          <Text style={styles.modalSubtitle}>Going Home:</Text>
                          <Switch
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor="#2196F3"
                            ios_backgroundColor="#3e3e3e"
                            value={formGoingHome}
                            onValueChange={(newValue) =>
                              handleUpdateHome(newValue)
                            }
                          />
                          <Text
                            style={[
                              styles.modalSubtitle,
                              styles.fieldLabelMandatory,
                            ]}
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
                              setShowTripModal(false);
                              resetTripForm();
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
            {/* <View style={[styles.inputRow, { marginTop: 10 }]}>
              <TouchableOpacity
                onPress={() => setShowTravelModal(true)}
                style={[styles.dropdownInput, { marginLeft: 10 }]}
              >
                <Text style={styles.buttonText}>Add Travel</Text>
              </TouchableOpacity>
              <Modal
                animationType="fade"
                transparent={true}
                visible={showTravelModal}
                statusBarTranslucent={true}
                onRequestClose={() => !isSaving && setShowTravelModal(false)}
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
                        <Text style={styles.modalTitle}>Add Travel</Text>

                        <View style={styles.formGroup}>
                          <Text style={styles.modalSubtitle}>Date:</Text>
                          <Text style={styles.fieldValue}>
                            {formatDate(formDate)}
                          </Text>
                          <Text>Country:</Text>
                          <TextInput
                            style={styles.webTextInput}
                            placeholder="Enter Country"
                            placeholderTextColor="#999999"
                            value={formCountry}
                            onChangeText={setFormCountry}
                            editable={!isSaving}
                            keyboardType="default"
                          />
                          <Text>Location:</Text>
                          <TextInput
                            style={styles.webTextInput}
                            placeholder="Enter Location"
                            placeholderTextColor="#999999"
                            value={formLocation}
                            onChangeText={setFormLocation}
                            editable={!isSaving}
                            keyboardType="default"
                          />
                          <Text style={styles.modalSubtitle}>
                            Airfare (RM):
                          </Text>
                          <TextInput
                            value={formAirfare}
                            onChangeText={setFormAirfare}
                            keyboardType="numeric"
                            style={styles.webTextInput}
                          />
                          <Text style={styles.modalSubtitle}>
                            Airport Tax (RM):
                          </Text>
                          <TextInput
                            value={formAirportTax}
                            onChangeText={setFormAirportTax}
                            keyboardType="numeric"
                            style={styles.webTextInput}
                          />
                          <Text style={styles.modalSubtitle}>
                            Parking (RM):
                          </Text>
                          <TextInput
                            value={formTravelParking}
                            onChangeText={setFormTravelParking}
                            keyboardType="numeric"
                            style={styles.webTextInput}
                          />
                          <Text style={styles.modalSubtitle}>Toll (RM):</Text>
                          <TextInput
                            value={formTravelToll}
                            onChangeText={setFormTravelToll}
                            keyboardType="numeric"
                            style={styles.webTextInput}
                          />
                          <Text style={styles.modalSubtitle}>
                            Transportation (RM):
                          </Text>
                          <TextInput
                            value={formTransportation}
                            onChangeText={setFormTransportation}
                            keyboardType="numeric"
                            style={styles.webTextInput}
                          />
                          <Text style={styles.modalSubtitle}>Hotel (RM):</Text>
                          <TextInput
                            value={formHotel}
                            onChangeText={setFormHotel}
                            keyboardType="numeric"
                            style={styles.webTextInput}
                          />
                          <Text style={styles.modalSubtitle}>
                            Meal Allowance (RM):
                          </Text>
                          <TextInput
                            value={formMealAllowance}
                            onChangeText={setFormMealAllowance}
                            keyboardType="numeric"
                            style={styles.webTextInput}
                          />
                          <Text style={styles.modalSubtitle}>
                            Entertainment (RM):
                          </Text>
                          <TextInput
                            value={formTravelEntertainment}
                            onChangeText={setFormTravelEntertainment}
                            keyboardType="numeric"
                            style={styles.webTextInput}
                          />
                          <Text style={styles.modalSubtitle}>
                            Laundry (RM):
                          </Text>
                          <TextInput
                            value={formLaundry}
                            onChangeText={setFormLaundry}
                            keyboardType="numeric"
                            style={styles.webTextInput}
                          />
                          <Text style={styles.modalSubtitle}>Others (RM):</Text>
                          <TextInput
                            value={formTravelOthers}
                            onChangeText={setFormTravelOthers}
                            keyboardType="numeric"
                            style={styles.webTextInput}
                          />
                        </View>

                        <View style={styles.buttonRow}>
                          <TouchableOpacity
                            style={[styles.dialogButton, styles.cancelButton]}
                            onPress={() => {
                              setShowTravelModal(false);
                              resetTravelForm();
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
                            onPress={saveTravel}
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
            </View> */}
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Distance:</Text>
              <Text style={styles.fieldValue}>{distance} km</Text>
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                Purpose:
              </Text>
              <select
                value={formPurpose}
                onChange={(e) => setFormPurpose(e.target.value)}
                style={htmlSelectStyle}
              >
                <option value="">Select a purpose...</option>
                <option value="Application support">Application support</option>
                <option value="Attending seminar/training">
                  Attending seminar/training
                </option>
                <option value="Breakfast/Lunch/Dinner meeting">
                  Breakfast/Lunch/Dinner meeting
                </option>
                <option value="Documents submission">
                  Documents submission
                </option>
                <option value="Door knocking">Door knocking</option>
                <option value="Meeting and follow-up">
                  Meeting and follow-up
                </option>
                <option value="Presentation">Presentation</option>
                <option value="Service and support">Service and support</option>
                <option value="Site inspection">Site inspection</option>
                <option value="Site visitation">Site visitation</option>
              </select>
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                Company/Site:
              </Text>
              <TextInput
                value={formCompany}
                onChangeText={setFormCompany}
                style={styles.webTextInput}
                placeholder="Company/Site"
              />
              <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                Name:
              </Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                style={styles.webTextInput}
                placeholder="Name"
              />
              <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                Contact:
              </Text>
              <TextInput
                value={formContactNumber}
                onChangeText={(text) =>
                  setFormContactNumber(text.replace(/[^0-9]/g, ""))
                }
                style={styles.webTextInput}
                placeholder="Contact Number"
              />
              <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                Email:
              </Text>
              <TextInput
                value={formEmail}
                onChangeText={setFormEmail}
                style={styles.webTextInput}
                placeholder="Email"
                keyboardType="email-address"
              />
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Start Trip Time:</Text>
              <Text style={styles.fieldValue}>
                {to12HourTime(formFromTime) || "N/A"}
              </Text>
              <Text style={styles.fieldLabel}>End Trip Time:</Text>
              <Text style={styles.fieldValue}>
                {to12HourTime(formToTime) || "N/A"}
              </Text>
              <Text style={styles.fieldLabel}>Duration:</Text>
              <Text style={styles.fieldValue}>{calculateDuration()}</Text>
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Mileage (RM):</Text>
              <Text style={styles.fieldValue}>RM {calculateMileage()}</Text>
              <Text style={styles.fieldLabel}>Toll (RM):</Text>
              {/* <Text style={styles.fieldValue}>RM {calculateToll()}</Text> */}
              <TextInput
                value={formToll}
                onChangeText={setFormToll}
                keyboardType="numeric"
                style={styles.webTextInput}
              />
              <Text style={styles.fieldLabel}>Parking (RM):</Text>
              <TextInput
                value={formParking}
                onChangeText={setFormParking}
                keyboardType="numeric"
                style={styles.webTextInput}
              />
              <Text style={styles.fieldLabel}>Cost:</Text>
              <Text style={styles.fieldValue}>RM {calculateCost()}</Text>
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Other Expenses (RM):</Text>
              <TextInput
                value={formOtherExpense}
                onChangeText={setFormOtherExpense}
                keyboardType="numeric"
                style={styles.webTextInput}
              />

              <select
                value={formOtherExpenseType}
                onChange={(e) => setFormOtherExpenseType(e.target.value)}
                style={htmlSelectStyle}
              >
                <option value="">Select a purpose...</option>
                <option value="Meal with customer">Meal with customer</option>
                <option value="Meal with supplier">Meal with supplier</option>
                <option value="Purchase of goods">Purchase of goods</option>
                <option value="Staff benefits">Staff benefits</option>
                <option value="Others">Others</option>
              </select>
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
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
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Business Card:</Text>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files && setBusinessCardFile(e.target.files[0])
                }
                style={htmlInputStyle}
              />
            </View>
            {/* <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Receipts:</Text>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setReceiptFiles(Array.from(e.target.files));
                  }
                }}
                style={htmlInputStyle}
              />
            </View>
            {receiptFiles.length > 0 && (
              <View style={styles.receiptList}>
                <Text style={styles.receiptLabel}>Selected files:</Text>
                {receiptFiles.map((file, idx) => (
                  <Text key={idx} style={styles.receiptFileName}>
                    {file.name}
                  </Text>
                ))}
              </View>
            )} */}
            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.button}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Submit Expense</Text>
              )}
            </TouchableOpacity>
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

const styles = StyleSheet.create({
  boldLabel: { fontWeight: "bold", color: "#333" },
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
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  fieldLabel: { fontSize: 14, fontWeight: "600", width: 120 },
  fieldLabelMandatory: { color: "#2196F3" },
  fieldValue: { fontSize: 14, flex: 1 },
  button: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    maxWidth: 200,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  formLabel: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
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
});
