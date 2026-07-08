import GeneralExpenseForm from "@/components/GeneralExpenseForm";
import MileageForm from "@/components/MileageForm";
import OutstationExpenseForm from "@/components/OutstationForm";
import { Text, View } from "@/components/Themed";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

export default function SubmitExpenseWebScreen() {
  const [tabIndex, setTabIndex] = useState<number>(1);

  const changeForm = (index: number) => {
    setTabIndex(index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => changeForm(1)}
          style={[
            styles.tabButton,
            { marginRight: 10 },
            tabIndex === 1 ? styles.activeTabButton : styles.inactiveTabButton,
          ]}
        >
          <Text
            style={
              tabIndex === 1
                ? styles.activeButtonText
                : styles.inactiveButtonText
            }
          >
            Mileage Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => changeForm(2)}
          style={[
            styles.tabButton,
            { marginRight: 10 },
            tabIndex === 2 ? styles.activeTabButton : styles.inactiveTabButton,
          ]}
        >
          <Text
            style={
              tabIndex === 2
                ? styles.activeButtonText
                : styles.inactiveButtonText
            }
          >
            General Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => changeForm(3)}
          style={[
            styles.tabButton,
            { marginRight: 10 },
            tabIndex === 3 ? styles.activeTabButton : styles.inactiveTabButton,
          ]}
        >
          <Text
            style={
              tabIndex === 3
                ? styles.activeButtonText
                : styles.inactiveButtonText
            }
          >
            Outstation Expense
          </Text>
        </TouchableOpacity>
      </View>

      {tabIndex === 1 && <MileageForm />}
      {tabIndex === 2 && <GeneralExpenseForm />}
      {tabIndex === 3 && <OutstationExpenseForm />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  tabRow: {
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 20,
    flexDirection: "row",
  },
  tabButton: {
    borderRadius: 5,
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    minHeight: 36,
    maxWidth: 200,
    alignItems: "center",
  },
  inactiveTabButton: {
    backgroundColor: "#2196F3",
  },
  activeTabButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  inactiveButtonText: { color: "white", fontWeight: "bold" },
  activeButtonText: { color: "#2196F3", fontWeight: "bold" },
});
