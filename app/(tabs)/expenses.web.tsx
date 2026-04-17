import { Text, View } from "@/components/Themed";
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
    Modal,
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
  from_address: string;
  to_address: string;
  purpose: string;
  from_time?: string;
  to_time?: string;
  duration?: string;
  company: string;
  name: string;
  trip_report?: string;
  contact_number: string;
  parking: number;
  toll: number;
  mileage: number;
  cost: number;
  user_id: string;
  business_card_url?: string;
  route_image_url?: string;
  approval_status: number;
  createdAt: any;
}

export default function ExpensesWebScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [appliedStartDate, setAppliedStartDate] = useState<string>("");
  const [appliedEndDate, setAppliedEndDate] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Expense>>({});
  const [mileageRate, setMileageRate] = useState<number>(0.8);
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const [tempPoints, setTempPoints] = useState<
    (google.maps.LatLngLiteral | null)[]
  >([null, null]);
  const [tempPolyline, setTempPolyline] = useState<string | null>(null);
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const editInputARef = useRef<any>(null);
  const editInputBRef = useRef<any>(null);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);

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
        if (userDoc.exists()) setRole(userDoc.data().role);
      } else {
        setUserId(null);
        setRole(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "expenses"),
      where("user_id", "==", userId),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = [];
      querySnapshot.forEach((doc) =>
        expensesData.push({ id: doc.id, ...doc.data() } as Expense),
      );
      setExpenses(expensesData);
    });
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

  const filteredExpenses = expenses.filter((e) => {
    if (!e.date || (!appliedStartDate && !appliedEndDate)) return true;
    return (
      !(appliedStartDate && e.date < appliedStartDate) &&
      !(appliedEndDate && e.date > appliedEndDate)
    );
  });

  const handleEdit = async (expense: Expense) => {
    setEditingId(expense.id);
    setEditFormData({ ...expense });
    setTempPolyline(null);
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
    }
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

  const exportToHTML = () => {
    const filtered = expenses.filter(
      (e) =>
        (!appliedStartDate || e.date! >= appliedStartDate) &&
        (!appliedEndDate || e.date! <= appliedEndDate),
    );
    if (filtered.length === 0) return alert("No expenses found.");
    const rows = filtered
      .map(
        (e) =>
          `<tr><td>${e.date}</td><td>${e.from_address}</td><td>${e.to_address}</td><td>${e.purpose}</td><td>${e.company || ""}</td><td>${e.name}</td><td>${e.contact_number || ""}</td><td>${e.from_time || ""}</td><td>${e.to_time || ""}</td><td>${e.duration || ""}</td><td>${e.parking.toFixed(2)}</td><td>${e.toll.toFixed(2)}</td><td>${e.mileage.toFixed(2)}</td><td>${e.cost.toFixed(2)}</td></tr>`,
      )
      .join("");
    const totals = filtered.reduce(
      (acc, e) => ({
        p: acc.p + e.parking,
        t: acc.t + e.toll,
        m: acc.m + e.mileage,
        c: acc.c + e.cost,
      }),
      { p: 0, t: 0, m: 0, c: 0 },
    );
    const html = `<html><head><style>table{border-collapse:collapse;width:100%;font-size:12px;}th,td{border:1px solid #ddd;padding:8px;}th{background:#808080;color:white;}</style></head><body><h2>Expense Report - ${new Date().toLocaleDateString()}</h2><table><thead><tr><th>Date</th><th>From</th><th>To</th><th>Purpose</th><th>Site</th><th>Name</th><th>Contact</th><th>Start</th><th>End</th><th>Duration</th><th>Parking</th><th>Toll</th><th>Mileage</th><th>Cost</th></tr></thead><tbody>${rows}<tr style="font-weight:bold;background:#eee;"><td colspan="10" style="text-align:right">TOTAL:</td><td>${totals.p.toFixed(2)}</td><td>${totals.t.toFixed(2)}</td><td>${totals.m.toFixed(2)}</td><td>${totals.c.toFixed(2)}</td></tr></tbody></table></body></html>`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    link.download = `expenses_${new Date().toISOString().split("T")[0]}.html`;
    link.click();
  };

  const format12Hour = (t?: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${(h % 12 || 12).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  const renderItem = (item: Expense) => {
    const isExpanded = expandedId === item.id;
    const isEditing = editingId === item.id;
    return (
      <React.Fragment key={item.id}>
        <tr
          style={{ cursor: "pointer", borderBottom: "1px solid #eee" }}
          onClick={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <td style={webTableStyles.td}>{item.date || "N/A"}</td>
          <td style={webTableStyles.td}>
            {format12Hour(item.from_time)} - {format12Hour(item.to_time)} (
            {item.duration})
          </td>
          <td style={webTableStyles.td}>{item.purpose}</td>
          <td style={webTableStyles.td}>{item.company}</td>
          <td style={webTableStyles.td}>{item.name}</td>
          <td
            style={{
              ...webTableStyles.td,
              fontWeight: "bold",
              color: "#2196F3",
            }}
          >
            RM {(isEditing ? editFormData.cost || 0 : item.cost).toFixed(2)}
          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td
              colSpan={6}
              style={{ padding: "20px", backgroundColor: "#f9f9f9" }}
            >
              <View style={styles.expandedContent}>
                <View style={styles.section}>
                  <Text style={styles.descriptionLabel}>Route:</Text>
                  {isEditing ? (
                    <View style={{ backgroundColor: "transparent" }}>
                      <TextInput
                        ref={editInputARef}
                        style={styles.inlineInput}
                        value={editFormData.from_address}
                        onChangeText={(t) =>
                          setEditFormData({ ...editFormData, from_address: t })
                        }
                        placeholder="From"
                      />
                      <TextInput
                        ref={editInputBRef}
                        style={styles.inlineInput}
                        value={editFormData.to_address}
                        onChangeText={(t) =>
                          setEditFormData({ ...editFormData, to_address: t })
                        }
                        placeholder="To"
                      />
                    </View>
                  ) : (
                    <Text style={styles.descriptionText}>
                      {item.from_address} → {item.to_address}
                    </Text>
                  )}
                  <Text style={styles.descriptionLabel}>Purpose:</Text>
                  {isEditing ? (
                    <select
                      value={editFormData.purpose}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          purpose: e.target.value,
                        })
                      }
                      style={htmlSelectStyle}
                    >
                      <option value="" disabled>
                        Select...
                      </option>
                      {purposeList.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Text style={styles.descriptionText}>{item.purpose}</Text>
                  )}
                  <Text style={styles.descriptionLabel}>Parking & Toll:</Text>
                  {isEditing ? (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        backgroundColor: "transparent",
                      }}
                    >
                      <TextInput
                        style={styles.inlineInput}
                        value={editFormData.parking?.toString()}
                        onChangeText={(t) =>
                          setEditFormData((p) => ({
                            ...p,
                            parking: parseFloat(t) || 0,
                            cost:
                              (p.mileage || 0) +
                              (parseFloat(t) || 0) +
                              (p.toll || 0),
                          }))
                        }
                        keyboardType="numeric"
                        placeholder="Parking"
                      />
                      <TextInput
                        style={styles.inlineInput}
                        value={editFormData.toll?.toString()}
                        onChangeText={(t) =>
                          setEditFormData((p) => ({
                            ...p,
                            toll: parseFloat(t) || 0,
                            cost:
                              (p.mileage || 0) +
                              (p.parking || 0) +
                              (parseFloat(t) || 0),
                          }))
                        }
                        keyboardType="numeric"
                        placeholder="Toll"
                      />
                    </View>
                  ) : (
                    <Text style={styles.descriptionText}>
                      RM {item.parking.toFixed(2)} / RM {item.toll.toFixed(2)}
                    </Text>
                  )}
                </View>
                <View style={styles.actionButtonsContainer}>
                  {isEditing ? (
                    <>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={handleSaveEdit}
                      >
                        <Text style={styles.approveButtonText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => setEditingId(null)}
                      >
                        <Text style={styles.rejectButtonText}>Cancel</Text>
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
                    onPress={async () => {
                      if (window.confirm("Delete?"))
                        await deleteDoc(doc(db, "expenses", item.id));
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContent}>
        <View style={styles.reportSummaryCard}>
          <TouchableOpacity
            onPress={() => setIsDashboardVisible(!isDashboardVisible)}
            style={{ alignSelf: "flex-end", padding: 10 }}
          >
            <Text style={{ color: "#fff" }}>
              {isDashboardVisible ? "✕ Hide Filter" : "View Filter"}
            </Text>
          </TouchableOpacity>
          {isDashboardVisible && (
            <View style={{ padding: 20, backgroundColor: "transparent" }}>
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginBottom: 16,
                  backgroundColor: "transparent",
                }}
              >
                <TextInput
                  placeholder="Start: YYYY-MM-DD"
                  value={startDate}
                  onChangeText={setStartDate}
                  style={styles.filterInput}
                />
                <TextInput
                  placeholder="End: YYYY-MM-DD"
                  value={endDate}
                  onChangeText={setEndDate}
                  style={styles.filterInput}
                />
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={() => {
                    setAppliedStartDate(startDate);
                    setAppliedEndDate(endDate);
                  }}
                >
                  <Text>Apply</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={exportToHTML}
              >
                <Text style={styles.exportButtonText}>
                  Generate HTML Report
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <div style={webTableStyles.container}>
          <table style={webTableStyles.table}>
            <thead>
              <tr style={webTableStyles.headerRow}>
                <th style={webTableStyles.th}>Date</th>
                <th style={webTableStyles.th}>Time</th>
                <th style={webTableStyles.th}>Purpose</th>
                <th style={webTableStyles.th}>Company</th>
                <th style={webTableStyles.th}>Name</th>
                <th style={webTableStyles.th}>Cost</th>
              </tr>
            </thead>
            <tbody>{filteredExpenses.map(renderItem)}</tbody>
          </table>
        </div>
      </ScrollView>
      <Modal
        visible={!!selectedImage}
        transparent
        onRequestClose={() => setSelectedImage(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedImage(null)}
        >
          <Image
            source={{ uri: selectedImage! }}
            style={styles.fullImage}
            resizeMode="contain"
          />
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  expandedContent: { marginTop: 12, backgroundColor: "transparent" },
  descriptionLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "bold",
    marginTop: 8,
  },
  descriptionText: { fontSize: 14, color: "#444", marginBottom: 4 },
  section: { marginBottom: 16 },
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
