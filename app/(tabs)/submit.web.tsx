import { Text, View } from "@/components/Themed";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { db, storage } from "../../firebaseConfig";

export default function SubmitExpenseWebScreen() {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMap = useRef<google.maps.Map | null>(null);
  const markers = useRef<(google.maps.marker.AdvancedMarkerElement | null)[]>([
    null,
    null,
  ]);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(
    null,
  );
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  const [distance, setDistance] = useState<string | null>(null);
  const [points, setPoints] = useState<(google.maps.LatLngLiteral | null)[]>([
    null,
    null,
  ]);
  const [formPurpose, setFormPurpose] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [formCompany, setFormCompany] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formContactNumber, setFormContactNumber] = useState<string>("");
  const [fromAddress, setFromAddress] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");
  const [formFromTime, setFormFromTime] = useState<string>("");
  const [formToTime, setFormToTime] = useState<string>("");
  const [formParking, setFormParking] = useState<string>("0.00");
  const [formToll, setFormToll] = useState<string>("0.00");
  const [formTripSummary, setFormTripSummary] = useState<string>("");
  const [businessCardFile, setBusinessCardFile] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadScript = () => {
      if (!apiKey) {
        console.error("Google Maps API key is missing.");
        return;
      }
      if (window.google) {
        initMap();
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places,marker`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current) return;
      googleMap.current = new google.maps.Map(mapRef.current, {
        center: { lat: 3.0414, lng: 101.5461 },
        mapId: "DEMO_MAP_ID",
        zoom: 13,
      });
      directionsService.current = new google.maps.DirectionsService();
      directionsRenderer.current = new google.maps.DirectionsRenderer({
        map: googleMap.current,
        suppressMarkers: true,
      });
      geocoder.current = new google.maps.Geocoder();

      const setupAutocomplete = (
        input: HTMLInputElement | null,
        index: number,
      ) => {
        if (!input) return;
        const autocomplete = new google.maps.places.Autocomplete(input, {
          fields: ["geometry", "formatted_address"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.geometry?.location) {
            const latLng = place.geometry.location.toJSON();
            index === 0
              ? setFromAddress(place.formatted_address || "")
              : setToAddress(place.formatted_address || "");
            updatePoint(index, latLng);
            googleMap.current?.panTo(latLng);
          }
        });
      };
      setupAutocomplete(inputARef.current, 0);
      setupAutocomplete(inputBRef.current, 1);
    };

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });
    loadScript();
    return () => unsubscribe();
  }, []);

  const updatePoint = (index: number, latLng: google.maps.LatLngLiteral) => {
    if (!googleMap.current || !window.google?.maps?.marker) return;

    // Clear existing marker for this specific slot
    if (markers.current[index]) {
      markers.current[index]!.map = null;
    }

    // Create a PinElement for the label
    const pin = new google.maps.marker.PinElement({
      glyph: index === 0 ? "A" : "B",
    });

    markers.current[index] = new google.maps.marker.AdvancedMarkerElement({
      position: latLng,
      map: googleMap.current,
      content: pin.element,
    });

    setPoints((prev) => {
      const next = [...prev];
      next[index] = latLng;
      return next;
    });
  };

  const reverseGeocode = (latLng: google.maps.LatLngLiteral, index: number) => {
    if (!geocoder.current) return;
    geocoder.current.geocode({ location: latLng }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
        const address = results[0].formatted_address;
        if (index === 0 && inputARef.current) inputARef.current.value = address;
        if (index === 1 && inputBRef.current) inputBRef.current.value = address;
        index === 0
          ? setFromAddress(address || "")
          : setToAddress(address || "");
      }
    });
  };

  const resetAll = () => {
    markers.current.forEach((m) => {
      if (m) m.map = null;
    });
    markers.current = [null, null];
    directionsRenderer.current?.setDirections({ routes: [] });
    setPoints([null, null]);
    setDistance(null);
    setFormPurpose("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormCompany("");
    setFormName("");
    setFormContactNumber("");
    setFromAddress("");
    setToAddress("");
    setFormFromTime("");
    setFormToTime("");
    setFormParking("0.00");
    setFormToll("0.00");
    setFormTripSummary("");
    setBusinessCardFile(null);
    if (inputARef.current) inputARef.current.value = "";
    if (inputBRef.current) inputBRef.current.value = "";
  };

  // Separate Effect to handle calculation when points update
  useEffect(() => {
    if (points[0] && points[1]) {
      calculateDistance(
        points[0] as google.maps.LatLngLiteral,
        points[1] as google.maps.LatLngLiteral,
      );
      // Reset parking and toll when new points are set, assuming they might be route-dependent
      setFormParking("0.00");
      setFormToll("0.00");
    } else {
      // Clear directions if one point is removed
      directionsRenderer.current?.setDirections({ routes: [] });
      setDistance(null);
    }
  }, [points]);

  const calculateDistance = (
    p1: google.maps.LatLngLiteral,
    p2: google.maps.LatLngLiteral,
  ) => {
    if (!directionsService.current || !directionsRenderer.current) return;

    directionsService.current.route(
      {
        origin: p1,
        destination: p2,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.current?.setDirections(result);
          // Extract road distance text (e.g. "12.5 km")
          const routeDistance = result.routes[0].legs[0].distance?.text;
          setDistance(routeDistance || null);
        }
      },
    );
  };

  const mileage = 0.8;

  // Robust calculation that handles distance strings (removing commas and units)
  const calculateMileage = () => {
    return (getDistance() * mileage).toFixed(2);
  };
  const calculateCost = () => {
    const travelCost = getDistance() * mileage;
    const parking = parseFloat(formParking) || 0;
    const toll = parseFloat(formToll) || 0;
    return (travelCost + parking + toll).toFixed(2);
  };

  const calculateDuration = () => {
    if (!formFromTime || !formToTime) return "0h 0m";
    const [h1, m1] = formFromTime.split(":").map(Number);
    const [h2, m2] = formToTime.split(":").map(Number);
    let diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 0) diff += 1440; // Handle duration crossing midnight
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  const getDistance = () => {
    if (!distance) return 0.0;
    return parseFloat(distance.replace(/[^0-9.]/g, ""));
  };

  const handleSubmit = async () => {
    const dist = getDistance();
    const mileage = parseFloat(calculateMileage());
    const cost = parseFloat(calculateCost());
    if (
      dist === 0.0 ||
      !formPurpose.trim() ||
      !formDate ||
      !fromAddress ||
      !toAddress ||
      !formCompany ||
      !formName ||
      !formContactNumber.trim() ||
      !formFromTime ||
      !formToTime
    ) {
      alert("Please ensure both addresses and a purpose are provided.");
      return;
    }

    try {
      let businessCardUrl = "";
      if (businessCardFile) {
        console.log("Uploading to bucket:", storage.app.options.storageBucket);
        const storageRef = ref(
          storage,
          `business-cards/${Date.now()}_${businessCardFile.name}`,
        );
        const uploadResult = await uploadBytes(storageRef, businessCardFile);
        businessCardUrl = await getDownloadURL(uploadResult.ref);
      }

      const docRef = await addDoc(collection(db, "expenses"), {
        user_id: userId,
        date: formDate,
        purpose: formPurpose,
        from_address: fromAddress,
        to_address: toAddress,
        company: formCompany,
        name: formName,
        contact_number: formContactNumber,
        from_time: formFromTime,
        to_time: formToTime,
        duration: calculateDuration(),
        distance: dist,
        trip_summary: formTripSummary,
        business_card_url: businessCardUrl,
        parking: parseFloat(formParking),
        toll: parseFloat(formToll),
        mileage: mileage,
        cost: cost,
        type: 1,
        approval_status: 0,
        createdAt: serverTimestamp(),
      });
      setFormPurpose("");
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormCompany("");
      setFormName("");
      setFormContactNumber("");
      setFormFromTime("");
      setFormToTime("");
      setFromAddress("");
      setToAddress("");
      setBusinessCardFile(null);
      console.log(docRef.id);
      console.log(docRef);
      alert("Expense submitted successfully!");
    } catch (e) {
      if (e && typeof e === "object" && "code" in e) {
        console.error("Storage/Firestore Error Code:", e.code);
      }
      console.error("Full error object:", e);
      alert("Failed to save expense to database.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapWrapper}>
        <View style={styles.header}>
          <View style={styles.searchSection}>
            <input
              ref={inputARef}
              placeholder="From..."
              style={webStyles.input}
            />
            <input
              ref={inputBRef}
              placeholder="To..."
              style={webStyles.input}
            />
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.instructions}>
              {!points[0] && "Set Origin"}
              {points[0] && !points[1] && "Set Destination"}
              {points[0] && points[1] && `Road Distance: ${distance}`}
            </Text>

            {(points[0] || points[1]) && (
              <TouchableOpacity onPress={resetAll} style={styles.button}>
                <Text style={styles.buttonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* @ts-ignore */}
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      </View>

      <View style={styles.detailsContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Submit Travel Expense</Text>
            <View style={styles.inputRow}>
              <Text style={styles.fieldLabel}>From:</Text>
              <Text style={styles.fieldValue} numberOfLines={1}>
                {fromAddress || "Not set"}
              </Text>
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>To:</Text>
              <Text style={styles.fieldValue} numberOfLines={1}>
                {toAddress || "Not set"}
              </Text>
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Distance:</Text>
              <Text style={styles.fieldValue}>{getDistance()} km</Text>
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              {" "}
              {/* Changed to Purpose */}
              <Text style={styles.fieldLabel}>Purpose:</Text>
              <select
                value={formPurpose}
                onChange={(e) => setFormPurpose(e.target.value)}
                style={{
                  ...webStyles.input,
                  flex: 1,
                  maxWidth: 400,
                  marginBottom: 10,
                  height: "auto",
                  padding: "8px 12px",
                }}
              >
                <option value="" disabled>
                  Select a purpose...
                </option>
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
                <option value="Documents submission with meeting">
                  Documents submission with meeting
                </option>
                <option value="Door knocking">Door knocking</option>
                <option value="Goods delivery">Goods delivery</option>
                <option value="Initial meeting and introduction">
                  Initial meeting and introduction
                </option>
                <option value="Meeting and follow-up">
                  Meeting and follow-up
                </option>
                <option value="Presentation">Presentation</option>
                <option value="Product demonstration">
                  Product demonstration
                </option>
                <option value="Service and support">Service and support</option>
                <option value="Site inspection">Site inspection</option>
                <option value="Site survey">Site survey</option>
                <option value="Site visitation">Site visitation</option>
                <option value="Tea break meeting">Tea break meeting</option>
                <option value="Tender submission">Tender submission</option>
                <option value="Tender submission with meeting">
                  Tender submission with meeting
                </option>
                <option value="Training and commissioning">
                  Training and commissioning
                </option>
              </select>
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Comapany/Site:</Text>
              <input
                type="text"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                style={{
                  ...webStyles.input,
                  flex: 1,
                  maxWidth: 400,
                  marginBottom: 0,
                }}
                placeholder="Company/Site"
              />
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Name:</Text>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={{
                  ...webStyles.input,
                  flex: 1,
                  maxWidth: 400,
                  marginBottom: 0,
                }}
                placeholder="Name"
              />
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Contact:</Text>
              <input
                type="text"
                value={formContactNumber}
                onChange={(e) =>
                  setFormContactNumber(e.target.value.replace(/[^0-9]/g, ""))
                }
                style={{
                  ...webStyles.input,
                  flex: 1,
                  maxWidth: 400,
                  marginBottom: 0,
                }}
                placeholder="Contact Number"
              />
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Date:</Text>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                style={{
                  ...webStyles.input,
                  flex: 1,
                  maxWidth: 400,
                  marginBottom: 0,
                }}
              />
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>From Time:</Text>
              <input
                type="time"
                value={formFromTime} // e.g., "14:30"
                onChange={(e) => setFormFromTime(e.target.value)}
                style={{
                  ...webStyles.input,
                  flex: 1,
                  maxWidth: 400,
                  marginBottom: 0,
                }}
              />
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>To Time:</Text>
              <input
                type="time"
                value={formToTime}
                onChange={(e) => setFormToTime(e.target.value)}
                style={{
                  ...webStyles.input,
                  flex: 1,
                  maxWidth: 400,
                  marginBottom: 0,
                }}
              />
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Duration:</Text>
              <Text style={styles.fieldValue}>{calculateDuration()}</Text>
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Parking:</Text>
              <input
                type="number"
                value={parseFloat(formParking).toFixed(2)}
                onChange={(e) =>
                  setFormParking(
                    Math.max(0, parseFloat(e.target.value || "0")).toFixed(2),
                  )
                }
                style={{
                  ...webStyles.input,
                  flex: 1,
                  maxWidth: 400,
                  marginBottom: 0,
                }}
                step="0.01"
                placeholder="0.00"
              />
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Toll:</Text>
              <input
                type="number"
                value={parseFloat(formToll).toFixed(2)}
                onChange={(e) =>
                  setFormToll(
                    Math.max(0, parseFloat(e.target.value || "0")).toFixed(2),
                  )
                }
                style={{
                  ...webStyles.input,
                  flex: 1,
                  maxWidth: 400,
                  marginBottom: 0,
                }}
                step="0.01"
                placeholder="0.00"
              />
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Trip Summary:</Text>
              <textarea
                value={formTripSummary}
                onChange={(e) => setFormTripSummary(e.target.value)}
                style={{
                  ...webStyles.input,
                  flex: 1,
                  maxWidth: 400,
                  marginBottom: 0,
                  minHeight: 80,
                  fontFamily: "inherit",
                }}
                placeholder="Trip Summary"
              />
            </View>
            <View
              style={[styles.inputRow, { marginTop: 10, alignItems: "center" }]}
            >
              <Text style={styles.fieldLabel}>Business Card:</Text>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setBusinessCardFile(e.target.files[0]);
                  }
                }}
                style={{
                  ...webStyles.input,
                  flex: 1,
                  maxWidth: 400,
                  marginBottom: 0,
                }}
              />
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Mileage:</Text>
              <Text style={styles.fieldValue}>RM {calculateMileage()}</Text>
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Cost:</Text>
              <Text style={styles.fieldValue}>RM {calculateCost()}</Text>
            </View>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={
                getDistance() === 0 ||
                !formPurpose.trim() ||
                isNaN(parseFloat(formParking)) ||
                isNaN(parseFloat(formToll))
              }
              style={[
                styles.button,
                { marginTop: 10, alignSelf: "flex-start" },
                (getDistance() === 0 ||
                  !formPurpose.trim() ||
                  isNaN(parseFloat(formParking)) ||
                  isNaN(parseFloat(formToll))) && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.buttonText}>Submit Expense</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const webStyles = {
  input: {
    padding: "8px 12px",
    border: "1px solid #ccc",
    width: "100%",
    boxSizing: "border-box" as const,
    marginBottom: "8px",
    fontSize: "14px",
  },
};
const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row" },
  mapWrapper: { width: "50%", height: "100%" },
  scrollContent: { paddingBottom: 40 },
  header: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
    padding: 15,
    backgroundColor: "white",
    borderRadius: 8,
  },
  formContainer: { padding: 20 },
  formLabel: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  button: { backgroundColor: "#2196F3", padding: 10, borderRadius: 5 },
  buttonText: { color: "white" },
  searchSection: {
    marginBottom: 10,
    backgroundColor: "transparent",
  },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 10, // Added margin to separate from form
  },
  instructions: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 0, // Adjusted to 0, children will manage their own padding
    justifyContent: "flex-start",
  },
  detailsText: {
    color: "#999",
    fontSize: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    width: 90,
  },
  fieldValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
});
