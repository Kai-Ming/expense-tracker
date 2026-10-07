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

interface User {
  id: string;
  username: string;
  email: string;
  ess_no: string;
  department: string;
  grade: string;
  cost_center: string;
  role: number;
  office: number;
  active: boolean;
  home_coordinates: {
    latitude: number;
    longitude: number;
  };
  subordinates: string[];
  home_address: string;
}

interface SelectUserModalProps {
  visible: boolean;
  onClose: () => void;
  users: User[];
  selectedUser?: string;
  onSelectUser: (user: User) => void;
  onClearUser?: () => void;
  onToggleUser?: (user: User) => void;
  title?: string;
  addedUsers?: User[];
  showIndex?: boolean;
  extraColumns?: ExtraColumn[];
  excludeUsername?: string;
}

interface ExtraColumn {
  key: string; // key to read off the user
  label: string; // header text
  flex: number; // column width
  render?: (user: User) => string; // optional formatter (e.g. roleMap)
}

const SelectUserModal: React.FC<SelectUserModalProps> = ({
  visible,
  onClose,
  users,
  selectedUser,
  onSelectUser,
  onClearUser,
  onToggleUser,
  title = "Select a User",
  addedUsers = [],
  showIndex = false,
  extraColumns = [],
  excludeUsername = "",
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const baseUsers = excludeUsername
    ? users.filter((u) => u.username !== excludeUsername)
    : users;

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return baseUsers.filter((u) => u.username?.toLowerCase().startsWith(term));
  }, [users, searchTerm]);

  const handleClose = () => {
    setSearchTerm("");
    onClose();
  };

  const handleSelect = (user: User) => {
    onSelectUser(user);
    handleClose();
  };

  const handleClear = () => {
    onClearUser?.();
    handleClose();
  };

  const isToggleMode = !!onToggleUser;

  const handleRowPress = (user: User) => {
    if (isToggleMode) {
      onToggleUser!(user);
    } else {
      handleSelect(user); // existing behavior preserved
    }
  };

  const alignStyle = showIndex ? styles.centerText : undefined;

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

        <View style={styles.userModalContent}>
          <View style={[styles.modalHeader, { marginBottom: 15 }]}>
            <View
              style={{ flexDirection: "row", gap: 15, alignItems: "center" }}
            >
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>
                {title}
              </Text>
              {selectedUser && onClearUser && (
                <TouchableOpacity style={styles.button} onPress={handleClear}>
                  <Text style={styles.buttonText}>Clear User</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>

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
            {/* Header */}
            <View style={styles.tableHeader}>
              {showIndex && (
                <View style={{ flex: 0.5 }}>
                  <Text style={[styles.headerCell, alignStyle]}></Text>
                </View>
              )}
              <View style={{ flex: 3 }}>
                <Text style={[styles.headerCell, alignStyle]}>Username</Text>
              </View>
              <View style={{ flex: 2 }}>
                <Text style={[styles.headerCell, alignStyle]}>Email</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerCell, alignStyle]}>Department</Text>
              </View>
              <View style={{ flex: 0.5 }}>
                <Text style={[styles.headerCell, alignStyle]}>Grade</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerCell, alignStyle]}>Cost Center</Text>
              </View>
              {extraColumns.map((col) => (
                <View key={col.key} style={{ flex: col.flex }}>
                  <Text style={[styles.headerCell, alignStyle]}>
                    {col.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Body */}
            <ScrollView
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
            >
              {filteredUsers.length === 0 && (
                <Text style={styles.emptyText}>No users found</Text>
              )}
              {filteredUsers.map((user, index) => {
                const isAdded = addedUsers.some((a) => a.id === user.id);
                const cellStyle = [
                  styles.tableCell,
                  isAdded && styles.disabledText,
                  alignStyle,
                ];

                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.tableRow,
                      isAdded && styles.disabledUserItem,
                    ]}
                    disabled={!isToggleMode && isAdded}
                    onPress={() => handleRowPress(user)}
                  >
                    {showIndex && (
                      <View style={{ flex: 0.5 }}>
                        <Text style={cellStyle} numberOfLines={1}>
                          {index + 1}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 3 }}>
                      <Text style={cellStyle} numberOfLines={1}>
                        {user.username}
                      </Text>
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={cellStyle} numberOfLines={1}>
                        {user.email}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={cellStyle} numberOfLines={1}>
                        {user.department}
                      </Text>
                    </View>
                    <View style={{ flex: 0.5 }}>
                      <Text style={cellStyle} numberOfLines={1}>
                        {user.grade}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={cellStyle} numberOfLines={1}>
                        {user.cost_center}
                      </Text>
                    </View>
                    {extraColumns.map((col) => (
                      <View key={col.key} style={{ flex: col.flex }}>
                        <Text style={cellStyle} numberOfLines={1}>
                          {col.render
                            ? col.render(user)
                            : ((user as any)[col.key] ?? "N/A")}
                        </Text>
                      </View>
                    ))}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SelectUserModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  userModalContent: {
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
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalCloseButton: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#999",
  },
  button: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 12,
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
  modalList: {
    maxHeight: 400,
  },
  emptyText: {
    textAlign: "center",
    padding: 16,
    color: "#888",
    fontStyle: "italic",
  },
  centerText: {
    textAlign: "center",
  },
  disabledUserItem: {
    backgroundColor: "#e0e0e0",
    opacity: 0.6,
  },
  disabledText: {
    color: "#9e9e9e", // grey text
  },
});
