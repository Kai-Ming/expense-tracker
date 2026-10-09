import { Text } from "@/components/Themed";
import React, { useCallback, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import TripList from "./TripList";

// ---- Types ----

interface Customer {
  name?: string;
  email?: string;
  number?: string;
  time?: string;
  address?: string;
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

const EXPENSE_TYPE_MAP = {
  "1": "Mileage",
  "2": "General",
  "3": "Outstation",
} as const;

// ---- Props ----

interface OutstationCardProps {
  item: ExpenseGroup;
  isExpanded: boolean;
  isEditing: boolean;
  editFormData: Partial<OutstationExpense>;
  setEditFormData: React.Dispatch<
    React.SetStateAction<Partial<OutstationExpense>>
  >;
  getTripById: (id: string) => Trip | undefined;
  onToggle: (id: string) => void;
  formatDate?: (date: any) => string;
  renderTripDetailView?: (tripId: string) => React.ReactNode;
  onDeleteTrip?: (item: OutstationExpense) => void;
  onDeleteExpenses?: (item: OutstationExpense) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onImagePress: (url: string | null) => void;
  role?: number;
  userId?: string;
}

// ---- Component ----

const OutstationCard = React.memo(function OutstationCard({
  item,
  isExpanded,
  isEditing,
  editFormData,
  setEditFormData,
  onToggle,
  onImagePress,
  formatDate = (date: any) => date || "N/A",
  getTripById,
  renderTripDetailView,
  onDeleteTrip,
  onDeleteExpenses,
  role,
  userId,
}: OutstationCardProps) {
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(
    null,
  );

  const handleCardPress = useCallback(() => {
    if (isEditing) return;
    onToggle(item.request_id);
  }, [isEditing, item.request_id, onToggle]);

  const stopProp = useCallback((e: any) => {
    e.stopPropagation();
  }, []);

  const format12Hour = (timeStr?: any) => {
    if (!timeStr) return "";

    // Firebase Timestamp
    if (typeof timeStr === "object" && typeof timeStr.toDate === "function") {
      const d = timeStr.toDate();
      const hours24 = d.getHours();
      const minutes = d.getMinutes();
      const period = hours24 >= 12 ? "PM" : "AM";
      const hours12 = hours24 % 12 || 12;
      return `${hours12.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")} ${period}`;
    }

    // number (epoch ms)
    if (typeof timeStr === "number") {
      const d = new Date(timeStr);
      const hours24 = d.getHours();
      const minutes = d.getMinutes();
      const period = hours24 >= 12 ? "PM" : "AM";
      const hours12 = hours24 % 12 || 12;
      return `${hours12.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")} ${period}`;
    }

    // Not a string — bail
    if (typeof timeStr !== "string") return "";

    // "HH:MM" string
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;

    const hours24 = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (isNaN(hours24) || isNaN(minutes)) return timeStr;

    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    return `${hours12.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")} ${period}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handleCardPress}
      style={styles.card}
    >
      {/* ---- Group Header ---- */}
      <View style={styles.cardHeader}>
        <Text style={styles.name} numberOfLines={1}>
          {EXPENSE_TYPE_MAP[String(item.type) as keyof typeof EXPENSE_TYPE_MAP]}
        </Text>
        <View style={styles.headerRight}>
          <Text style={styles.cost}>
            RM{" "}
            {typeof item.total_amount === "number"
              ? item.total_amount.toFixed(2)
              : item.total_amount}
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
          {item.trip_title || "Untitled Trip"}
        </Text>
        <Text style={styles.date}>{formatDate(item.start_date)}</Text>
      </View>

      <View style={[styles.cardFooter, { marginTop: 2 }]}>
        <Text style={[styles.companyText, { fontSize: 12 }]} numberOfLines={1}>
          {item.travel_purposes?.join(", ") || ""}
        </Text>
        <Text style={styles.date}>{formatDate(item.end_date)}</Text>
        {/* <Text style={[styles.date, { fontSize: 12 }]}>
          {item.data.length} expense{item.data.length > 1 ? "s" : ""}
        </Text> */}
      </View>

      {/* ---- Expanded Group Content ---- */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.separator} />

          {/* Action buttons for delete (if provided) */}
          {onDeleteTrip &&
            onDeleteExpenses &&
            item.data.some((e) => e.approval_status === 0) && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={(e) => {
                    stopProp(e);
                    onDeleteTrip(item.data[0]);
                  }}
                >
                  <Text style={styles.deleteButtonText}>
                    Delete Trip & Expenses
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={(e) => {
                    stopProp(e);
                    onDeleteExpenses(item.data[0]);
                  }}
                >
                  <Text style={styles.deleteButtonText}>Delete Expenses</Text>
                </TouchableOpacity>
              </View>
            )}

          {/* ---- Render each expense in the group ---- */}
          {/* {item.data.map((expense) => {
            const isExpenseExpanded = expandedExpenseId === expense.id;
            const isExpenseEditing = isEditing && isExpenseExpanded;

            const mealCost =
              expense.meal ??
              Number(expense.total) -
                (Number(expense.airfare || 0) +
                  Number(expense.parking || 0) +
                  Number(expense.transport || 0) +
                  Number(expense.hotel || 0) +
                  Number(expense.own_acc || 0) +
                  Number(expense.entertainment || 0) +
                  Number(expense.laundry || 0) +
                  Number(expense.others || 0));

            return (
              <View key={expense.id} style={styles.expenseItemWrapper}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={(e) => {
                    stopProp(e);
                    if (isExpenseEditing) return;
                    setExpandedExpenseId(isExpenseExpanded ? null : expense.id);
                  }}
                  style={styles.expenseItemHeader}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      flex: 1,
                      backgroundColor: "transparent",
                    }}
                  >
                    <Text style={styles.expenseItemTitle}>
                      {formatDate(expense.date) || "N/A"}
                    </Text>
                    <Text style={styles.expenseItemAmount}>
                      RM{" "}
                      {typeof expense.total === "number"
                        ? expense.total.toFixed(2)
                        : expense.total}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isExpenseExpanded && (
                  <View style={styles.expenseItemContent}>
                    <View style={styles.detailRowContainer}>
                      <DetailItem
                        label="Airfare"
                        value={`RM ${Number(expense.airfare || 0).toFixed(2)}`}
                        remark={expense.airfare_remark}
                        isEditing={isExpenseEditing}
                        editValue={editFormData.airfare}
                        onEditChange={(text) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            airfare: Number(text),
                          }))
                        }
                      />
                      <DetailItem
                        label="Mileage"
                        value={`RM ${Number(expense.mileage || 0).toFixed(2)}`}
                        isEditing={isExpenseEditing}
                        editValue={editFormData.mileage}
                        onEditChange={(text) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            mileage: Number(text),
                          }))
                        }
                      />
                      <DetailItem
                        label="Toll"
                        value={`RM ${Number(expense.toll || 0).toFixed(2)}`}
                        remark={expense.toll_remark}
                        isEditing={isExpenseEditing}
                        editValue={editFormData.toll}
                        onEditChange={(text) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            toll: Number(text),
                          }))
                        }
                      />
                      <DetailItem
                        label="Parking"
                        value={`RM ${Number(expense.parking || 0).toFixed(2)}`}
                        remark={expense.parking_remark}
                        isEditing={isExpenseEditing}
                        editValue={editFormData.parking}
                        onEditChange={(text) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            parking: Number(text),
                          }))
                        }
                      />
                    </View>

                    <View style={styles.detailRowContainer}>
                      <DetailItem
                        label="Transport"
                        value={`RM ${Number(expense.transport || 0).toFixed(2)}`}
                        remark={expense.transport_remark}
                        isEditing={isExpenseEditing}
                        editValue={editFormData.transport}
                        onEditChange={(text) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            transport: Number(text),
                          }))
                        }
                      />
                      <DetailItem
                        label="Hotel"
                        value={`RM ${Number(expense.hotel || 0).toFixed(2)}`}
                        remark={expense.hotel_remark}
                        isEditing={isExpenseEditing}
                        editValue={editFormData.hotel}
                        onEditChange={(text) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            hotel: Number(text),
                          }))
                        }
                      />
                      <DetailItem
                        label="Own Acc"
                        value={`RM ${Number(expense.own_acc || 0).toFixed(2)}`}
                        remark={expense.own_acc_remark}
                        extra={expense.own_acc_sharing}
                        isEditing={isExpenseEditing}
                        editValue={editFormData.own_acc}
                        onEditChange={(text) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            own_acc: Number(text),
                          }))
                        }
                      />
                      <DetailItem
                        label="Entertainment"
                        value={`RM ${Number(expense.entertainment || 0).toFixed(2)}`}
                        remark={expense.entertainment_remark}
                        isEditing={isExpenseEditing}
                        editValue={editFormData.entertainment}
                        onEditChange={(text) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            entertainment: Number(text),
                          }))
                        }
                      />
                    </View>

                    <View style={styles.detailRowContainer}>
                      <DetailItem
                        label="Laundry"
                        value={`RM ${Number(expense.laundry || 0).toFixed(2)}`}
                        remark={expense.laundry_remark}
                        isEditing={isExpenseEditing}
                        editValue={editFormData.laundry}
                        onEditChange={(text) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            laundry: Number(text),
                          }))
                        }
                      />
                      <DetailItem
                        label="Others"
                        value={`RM ${Number(expense.others || 0).toFixed(2)}`}
                        remark={expense.others_remark}
                        isEditing={isExpenseEditing}
                        editValue={editFormData.others}
                        onEditChange={(text) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            others: Number(text),
                          }))
                        }
                      />
                      <DetailItem
                        label="Meal Cost"
                        value={`RM ${mealCost.toFixed(2)}`}
                        isEditing={isExpenseEditing}
                        editValue={editFormData.meal}
                        onEditChange={(text) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            meal: Number(text),
                          }))
                        }
                      />
                    </View>

                    <View style={styles.detailRowContainer}>
                      <DetailItem
                        label="Breakfast"
                        value={expense.breakfast ? "Yes" : "No"}
                      />
                      <DetailItem
                        label="Lunch"
                        value={expense.lunch ? "Yes" : "No"}
                      />
                      <DetailItem
                        label="Dinner"
                        value={expense.dinner ? "Yes" : "No"}
                      />
                    </View>

                    {(expense.departure_time || expense.arrival_time) && (
                      <View style={styles.detailRowContainer}>
                        {expense.departure_time && (
                          <DetailItem
                            label="Departure Time"
                            value={format12Hour(expense.departure_time)}
                          />
                        )}
                        {expense.arrival_time && (
                          <DetailItem
                            label="Arrival Time"
                            value={format12Hour(expense.arrival_time)}
                          />
                        )}
                      </View>
                    )}

                    {expense.customers?.map((customer, index) => (
                      <View key={index} style={styles.customerSection}>
                        <Text style={styles.customerTitle}>
                          Customer #{index + 1}:
                        </Text>
                        <View style={styles.detailRowContainer}>
                          <DetailItem
                            label="Name"
                            value={customer.name || "N/A"}
                          />
                          <DetailItem
                            label="Email"
                            value={customer.email || "N/A"}
                          />
                          <DetailItem
                            label="Number"
                            value={customer.number || "N/A"}
                          />
                          <DetailItem
                            label="Time"
                            value={format12Hour(customer.time) || "N/A"}
                          />
                          {customer.address && (
                            <DetailItem
                              label="Address"
                              value={customer.address}
                            />
                          )}
                        </View>
                      </View>
                    ))}

                    {expense.trip_ids &&
                      expense.trip_ids.length > 0 &&
                      renderTripDetailView && (
                        <View style={styles.section}>
                          <Text style={styles.descriptionLabel}>Trips:</Text>
                          {expense.trip_ids.map((tripId, index) => (
                            <View key={index}>
                              {renderTripDetailView(tripId)}
                            </View>
                          ))}
                        </View>
                      )}

                    <View style={styles.reportSection}>
                      <Text style={styles.descriptionLabel}>Trip Report:</Text>
                      <Text style={styles.descriptionText}>
                        {(expense.trip_report || "N/A")
                          .replace(/\\n/g, "\n")
                          .replace(/\\r/g, "")}
                      </Text>
                    </View>

                    <View style={styles.totalSection}>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Expense Total:</Text>
                        <Text style={styles.totalValue}>
                          RM{" "}
                          {typeof expense.total === "number"
                            ? expense.total.toFixed(2)
                            : expense.total}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })} */}

          {[...item.data]
            .sort((a, b) => {
              const dateA = a.date ? new Date(a.date).getTime() : 0;
              const dateB = b.date ? new Date(b.date).getTime() : 0;
              return dateA - dateB; // earliest first
            })
            .map((expense) => {
              const isExpenseExpanded = expandedExpenseId === expense.id;
              const isExpenseEditing = isEditing && isExpenseExpanded;

              const mealCost =
                expense.meal ??
                Number(expense.total) -
                  (Number(expense.airfare || 0) +
                    Number(expense.parking || 0) +
                    Number(expense.transport || 0) +
                    Number(expense.hotel || 0) +
                    Number(expense.own_acc || 0) +
                    Number(expense.entertainment || 0) +
                    Number(expense.laundry || 0) +
                    Number(expense.others || 0));

              return (
                <View key={expense.id} style={styles.expenseItemWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={(e) => {
                      stopProp(e);
                      if (isExpenseEditing) return;
                      setExpandedExpenseId(
                        isExpenseExpanded ? null : expense.id,
                      );
                    }}
                    style={styles.expenseItemHeader}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        flex: 1,
                        backgroundColor: "transparent",
                      }}
                    >
                      <Text style={styles.expenseItemTitle}>
                        {formatDate(expense.date) || "N/A"}
                      </Text>
                      <Text style={styles.expenseItemAmount}>
                        RM{" "}
                        {typeof expense.total === "number"
                          ? expense.total.toFixed(2)
                          : expense.total}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {isExpenseExpanded && (
                    <View style={styles.expenseItemContent}>
                      {/* Expense Breakdown Row 1 */}
                      <View style={styles.detailRowContainer}>
                        <DetailItem
                          label="Airfare"
                          value={`RM ${Number(expense.airfare || 0).toFixed(2)}`}
                          remark={expense.airfare_remark}
                          isEditing={isExpenseEditing}
                          editValue={editFormData.airfare}
                          onEditChange={(text) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              airfare: Number(text),
                            }))
                          }
                        />
                        <DetailItem
                          label="Mileage"
                          value={`RM ${Number(expense.mileage || 0).toFixed(2)}`}
                          isEditing={isExpenseEditing}
                          editValue={editFormData.mileage}
                          onEditChange={(text) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              mileage: Number(text),
                            }))
                          }
                        />
                        <DetailItem
                          label="Toll"
                          value={`RM ${Number(expense.toll || 0).toFixed(2)}`}
                          remark={expense.toll_remark}
                          isEditing={isExpenseEditing}
                          editValue={editFormData.toll}
                          onEditChange={(text) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              toll: Number(text),
                            }))
                          }
                        />
                        <DetailItem
                          label="Parking"
                          value={`RM ${Number(expense.parking || 0).toFixed(2)}`}
                          remark={expense.parking_remark}
                          isEditing={isExpenseEditing}
                          editValue={editFormData.parking}
                          onEditChange={(text) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              parking: Number(text),
                            }))
                          }
                        />
                      </View>

                      {/* Expense Breakdown Row 2 */}
                      <View style={styles.detailRowContainer}>
                        <DetailItem
                          label="Transport"
                          value={`RM ${Number(expense.transport || 0).toFixed(2)}`}
                          remark={expense.transport_remark}
                          isEditing={isExpenseEditing}
                          editValue={editFormData.transport}
                          onEditChange={(text) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              transport: Number(text),
                            }))
                          }
                        />
                        <DetailItem
                          label="Hotel"
                          value={`RM ${Number(expense.hotel || 0).toFixed(2)}`}
                          remark={expense.hotel_remark}
                          isEditing={isExpenseEditing}
                          editValue={editFormData.hotel}
                          onEditChange={(text) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              hotel: Number(text),
                            }))
                          }
                        />
                        <DetailItem
                          label="Own Acc"
                          value={`RM ${Number(expense.own_acc || 0).toFixed(2)}`}
                          remark={expense.own_acc_remark}
                          extra={expense.own_acc_sharing}
                          isEditing={isExpenseEditing}
                          editValue={editFormData.own_acc}
                          onEditChange={(text) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              own_acc: Number(text),
                            }))
                          }
                        />
                        <DetailItem
                          label="Entertainment"
                          value={`RM ${Number(expense.entertainment || 0).toFixed(2)}`}
                          remark={expense.entertainment_remark}
                          isEditing={isExpenseEditing}
                          editValue={editFormData.entertainment}
                          onEditChange={(text) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              entertainment: Number(text),
                            }))
                          }
                        />
                      </View>

                      {/* Expense Breakdown Row 3 */}
                      <View style={styles.detailRowContainer}>
                        <DetailItem
                          label="Laundry"
                          value={`RM ${Number(expense.laundry || 0).toFixed(2)}`}
                          remark={expense.laundry_remark}
                          isEditing={isExpenseEditing}
                          editValue={editFormData.laundry}
                          onEditChange={(text) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              laundry: Number(text),
                            }))
                          }
                        />
                        <DetailItem
                          label="Others"
                          value={`RM ${Number(expense.others || 0).toFixed(2)}`}
                          remark={expense.others_remark}
                          isEditing={isExpenseEditing}
                          editValue={editFormData.others}
                          onEditChange={(text) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              others: Number(text),
                            }))
                          }
                        />
                        <DetailItem
                          label="Meal Cost"
                          value={`RM ${mealCost.toFixed(2)}`}
                          isEditing={isExpenseEditing}
                          editValue={editFormData.meal}
                          onEditChange={(text) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              meal: Number(text),
                            }))
                          }
                        />
                      </View>

                      {/* Meals Row */}
                      <View style={styles.detailRowContainer}>
                        <DetailItem
                          label="Breakfast"
                          value={expense.breakfast ? "Yes" : "No"}
                        />
                        <DetailItem
                          label="Lunch"
                          value={expense.lunch ? "Yes" : "No"}
                        />
                        <DetailItem
                          label="Dinner"
                          value={expense.dinner ? "Yes" : "No"}
                        />
                      </View>

                      {/* Times Row */}
                      {(expense.departure_time || expense.arrival_time) && (
                        <View style={styles.detailRowContainer}>
                          {expense.departure_time && (
                            <DetailItem
                              label="Departure Time"
                              value={format12Hour(expense.departure_time)}
                            />
                          )}
                          {expense.arrival_time && (
                            <DetailItem
                              label="Arrival Time"
                              value={format12Hour(expense.arrival_time)}
                            />
                          )}
                        </View>
                      )}

                      {/* Customers Section */}
                      {expense.customers?.map((customer, index) => (
                        <View key={index} style={styles.customerSection}>
                          <Text style={styles.customerTitle}>
                            Customer #{index + 1}:
                          </Text>
                          <View style={styles.detailRowContainer}>
                            <DetailItem
                              label="Name"
                              value={customer.name || "N/A"}
                            />
                            <DetailItem
                              label="Email"
                              value={customer.email || "N/A"}
                            />
                            <DetailItem
                              label="Number"
                              value={customer.number || "N/A"}
                            />
                            <DetailItem
                              label="Time"
                              value={format12Hour(customer.time) || "N/A"}
                            />
                            {customer.address && (
                              <DetailItem
                                label="Address"
                                value={customer.address}
                              />
                            )}
                          </View>
                        </View>
                      ))}

                      {/* Trips Section */}
                      <TripList
                        tripIds={expense.trip_ids ?? []}
                        getTripById={getTripById}
                        onImagePress={onImagePress}
                      />

                      {/* Trip Report */}
                      <View style={styles.reportSection}>
                        <Text style={styles.descriptionLabel}>
                          Trip Report:
                        </Text>
                        <Text style={styles.descriptionText}>
                          {(expense.trip_report || "N/A")
                            .replace(/\\n/g, "\n")
                            .replace(/\\r/g, "")}
                        </Text>
                      </View>

                      {/* Expense Total */}
                      <View style={styles.totalSection}>
                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Expense Total:</Text>
                          <Text style={styles.totalValue}>
                            RM{" "}
                            {typeof expense.total === "number"
                              ? expense.total.toFixed(2)
                              : expense.total}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

          {/* ---- Group Total ---- */}
          <View style={[styles.totalSection, { marginTop: 12 }]}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                RM{" "}
                {typeof item.total_amount === "number"
                  ? item.total_amount.toFixed(2)
                  : item.total_amount}
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ---- Helper Component ----

interface DetailItemProps {
  label: string;
  value: string | number;
  remark?: string;
  extra?: string;
  isEditing?: boolean;
  editValue?: any;
  onEditChange?: (text: string) => void;
}

const DetailItem = React.memo(function DetailItem({
  label,
  value,
  remark,
  extra,
  isEditing,
  editValue,
  onEditChange,
}: DetailItemProps) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailItemLabel}>{label}:</Text>
      {isEditing && onEditChange ? (
        <TextInput
          style={styles.inlineInput}
          value={editValue?.toString()}
          onChangeText={onEditChange}
          keyboardType="numeric"
          placeholder={label}
        />
      ) : (
        <Text style={styles.detailItemValue}>{value}</Text>
      )}
      {remark && (
        <>
          <Text style={styles.detailItemLabel}>{label} Remark:</Text>
          <Text style={styles.detailItemValue}>{remark}</Text>
        </>
      )}
      {extra && (
        <>
          <Text style={styles.detailItemLabel}>{label} Sharing:</Text>
          <Text style={styles.detailItemValue}>{extra}</Text>
        </>
      )}
    </View>
  );
});

// ---- Styles ----

const styles = StyleSheet.create({
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    gap: 8,
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
  companyText: { fontSize: 14, color: "#666", flex: 1, marginRight: 8 },
  date: { fontSize: 14, color: "#999" },
  expandedContent: { marginTop: 12, backgroundColor: "transparent" },
  separator: { height: 1, backgroundColor: "#eee", marginBottom: 12 },
  actionButtonsContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "transparent",
    gap: 8,
  },
  deleteButton: {
    backgroundColor: "#F44336",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    flex: 1,
  },
  deleteButtonText: { color: "#fff", fontWeight: "bold", fontSize: 12 },

  // ---- Expense item inside group ----
  expenseItemWrapper: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    marginBottom: 8,
    overflow: "hidden",
  },
  expenseItemHeader: {
    padding: 10,
    backgroundColor: "#f9f9f9",
    flexDirection: "row",
    alignItems: "center",
  },
  expenseItemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  expenseItemAmount: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2196F3",
  },
  expenseItemContent: {
    padding: 10,
    backgroundColor: "#fff",
  },

  detailRowContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  detailItem: {
    flexDirection: "column",
    marginRight: 20,
    marginBottom: 8,
    minWidth: 100,
  },
  detailItemLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "bold",
    marginBottom: 4,
  },
  detailItemValue: { fontSize: 14, color: "#444" },
  customerSection: {
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  customerTitle: {
    fontSize: 12,
    color: "#999",
    fontWeight: "bold",
    marginBottom: 6,
  },
  section: { marginBottom: 16, backgroundColor: "transparent" },
  descriptionLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "bold",
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 4,
  },
  reportSection: { marginBottom: 12, maxWidth: 600 },
  totalSection: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  totalLabel: { fontSize: 14, fontWeight: "bold", color: "#333" },
  totalValue: { fontSize: 14, fontWeight: "bold", color: "#2196F3" },
  inlineInput: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    fontSize: 14,
    minWidth: 100,
  },
});

export default OutstationCard;
