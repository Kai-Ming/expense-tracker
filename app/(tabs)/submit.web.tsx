import PlacesInput from "@/components/PlacesInput";
import { Text, View } from "@/components/Themed";
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
import { db, storage } from "../../firebaseConfig";

export default function SubmitExpenseWebScreen() {
  const [distance, setDistance] = useState<string>("0.00");
  const [formPurpose, setFormPurpose] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [formCompany, setFormCompany] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formContactNumber, setFormContactNumber] = useState<string>("");
  const [formFromTime, setFormFromTime] = useState<string>("");
  const [formToTime, setFormToTime] = useState<string>("");
  const [formParking, setFormParking] = useState<string>("0.00");
  const [formToll, setFormToll] = useState<string>("0.00");
  const [formTripReport, setFormTripReport] = useState<string>("");
  const [businessCardFile, setBusinessCardFile] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [mileageRate, setMileageRate] = useState<number>(0.8);
  const [formMileageRate, setFormMileageRate] = useState<number>(0.8);
  const [allUserTrips, setAllUserTrips] = useState<any[]>([]);
  const [tripsForSelectedDate, setTripsForSelectedDate] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [addedTrips, setAddedTrips] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [fromAddress, setFromAddress] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");
  const [formGoingHome, setFormGoingHome] = useState<boolean>(false);
  const [formTripFromTime, setFormTripFromTime] = useState<string>("");
  const [formTripToTime, setFormTripToTime] = useState<string>("");
  const [formRemark, setFormRemark] = useState<string>("");
  const [originCoord, setOriginCoord] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [destCoord, setDestCoord] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

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

  // Filter trips by selected date
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
    setAddedTrips([]);
    setDistance("0.00");
  }, [allUserTrips, formDate]);

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
          } else {
            setUsername(user.displayName || "User");
          }
        } catch (error) {
          console.error("Error fetching user doc:", error);
          setUsername("");
        }
      } else {
        setUserId(null);
        setUsername("");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddTrip = (tripId?: string) => {
    const idToAdd = tripId || selectedTripId;
    if (!idToAdd) return;
    const tripToAdd = tripsForSelectedDate.find((t) => t.id === idToAdd);
    if (tripToAdd && !addedTrips.some((t) => t.id === tripToAdd.id)) {
      setAddedTrips((prev) => [...prev, tripToAdd]);
      setSelectedTripId(""); // clear selection after adding
    } else if (tripToAdd) {
      alert("This trip has already been added.");
    }
  };

  const handleRemoveTrip = (tripId: string) => {
    setAddedTrips((prev) => prev.filter((t) => t.id !== tripId));
  };

  const getDistanceValue = () =>
    parseFloat(distance.replace(/[^0-9.]/g, "")) || 0;
  const calculateMileage = () => (getDistanceValue() * mileageRate).toFixed(2);
  const calculateCost = () => {
    const travelCost = getDistanceValue() * mileageRate;
    const parking = parseFloat(formParking) || 0;
    const toll = parseFloat(formToll) || 0;
    return (travelCost + parking + toll).toFixed(2);
  };
  const calculateDuration = () => {
    if (!formFromTime || !formToTime) return "0h 0m";
    const [h1, m1] = formFromTime.split(":").map(Number);
    const [h2, m2] = formToTime.split(":").map(Number);
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

    // Get the encoded polyline for the entire route
    const routePolyline = data.routes[0].overview_polyline.points;

    // Construct the static map URL with the encoded path
    // The 'enc:' prefix tells the Static API to decode the polyline[reference:0]
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
            km: element.distance.value / 1000, // meters → km
            text: element.distance.text, // e.g. "12.3 km"
            duration: element.duration.text, // e.g. "25 mins"
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

  const saveTripToFirestore = async () => {
    // Validation
    if (!fromAddress.trim() || !toAddress.trim()) {
      alert("Please fill in both 'From' and 'To' addresses.");
      return;
    }
    if (!originCoord || !destCoord) {
      alert("Please select valid locations from the suggestions.");
      return;
    }
    if (!userId) {
      alert("You must be logged in.");
      return;
    }

    setIsSaving(true);

    try {
      const distanceData = await getDrivingDistance(originCoord, destCoord);
      if (!distanceData) {
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
        // Continue saving even if image generation fails, but log the error.
      }

      let mileage = distanceData.km * mileageRate;
      let toll = await fetchTollCost(originCoord, destCoord);

      // Prepare trip document
      const tripToSave = {
        user_id: userId,
        from_address: fromAddress,
        to_address: toAddress,
        distance: distanceData.km.toFixed(2),
        mileage: mileage.toFixed(2),
        toll: toll.toFixed(2),
        total: (mileage + toll).toFixed(2),
        remark: formRemark.trim() || "",
        from_time: formTripFromTime,
        to_time: formTripToTime,
        to_home: formGoingHome,
        route_image_url: routeImageUrl,
        date: formDate,
        created_at: serverTimestamp(),
      };

      await addDoc(collection(db, "trips"), tripToSave);

      // Reset modal and form fields
      setFormDate("");
      setFormTripFromTime("");
      setFormTripToTime("");
      setFormGoingHome(false);
      setShowModal(false);
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save trip.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    const dist = getDistanceValue();
    if (dist === 0 || !formPurpose.trim() || !formDate) {
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

      await addDoc(collection(db, "expenses"), {
        user_id: userId,
        user_name: username,
        date: formDate,
        purpose: formPurpose,
        company: formCompany,
        name: formName,
        contact_number: formContactNumber,
        from_time: formFromTime,
        to_time: formToTime,
        duration: calculateDuration(),
        distance: dist,
        trip_report: formTripReport,
        business_card_url: businessCardUrl,
        parking: parseFloat(formParking),
        toll: parseFloat(formToll),
        mileage: parseFloat(calculateMileage()),
        cost: parseFloat(calculateCost()),
        type: 1,
        approval_status: 0,
        created_at: serverTimestamp(),
        // 🔹 NEW: store the list of trip IDs that were added
        trip_ids: addedTrips.map((trip) => trip.id),
      });
      alert("Expense submitted successfully!");
      // Optionally reset the form or clear addedTrips
      // setAddedTrips([]);
      // setSelectedTripId("");
    } catch (e) {
      console.error(e);
      alert("Failed to save expense.");
    }
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
            <Text style={styles.modalTitle}>Select a Trip</Text>
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
            {tripsForSelectedDate.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={styles.modalTripItem}
                onPress={() => {
                  setSelectedTripId(trip.id);
                  setIsDropdownOpen(false);
                  handleAddTrip(trip.id);
                }}
              >
                <View style={styles.modalTripHeader}>
                  <Text style={styles.timeText}>
                    {trip.created_at?.toDate().toLocaleTimeString()}
                  </Text>
                  <Text style={styles.distanceText}>
                    {(parseFloat(trip.distance) || 0).toFixed(2)} km
                  </Text>
                </View>
                <Text style={styles.addressText}>
                  <Text style={styles.boldLabel}>Remark: </Text>
                  {trip.remark || "No Remark"}
                </Text>
                <Text style={styles.addressText}>
                  <Text style={styles.boldLabel}>From: </Text>
                  {trip.from_address}
                </Text>
                <Text style={styles.addressText}>
                  <Text style={styles.boldLabel}>To: </Text>
                  {trip.to_address}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.detailsContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Submit Travel Expense</Text>

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Date:</Text>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                style={htmlInputStyle}
              />
            </View>

            {/* <TouchableOpacity
              onPress={() => setShowModal(true)}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Add Trip</Text>
            </TouchableOpacity> */}
            <Modal
              animationType="fade"
              transparent={true}
              visible={showModal}
              statusBarTranslucent={true}
              onRequestClose={() => !isSaving && setShowModal(false)}
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
                        <Text style={styles.modalSubtitle}>
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
                        <Text style={styles.modalSubtitle}>
                          To (Destination):
                        </Text>
                        <PlacesInput
                          value={toAddress}
                          placeholder="Search destination…"
                          onPlaceSelected={(address, location) => {
                            setToAddress(address);
                            setDestCoord(location);
                          }}
                        />

                        <Text style={styles.modalSubtitle}>Going Home:</Text>
                        <Switch
                          trackColor={{ false: "#767577", true: "#81b0ff" }}
                          thumbColor="#2196F3"
                          ios_backgroundColor="#3e3e3e"
                          value={formGoingHome}
                          onValueChange={(newValue) =>
                            setFormGoingHome(newValue)
                          }
                        />
                        <Text style={styles.modalSubtitle}>
                          Remark (Optional):
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
                          onPress={() => setShowModal(false)}
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
                          onPress={saveTripToFirestore}
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

            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Select Trips:</Text>
              <View style={styles.dropdownInput}>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setIsDropdownOpen(true)}
                >
                  <Text style={styles.selectedText}>
                    {selectedTripId
                      ? (() => {
                          const selected = tripsForSelectedDate.find(
                            (t) => t.id === selectedTripId,
                          );
                          return selected
                            ? `${selected.remark || "No Remark"} (${(parseFloat(selected.distance) || 0).toFixed(2)} km)`
                            : "Click to Select";
                        })()
                      : tripsForSelectedDate.length > 0
                        ? "Click to Select"
                        : "No Trips on this Day"}
                  </Text>
                </TouchableOpacity>
                {/* <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddTrip}
                >
                  <Text style={styles.addButtonText}>Add Trip</Text>
                </TouchableOpacity> */}
              </View>

              {renderTripModal()}
            </View>
            {addedTrips.length > 0 && (
              <View style={styles.addedTripsContainer}>
                <Text style={styles.subsectionTitle}>Selected Trips:</Text>
                {addedTrips.map((trip) => (
                  <View key={trip.id} style={styles.addedTripItem}>
                    <View style={styles.addedTripDetails}>
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

            {/* Rest of the form fields (same as before) */}
            {/*<View style={styles.inputRow}>
              <Text style={styles.fieldLabel}>From:</Text>
              <TextInput
                placeholder="From..."
                value={fromAddress}
                onChangeText={setFromAddress}
                style={styles.webTextInput}
              />
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>To:</Text>
              <TextInput
                placeholder="To..."
                value={toAddress}
                onChangeText={setToAddress}
                style={styles.webTextInput}
              />
            </View>*/}
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Distance:</Text>
              {/* <TextInput
                placeholder="0.00"
                value={distance}
                editable={false}
                style={[styles.webTextInput, styles.disabledInput]}
              /> */}
              <Text style={styles.fieldValue}>{distance} km</Text>
              {/* <Text style={styles.autoNote}>
                (Auto-sum from selected trips)
              </Text> */}
            </View>

            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Purpose:</Text>
              <select
                value={formPurpose}
                onChange={(e) => setFormPurpose(e.target.value)}
                style={htmlSelectStyle}
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
              <Text style={styles.fieldLabel}>Company/Site:</Text>
              <TextInput
                value={formCompany}
                onChangeText={setFormCompany}
                style={styles.webTextInput}
                placeholder="Company/Site"
              />
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Name:</Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                style={styles.webTextInput}
                placeholder="Name"
              />
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Contact:</Text>
              <TextInput
                value={formContactNumber}
                onChangeText={(text) =>
                  setFormContactNumber(text.replace(/[^0-9]/g, ""))
                }
                style={styles.webTextInput}
                placeholder="Contact Number"
              />
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>From Time:</Text>
              <input
                type="time"
                value={formFromTime}
                onChange={(e) => setFormFromTime(e.target.value)}
                style={htmlInputStyle}
              />
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>To Time:</Text>
              <input
                type="time"
                value={formToTime}
                onChange={(e) => setFormToTime(e.target.value)}
                style={htmlInputStyle}
              />
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Duration:</Text>
              <Text style={styles.fieldValue}>{calculateDuration()}</Text>
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Parking (RM):</Text>
              <TextInput
                value={formParking}
                onChangeText={setFormParking}
                keyboardType="numeric"
                style={styles.webTextInput}
              />
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Toll (RM):</Text>
              <TextInput
                value={formToll}
                onChangeText={setFormToll}
                keyboardType="numeric"
                style={styles.webTextInput}
              />
            </View>
            <View
              style={[
                styles.inputRow,
                { marginTop: 10, alignItems: "flex-start" },
              ]}
            >
              <Text style={styles.fieldLabel}>Trip Report:</Text>
              <TextInput
                value={formTripReport}
                onChangeText={setFormTripReport}
                multiline
                style={[styles.webTextInput, { minHeight: 80 }]}
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
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Mileage:</Text>
              <Text style={styles.fieldValue}>RM {calculateMileage()}</Text>
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Cost:</Text>
              <Text style={styles.fieldValue}>RM {calculateCost()}</Text>
            </View>

            <TouchableOpacity onPress={handleSubmit} style={styles.button}>
              <Text style={styles.buttonText}>Submit Expense</Text>
            </TouchableOpacity>
          </View>

          {/* <View style={styles.mileageUpdateContainer}>
            <Text style={[styles.fieldLabel, { marginBottom: 10 }]}>
              Mileage Rate
            </Text>
            <select
              value={formMileageRate}
              onChange={(e) => setFormMileageRate(parseFloat(e.target.value))}
              style={htmlSelectStyle}
            >
              <option value={0.6}>0.6</option>
              <option value={0.8}>0.8</option>
              <option value={1.0}>1.0</option>
            </select>
            <TouchableOpacity
              onPress={updateMileageRate}
              style={[styles.button, { marginTop: 10 }]}
            >
              <Text style={styles.buttonText}>Update Rate</Text>
            </TouchableOpacity>
          </View> */}
        </ScrollView>
      </View>
    </View>
  );
}

const htmlInputStyle = {
  padding: "8px 12px",
  border: "1px solid #ccc",
  width: "100%",
  maxWidth: "400px",
  minHeight: "36px",
  boxSizing: "border-box" as const,
  backgroundColor: "#fff",
};
const htmlSelectStyle = { ...htmlInputStyle, height: "auto" };

const styles = StyleSheet.create({
  boldLabel: { fontWeight: "bold", color: "#333" },
  container: { flex: 1, backgroundColor: "#fff" },
  detailsContainer: { flex: 1 },
  scrollContent: { padding: 20 },
  formContainer: { flex: 1 },
  dropdownInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    justifyContent: "center",
    // Ensure consistent height with native select
    height: "auto",
    minHeight: 36,
    maxWidth: 400,
  },
  webTextInput: {
    flex: 1,
    maxWidth: 400,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    zIndex: 1,
    position: "relative",
  },
  disabledInput: { backgroundColor: "#f5f5f5", color: "#888" },
  autoNote: { marginLeft: 8, fontSize: 12, color: "#666", fontStyle: "italic" },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  fieldLabel: { fontSize: 14, fontWeight: "600", width: 120 },
  fieldValue: { fontSize: 14, flex: 1 },
  button: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 5,
    marginTop: 20,
    alignItems: "center",
    maxWidth: 200,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  formLabel: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  mileageUpdateContainer: {
    marginTop: 40,
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 20,
  },
  tripSelectionSection: {
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 12,
    backgroundColor: "#fafafa",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  dropdownAddRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dropdownButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#fff",
    backgroundColor: "#fff",
  },
  selectedText: { fontSize: 14, color: "#333" },
  addButton: {
    backgroundColor: "#4caf50",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  addButtonText: { color: "white", fontWeight: "bold" },
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
});
