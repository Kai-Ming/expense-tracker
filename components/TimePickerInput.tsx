import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface TimePickerProps {
  value: string; // Format: HH:mm
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TimePickerInput({
  value,
  onChange,
  placeholder = "Select Time",
  disabled = false,
}: TimePickerProps) {
  const [show, setShow] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(() => {
    if (value) {
      const [hours, minutes] = value.split(":").map(Number);
      const date = new Date();
      date.setHours(hours || 0, minutes || 0, 0, 0);
      return date;
    }
    return new Date();
  });

  const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatDisplayTime = (timeStr: string): string => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
    }

    if (selectedTime) {
      setTempTime(selectedTime);
      if (Platform.OS === "android") {
        onChange(formatTime(selectedTime));
      }
    }
  };

  const handleConfirm = () => {
    onChange(formatTime(tempTime));
    setShow(false);
  };

  const handleCancel = () => {
    if (value) {
      const [hours, minutes] = value.split(":").map(Number);
      const date = new Date();
      date.setHours(hours || 0, minutes || 0, 0, 0);
      setTempTime(date);
    } else {
      setTempTime(new Date());
    }
    setShow(false);
  };

  const showTimePicker = () => {
    if (!disabled) {
      if (value) {
        const [hours, minutes] = value.split(":").map(Number);
        const date = new Date();
        date.setHours(hours || 0, minutes || 0, 0, 0);
        setTempTime(date);
      } else {
        setTempTime(new Date());
      }
      setShow(true);
    }
  };

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
          value={tempTime}
          mode="time"
          display="spinner"
          onChange={handleTimeChange}
          style={styles.iosPicker}
        />
      </View>
    );
  };

  const renderAndroidPicker = () => {
    if (!show) return null;

    return (
      <DateTimePicker
        value={tempTime}
        mode="time"
        display="default"
        onChange={handleTimeChange}
      />
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.input, disabled && styles.disabledInput]}
        onPress={showTimePicker}
        disabled={disabled}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value ? formatDisplayTime(value) : placeholder}
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
    zIndex: 999,
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
