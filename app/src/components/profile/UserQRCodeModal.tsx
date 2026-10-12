import React from "react";
import { View, Text, Modal, TouchableOpacity, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useThemeStore } from "@/state/themeStore";

interface UserQRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const UserQRCodeModal: React.FC<UserQRCodeModalProps> = ({
  visible,
  onClose,
  userId,
  userName,
}) => {
  const { isDark } = useThemeStore();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            backgroundColor: isDark ? "#1C1C20" : "#FFFFFF",
            borderRadius: 24,
            padding: 24,
            width: "100%",
            maxWidth: 340,
            position: "relative",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 10,
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
              borderRadius: 20,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={20} color={isDark ? "#FFFFFF" : "#000000"} />
          </TouchableOpacity>

          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 20, marginTop: 8 }}>
            <Text
              style={{
                fontFamily: "Poppins_700Bold",
                color: isDark ? "#FFFFFF" : "#000000",
                fontSize: 20,
                marginBottom: 4,
              }}
            >
              Your QR Code
            </Text>
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: isDark ? "#9CA3AF" : "#666666",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              Show this QR code to access your profile
            </Text>
          </View>

          {/* QR Code Container (Always crisp white for scanner readability) */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 20,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
              alignSelf: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {userId && userId.length > 0 ? (
              <QRCode
                value={userId}
                size={180}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            ) : (
              <View
                style={{
                  width: 180,
                  height: 180,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#F3F4F6",
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    color: "#6B7280",
                    textAlign: "center",
                    fontSize: 13,
                  }}
                >
                  No User ID Available
                </Text>
              </View>
            )}
          </View>

          {/* User Info */}
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: isDark ? "#FFFFFF" : "#000000",
                fontSize: 17,
                marginBottom: 2,
              }}
            >
              {userName}
            </Text>
          </View>

          {/* Info Text */}
          <View
            style={{
              marginTop: 16,
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: isDark ? "#9CA3AF" : "#666666",
                fontSize: 12,
                textAlign: "center",
                lineHeight: 17,
              }}
            >
              This QR code contains your unique user ID for quick check-in, event access, and merchandise pick-up.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UserQRCodeModal;
