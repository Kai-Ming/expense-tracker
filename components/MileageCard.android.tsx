import { Text } from "@/components/Themed";
import React, { useCallback } from "react";
import {
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-paper-dropdown";
import TripList from "./TripList";

// ---- Types (hoist these OUTSIDE ExpensesScreen) ----

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

interface Trip {
  id: string;
  user_id: string;
  distance: number;
  toll?: number;
  mileage?: number;
  date?: any;
  from_address: string;
  to_address: string;
  from_time?: string;
  to_time?: string;
  remark: string;
  route_image_url?: string;
  to_home: boolean;
  platform: number;
  created_at: any;
}

// ---- Props interface ----

interface MileageCardProps {
  item: Expense;
  isExpanded: boolean;
  isEditing: boolean;
  editFormData: Partial<Expense>;
  setEditFormData: React.Dispatch<React.SetStateAction<Partial<Expense>>>;
  getTripById: (id: string) => Trip | undefined;
  purposeList: { label: string; value: string }[];
  showPurposeDropDown: boolean;
  setShowPurposeDropDown: (v: boolean) => void;
  onToggle: (id: string) => void;
  onImagePress: (url: string | null) => void;
  format12Hour: (t?: string) => string;
  formatDate?: (date: any) => string;
}

// ---- Constants (hoist OUTSIDE the component so they never re-create) ----

const EXPENSE_TYPE_MAP = {
  "1": "Mileage",
  "2": "General",
  "3": "Outstation",
} as const;

// ---- The memoized component ----

const MileageCard = React.memo(function MileageCard({
  item,
  isExpanded,
  isEditing,
  editFormData,
  formatDate = (date: any) => date || "N/A",
  setEditFormData,
  getTripById,
  purposeList,
  showPurposeDropDown,
  setShowPurposeDropDown,
  onToggle,
  onImagePress,
  format12Hour,
}: MileageCardProps) {
  // Stable handlers (created once per card lifetime, not per parent render)
  const handleCardPress = useCallback(() => {
    if (isEditing) return;
    onToggle(item.id);
  }, [isEditing, item.id, onToggle]);

  const handleBusinessCardPress = useCallback(
    (e: any) => {
      e.stopPropagation();
      onImagePress(item.business_card_url ?? null);
    },
    [item.business_card_url, onImagePress],
  );

  // Local helper — stops propagation on every TextInput without repeating code
  const stopProp = useCallback((e: any) => {
    e.stopPropagation();
  }, []);

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
          <Text style={styles.cost}>RM {item.cost.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.companyText} numberOfLines={1}>
          {item.user_name || "N/A"}
        </Text>
      </View>

      <View style={[styles.cardFooter, { marginTop: 2 }]}>
        <Text style={[styles.companyText, { fontSize: 13 }]} numberOfLines={1}>
          {item.purpose}
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

            <Text style={styles.descriptionLabel}>Name:</Text>
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
                <View style={{ flexDirection: "column" }}>
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
                  {item.address ? (
                    <View style={{ flexDirection: "column", marginRight: 20 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#999",
                          fontWeight: "bold",
                          marginBottom: 4,
                        }}
                      >
                        Address:
                      </Text>
                      <Text style={{ fontSize: 14, color: "#444" }}>
                        {item.address}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.descriptionLabel}>Date:</Text>
            {isEditing ? (
              <TextInput
                style={styles.inlineInput}
                value={editFormData.date}
                onChangeText={(text) =>
                  setEditFormData((prev) => ({ ...prev, date: text }))
                }
                placeholder="YYYY-MM-DD"
                onStartShouldSetResponder={() => true}
                onTouchStart={stopProp}
              />
            ) : (
              <Text style={styles.descriptionText}>{item.date || "N/A"}</Text>
            )}

            <Text style={styles.descriptionLabel}>Purpose:</Text>
            {isEditing ? (
              <Dropdown
                label={"Purpose"}
                mode={"outlined"}
                visible={showPurposeDropDown}
                showDropDown={() => setShowPurposeDropDown(true)}
                onDismiss={() => setShowPurposeDropDown(false)}
                value={editFormData.purpose}
                setValue={(val) =>
                  setEditFormData((prev) => ({ ...prev, purpose: val }))
                }
                list={purposeList}
              />
            ) : (
              <Text style={styles.descriptionText}>{item.purpose}</Text>
            )}

            <Text style={styles.descriptionLabel}>Time:</Text>
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
                    setEditFormData((prev) => ({ ...prev, from_time: text }))
                  }
                  placeholder="Start (e.g. 09:00)"
                  onStartShouldSetResponder={() => true}
                  onTouchStart={stopProp}
                />
                <TextInput
                  style={[styles.inlineInput, { flex: 1 }]}
                  value={editFormData.to_time}
                  onChangeText={(text) =>
                    setEditFormData((prev) => ({ ...prev, to_time: text }))
                  }
                  placeholder="End (e.g. 17:00)"
                  onStartShouldSetResponder={() => true}
                  onTouchStart={stopProp}
                />
              </View>
            ) : (
              item.from_time &&
              item.to_time && (
                <Text style={styles.descriptionText}>
                  {format12Hour(item.from_time)} - {format12Hour(item.to_time)}{" "}
                  ({item.duration})
                </Text>
              )
            )}

            <Text style={styles.descriptionLabel}>Trip Report:</Text>
            {isEditing ? (
              <TextInput
                style={[styles.inlineInput, { minHeight: 60 }]}
                value={editFormData.trip_report}
                onChangeText={(text) =>
                  setEditFormData((prev) => ({ ...prev, trip_report: text }))
                }
                multiline
                placeholder="Trip Summary"
                onStartShouldSetResponder={() => true}
                onTouchStart={stopProp}
              />
            ) : (
              <Text style={styles.descriptionText}>
                {(item.trip_report || "N/A")
                  .replace(/\\n/g, "\n")
                  .replace(/\\r/g, "")}
              </Text>
            )}
          </View>

          <TripList
            tripIds={item.trip_ids}
            getTripById={getTripById}
            onImagePress={onImagePress}
          />

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
                  style={[styles.inlineInput, { width: 100, marginBottom: 0 }]}
                  value={editFormData.toll?.toString()}
                  onChangeText={(text) =>
                    setEditFormData((prev) => {
                      const toll = parseFloat(text) || 0;
                      return {
                        ...prev,
                        toll,
                        cost: (prev.mileage || 0) + (prev.parking || 0) + toll,
                      };
                    })
                  }
                  keyboardType="numeric"
                  onStartShouldSetResponder={() => true}
                  onTouchStart={stopProp}
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
                  style={[styles.inlineInput, { width: 100, marginBottom: 0 }]}
                  value={editFormData.parking?.toString()}
                  onChangeText={(text) =>
                    setEditFormData((prev) => {
                      const parking = parseFloat(text) || 0;
                      return {
                        ...prev,
                        parking,
                        cost: (prev.mileage || 0) + parking + (prev.toll || 0),
                      };
                    })
                  }
                  keyboardType="numeric"
                  onStartShouldSetResponder={() => true}
                  onTouchStart={stopProp}
                />
              ) : (
                <Text style={styles.detailValue}>
                  RM {item.parking.toFixed(2)}
                </Text>
              )}
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Expense:</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.inlineInput, { width: 100, marginBottom: 0 }]}
                  value={editFormData.expense?.toString()}
                  onChangeText={(text) =>
                    setEditFormData((prev) => {
                      const expense = parseFloat(text) || 0;
                      return {
                        ...prev,
                        expense,
                        cost: (prev.mileage || 0) + expense + (prev.toll || 0),
                      };
                    })
                  }
                  keyboardType="numeric"
                  onStartShouldSetResponder={() => true}
                  onTouchStart={stopProp}
                />
              ) : (
                <Text style={styles.detailValue}>
                  RM {item.expense.toFixed(2)}
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
              <TouchableOpacity onPress={handleBusinessCardPress}>
                <Image
                  source={{ uri: item.business_card_url }}
                  style={styles.businessCardImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </>
          )}
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

export default MileageCard;
