import React, { useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface TravelmateUser {
  id: string;
  username: string;
}

interface SelectTravelmateModalProps {
  visible: boolean;
  onClose: () => void;
  users: TravelmateUser[];
  onSelectUser: (user: TravelmateUser) => void;
  title?: string;
}

const SelectTravelmateModal: React.FC<SelectTravelmateModalProps> = ({
  visible,
  onClose,
  users,
  onSelectUser,
  title = "Select a Travelmate",
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => u.username?.toLowerCase().startsWith(term));
  }, [users, searchTerm]);

  const handleClose = () => {
    setSearchTerm("");
    onClose();
  };

  const handleSelect = (user: TravelmateUser) => {
    onSelectUser(user);
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <TextInput
            style={styles.searchInput}
            placeholder="Type to filter by username..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.tableContainer}>
            <ScrollView
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
            >
              {filteredUsers.length === 0 && (
                <Text style={styles.emptyText}>No users found</Text>
              )}
              {filteredUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.tableRow}
                  onPress={() => handleSelect(user)}
                >
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.tableCell} numberOfLines={1}>
                      {user.username}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SelectTravelmateModal;

const styles = StyleSheet.create({
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
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#fff",
  },
  tableContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  modalList: { maxHeight: 400 },
  tableRow: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  tableCell: { fontSize: 13, color: "#666" },
  emptyText: {
    textAlign: "center",
    padding: 16,
    color: "#888",
    fontStyle: "italic",
  },
});
