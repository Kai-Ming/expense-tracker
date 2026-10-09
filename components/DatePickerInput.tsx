import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DatePickerProps {
  value: string; // Format: YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Select Date",
  disabled = false,
}: DatePickerProps) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(
    value ? new Date(value + "T00:00:00") : new Date(),
  );

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
    }

    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === "android") {
        onChange(formatDate(selectedDate));
      }
    }
  };

  const handleConfirm = () => {
    onChange(formatDate(tempDate));
    setShow(false);
  };

  const handleCancel = () => {
    setTempDate(value ? new Date(value + "T00:00:00") : new Date());
    setShow(false);
  };

  const showDatePicker = () => {
    if (!disabled) {
      setTempDate(value ? new Date(value + "T00:00:00") : new Date());
      setShow(true);
    }
  };

  // For iOS, we show the picker in a modal
  const renderIOSPicker = () => {
    if (!show) return null;

    return (
      <View style={styles.iosPickerContainer}>
        <View style={styles.iosPickerHeader}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.iosPickerCancel}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleConfirm}>
            <Text style={styles.iosPickerConfirm}>Done</Text>
          </TouchableOpacity>
        </View>
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
          style={styles.iosPicker}
        />
      </View>
    );
  };

  // For Android, we show the native picker
  const renderAndroidPicker = () => {
    if (!show) return null;

    return (
      <DateTimePicker
        value={tempDate}
        mode="date"
        display="default"
        onChange={handleDateChange}
      />
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.input, disabled && styles.disabledInput]}
        onPress={showDatePicker}
        disabled={disabled}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
      </TouchableOpacity>

      {Platform.OS === "ios" ? renderIOSPicker() : renderAndroidPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    justifyContent: "center",
  },
  disabledInput: {
    backgroundColor: "#f0f0f0",
    borderColor: "#ddd",
  },
  inputText: {
    fontSize: 16,
    color: "#333",
  },
  placeholderText: {
    color: "#999",
  },
  iosPickerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  iosPickerCancel: {
    fontSize: 16,
    color: "#666",
  },
  iosPickerConfirm: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  iosPicker: {
    height: 216,
  },
});
