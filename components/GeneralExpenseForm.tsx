import { Text, View } from "@/components/Themed";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { db } from "../firebaseConfig";

export default function GeneralExpenseForm() {
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

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const expenseType = {
    "1": "Meal with customer",
    "2": "Meal with supplier",
    "3": "Medical",
    "4": "Purchase of goods",
    "5": "Staff benefits",
    "6": "Others",
  };

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
      console.log("not valid");
      alert("Please ensure all required fields are filled.");
      return;
    }
    console.log("valid");
    try {
      await addDoc(collection(db, "expenses"), {
        user_id: userId,
        user_name: username,
        date: formDate,
        expense_type: expenseType[formExpenseType as keyof typeof expenseType],
        amount: parseFloat(formAmount),
        customers: formCustomers,
        vendor: formVendor,
        expense_report: formExpenseReport,
        type: 2, // 1 mileage, 2 general, 3 outstation
        approval_status: 0,
        created_at: serverTimestamp(),
      });
      resetForm();
      alert("Expense submitted successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save expense.");
    }
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

  const resetForm = () => {
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
  };

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
          <View style={styles.wrapper}>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={true}
              style={styles.horizontalScrollView}
              contentContainerStyle={styles.horizontalContent}
            >
              <View style={styles.formContainer}>
                <Text style={styles.formLabel}>Submit General Expense</Text>
                {fieldMessage}
                <View style={[styles.inputRow, { marginTop: 10 }]}>
                  <Text style={styles.fieldLabel}>Date:</Text>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    style={htmlInputStyle}
                  />
                  <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                    Expense Purpose:
                  </Text>
                  <select
                    value={formExpenseType}
                    onChange={(e) => setFormExpenseType(e.target.value)}
                    style={htmlSelectStyle}
                  >
                    <option value="">Select a purpose...</option>
                    <option value="1">{expenseType["1"]}</option>
                    <option value="2">{expenseType["2"]}</option>
                    <option value="3">{expenseType["3"]}</option>
                    <option value="4">{expenseType["4"]}</option>
                    <option value="5">{expenseType["5"]}</option>
                    <option value="6">{expenseType["6"]}</option>
                  </select>
                  <Text style={styles.fieldLabel}></Text>

                  <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                    Amount (RM):
                  </Text>
                  <TextInput
                    value={formAmount}
                    onChangeText={setFormAmount}
                    keyboardType="decimal-pad"
                    style={styles.webTextInput}
                    editable={!isSaving}
                  />

                  <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                    Vendor:
                  </Text>
                  <TextInput
                    value={formVendor}
                    onChangeText={setFormVendor}
                    placeholder="Vendor"
                    style={styles.webTextInput}
                    editable={!isSaving}
                  />
                </View>

                {/* {(formExpenseType === "1" || formExpenseType === "2") && (
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
                  placeholderTextColor="#999999"
                />
                <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                  Email:
                </Text>
                <TextInput
                  value={formEmail}
                  onChangeText={setFormEmail}
                  keyboardType="email-address"
                  style={styles.webTextInput}
                  placeholder="Enter Email"
                  placeholderTextColor="#999999"
                  editable={!isSaving}
                />
              </View>
            )} */}

                {(formExpenseType === "1" || formExpenseType === "2") && (
                  <View style={[{ marginTop: 10 }]}>
                    <Text style={[styles.formLabel, { fontSize: 16 }]}>
                      Customer Details:
                    </Text>

                    {formCustomers.map((customer, index) => (
                      <View
                        key={index}
                        style={[
                          styles.inputRow,
                          { marginTop: 10, alignItems: "center" },
                        ]}
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

                        <View
                          style={[
                            { alignItems: "center", flexDirection: "row" },
                          ]}
                        >
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
                              handleCustomerChange(
                                index,
                                "time",
                                e.target.value,
                              )
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
                          <Text style={{ color: "red", fontWeight: "bold" }}>
                            ✕
                          </Text>
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
                )}

                <View
                  style={[
                    styles.inputRow,
                    { marginTop: 10, alignItems: "flex-start" },
                  ]}
                >
                  <Text style={[styles.fieldLabel, styles.fieldLabelMandatory]}>
                    Expense Report:
                  </Text>
                  <TextInput
                    value={formExpenseReport}
                    onChangeText={setFormExpenseReport}
                    multiline
                    style={[
                      styles.webTextInput,
                      { minHeight: 200, width: "100%", maxWidth: "100%" },
                    ]}
                    placeholder="Expense Report"
                  />
                </View>
                <TouchableOpacity
                  onPress={handleSubmit}
                  style={[styles.button, { marginBottom: 20 }]}
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
  fieldLabelMandatory: { color: "#2196F3" },
  wrapper: {
    flex: 1,
  },
  horizontalScrollView: {
    flex: 1,
  },
  horizontalContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
