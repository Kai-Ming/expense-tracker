import MapDisplay from "@/components/MapDisplay"; // Check if this should be { MapDisplay }
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
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
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { db } from "../../firebaseConfig"; // Assuming firebaseConfig is correctly set up

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
  approval_status: number;
  createdAt: any;
}

export default function ExpensesScreen() {
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
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        // Fetch role from Firestore users collection
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        }
      } else {
        setUserId(null);
        setRole(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      setExpenses([]);
      return;
    }

    const q = query(
      collection(db, "expenses"),
      where("user_id", "==", userId),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = [];
      querySnapshot.forEach((doc) => {
        expensesData.push({ id: doc.id, ...doc.data() } as Expense);
      });
      setExpenses(expensesData);
    });

    return () => unsubscribe();
  }, [userId]);

  const filteredExpenses = expenses.filter((e) => {
    if (!e.date) return true;
    if (!appliedStartDate && !appliedEndDate) return true;

    const dateVal = e.date;
    if (appliedStartDate && dateVal < appliedStartDate) return false;
    if (appliedEndDate && dateVal > appliedEndDate) return false;

    return true;
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

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditFormData({ ...expense });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const docRef = doc(db, "expenses", editingId);

      // Recalculate total cost
      const mileage = editFormData.mileage || 0;
      const parking = editFormData.parking || 0;
      const toll = editFormData.toll || 0;
      const updatedCost = mileage + parking + toll;

      let updatedDuration = editFormData.duration;
      if (editFormData.from_time && editFormData.to_time) {
        const [h1, m1] = editFormData.from_time.split(":").map(Number);
        const [h2, m2] = editFormData.to_time.split(":").map(Number);
        const totalMinutes = h2 * 60 + m2 - (h1 * 60 + m1);
        if (totalMinutes > 0) {
          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          updatedDuration = `${hours}h ${mins}m`;
        }
      }

      const updatedData = {
        ...editFormData,
        cost: updatedCost,
        duration: updatedDuration,
      };
      await updateDoc(docRef, updatedData);

      setEditingId(null);
      setEditFormData({});
    } catch (error) {
      console.error("Error updating expense:", error);
      Alert.alert("Error", "Failed to update expense.");
    }
  };

  const handleStatus = async (id: string, status: number) => {
    try {
      const docRef = doc(db, "expenses", id);
      await updateDoc(docRef, { approval_status: status });
    } catch (error) {
      console.error("Error approving expense:", error);
    }
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
        <td>${e.from_address}</td>
        <td>${e.to_address}</td>
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
        <td colspan="10" style="text-align: right;">TOTAL:</td>
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
        <p><strong>From:</strong> ${e.from_address}</p>
        <p><strong>To:</strong> ${e.to_address}</p>
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
        <React.Fragment>
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
              RM {item.cost.toFixed(2)}
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
                    <Text style={styles.descriptionText}>
                      {item.from_address} → {item.to_address}
                    </Text>
                    <Text style={styles.descriptionLabel}>Parking:</Text>
                    <Text style={styles.descriptionText}>
                      RM {item.parking.toFixed(2)}
                    </Text>
                    <Text style={styles.descriptionLabel}>Toll:</Text>
                    <Text style={styles.descriptionText}>
                      RM {item.toll.toFixed(2)}
                    </Text>
                    <Text style={styles.descriptionLabel}>Mileage:</Text>
                    <Text style={styles.descriptionText}>
                      RM {item.mileage.toFixed(2)}
                    </Text>
                    <Text style={styles.descriptionLabel}>Trip Report:</Text>
                    <Text style={styles.descriptionText}>
                      {item.trip_report || "N/A"}
                    </Text>
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
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
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
                  </View>
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
              <Text style={styles.descriptionLabel}>Route:</Text>
              {/* {isEditing ? (
                <View style={{ backgroundColor: "transparent" }}>
                  <TextInput
                    style={styles.inlineInput}
                    value={editFormData.from_address}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, from_address: text })
                    }
                    placeholder="From Address"
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                  <TextInput
                    style={styles.inlineInput}
                    value={editFormData.to_address}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, to_address: text })
                    }
                    placeholder="To Address"
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                </View>
              ) : (
                <Text style={styles.descriptionText}>
                  {item.from_address || "N/A"} → {item.to_address || "N/A"}
                </Text>
              )} */}
              <Text style={styles.descriptionText}>
                {item.from_address || "N/A"} → {item.to_address || "N/A"}
              </Text>

              <Text style={styles.descriptionLabel}>Time and Duration:</Text>
              {/* {isEditing ? (
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
              )} */}
              <Text style={styles.descriptionText}>
                {format12Hour(item.from_time)} - {format12Hour(item.to_time)} (
                {item.duration})
              </Text>

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

              {isEditing && (
                <>
                  <Text style={styles.descriptionLabel}>Company / Site:</Text>
                  <TextInput
                    style={styles.inlineInput}
                    value={editFormData.company}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, company: text })
                    }
                    placeholder="Company"
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                </>
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
                      setEditFormData({
                        ...editFormData,
                        toll: parseFloat(text) || 0,
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
                      setEditFormData({
                        ...editFormData,
                        parking: parseFloat(text) || 0,
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

  /* const renderItem = ({ item }: { item: Expense }) => {
    const isExpanded = expandedId === item.id;
    const isEditing = editingId === item.id;
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
              <Text style={styles.descriptionLabel}>Route:</Text>
              {isEditing ? (
                <View style={{ backgroundColor: "transparent" }}>
                  <TextInput
                    style={styles.inlineInput}
                    value={editFormData.from_address}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, from_address: text })
                    }
                    placeholder="From Address"
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                  <TextInput
                    style={styles.inlineInput}
                    value={editFormData.to_address}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, to_address: text })
                    }
                    placeholder="To Address"
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                </View>
              ) : (
                <Text style={styles.descriptionText}>
                  {item.from_address || "N/A"} → {item.to_address || "N/A"}
                </Text>
              )}
              <Text style={styles.descriptionText}>
                {item.from_address || "N/A"} → {item.to_address || "N/A"}
              </Text>

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
              <Text style={styles.descriptionText}>
                {format12Hour(item.from_time)} - {format12Hour(item.to_time)} (
                {item.duration})
              </Text>

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

              {isEditing && (
                <>
                  <Text style={styles.descriptionLabel}>Company / Site:</Text>
                  <TextInput
                    style={styles.inlineInput}
                    value={editFormData.company}
                    onChangeText={(text) =>
                      setEditFormData({ ...editFormData, company: text })
                    }
                    placeholder="Company"
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                </>
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
                      setEditFormData({
                        ...editFormData,
                        toll: parseFloat(text) || 0,
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
                      setEditFormData({
                        ...editFormData,
                        parking: parseFloat(text) || 0,
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
  }; */

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
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "none",
                      fontSize: "13px",
                      outline: "none",
                    }}
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
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "none",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
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
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}
                  >
                    Reset
                  </Text>
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
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {Platform.OS !== "web" && <MapDisplay />}
      {Platform.OS === "web" ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {renderHeader()}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "#fff",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", textAlign: "left" }}>
                <th style={webTableStyles.th}>Date</th>
                <th style={webTableStyles.th}>Time</th>
                <th style={webTableStyles.th}>Purpose</th>
                <th style={webTableStyles.th}>Company</th>
                <th style={webTableStyles.th}>Name</th>
                <th style={webTableStyles.th}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((item) => renderItem({ item }))}
            </tbody>
          </table>
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
  statusText: { fontSize: 14, fontWeight: "bold" },
  expandedContent: { marginTop: 12, backgroundColor: "transparent" },
  separator: { height: 1, backgroundColor: "#eee", marginBottom: 12 },
  descriptionLabel: { fontSize: 12, color: "#999", fontWeight: "bold" },
  descriptionText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 4,
  },
  businessCardImage: {
    width: "100%",
    height: 200,
    marginTop: 4,
    borderRadius: 4,
    backgroundColor: "#f9f9f9",
  },
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
  detailLabel: { fontSize: 14, color: "#777" },
  detailValue: { fontSize: 14, color: "#333" },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  fullImage: { width: "100%", height: "100%" },
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
    alignItems: "center",
    flex: 1,
  },
  editButtonText: { color: "#fff", fontWeight: "bold" },
  deleteButton: {
    backgroundColor: "#F44336",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    flex: 1,
  },
  deleteButtonText: { color: "#fff", fontWeight: "bold" },
  approveButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  approveButtonText: { color: "#fff", fontWeight: "bold" },
  rejectButton: {
    backgroundColor: "#F44336",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    flex: 1,
  },
  rejectButtonText: { color: "#fff", fontWeight: "bold" },
  reportSummaryCard: {
    backgroundColor: "#2196F3",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  reportSummaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  reportSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    marginBottom: 15,
  },
  reportSummaryItem: { backgroundColor: "transparent" },
  reportSummaryLabel: { fontSize: 12, color: "#e3f2fd", marginBottom: 4 },
  reportSummaryValue: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  exportButton: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
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
  exportButtonText: { color: "#2196F3", fontWeight: "bold", fontSize: 14 },
});

const webTableStyles = {
  th: {
    padding: "12px 15px",
    borderBottom: "2px solid #ddd",
    color: "#666",
  },
  td: {
    padding: "12px 15px",
    fontSize: "14px",
  },
};
