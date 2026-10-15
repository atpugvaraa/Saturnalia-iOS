// src/components/admin/UserQRScannerModal.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ArrowLeft, QrCode } from "lucide-react-native";
import { showAlert } from "../index";
import { useThemeStore } from "@/state/themeStore";

interface UserQRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onUserIdScanned: (userId: string) => void;
}

const UserQRScannerModal: React.FC<UserQRScannerModalProps> = ({
  visible,
  onClose,
  onUserIdScanned,
}) => {
  const { isDark } = useThemeStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraKey, setCameraKey] = useState(Date.now());
  const [cameraReady, setCameraReady] = useState(false);

  const modalBg = isDark ? "#1C1C20" : "#FFFFFF";
  const modalBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";

  // Reset camera when modal opens or closes
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setCameraReady(false);

      const timer = setTimeout(() => {
        setCameraKey(Date.now());
        setTimeout(() => {
          setCameraReady(true);
        }, 200);
      }, 100);

      return () => {
        clearTimeout(timer);
        setScanned(false);
        setCameraReady(false);
      };
    }
  }, [visible]);

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;

    setScanned(true);

    // Extract userId from QR data
    // QR data should contain just the userId
    if (data && data.trim()) {
      onUserIdScanned(data.trim());
      // Don't close immediately - let parent handle it
    } else {
      showAlert("Invalid QR Code", "The scanned QR code does not contain valid user information.", [
        { text: "Try Again", onPress: () => setScanned(false) },
      ]);
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.75)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <View
            style={{
              backgroundColor: modalBg,
              borderWidth: 1,
              borderColor: modalBorder,
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 360,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "rgba(65, 184, 240, 0.15)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <QrCode size={32} color="#41B8F0" />
            </View>
            <Text
              style={{
                fontFamily: "Talina",
                color: textPrimary,
                fontSize: 22,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Camera Access
            </Text>
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: textSecondary,
                textAlign: "center",
                marginBottom: 24,
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              We need camera access to quickly scan user QR codes securely.
            </Text>
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    color: textSecondary,
                    fontSize: 14,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#41B8F0",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={requestPermission}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    color: "#FFFFFF",
                    fontSize: 14,
                  }}
                >
                  Grant Access
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        {/* Camera View */}
        {cameraReady ? (
          <CameraView
            key={`user-qr-camera-${cameraKey}`}
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "pdf417"],
            }}
          >
            {/* Scanner Frame - Centered */}
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <View style={{ position: "relative" }}>
                <View
                  style={{
                    width: 250,
                    height: 250,
                    borderRadius: 16,
                    backgroundColor: "transparent",
                  }}
                >
                  {/* Corner indicators */}
                  <View
                    style={{
                      position: "absolute",
                      top: -1,
                      left: -1,
                      width: 32,
                      height: 32,
                      borderLeftWidth: 4,
                      borderTopWidth: 4,
                      borderColor: "#41B8F0",
                      borderTopLeftRadius: 8,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      top: -1,
                      right: -1,
                      width: 32,
                      height: 32,
                      borderRightWidth: 4,
                      borderTopWidth: 4,
                      borderColor: "#41B8F0",
                      borderTopRightRadius: 8,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: -1,
                      left: -1,
                      width: 32,
                      height: 32,
                      borderLeftWidth: 4,
                      borderBottomWidth: 4,
                      borderColor: "#41B8F0",
                      borderBottomLeftRadius: 8,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: -1,
                      right: -1,
                      width: 32,
                      height: 32,
                      borderRightWidth: 4,
                      borderBottomWidth: 4,
                      borderColor: "#41B8F0",
                      borderBottomRightRadius: 8,
                    }}
                  />
                </View>
              </View>
            </View>
          </CameraView>
        ) : (
          <View style={{ flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#41B8F0" />
            <Text style={{ fontFamily: "Poppins_500Medium", color: "#FFFFFF", fontSize: 14, marginTop: 12 }}>
              Initializing camera...
            </Text>
          </View>
        )}

        {/* Absolute Overlay Container */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
          {/* Header Row */}
          <View style={{ position: "absolute", top: 48, left: 20, right: 20, flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                borderRadius: 20,
                padding: 10,
                marginRight: 12,
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: "center" }} pointerEvents="none">
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  color: "#FFFFFF",
                  fontSize: 17,
                  textAlign: "center",
                }}
              >
                Scan User QR Code
              </Text>
            </View>

            <View style={{ width: 44 }} pointerEvents="none" />
          </View>

          {/* Status Message */}
          <View style={{ position: "absolute", bottom: 120, left: 24, right: 24 }} pointerEvents="none">
            <View
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.15)",
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_500Medium",
                  color: "#FFFFFF",
                  textAlign: "center",
                  fontSize: 14,
                }}
              >
                {scanned ? "Processing..." : "Position QR code in the frame"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UserQRScannerModal;
