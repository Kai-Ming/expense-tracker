// CustomerExporter.web.ts
import { Alert } from "react-native";

// Type definitions
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
  username?: string;
  business_card_url?: string;
  route_image_url?: string;
  receipt_urls?: string[];
  approval_status: number;
  type: number;
  created_at: any;
}

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
  username?: string;
  email?: string;
  expense_report?: string;
  type: number;
  approval_status: number;
  created_at: any;
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

interface Customer {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  customerName?: string;
  email?: string;
  emailId?: string;
  phone?: string;
  mobile?: string;
  contactNumber?: string;
  company?: string;
  companyName?: string;
  created_at?: any; // Added
  expense_type?: string; // Added
  [key: string]: any;
}

// Web-based CSV export
export const exportCustomersToCSV = (
  allMileage: Expense[],
  allGeneral: GeneralExpense[],
  allOutstation: OutstationExpense[],
): void => {
  try {
    // Extract all customers
    const allCustomers: Customer[] = [];

    // Helper to format date consistently
    const formatDate = (date: any): string => {
      if (!date) return "";

      let dateObj: Date;

      // Handle different date types
      if (date.toDate) {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === "string") {
        dateObj = new Date(date);
      } else {
        return String(date);
      }

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return String(date);
      }

      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();
      const hours = String(dateObj.getHours()).padStart(2, "0");
      const minutes = String(dateObj.getMinutes()).padStart(2, "0");
      const seconds = String(dateObj.getSeconds()).padStart(2, "0");

      return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    };

    // Helper to check if customer has any valid values
    const hasValidValues = (customer: Customer): boolean => {
      return Object.values(customer).some((value) => {
        if (typeof value === "string") {
          return value.trim() !== "";
        }
        return value !== null && value !== undefined;
      });
    };

    // Extract from Mileage expenses
    allMileage.forEach((expense: Expense) => {
      if (expense.customers && expense.customers.length > 0) {
        expense.customers.forEach((customer: Customer) => {
          if (hasValidValues(customer)) {
            allCustomers.push({
              ...customer,
              created_at: formatDate(expense.created_at),
              expense_type: "Mileage",
              user_id: expense.user_id,
              username: expense.user_name || expense.username,
              id: expense.id,
            });
          }
        });
      }
    });

    // Extract from General expenses
    allGeneral.forEach((expense: GeneralExpense) => {
      if (expense.customers && expense.customers.length > 0) {
        expense.customers.forEach((customer: Customer) => {
          if (hasValidValues(customer)) {
            allCustomers.push({
              ...customer,
              created_at: formatDate(expense.created_at),
              expense_type: "General",
              user_id: expense.user_id,
              username: expense.user_name || expense.username,
              id: expense.id,
            });
          }
        });
      }
    });

    // Extract from Outstation expenses
    allOutstation.forEach((expense: OutstationExpense) => {
      if (expense.customers && expense.customers.length > 0) {
        expense.customers.forEach((customer: Customer) => {
          if (hasValidValues(customer)) {
            allCustomers.push({
              ...customer,
              created_at: formatDate(expense.created_at),
              expense_type: "Outstation",
              user_id: expense.user_id,
              username: expense.user_name || expense.username,
              id: expense.id,
            });
          }
        });
      }
    });

    if (allCustomers.length === 0) {
      alert("No customers found to export");
      return;
    }

    const filteredCustomers = allCustomers.filter((customer: Customer) => {
      // Check if any value is truthy (not empty, not null, not undefined)
      return Object.values(customer).some((value) => {
        if (typeof value === "string") {
          return value.trim() !== ""; // Also removes whitespace-only strings
        }
        return value != null && value !== undefined;
      });
    });

    // Convert customers to CSV
    const csvData = convertCustomersToCSV(filteredCustomers);

    if (!csvData) {
      alert("Failed to generate CSV data");
      return;
    }

    console.log(filteredCustomers.find((c) => c.id === "Qw0xeZanq1Igr3GmwElw"));

    console.log(filteredCustomers.find((c) => c.id === "oZnLwWf7jYuBpy9Xu4dU"));

    // Download CSV on web
    downloadCSV(csvData);

    Alert.alert(
      "Success",
      `Exported ${allCustomers.length} customers successfully!`,
    );
  } catch (error) {
    console.error("Error exporting customers to CSV:", error);
    alert("Failed to export customers to CSV");
  }
};

const convertCustomersToCSV = (customers: Customer[]): string | null => {
  if (!customers || customers.length === 0) {
    return null;
  }

  // Convert display header back to snake_case for lookup
  const getKeyFromHeader = (header: string): string => {
    return header.toLowerCase().replace(/ /g, "_"); // Replace spaces with underscores
  };

  const formatHeader = (header: string): string => {
    return header
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const headerKeys = [
    "username",
    "company",
    "name",
    "number",
    "email",
    "address",
    "created_at",
  ];

  const headers = headerKeys.map(formatHeader);

  const escapeCSVField = (field: any): string => {
    if (field === null || field === undefined) return "";
    const stringField = String(field);
    if (
      stringField.includes(",") ||
      stringField.includes('"') ||
      stringField.includes("\n")
    ) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const rows: string[][] = customers.map((customer: Customer) => {
    return headers.map((header: string) => {
      // Convert header back to snake_case for lookup
      const key = getKeyFromHeader(header);
      const value = customer[key];
      if (typeof value === "object") {
        return escapeCSVField(JSON.stringify(value));
      }
      return escapeCSVField(value);
    });
  });

  const csvContent: string = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
};

// Web download function
const downloadCSV = (csvData: string): void => {
  // Create blob
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });

  // Create download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `customers_export_${timestamp}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up URL
  URL.revokeObjectURL(url);
};

// Export with specific fields
export const exportCustomersWithSpecificFields = (
  allMileage: Expense[],
  allGeneral: GeneralExpense[],
  allOutstation: OutstationExpense[],
  fields: string[] = ["id", "name", "email", "phone", "company"],
): void => {
  try {
    // Extract all customers
    const allCustomers: Customer[] = [];

    allMileage.forEach((expense: Expense) => {
      if (expense.customers && expense.customers.length > 0) {
        expense.customers.forEach((customer: Customer) => {
          allCustomers.push(customer);
        });
      }
    });

    allGeneral.forEach((expense: GeneralExpense) => {
      if (expense.customers && expense.customers.length > 0) {
        expense.customers.forEach((customer: Customer) => {
          allCustomers.push(customer);
        });
      }
    });

    allOutstation.forEach((expense: OutstationExpense) => {
      if (expense.customers && expense.customers.length > 0) {
        expense.customers.forEach((customer: Customer) => {
          allCustomers.push(customer);
        });
      }
    });

    if (allCustomers.length === 0) {
      Alert.alert("No Data", "No customers found to export");
      return;
    }

    const csvData = convertCustomersToCSVWithFields(allCustomers, fields);

    if (!csvData) {
      Alert.alert("Error", "Failed to generate CSV data");
      return;
    }

    downloadCSV(csvData);

    Alert.alert(
      "Success",
      `Exported ${allCustomers.length} customers successfully!`,
    );
  } catch (error) {
    console.error("Error exporting customers to CSV:", error);
    Alert.alert("Error", "Failed to export customers to CSV");
  }
};

// Helper function to convert customers with specific fields
const convertCustomersToCSVWithFields = (
  customers: Customer[],
  fields: string[],
): string | null => {
  if (!customers || customers.length === 0) {
    return null;
  }

  const escapeCSVField = (field: any): string => {
    if (field === null || field === undefined) return "";
    const stringField = String(field);
    if (
      stringField.includes(",") ||
      stringField.includes('"') ||
      stringField.includes("\n")
    ) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  // Create CSV rows
  const rows: string[][] = customers.map((customer: Customer) => {
    return fields.map((field: string) => {
      const value = customer[field];
      if (typeof value === "object") {
        return escapeCSVField(JSON.stringify(value));
      }
      return escapeCSVField(value);
    });
  });

  const csvContent: string = [
    fields.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
};

// Export with custom delimiter
export const exportCustomersWithDelimiter = (
  allMileage: Expense[],
  allGeneral: GeneralExpense[],
  allOutstation: OutstationExpense[],
  delimiter: string = ",",
): void => {
  try {
    const allCustomers: Customer[] = [];

    allMileage.forEach((expense: Expense) => {
      if (expense.customers && expense.customers.length > 0) {
        expense.customers.forEach((customer: Customer) => {
          allCustomers.push(customer);
        });
      }
    });

    allGeneral.forEach((expense: GeneralExpense) => {
      if (expense.customers && expense.customers.length > 0) {
        expense.customers.forEach((customer: Customer) => {
          allCustomers.push(customer);
        });
      }
    });

    allOutstation.forEach((expense: OutstationExpense) => {
      if (expense.customers && expense.customers.length > 0) {
        expense.customers.forEach((customer: Customer) => {
          allCustomers.push(customer);
        });
      }
    });

    if (allCustomers.length === 0) {
      Alert.alert("No Data", "No customers found to export");
      return;
    }

    const csvData = convertCustomersToCSVWithDelimiter(allCustomers, delimiter);

    if (!csvData) {
      Alert.alert("Error", "Failed to generate CSV data");
      return;
    }

    downloadCSV(csvData);

    Alert.alert(
      "Success",
      `Exported ${allCustomers.length} customers successfully!`,
    );
  } catch (error) {
    console.error("Error exporting customers to CSV:", error);
    Alert.alert("Error", "Failed to export customers to CSV");
  }
};

const convertCustomersToCSVWithDelimiter = (
  customers: Customer[],
  delimiter: string,
): string | null => {
  if (!customers || customers.length === 0) {
    return null;
  }

  const allKeys = new Set<string>();
  customers.forEach((customer: Customer) => {
    Object.keys(customer).forEach((key: string) => {
      allKeys.add(key);
    });
  });

  const headers = Array.from(allKeys);

  const escapeCSVField = (field: any): string => {
    if (field === null || field === undefined) return "";
    const stringField = String(field);
    if (
      stringField.includes(delimiter) ||
      stringField.includes('"') ||
      stringField.includes("\n")
    ) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const rows: string[][] = customers.map((customer: Customer) => {
    return headers.map((header: string) => {
      const value = customer[header];
      if (typeof value === "object") {
        return escapeCSVField(JSON.stringify(value));
      }
      return escapeCSVField(value);
    });
  });

  const csvContent: string = [
    headers.join(delimiter),
    ...rows.map((row) => row.join(delimiter)),
  ].join("\n");

  return csvContent;
};

// React component for web
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CustomerExportComponentProps {
  allMileage: Expense[];
  allGeneral: GeneralExpense[];
  allOutstation: OutstationExpense[];
}

export const CustomerExportComponent: React.FC<
  CustomerExportComponentProps
> = ({ allMileage, allGeneral, allOutstation }) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExportAllCustomers = () => {
    setIsExporting(true);
    try {
      exportCustomersToCSV(allMileage, allGeneral, allOutstation);
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Error", "Failed to export customers");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWithSpecificFields = () => {
    setIsExporting(true);
    try {
      const fields = ["id", "name", "email", "phone", "company"];
      exportCustomersWithSpecificFields(
        allMileage,
        allGeneral,
        allOutstation,
        fields,
      );
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Error", "Failed to export customers");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWithTabDelimiter = () => {
    setIsExporting(true);
    try {
      exportCustomersWithDelimiter(
        allMileage,
        allGeneral,
        allOutstation,
        "\t", // Tab delimiter
      );
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Error", "Failed to export customers");
    } finally {
      setIsExporting(false);
    }
  };

  const getCustomerCount = (): number => {
    const customers: Customer[] = [];

    allMileage.forEach((expense: Expense) => {
      if (expense.customers) {
        customers.push(...expense.customers);
      }
    });

    allGeneral.forEach((expense: GeneralExpense) => {
      if (expense.customers) {
        customers.push(...expense.customers);
      }
    });

    allOutstation.forEach((expense: OutstationExpense) => {
      if (expense.customers) {
        customers.push(...expense.customers);
      }
    });

    return customers.length;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Export</Text>
      <Text style={styles.subtitle}>Total Customers: {getCustomerCount()}</Text>

      <TouchableOpacity
        style={[styles.button, isExporting && styles.buttonDisabled]}
        onPress={handleExportAllCustomers}
        disabled={isExporting}
      >
        <Text style={styles.buttonText}>
          {isExporting ? "Exporting..." : "📊 Export All Customers to CSV"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.secondaryButton,
          isExporting && styles.buttonDisabled,
        ]}
        onPress={handleExportWithSpecificFields}
        disabled={isExporting}
      >
        <Text style={styles.buttonText}>📝 Export Selected Fields</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.tertiaryButton,
          isExporting && styles.buttonDisabled,
        ]}
        onPress={handleExportWithTabDelimiter}
        disabled={isExporting}
      >
        <Text style={styles.buttonText}>📄 Export as TSV (Tab Delimited)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    maxWidth: 600,
    margin: "auto",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center" as const,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    textAlign: "center" as const,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center" as const,
    cursor: "pointer",
  },
  secondaryButton: {
    backgroundColor: "#5856D6",
  },
  tertiaryButton: {
    backgroundColor: "#34C759",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

// Simple usage
export const handleExport = (
  allMileage: Expense[],
  allGeneral: GeneralExpense[],
  allOutstation: OutstationExpense[],
): void => {
  exportCustomersToCSV(allMileage, allGeneral, allOutstation);
};
