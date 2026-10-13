import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import {
  handleQRScan,
  updateUserCheckingStatus,
  UserRegistrationData,
  UserGateData,
} from "@/api/admin";
import GateUserModal from "@/components/qr/GateUserModal";
import HostelUserModal from "@/components/qr/HostelUserModal";
import { showAlert } from "@/components";
import {
  ArrowLeft,
  QrCode,
  Home,
  Building,
  Calendar,
} from "lucide-react-native";
import { useUserStore } from "@/state/userStore";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { useThemeStore } from "@/state/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Dimensions available if needed
// const { width, height } = Dimensions.get("window");

interface QRScannerProps {
  navigation: any;
  setShowBottomNav?: (show: boolean) => void;
}

export default function QRScanner({
  setShowBottomNav,
}: { setShowBottomNav?: (show: boolean) => void }) {
  const navigation = useAdminNavigation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraKey, setCameraKey] = useState(Date.now());
  const [cameraReady, setCameraReady] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [showHostelModal, setShowHostelModal] = useState(false);
  const [userData, setUserData] = useState<UserRegistrationData | null>(null);
  const [gateUserData, setGateUserData] = useState<UserGateData | null>(null);
  const [hostelUserData, setHostelUserData] = useState<UserGateData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [showCategorySelection, setShowCategorySelection] = useState(true);
  const { userData: userProfile } = useUserStore();

  const gateAllowedRoles = [
    "admin",
    "outreach_admin",
    "hospitality_admin",
    "hospitality_member",
    "outreach_member",
  ];

  const hostelAllowedRoles = [
    "admin",
    "hospitality_admin",
    "hospitality_member",
  ];

  const eventAllowedRoles = [
    "admin",
    "event_admin",
    "event_coordinator",
    "outreach_admin",
    "outreach_member",
    "core_member",
    "executive_committee",
  ];

  const isHostelAccessAllowed = userProfile?.roles
    ? userProfile.roles.some((role) => hostelAllowedRoles.includes(role))
    : false;

  const isGateAccessAllowed = userProfile?.roles
    ? userProfile.roles.some((role) => gateAllowedRoles.includes(role))
    : false;

  const isEventAccessAllowed = userProfile?.roles
    ? userProfile.roles.some((role) => eventAllowedRoles.includes(role))
    : false;

  // Manage navbar and reset states when screen is focused/unfocused
  useFocusEffect(
    React.useCallback(() => {
      // When screen comes into focus
      setSelectedCategory(null);
      setScanned(false);
      setShowCategorySelection(true);

      // Hide the main app navbar
      if (setShowBottomNav) {
        setShowBottomNav(false);
      }

      return () => {
        // When screen loses focus
        // Restore the main app navbar
        if (setShowBottomNav) {
          setShowBottomNav(true);
        }
      };
    }, [setShowBottomNav])
  );

  // Initialize camera when category is selected
  useEffect(() => {
    if (!showCategorySelection && selectedCategory) {
      setCameraReady(false);
      const timer = setTimeout(() => {
        setCameraKey(Date.now());
        setTimeout(() => {
          setCameraReady(true);
        }, 200);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showCategorySelection, selectedCategory]);

  // Filter categories based on user roles
  const allCategories = [
    {
      id: "gate",
      name: "Gate",
      icon: Home,
      color: "#10B981",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/30",
      description: "Scan QR codes for fest entry verification",
      isAllowed: isGateAccessAllowed,
    },
    {
      id: "hostel",
      name: "Hostel",
      icon: Building,
      color: "#3B82F6",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/30",
      description: "Manage hostel accommodation check-ins",
      isAllowed: isHostelAccessAllowed,
    },
    {
      id: "event",
      name: "Event",
      icon: Calendar,
      color: "#EF4444",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500/30",
      description: "Verify event registrations and attendance",
      isAllowed: isEventAccessAllowed,
    },
  ];

  const categories = allCategories.filter((category) => category.isAllowed);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setScanned(false);
    setShowCategorySelection(false);
  };

  const handleBackToSelection = () => {
    setShowCategorySelection(true);
    setSelectedCategory(null);
    setScanned(false);
    setCameraReady(false);
  };

  const handleCheckIn = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      const result = await updateUserCheckingStatus(
        userData.registrationId,
        "checked in"
      );

      if (result.success) {
        showAlert(
          "Success",
          `${userData.name || (userData as any).displayName || "User"} has been checked in successfully!`,
          [{ text: "OK", onPress: closeModal }]
        );
      } else {
        showAlert(
          result.error || "Check-in Failed",
          result.message || "Failed to check in user"
        );
      }
    } catch (error) {
      showAlert("Error", "Failed to check in user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      const result = await updateUserCheckingStatus(
        userData.registrationId,
        "rejected"
      );

      if (result.success) {
        showAlert("User Rejected", `${userData.name || (userData as any).displayName || "User"} has been rejected.`, [
          { text: "OK", onPress: closeModal },
        ]);
      } else {
        showAlert(
          result.error || "Rejection Failed",
          result.message || "Failed to reject user"
        );
      }
    } catch (error) {
      showAlert("Error", "Failed to reject user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowUserModal(false);
    setShowGateModal(false);
    setShowHostelModal(false);
    setUserData(null);
    setGateUserData(null);
    setHostelUserData(null);
    setScanned(false);
  };

  const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || !selectedCategory) return;

    setScanned(true);
    setLoading(true);

    try {
      const result = await handleQRScan(data, selectedCategory);

      if (result.success && result.data) {
        if (selectedCategory === "gate") {
          setGateUserData(result.data as UserGateData);
          setShowGateModal(true);
        } else if (selectedCategory === "hostel") {
          setHostelUserData(result.data as UserGateData);
          setShowHostelModal(true);
        } else {
          setUserData(result.data as UserRegistrationData);
          setShowUserModal(true);
        }
      } else {
        showAlert(
          result.error || "Scan Failed",
          result.message || "Failed to process QR code",
          [{ text: "Try Again", onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      showAlert("Error", "An unexpected error occurred. Please try again.", [
        { text: "Try Again", onPress: () => setScanned(false) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";

  // Check camera permissions
  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 16 }}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#41B8F020",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <QrCode size={48} color="#41B8F0" />
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
            Camera Access Required
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              color: textSecondary,
              textAlign: "center",
              marginBottom: 24,
              fontSize: 13,
            }}
          >
            We need camera permission to scan QR codes for user verification
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#41B8F0",
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 14,
            }}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: "#FFFFFF",
                fontSize: 15,
              }}
            >
              Grant Permission
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Category Selection Screen
  if (showCategorySelection) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: 16,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: cardBorder,
            backgroundColor: bgColor,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate("Dashboard")}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Talina",
                fontSize: 22,
                color: textPrimary,
                letterSpacing: 0.5,
              }}
            >
              QR Scanner
            </Text>
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                fontSize: 12,
                color: "#41B8F0",
                marginTop: 1,
              }}
            >
              Select verification category
            </Text>
          </View>
        </View>

        {/* Category Cards */}
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              color: textPrimary,
              fontSize: 16,
              marginBottom: 14,
            }}
          >
            Choose Scanning Mode
          </Text>

          {categories.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <QrCode size={64} color={textSecondary} />
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  color: textPrimary,
                  fontSize: 18,
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                No Access
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  color: textSecondary,
                  textAlign: "center",
                  marginTop: 8,
                  paddingHorizontal: 32,
                  fontSize: 13,
                }}
              >
                You don't have permission to access any scanning categories
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => handleCategorySelect(category.id)}
                    style={{
                      backgroundColor: cardBg,
                      borderWidth: 1,
                      borderColor: cardBorder,
                      borderRadius: 18,
                      padding: 18,
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 14,
                          backgroundColor: category.color + "20",
                        }}
                      >
                        <IconComponent size={24} color={category.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "Poppins_600SemiBold",
                            color: textPrimary,
                            fontSize: 16,
                            marginBottom: 2,
                          }}
                        >
                          {category.name}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Poppins_400Regular",
                            color: textSecondary,
                            fontSize: 12,
                          }}
                        >
                          {category.description}
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <Text style={{ fontSize: 16, color: textSecondary }}>→</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  }

  // Camera Scanner Screen
  return (
    <View className="flex-1 bg-black">
      {/* Full Screen Camera */}
      {cameraReady ? (
        <CameraView
          key={`qr-camera-${cameraKey}`}
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "pdf417"],
          }}
        />
      ) : (
        <View className="flex-1 bg-black items-center justify-center">
          <ActivityIndicator size="large" color="#EEB170" />
          <Text
            style={{ fontFamily: "Outfit_500Medium" }}
            className="text-[#0C3572] text-base mt-4"
          >
            Initializing camera...
          </Text>
        </View>
      )}

      {/* Scanner Frame - Absolutely Positioned */}
      {cameraReady && (
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <View className="relative">
            <View
              className="rounded-2xl bg-transparent"
              style={{ width: 250, height: 250 }}
            >
              {/* Corner indicators */}
              <View className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-[#EEB170] rounded-tl-lg" />
              <View className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-[#EEB170] rounded-tr-lg" />
              <View className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-[#EEB170] rounded-bl-lg" />
              <View className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-[#EEB170] rounded-br-lg" />
            </View>
          </View>
        </View>
      )}

      {/* Absolute Overlay Container - All UI elements */}
      <View className="absolute inset-0" pointerEvents="box-none">
        {/* Header Row - Back Button and Title */}
        <View className="absolute top-12 left-6 right-6 flex-row items-center">
          <TouchableOpacity
            onPress={handleBackToSelection}
            className="bg-black/70 rounded-full p-3 mr-4"
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>

          <View className="flex-1 items-center" pointerEvents="none">
            <Text
              style={{ fontFamily: "Outfit_600SemiBold" }}
              className="text-[#0C3572] text-xl"
            >
              {selectedCategory?.toUpperCase()} Scanner
            </Text>
          </View>

          {/* Invisible spacer to balance the layout */}
          <View style={{ width: 56 }} pointerEvents="none" />
        </View>
      </View>

      {/* User Information Modal */}
      <Modal
        visible={showUserModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-[#FFFFFF66] rounded-2xl p-6 w-full max-w-sm border border-[#A0B3D0]">
            {userData && (
              <>
                {/* User Info Header */}
                <View className="items-center mb-6">
                  <Text
                    style={{ fontFamily: "Outfit_700Bold" }}
                    className="text-[#0C3572] text-2xl mb-2"
                  >
                    {userData.name || (userData as any).displayName || "Unknown User"}
                  </Text>
                  <View className="bg-[#EEB170] rounded-xl px-4 py-2 mb-2">
                    <Text
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                      className="text-[#121212] text-lg"
                    >
                      {userData.eventName}
                    </Text>
                  </View>
                  <View className="bg-[#FFFFFF66] rounded-full px-3 py-1">
                    <Text
                      style={{ fontFamily: "Outfit_400Regular" }}
                      className="text-[#2175C0] text-sm"
                    >
                      Event Registration
                    </Text>
                  </View>
                </View>

                {/* Status Information */}
                <View className="mb-6">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text
                      style={{ fontFamily: "Outfit_400Regular" }}
                      className="text-[#2175C0] text-base"
                    >
                      Status:
                    </Text>
                    <View
                      className={`px-3 py-1 rounded-full ${
                        userData.status === "confirmed"
                          ? "bg-green-500/20"
                          : userData.status === "payment pending"
                          ? "bg-yellow-500/20"
                          : userData.status === "rejected"
                          ? "bg-red-500/20"
                          : "bg-gray-500/20"
                      }`}
                    >
                      <Text
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                        className={`text-sm capitalize ${
                          userData.status === "confirmed"
                            ? "text-green-400"
                            : userData.status === "payment pending"
                            ? "text-yellow-400"
                            : userData.status === "rejected"
                            ? "text-red-400"
                            : "text-[#2175C0]"
                        }`}
                      >
                        {userData.status}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between items-center">
                    <Text
                      style={{ fontFamily: "Outfit_400Regular" }}
                      className="text-[#2175C0] text-base"
                    >
                      Check-in Status:
                    </Text>
                    <View
                      className={`px-3 py-1 rounded-full ${
                        userData.checkingStatus === "checked in"
                          ? "bg-green-500/20"
                          : userData.checkingStatus === "rejected"
                          ? "bg-red-500/20"
                          : "bg-yellow-500/20"
                      }`}
                    >
                      <Text
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                        className={`text-sm capitalize ${
                          userData.checkingStatus === "checked in"
                            ? "text-green-400"
                            : userData.checkingStatus === "rejected"
                            ? "text-red-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {userData.checkingStatus}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                {userData.checkingStatus === "pending" && (
                  <View className="mb-4">
                    {userData.status === "confirmed" ? (
                      <View className="flex-row gap-3">
                        <TouchableOpacity
                          className="flex-1 bg-green-600 py-3 rounded-xl"
                          onPress={handleCheckIn}
                          disabled={loading}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={{ fontFamily: "Outfit_600SemiBold" }}
                            className="text-[#0C3572] text-center"
                          >
                            {loading ? "Processing..." : "Check In"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          className="flex-1 bg-red-600 py-3 rounded-xl"
                          onPress={handleReject}
                          disabled={loading}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={{ fontFamily: "Outfit_600SemiBold" }}
                            className="text-[#0C3572] text-center"
                          >
                            {loading ? "Processing..." : "Reject"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="bg-yellow-500/20 p-3 rounded-xl border border-yellow-500/30">
                        <Text
                          style={{ fontFamily: "Outfit_400Regular" }}
                          className="text-yellow-400 text-center text-sm"
                        >
                          Cannot check in: User status is "{userData.status}"
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  className="bg-[#FFFFFF66] py-3 rounded-xl"
                  onPress={closeModal}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                    className="text-[#0C3572] text-center"
                  >
                    Close
                  </Text>
                </TouchableOpacity>

                {/* Loading Overlay */}
                {loading && (
                  <View className="absolute inset-0 bg-black/50 rounded-2xl items-center justify-center">
                    <ActivityIndicator size="large" color="#EEB170" />
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Gate User Information Modal */}
      <GateUserModal
        visible={showGateModal}
        onClose={closeModal}
        userData={gateUserData}
        onUserDataUpdate={(updatedData) => setGateUserData(updatedData)}
      />

      {/* Hostel User Information Modal */}
      <HostelUserModal
        visible={showHostelModal}
        onClose={closeModal}
        userData={hostelUserData}
        onUserDataUpdate={(updatedData) => setHostelUserData(updatedData)}
      />
    </View>
  );
}
