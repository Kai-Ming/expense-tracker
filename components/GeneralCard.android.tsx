import { Text } from "@/components/Themed";
import React, { useCallback } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

// ---- Types (hoist outside the component) ----

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

const EXPENSE_TYPE_MAP = {
  "1": "Mileage",
  "2": "General",
  "3": "Outstation",
} as const;

// ---- Props ----

interface GeneralCardProps {
  item: GeneralExpense;
  isExpanded: boolean;
  isEditing: boolean;
  editFormData: Partial<GeneralExpense>;
  setEditFormData: React.Dispatch<
    React.SetStateAction<Partial<GeneralExpense>>
  >;
  formatDate?: (date: any) => string;
  onToggle: (id: string) => void;
}

// ---- Component ----

const GeneralCard = React.memo(function GeneralCard({
  item,
  isExpanded,
  isEditing,
  formatDate = (date: any) => date || "N/A",
  editFormData,
  setEditFormData,
  onToggle,
}: GeneralCardProps) {
  const handleCardPress = useCallback(() => {
    if (isEditing) return;
    onToggle(item.id);
  }, [isEditing, item.id, onToggle]);

  const stopProp = useCallback((e: any) => {
    e.stopPropagation();
  }, []);

  const format12Hour = (timeStr?: string) => {
    if (!timeStr) return "";
    const [hours24, minutes] = timeStr.split(":").map(Number);
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    const hoursStr = hours12.toString().padStart(2, "0");
    const minutesStr = minutes.toString().padStart(2, "0");
    return `${hoursStr}:${minutesStr} ${period}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handleCardPress}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.name} numberOfLines={1}>
          {EXPENSE_TYPE_MAP[String(item.type) as keyof typeof EXPENSE_TYPE_MAP]}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "transparent",
            gap: 8,
          }}
        >
          <Text style={styles.cost}>
            RM{" "}
            {typeof item.amount === "number"
              ? item.amount.toFixed(2)
              : item.amount}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.companyText} numberOfLines={1}>
          {item.user_name || "N/A"}
        </Text>
      </View>

      <View style={[styles.cardFooter, { marginTop: 2 }]}>
        <Text style={[styles.companyText, { fontSize: 13 }]} numberOfLines={1}>
          {item.expense_type}
        </Text>
        <Text style={styles.date}>{formatDate(item.date) || "N/A"}</Text>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.separator} />

          {/* <View style={styles.section}>
            <Text style={styles.descriptionLabel}>Submitted By:</Text>
            <Text style={styles.descriptionText}>
              {item.user_name || "N/A"}
            </Text>
          </View> */}

          {/* <View style={styles.section}>
            <Text style={styles.descriptionLabel}>Company:</Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormData.company}
                onChangeText={(text) =>
                  setEditFormData((prev) => ({ ...prev, company: text }))
                }
                placeholder="Company/Site"
                onStartShouldSetResponder={() => true}
                onTouchStart={stopProp}
              />
            ) : (
              <Text style={styles.descriptionText}>
                {item.company || "N/A"}
              </Text>
            )}

            <Text style={styles.descriptionLabel}>Customer Name:</Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormData.name}
                onChangeText={(text) =>
                  setEditFormData((prev) => ({ ...prev, name: text }))
                }
                placeholder="Name"
                onStartShouldSetResponder={() => true}
                onTouchStart={stopProp}
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
                  setEditFormData((prev) => ({ ...prev, contact_number: text }))
                }
                keyboardType="phone-pad"
                placeholder="Contact Number"
                onStartShouldSetResponder={() => true}
                onTouchStart={stopProp}
              />
            ) : (
              <Text style={styles.descriptionText}>
                {item.contact_number || "N/A"}
              </Text>
            )}

            <Text style={styles.descriptionLabel}>Email:</Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormData.email} // ← fixed: was contact_number
                onChangeText={(text) =>
                  setEditFormData((prev) => ({ ...prev, email: text }))
                }
                keyboardType="email-address"
                placeholder="Email"
                onStartShouldSetResponder={() => true}
                onTouchStart={stopProp}
              />
            ) : (
              <Text style={styles.descriptionText}>{item.email || "N/A"}</Text>
            )}
          </View> */}

          <View style={styles.section}>
            {item.customers?.map((item, index) => (
              <View
                style={{ marginBottom: 10, flexDirection: "column" }}
                key={index}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: "#999",
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                >
                  Customer #{index + 1}:
                </Text>
                <View style={{ flexDirection: "row" }}>
                  <View style={{ flexDirection: "column", marginRight: 20 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Customer Name:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "column", marginRight: 20 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Company:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {item.company}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "column", marginRight: 20 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Contact Number:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {item.number}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "column", marginRight: 20 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Email:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {item.email}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "column", marginRight: 20 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Time:
                    </Text>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {format12Hour(item.time)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.descriptionLabel}>Expense Report:</Text>
          <Text style={styles.descriptionText}>
            {(item.expense_report || "N/A")
              .replace(/\\n/g, "\n")
              .replace(/\\r/g, "")}
          </Text>

          <View style={styles.section}>
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
                {typeof item.amount === "number"
                  ? item.amount.toFixed(2)
                  : item.amount}
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
  },
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
  filterInput: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 6,
    fontSize: 13,
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
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 6,
    flex: 1,
    height: 40,
    justifyContent: "center",
    borderWidth: 0,
  },
  picker: {
    width: "100%",
    color: "#000",
    fontSize: 14,
  },
  pickerItem: {
    fontSize: 14,
    height: 40,
  },
  customPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 40,
    width: "100%",
    backgroundColor: "transparent",
  },
  customPickerText: {
    fontSize: 14,
    color: "#000",
    flex: 1,
  },
  customPickerIcon: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  placeholderText: {
    color: "#000",
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
  userModalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "95%", // Take 95% of screen width
    maxWidth: 700, // But max 700px
    maxHeight: "80%", // Max 80% of screen height
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlayUser: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center", // ← Add this
    alignItems: "center", // ← Add this
    padding: 20, // ← Add this
  },
  tableContainer: {},
  webTableContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  webTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#ddd",
  },
  webTableHeaderCell: { fontWeight: "bold", color: "#666", fontSize: 14 },
  exportButtonText: { color: "#2196F3", fontWeight: "bold", fontSize: 14 },
  modalList: { maxHeight: 200 },
  disabledUserItem: {
    backgroundColor: "#e0e0e0",
    opacity: 0.6,
  },
  disabledText: {
    color: "#9e9e9e", // grey text
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  tripItem: {
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 4,
  },
  tripDetail: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  tripAddress: {
    fontSize: 12,
    color: "#000",
    marginTop: 2,
  },
  boldText: {
    fontWeight: "600",
  },
  modalCloseButton: { fontSize: 20, fontWeight: "bold", color: "#999" },
});

export default GeneralCard;
