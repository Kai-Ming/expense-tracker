import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const InfoModal = ({
  visible,
  title,
  content,
  onCancel,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  loading = false,
  onRequestClose,
}) => {
  const handleCancel = () => {
    if (loading) return;
    onCancel?.();
  };

  const handleConfirm = () => {
    if (loading) return;
    onConfirm?.();
  };

  const handleRequestClose = () => {
    if (loading) return;
    onRequestClose ? onRequestClose() : onCancel?.();
  };

  const showCancelButton = !!onCancel;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      statusBarTranslucent={true}
      onRequestClose={handleRequestClose}
    >
      <View style={styles.screenOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardContainer}
        >
          <ScrollView
            style={styles.modalScrollWrapper}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalView}>
              {title ? <Text style={styles.modalTitle}>{title}</Text> : null}

              <View style={styles.formGroup}>
                {typeof content === "string" ? (
                  <Text style={styles.modalSubtitle}>{content}</Text>
                ) : (
                  content
                )}
              </View>

              <View style={styles.buttonRow}>
                {showCancelButton && (
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={handleCancel}
                    disabled={loading}
                  >
                    <Text style={styles.textStyle}>{cancelText}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.dialogButton,
                    styles.submitButton,
                    loading && { opacity: 0.7 },
                  ]}
                  onPress={handleConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.textStyle}>{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default InfoModal;

const styles = StyleSheet.create({
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
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
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
    elevation: 0,
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
});
