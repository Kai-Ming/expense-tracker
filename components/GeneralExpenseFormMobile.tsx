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
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { db } from "../firebaseConfig";
import { DatePickerInput } from "./DatePickerInput";
import { TimePickerInput } from "./TimePickerInput";

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

export default function GeneralExpenseFormMobile() {
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [formCompany, setFormCompany] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formExpenseType, setFormExpenseType] = useState<string>("");
  const [formPurpose, setFormPurpose] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("0.00");
  const [formContactNumber, setFormContactNumber] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formExpenseReport, setFormExpenseReport] = useState<string>("");
  const [formVendor, setFormVendor] = useState<string>("");
  const [formCustomers, setFormCustomers] = useState([
    { name: "", company: "", email: "", number: "", time: "" },
  ]);

  const [allExpenses, setAllExpenses] = useState<GeneralExpense[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string>("");

  // For the modal fields
  const [editFormCompany, setEditFormCompany] = useState("");
  const [editFormName, setEditFormName] = useState("");
  const [editFormEmail, setEditFormEmail] = useState("");
  const [editFormContactNumber, setEditFormContactNumber] = useState("");
  const [editFormTime, setEditFormTime] = useState("");

  // Add these state variables
  const [editingCustomerIndex, setEditingCustomerIndex] = useState<
    number | null
  >(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const expenseType = {
    "1": "Meal with customer",
    "2": "Meal with supplier",
    "3": "Medical",
    "4": "Purchase of goods",
    "5": "Staff benefits",
    "6": "Others",
  };

  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth * 0.9, 1200);

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
        setUserId("");
        setUsername("");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "expenses"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expenseData: GeneralExpense[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 2) {
          expenseData.push({
            id: doc.id,
            ...data,
          } as GeneralExpense);
        }
      });
      setAllExpenses(expenseData);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSubmit = async () => {
    const isCustomersFormValid = formCustomers.every(
      (customer) =>
        customer.name.trim() !== "" &&
        customer.company.trim() !== "" &&
        customer.email.trim() !== "" &&
        customer.number.trim() !== "" &&
        customer.time.trim() !== "",
    );

    const expensePurposeValidation =
      (formExpenseType === "1" || formExpenseType === "2") &&
      !isCustomersFormValid;

    console.log(expensePurposeValidation);

    if (
      !formExpenseType ||
      !formDate ||
      parseFloat(formAmount) === 0 ||
      !formExpenseReport ||
      !formVendor ||
      expensePurposeValidation
    ) {
      // Individual validation checks
      if (!formExpenseType) {
        alert("Please select an Expense Type.");
        console.log("Expense Type is missing");
      } else if (!formDate) {
        alert("Please select a Date.");
        console.log("Date is missing");
      } else if (parseFloat(formAmount) === 0) {
        alert("Please enter an Amount greater than 0.");
        console.log("Amount is 0 or invalid");
      } else if (!formExpenseReport) {
        alert("Please enter an Expense Report.");
        console.log("Expense Report is missing");
      } else if (!formVendor) {
        alert("Please select a Vendor.");
        console.log("Vendor is missing");
      } else if (expensePurposeValidation) {
        alert("Please fill in customers.");
        console.log("Customer fields are incomplete for selected expense type");
      }
      setIsSaving(false);
      return;
    }

    // If all validations pass
    console.log("All validations passed");

    const encodedReport = formExpenseReport.replace(/\n/g, "\\n");
    console.log("valid");
    setIsSaving(true);
    try {
      await addDoc(collection(db, "expenses"), {
        user_id: userId,
        user_name: username,
        date: formDate,
        expense_type: expenseType[formExpenseType as keyof typeof expenseType],
        amount: parseFloat(formAmount),
        customers: formCustomers,
        vendor: formVendor,
        expense_report: encodedReport,
        type: 2, // 1 mileage, 2 general, 3 outstation
        approval_status: 0,
        created_at: serverTimestamp(),
      });
      resetForm();
      alert("Expense submitted successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save expense.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    const isCustomersFormValid = formCustomers.every(
      (customer) =>
        customer.name.trim() !== "" &&
        customer.company.trim() !== "" &&
        customer.email.trim() !== "" &&
        customer.number.trim() !== "" &&
        customer.time.trim() !== "",
    );

    const expensePurposeValidation =
      (formExpenseType === "1" || formExpenseType === "2") &&
      !isCustomersFormValid;

    console.log(expensePurposeValidation);

    if (
      !formExpenseType ||
      !formDate ||
      parseFloat(formAmount) === 0 ||
      !formExpenseReport ||
      !formVendor ||
      expensePurposeValidation
    ) {
      console.log("not valid");
      alert("Please ensure all required fields are filled.");
      return;
    }
    const encodedReport = formExpenseReport.replace(/\n/g, "\\n");

    try {
      const docRef = doc(db, "expenses", editExpenseId);
      const expense = {
        date: formDate,
        expense_type: expenseType[formExpenseType as keyof typeof expenseType],
        amount: parseFloat(formAmount),
        customers: formCustomers,
        vendor: formVendor,
        expense_report: encodedReport,
      };

      await updateDoc(docRef, expense);

      resetForm();
    } catch (e) {
      console.error(e);
      alert("Failed to save expense.");
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

  const resetForm = () => {
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormExpenseType("");
    setFormPurpose("");
    setFormAmount("0.00");
    setFormCompany("");
    setFormName("");
    setFormContactNumber("");
    setFormEmail("");
    setFormVendor("");
    setFormExpenseReport("");
    setFormCustomers([
      { name: "", company: "", email: "", number: "", time: "" },
    ]);
    setEditingExpense(false);
  };

  const findKeyByValue = (value: string): string | undefined => {
    return Object.keys(expenseType).find(
      (key) => expenseType[key as keyof typeof expenseType] === value,
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return dateString.split("-").reverse().join("/");
  };

  const getDisplayText = (item: any) => {
    const company = item.company || item.customers?.[0]?.company || "";
    const name = item.name || item.customers?.[0]?.name || "";

    if (company && name) {
      return `${company} • ${name}`;
    }
    return company || name;
  };

  const setEditExpense = (id: string) => {
    if (!id) {
      console.log("Not a valid expense");
      return;
    }
    setEditingExpense(true);
    setEditExpenseId(id.trim());

    const selectedExpense = allExpenses.find((e) => e.id === id);

    if (selectedExpense) {
      const formatCurrency = (value: any): string => {
        // Handle null, undefined, or non-numeric values
        const num = typeof value === "number" ? value : parseFloat(value);
        // Check if it's a valid number
        if (isNaN(num) || num === undefined || num === null) {
          return "0.00";
        }
        return num.toFixed(2);
      };

      setFormDate(
        selectedExpense.date || new Date().toISOString().split("T")[0],
      );

      setFormAmount(formatCurrency(selectedExpense.amount));
      setFormVendor(selectedExpense.vendor);

      setFormExpenseReport(
        (selectedExpense.expense_report || "")
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, ""),
      );

      const key = findKeyByValue(selectedExpense.expense_type);
      if (key) {
        setFormExpenseType(key);
      }

      setFormCustomers(
        selectedExpense.customers?.length > 0
          ? selectedExpense.customers
          : [
              {
                name: "",
                company: "",
                email: "",
                number: "",
                time: "",
              },
            ],
      );
    }
  };

  const addCustomerRow = (
    company: string,
    name: string,
    email: string,
    number: string,
    time: string,
  ) => {
    setFormCustomers([
      ...formCustomers,
      {
        name: name,
        company: company,
        email: email,
        number: number,
        time: time,
      },
    ]);
  };

  const removeCustomerRow = (index: number) => {
    if (formCustomers.length === 1) {
      setFormCustomers([
        { name: "", company: "", email: "", number: "", time: "" },
      ]);
    } else {
      setFormCustomers(formCustomers.filter((_, i) => i !== index));
    }
  };

  // Open modal with customer data for editing
  const openEditCustomerModal = (index: number) => {
    const customer = formCustomers[index];
    setEditingCustomerIndex(index);
    setIsEditingCustomer(true);

    setEditFormCompany(customer.company || "");
    setEditFormName(customer.name || "");
    setEditFormEmail(customer.email || "");
    setEditFormContactNumber(customer.number || "");
    setEditFormTime(customer.time || "");

    setShowCustomerModal(true);
  };

  // Reset edit form
  const resetCustomerEditForm = () => {
    setEditFormCompany("");
    setEditFormName("");
    setEditFormEmail("");
    setEditFormContactNumber("");
    setEditFormTime("");
    setEditingCustomerIndex(null);
    setIsEditingCustomer(false);
  };

  // Function to save edited customer
  const saveEditedCustomer = () => {
    if (editingCustomerIndex === null) return;

    const updatedCustomers = [...formCustomers];
    updatedCustomers[editingCustomerIndex] = {
      company: editFormCompany,
      name: editFormName,
      email: editFormEmail,
      number: editFormContactNumber,
      time: editFormTime,
    };

    setFormCustomers(updatedCustomers);

    resetCustomerEditForm();
    setShowCustomerModal(false);
    //Alert.alert("Success", "Customer updated successfully!");
  };

  const renderCustomerModal = () => {
    return (
      <Modal
        visible={showCustomerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowCustomerModal(false);
          resetCustomerEditForm();
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCustomerModal(false);
            resetCustomerEditForm();
          }}
        >
          <View style={styles.modalContent}>
            <View
              style={[
                styles.modalHeader,
                { borderBottomWidth: 0, marginBottom: 10 },
              ]}
            >
              <Text style={styles.modalTitle}>
                {isEditingCustomer ? "Edit Customer" : "Add Customer"}
              </Text>
            </View>

            <View style={[{ gap: 10, marginVertical: 10 }]}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Company:
                </Text>
                <TextInput
                  placeholder="Company"
                  value={editFormCompany}
                  onChangeText={setEditFormCompany}
                  style={[styles.textInput]}
                  placeholderTextColor="#000"
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Name:
                </Text>
                <TextInput
                  placeholder="Name"
                  value={editFormName}
                  onChangeText={setEditFormName}
                  style={[styles.textInput]}
                  placeholderTextColor="#000"
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Email:
                </Text>
                <TextInput
                  placeholder="Email"
                  value={editFormEmail}
                  onChangeText={setEditFormEmail}
                  style={[styles.textInput]}
                  placeholderTextColor="#000"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Number:
                </Text>
                <TextInput
                  placeholder="Number"
                  value={editFormContactNumber}
                  onChangeText={setEditFormContactNumber}
                  style={[styles.textInput]}
                  placeholderTextColor="#000"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Time:
                </Text>
                <TimePickerInput
                  value={editFormTime}
                  onChange={setEditFormTime}
                  placeholder="Select time"
                  disabled={isSaving}
                />
              </View>
            </View>

            <View style={[styles.buttonRow, { marginTop: 10 }]}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.cancelButton]}
                onPress={() => {
                  setShowCustomerModal(false);
                  resetCustomerEditForm();
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
                onPress={() => {
                  if (isEditingCustomer) {
                    saveEditedCustomer();
                  } else {
                    addCustomerRow(
                      editFormCompany,
                      editFormName,
                      editFormEmail,
                      editFormContactNumber,
                      editFormTime,
                    );
                    resetCustomerEditForm();
                    setShowCustomerModal(false);
                  }
                }}
                disabled={isSaving}
              >
                <Text style={styles.textStyle}>
                  {isEditingCustomer ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select an Expense</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {allExpenses.length === 0 && (
                <Text style={styles.noTripsText}>No expense found</Text>
              )}
              {allExpenses.map((expense) => {
                return (
                  <TouchableOpacity
                    key={expense.id}
                    style={[styles.modalTripItem]}
                    onPress={() => {
                      setShowEditModal(false);
                      setEditExpense(expense.id);
                    }}
                  >
                    <Text style={[styles.tripRemark]}>
                      {expense?.expense_type}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#666" }}>
                      {getDisplayText(expense)}
                    </Text>
                    <Text style={[styles.addressText]}>
                      RM {expense.amount.toFixed(2)}
                    </Text>
                    <Text style={[styles.timeText]}>
                      {formatDate(expense?.date || "")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const fieldMessage = (
    <Text
      style={[{ fontSize: 14, fontWeight: "600", marginTop: 10, width: 500 }]}
    >
      Required fields in <Text style={{ color: "#2196F3" }}>blue</Text>.
    </Text>
  );

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={64}
    >
      <View style={[styles.mobileContainer, { gap: 10 }]}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              setShowEditModal(true);
            }}
            style={[
              styles.button,
              {
                backgroundColor: "#FFA500",
                padding: 12,
                marginTop: 0,
              },
            ]}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>Edit General Expense</Text>
          </TouchableOpacity>
          {editingExpense && (
            <TouchableOpacity
              onPress={() => {
                setEditingExpense(false);
                resetForm();
              }}
              style={[styles.button, { padding: 12, marginTop: 0 }]}
              disabled={isSaving}
            >
              <Text style={styles.buttonText}>Cancel Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        {renderEditModal()}
        {fieldMessage}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.fieldLabel}>Date:</Text>
          <DatePickerInput
            value={formDate}
            onChange={setFormDate}
            placeholder="Select your date"
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Expense Purpose:
          </Text>
          <View style={styles.inputContainer}>
            <Picker
              selectedValue={formExpenseType}
              onValueChange={(itemValue) => setFormExpenseType(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              dropdownIconColor="#666"
              mode="dropdown"
            >
              <Picker.Item label="Select a purpose..." value="" />
              <Picker.Item label={expenseType["1"]} value="1" />
              <Picker.Item label={expenseType["2"]} value="2" />
              <Picker.Item label={expenseType["3"]} value="3" />
              <Picker.Item label={expenseType["4"]} value="4" />
              <Picker.Item label={expenseType["5"]} value="5" />
              <Picker.Item label={expenseType["6"]} value="6" />
            </Picker>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={[styles.fieldLabel]}>Amount (RM):</Text>
          <TextInput
            value={formAmount}
            onChangeText={setFormAmount}
            keyboardType="decimal-pad"
            style={[styles.textInput, { maxWidth: 80 }]}
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={[styles.fieldLabel]}>Vendor:</Text>
          <TextInput
            value={formVendor}
            onChangeText={setFormVendor}
            style={[styles.textInput, { flex: 1 }]}
            placeholder="Vendor"
            placeholderTextColor="#000"
          />
        </View>

        {(formExpenseType === " 1" || formExpenseType === "2") && (
          <>
            <Text style={[styles.formLabel, { fontSize: 16 }]}>
              Customer Details:
            </Text>
            {formCustomers.map((customer, index) => {
              if (index === 0) return null;

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.customerCard}
                  onPress={() => openEditCustomerModal(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.customerHeader}>
                    <Text style={styles.customerIndex}>Customer #{index}</Text>
                    <View style={styles.customerHeaderActions}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          removeCustomerRow(index);
                        }}
                        style={styles.removeCustomerButton}
                      >
                        <Text style={styles.removeCustomerText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.customerDetails}>
                    <Text style={styles.customerDetailText}>
                      <Text style={styles.customerDetailLabel}>Company: </Text>
                      {customer.company || "N/A"}
                    </Text>
                    <Text style={styles.customerDetailText}>
                      <Text style={styles.customerDetailLabel}>Name: </Text>
                      {customer.name || "N/A"}
                    </Text>
                    <Text style={styles.customerDetailText}>
                      <Text style={styles.customerDetailLabel}>Email: </Text>
                      {customer.email || "N/A"}
                    </Text>
                    <Text style={styles.customerDetailText}>
                      <Text style={styles.customerDetailLabel}>Number: </Text>
                      {customer.number || "N/A"}
                    </Text>
                    <Text style={styles.customerDetailText}>
                      <Text style={styles.customerDetailLabel}>Time: </Text>
                      {customer.time || "N/A"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={() => {
                console.log(formCustomers);
                setShowCustomerModal(true);
              }}
              style={[
                {
                  backgroundColor: "#2196F3",
                  borderRadius: 5,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  justifyContent: "center",
                  minHeight: 36,
                  alignItems: "center",
                },
              ]}
            >
              <Text style={styles.buttonText}>+ Add Customer</Text>
            </TouchableOpacity>
          </>
        )}

        {renderCustomerModal()}

        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        ></View>

        <View style={{ alignItems: "flex-start", gap: 10 }}>
          <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
            Expense Report:
          </Text>
          <TextInput
            value={formExpenseReport}
            onChangeText={setFormExpenseReport}
            multiline
            style={[
              styles.textInput,
              {
                minHeight: 200,
                width: "100%",
                textAlignVertical: "top",
                textAlign: "left",
              },
            ]}
            placeholderTextColor="#000"
            placeholder="Expense Report"
          />
        </View>

        <TouchableOpacity
          onPress={editingExpense ? handleEdit : handleSubmit}
          style={[styles.button, { opacity: isSaving ? 0.5 : 1 }]}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>
              {editingExpense ? "Submit Edit" : "Submit Expense"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}

const htmlInputStyle = {
  padding: "10px",
  border: "1px solid #ccc",
  width: "100%",
  maxWidth: "200px",
  minHeight: "36px",
  boxSizing: "border-box" as const,
  backgroundColor: "#fff",
  marginRight: "10px",
};
const htmlSelectStyle = { ...htmlInputStyle, height: "auto" };

const styles = StyleSheet.create({
  // Mobile Container
  mobileContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginVertical: 10,
  },

  // Shared Text
  timeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2196F3",
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4caf50",
  },
  noTripsText: {
    padding: 20,
    textAlign: "center",
    color: "#888",
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2e7d32",
  },
  disabledTripItem: {
    opacity: 0.6,
  },
  disabledText: {
    color: "#9e9e9e",
  },
  boldLabel: { fontWeight: "bold", color: "#333" },
  addressText: { fontSize: 13, color: "#444", marginTop: 2 },

  // Field Styles
  fieldLabel: { fontSize: 14, fontWeight: "600", width: 100 },
  fieldValue: { fontSize: 14, width: 120, paddingVertical: 10 },
  fieldLabelMandatory: { color: "#2196F3" },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  formLabel: { fontSize: 18, fontWeight: "bold" },

  // Input Styles
  textInput: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    zIndex: 1,
    position: "relative",
    marginRight: 10,
  },
  inputContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#eee",
    height: 48,
  },
  picker: {
    width: "100%",
    color: "#000",
    fontSize: 14,
  },
  pickerItem: {
    fontSize: 14,
  },

  // Buttons
  dropdownInput: {
    backgroundColor: "#2196F3",
    borderRadius: 5,
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    minHeight: 36,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold" },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  button: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
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

  // Added Trips
  addedTripsContainer: { marginTop: 5 },
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

  // Modals
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
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
  },
  closeButton: { fontSize: 20, fontWeight: "bold", color: "#999" },
  closeButtonWrapper: {
    flexShrink: 0,
    padding: 4,
  },
  modalList: { maxHeight: 400 },
  modalTripItem: { padding: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" },

  // Mobile Modal (Edit Modal)
  mobileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  mobileModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  mobileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  mobileModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  mobileModalList: {
    paddingHorizontal: 16,
  },
  mobileTripItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  // Customer Cards
  customerCard: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  customerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  customerIndex: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  customerDetails: {
    gap: 4,
  },
  customerDetailText: {
    fontSize: 13,
    color: "#444",
  },
  customerDetailLabel: {
    fontWeight: "600",
    color: "#666",
  },
  removeCustomerButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f44336",
    alignItems: "center",
    justifyContent: "center",
  },
  removeCustomerText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  customerHeaderActions: {
    flexDirection: "row",
    gap: 8,
  },

  // File Upload
  uploadButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  fileListContainer: {
    gap: 8,
  },
  fileListTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 12,
  },
  filePreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  fileThumbnail: {
    width: "100%",
    height: "100%",
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  fileMeta: {
    fontSize: 12,
    color: "#888",
  },
  removeFileButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f44336",
    alignItems: "center",
    justifyContent: "center",
  },
  removeFileText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 16,
  },
});
