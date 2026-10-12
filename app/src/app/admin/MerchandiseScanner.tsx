import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Image,
  StatusBar,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import { ArrowLeft, QrCode, Package, Scan } from "lucide-react-native";
import { Button, showAlert } from "@/components";
import {
  getOrderByQR,
  updateOrderStatus,
  UserOrder,
  getAllOrders,
} from "@/api/admin";
import { getStoreItems, StoreItem } from "@/api/admin";
import { Ionicons } from "@expo/vector-icons";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { useThemeStore } from "@/state/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MerchandiseScannerProps {
  navigation: any;
  setShowBottomNav?: (show: boolean) => void;
}

interface ItemWithOrders extends StoreItem {
  orders: UserOrder[];
  totalOrders: number;
  deliveredCount: number;
  pendingCount: number;
}

export default function MerchandiseScanner({
  setShowBottomNav,
}: { setShowBottomNav?: (show: boolean) => void }) {
  const navigation = useAdminNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";

  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraKey, setCameraKey] = useState(Date.now());
  const [cameraReady, setCameraReady] = useState(false);

  const [items, setItems] = useState<ItemWithOrders[]>([]);
  const [unknownOrders, setUnknownOrders] = useState<UserOrder[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemWithOrders | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // Filter state
  const [selectedFilterItemId, setSelectedFilterItemId] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderData, setOrderData] = useState<UserOrder | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  // Camera management
  useFocusEffect(
    React.useCallback(() => {
      if (showScanner) {
        setCameraReady(false);
        setScanned(false);

        const timer = setTimeout(() => {
          setCameraKey(Date.now());
          setTimeout(() => {
            setCameraReady(true);
          }, 200);
        }, 100);

        return () => clearTimeout(timer);
      }
    }, [showScanner])
  );

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch items (including inactive) and orders in parallel
      const [itemsResult, orders] = await Promise.all([
        getStoreItems(true), // Include inactive items for admin
        getAllOrders(),
      ]);

      if (!itemsResult.success) {
        showAlert("Error", "Failed to load store items");
        return;
      }

      const storeItems = itemsResult.data;

      // Map items with their orders
      const itemsWithOrders: ItemWithOrders[] = storeItems.map((item: any) => {
        const itemOrders = orders.filter((order: any) =>
          order.items?.some((orderItem: any) => orderItem.itemId === item.id)
        );

        const deliveredCount = itemOrders.filter(
          (o: any) => o.status === "delivered"
        ).length;
        const pendingCount = itemOrders.filter(
          (o: any) => o.status === "confirmed"
        ).length;

        return {
          ...item,
          orders: itemOrders,
          totalOrders: itemOrders.length,
          deliveredCount,
          pendingCount,
        };
      });

      // Find zombie orders (orders with items not in store catalog)
      const allItemIds = new Set(storeItems.map((item: any) => item.id));
      const orphanOrders = orders.filter((order: any) =>
        order.items?.some((item: any) => !allItemIds.has(item.itemId))
      );

      setItems(itemsWithOrders);
      setUnknownOrders(orphanOrders);
    } catch (error) {
      console.error("Error fetching data:", error);
      showAlert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned) return;

    setScanned(true);

    try {
      const result = await getOrderByQR(data.trim());

      if (result.success && result.order) {
        setOrderData(result.order);
        setShowScanner(false);
        setShowOrderModal(true);
      } else {
        showAlert(
          "Order Not Found",
          result.error || "Failed to fetch order details",
          [{ text: "Try Again", onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      showAlert("Error", "An unexpected error occurred. Please try again.", [
        { text: "Try Again", onPress: () => setScanned(false) },
      ]);
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!orderData) return;

    if (orderData.status === "delivered") {
      showAlert(
        "Already Delivered",
        "This order has already been marked as delivered."
      );
      return;
    }

    if (orderData.status !== "confirmed") {
      showAlert(
        "Cannot Deliver",
        `This order is currently ${orderData.status}. Only confirmed orders can be delivered.`
      );
      return;
    }

    setUpdatingStatus(true);
    try {
      const result = await updateOrderStatus(orderData.orderId, "delivered");
      console.log("Update order status result:", result);
      if (result.success) {
        // Show inline success banner instead of modal alert to avoid freeze
        setSuccessMessage("Order marked as delivered successfully!");
        setUpdateSuccess(true);
        setTimeout(() => {
          setUpdateSuccess(false);
          setShowOrderModal(false);
          setOrderData(null);
          fetchData(); // Refresh data
        }, 2000);
      } else {
        showAlert("Error", result.error || "Failed to update order status");
      }
    } catch (error) {
      showAlert(
        "Error",
        "Failed to mark order as delivered. Please try again."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filtered data based on selected item
  const filteredData = React.useMemo(() => {
    if (!selectedFilterItemId) {
      // Show all items
      return {
        items: items,
        totalOrders: items.reduce((sum, item) => sum + item.totalOrders, 0) + unknownOrders.length,
        deliveredCount: items.reduce((sum, item) => sum + item.deliveredCount, 0),
        pendingCount: items.reduce((sum, item) => sum + item.pendingCount, 0),
        showUnknownOrders: true,
      };
    } else {
      // Show only selected item
      const selectedItem = items.find((item) => item.id === selectedFilterItemId);
      if (!selectedItem) {
        return {
          items: [],
          totalOrders: 0,
          deliveredCount: 0,
          pendingCount: 0,
          showUnknownOrders: false,
        };
      }
      return {
        items: [selectedItem],
        totalOrders: selectedItem.totalOrders,
        deliveredCount: selectedItem.deliveredCount,
        pendingCount: selectedItem.pendingCount,
        showUnknownOrders: false,
      };
    }
  }, [selectedFilterItemId, items, unknownOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/20 text-green-400 border-green-500";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500";
      case "delivered":
        return "bg-blue-500/20 text-blue-400 border-blue-500";
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500";
      default:
        return "bg-gray-500/20 text-[#2175C0] border-gray-500";
    }
  };

  // Scanner View
  if (showScanner) {
    if (!permission) {
      return (
        <View style={{ flex: 1, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 16 }}>
            Requesting camera permission...
          </Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={{ flex: 1, backgroundColor: bgColor, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(65, 184, 240, 0.15)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Package size={44} color="#41B8F0" />
          </View>
          <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 18, textAlign: "center", marginBottom: 8 }}>
            Camera Access Required
          </Text>
          <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 14, textAlign: "center", marginBottom: 24 }}>
            Camera permission is required to scan order QR codes
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "#41B8F0" }}
            className="px-6 py-3.5 rounded-xl"
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", fontSize: 16 }}>
              Grant Permission
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        {cameraReady ? (
          <CameraView
            key={`merchandise-camera-${cameraKey}`}
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
        ) : (
          <View className="flex-1 bg-black items-center justify-center">
            <ActivityIndicator size="large" color="#41B8F0" />
            <Text
              style={{ fontFamily: "Poppins_500Medium", color: "#FFFFFF", marginTop: 16 }}
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
                <View className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-[#41B8F0] rounded-tl-lg" />
                <View className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-[#41B8F0] rounded-tr-lg" />
                <View className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-[#41B8F0] rounded-bl-lg" />
                <View className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-[#41B8F0] rounded-br-lg" />
              </View>
            </View>
          </View>
        )}

        <View className="absolute inset-0" pointerEvents="box-none">
          <View className="absolute top-12 left-6 right-6 flex-row items-center">
            <TouchableOpacity
              onPress={() => setShowScanner(false)}
              className="bg-black/70 rounded-full p-3 mr-4"
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>

            <View className="flex-1 items-center" pointerEvents="none">
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", fontSize: 18 }}>
                Scan Order QR Code
              </Text>
            </View>

            <View style={{ width: 56 }} pointerEvents="none" />
          </View>

          <View
            className="absolute bottom-28 left-4 right-4"
            pointerEvents="none"
          >
            <View className="bg-black/70 rounded-xl px-4 py-3">
              <Text style={{ fontFamily: "Poppins_500Medium", color: "#FFFFFF", textAlign: "center", fontSize: 14 }}>
                {scanned
                  ? "Processing order..."
                  : "Point camera at order QR code"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Dashboard View
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
          onPress={() => navigation.goBack()}
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
            Merchandise Dashboard
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              fontSize: 12,
              color: "#41B8F0",
              marginTop: 1,
            }}
          >
            Track store items and order fulfilment
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#41B8F0" />
          <Text style={{ fontFamily: "Poppins_500Medium", color: textSecondary, marginTop: 12 }}>
            Loading merchandise data...
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Item Filter Dropdown */}
            <View className="mb-4">
              <Text
                style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 13, marginBottom: 8 }}
              >
                Filter by Item
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                className="rounded-xl p-4 flex-row items-center justify-between"
                onPress={() => setShowFilterDropdown(!showFilterDropdown)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <Package size={20} color="#41B8F0" />
                  <Text
                    style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 15, marginLeft: 12, flex: 1 }}
                    numberOfLines={1}
                  >
                    {selectedFilterItemId
                      ? items.find((item) => item.id === selectedFilterItemId)
                          ?.name || "All Items"
                      : "All Items"}
                  </Text>
                </View>
                <Ionicons
                  name={showFilterDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={textSecondary}
                />
              </TouchableOpacity>

              {/* Dropdown Menu */}
              {showFilterDropdown && (
                <View
                  style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                  className="rounded-xl mt-2 overflow-hidden shadow-sm"
                >
                  <TouchableOpacity
                    style={{ borderBottomWidth: 1, borderBottomColor: cardBorder }}
                    className="p-4"
                    onPress={() => {
                      setSelectedFilterItemId(null);
                      setShowFilterDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <View
                        className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                          selectedFilterItemId === null
                            ? "border-[#41B8F0] bg-[#41B8F0]"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedFilterItemId === null && (
                          <View className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </View>
                      <Text
                        style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 15 }}
                      >
                        All Items
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <ScrollView style={{ maxHeight: 300 }}>
                    {items.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={{ borderBottomWidth: 1, borderBottomColor: cardBorder }}
                        className="p-4"
                        onPress={() => {
                          setSelectedFilterItemId(item.id);
                          setShowFilterDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View className="flex-row items-center">
                          <View
                            className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                              selectedFilterItemId === item.id
                                ? "border-[#41B8F0] bg-[#41B8F0]"
                                : "border-gray-500"
                            }`}
                          >
                            {selectedFilterItemId === item.id && (
                              <View className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </View>
                          <Image
                            source={{ uri: item.images?.[0] || "" }}
                            className="w-10 h-10 rounded-lg mr-3"
                          />
                          <View className="flex-1">
                            <Text
                              style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 15 }}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            <Text
                              style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 12 }}
                            >
                              {item.totalOrders} orders • {item.pendingCount}{" "}
                              pending
                            </Text>
                          </View>
                          {!item.isActive && (
                            <View className="bg-red-500/20 px-2 py-1 rounded-full">
                              <Text
                                style={{ fontFamily: "Poppins_600SemiBold" }}
                                className="text-red-400 text-xs"
                              >
                                Inactive
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowScanner(true)}
              style={{ backgroundColor: "#41B8F0" }}
              className="mb-6 rounded-xl py-4 flex-row items-center justify-center shadow-sm"
              activeOpacity={0.8}
            >
              <Scan size={24} color="#FFFFFF" />
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", fontSize: 16, marginLeft: 10 }}>
                Scan QR Code
              </Text>
            </TouchableOpacity>

            {/* Stats Summary */}
            <View
              style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
              className="rounded-2xl p-5 mb-6"
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 16 }}
                >
                  {selectedFilterItemId ? "Item Overview" : "Overview"}
                </Text>
                {selectedFilterItemId && (
                  <TouchableOpacity
                    onPress={() => setSelectedFilterItemId(null)}
                    style={{ backgroundColor: isDark ? "#2A2A30" : "#E5E7EB" }}
                    className="px-3 py-1 rounded-lg"
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{ fontFamily: "Poppins_500Medium", color: "#41B8F0", fontSize: 12 }}
                    >
                      Clear Filter
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-row justify-between">
                <View className="items-center">
                  <Text
                    style={{ fontFamily: "Poppins_700Bold", color: "#41B8F0", fontSize: 24 }}
                  >
                    {filteredData.totalOrders}
                  </Text>
                  <Text
                    style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 13 }}
                  >
                    Total Orders
                  </Text>
                </View>
                <View className="items-center">
                  <Text
                    style={{ fontFamily: "Poppins_700Bold", color: "#3B82F6", fontSize: 24 }}
                  >
                    {filteredData.deliveredCount}
                  </Text>
                  <Text
                    style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 13 }}
                  >
                    Delivered
                  </Text>
                </View>
                <View className="items-center">
                  <Text
                    style={{ fontFamily: "Poppins_700Bold", color: "#10B981", fontSize: 24 }}
                  >
                    {filteredData.pendingCount}
                  </Text>
                  <Text
                    style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 13 }}
                  >
                    Pending
                  </Text>
                </View>
              </View>
            </View>            {/* Items List */}
            {!selectedFilterItemId && (
              <Text
                style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 16, marginBottom: 12 }}
              >
                Merchandise Items
              </Text>
            )}

            {selectedFilterItemId && filteredData.items.length > 0 && (
              <Text
                style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 16, marginBottom: 12 }}
              >
                Orders for {filteredData.items[0].name}
              </Text>
            )}

            {!selectedFilterItemId && filteredData.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                className="rounded-2xl p-4 mb-4"
                onPress={() => {
                  setSelectedItem(item);
                  setShowItemModal(true);
                }}
                activeOpacity={0.7}
              >
                <View className="flex-row items-start">
                  <View className="relative">
                    <Image
                      source={{ uri: item.images?.[0] || "" }}
                      className="w-20 h-20 rounded-xl"
                    />
                    {!item.isActive && (
                      <View className="absolute inset-0 bg-black/70 rounded-xl items-center justify-center">
                        <Text
                          style={{ fontFamily: "Poppins_600SemiBold" }}
                          className="text-red-400 text-xs"
                        >
                          INACTIVE
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-1 ml-4">
                    <View className="flex-row items-center mb-1">
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 15 }}
                        className="flex-1"
                      >
                        {item.name}
                      </Text>
                      {!item.isActive && (
                        <View className="bg-red-500/20 px-2 py-0.5 rounded-full">
                          <Text
                            style={{ fontFamily: "Poppins_600SemiBold" }}
                            className="text-red-400 text-xs"
                          >
                            Inactive
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 13, marginBottom: 8 }}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                    <View className="flex-row items-center gap-3">
                      <View className="flex-row items-center">
                        <Text
                          style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 13 }}
                        >
                          {item.totalOrders} orders
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text
                          style={{ fontFamily: "Poppins_500Medium", color: "#10B981", fontSize: 13 }}
                        >
                          {item.pendingCount} pending
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                </View>
              </TouchableOpacity>
            ))}

            {/* Show orders when a specific item is selected */}
            {selectedFilterItemId && filteredData.items.length > 0 && (
              <>
                {filteredData.items[0].orders.length > 0 ? (
                  filteredData.items[0].orders.map((order) => (
                    <TouchableOpacity
                      key={order.orderId}
                      style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                      className="rounded-2xl p-4 mb-4"
                      onPress={() => {
                        setOrderData(order);
                        setShowOrderModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View className="flex-row justify-between items-start mb-3">
                        <View className="flex-1">
                          <Text
                            style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 15, marginBottom: 2 }}
                          >
                            Order #{order.orderId.slice(-8).toUpperCase()}
                          </Text>
                          <Text
                            style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 13, marginBottom: 4 }}
                          >
                            {order.userName || "Unknown User"}
                          </Text>
                          <Text
                            style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}
                          >
                            {new Date(order.orderDate).toLocaleDateString(
                              "en-US",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </Text>
                        </View>
                        <View
                          className={`px-3 py-1 rounded-full ${getStatusColor(
                            order.status
                          )
                            .split(" ")
                            .slice(0, 2)
                            .join(" ")}`}
                        >
                          <Text
                            style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12 }}
                            className={getStatusColor(order.status).split(" ")[1]}
                          >
                            {order.status.charAt(0).toUpperCase() +
                              order.status.slice(1)}
                          </Text>
                        </View>
                      </View>

                      <View style={{ borderTopWidth: 1, borderTopColor: cardBorder, paddingTop: 10 }}>
                        <View className="flex-row justify-between items-center">
                          <View className="flex-row items-center gap-3">
                            <Text
                              style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 13 }}
                            >
                              {order.items.length} item(s)
                            </Text>
                            <Text
                              style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 13 }}
                            >
                              •
                            </Text>
                            <Text
                              style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 14 }}
                            >
                              ₹{order.finalAmount}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={textSecondary}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View
                    style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                    className="rounded-2xl p-6 items-center"
                  >
                    <Package size={40} color={textSecondary} />
                    <Text
                      style={{ fontFamily: "Poppins_500Medium", color: textSecondary, textAlign: "center", marginTop: 12 }}
                    >
                      No orders found for this item
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Zombie Orders Section */}
            {filteredData.showUnknownOrders && unknownOrders.length > 0 && (
              <>
                <Text
                  style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 16, marginBottom: 12, marginTop: 8 }}
                >
                  Zombie Orders
                </Text>
                <View
                  style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                  className="rounded-2xl p-4 mb-4"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <Ionicons name="alert-circle" size={22} color="#F59E0B" />
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 14, marginLeft: 8 }}
                      >
                        Orders with deleted items
                      </Text>
                    </View>
                    <Text
                      style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 13 }}
                    >
                      {unknownOrders.length} orders
                    </Text>
                  </View>
                  {unknownOrders.map((order) => (
                    <TouchableOpacity
                      key={order.orderId}
                      style={{ backgroundColor: isDark ? "#2A2A30" : "#F3F4F6", borderColor: cardBorder, borderWidth: 1 }}
                      className="rounded-xl p-3 mb-2"
                      onPress={() => {
                        setOrderData(order);
                        setShowOrderModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                          <Text
                            style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 13, marginBottom: 2 }}
                          >
                            Order #{order.orderId.slice(-8).toUpperCase()}
                          </Text>
                          <Text
                            style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 12, marginBottom: 4 }}
                          >
                            {order.userName || "Unknown User"}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            <View
                              className={`px-2 py-0.5 rounded-full ${getStatusColor(
                                order.status
                              )
                                .split(" ")
                                .slice(0, 2)
                                .join(" ")}`}
                            >
                              <Text
                                style={{ fontFamily: "Poppins_500Medium", fontSize: 11 }}
                                className={getStatusColor(order.status).split(" ")[1]}
                              >
                                {order.status}
                              </Text>
                            </View>
                            <Text
                              style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}
                            >
                              {order.items.length} item(s)
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={textSecondary}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* Item Details Modal */}
      <Modal
        visible={showItemModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowItemModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View
            style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
            className="rounded-2xl p-6 w-full max-w-md max-h-[85%] shadow-lg"
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedItem && (
                <>
                  <View className="items-center mb-6">
                    <Image
                      source={{ uri: selectedItem.images?.[0] || "" }}
                      className="w-32 h-32 rounded-2xl mb-4"
                    />
                    <Text
                      style={{ fontFamily: "Poppins_700Bold", color: textPrimary, fontSize: 20, textAlign: "center", marginBottom: 6 }}
                    >
                      {selectedItem.name}
                    </Text>
                    <Text
                      style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 13, textAlign: "center" }}
                    >
                      {selectedItem.description}
                    </Text>
                  </View>

                  {/* Stats */}
                  <View
                    style={{ backgroundColor: isDark ? "#26262B" : "#F3F4F6", borderColor: cardBorder, borderWidth: 1 }}
                    className="rounded-xl p-4 mb-4"
                  >
                    <View className="flex-row justify-between items-center mb-3">
                      <Text
                        style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 13 }}
                      >
                        Total Orders
                      </Text>
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 16 }}
                      >
                        {selectedItem.totalOrders}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-3">
                      <Text
                        style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 13 }}
                      >
                        Delivered
                      </Text>
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: "#3B82F6", fontSize: 16 }}
                      >
                        {selectedItem.deliveredCount}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text
                        style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 13 }}
                      >
                        Pending Delivery
                      </Text>
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: "#10B981", fontSize: 16 }}
                      >
                        {selectedItem.pendingCount}
                      </Text>
                    </View>
                  </View>

                  {/* Orders List */}
                  {selectedItem.orders.length > 0 && (
                    <>
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 15, marginBottom: 10 }}
                      >
                        Recent Orders
                      </Text>
                      {selectedItem.orders.slice(0, 5).map((order) => (
                        <TouchableOpacity
                          key={order.orderId}
                          style={{ backgroundColor: isDark ? "#26262B" : "#F3F4F6", borderColor: cardBorder, borderWidth: 1 }}
                          className="rounded-xl p-3 mb-2"
                          onPress={() => {
                            setOrderData(order);
                            setShowItemModal(false);
                            setShowOrderModal(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <View className="flex-row justify-between items-center mb-1">
                            <Text
                              style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 13 }}
                            >
                              #{order.orderId.slice(-8).toUpperCase()}
                            </Text>
                            <View className="flex-row items-center gap-2">
                              <View
                                className={`px-2 py-0.5 rounded-full ${getStatusColor(
                                  order.status
                                )
                                  .split(" ")
                                  .slice(0, 2)
                                  .join(" ")}`}
                              >
                                <Text
                                  style={{ fontFamily: "Poppins_500Medium", fontSize: 11 }}
                                  className={getStatusColor(order.status).split(" ")[1]}
                                >
                                  {order.status}
                                </Text>
                              </View>
                              <Ionicons
                                name="chevron-forward"
                                size={16}
                                color={textSecondary}
                              />
                            </View>
                          </View>
                          <Text
                            style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}
                          >
                            {order.userName || "Unknown"} •{" "}
                            {new Date(order.orderDate).toLocaleDateString()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}

                  <TouchableOpacity
                    style={{ backgroundColor: isDark ? "#2A2A30" : "#E5E7EB" }}
                    className="rounded-xl py-3.5 items-center mt-4"
                    onPress={() => setShowItemModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 15 }}
                    >
                      Close
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Order Details Modal (from QR scan) */}
      <Modal
        visible={showOrderModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOrderModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View
            style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
            className="rounded-2xl p-6 w-full max-w-md max-h-[85%] shadow-lg"
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Success Banner */}
              {updateSuccess && (
                <View className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-4">
                  <Text
                    style={{ fontFamily: "Poppins_600SemiBold", color: "#10B981", textAlign: "center", fontSize: 13 }}
                  >
                    ✓ {successMessage}
                  </Text>
                </View>
              )}

              {orderData && (
                <>
                  <View className="items-center mb-6">
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(65, 184, 240, 0.15)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                      <Package size={28} color="#41B8F0" />
                    </View>
                    <Text
                      style={{ fontFamily: "Poppins_700Bold", color: textPrimary, fontSize: 20, marginBottom: 4 }}
                    >
                      Order #{orderData.orderId.slice(-8).toUpperCase()}
                    </Text>
                    <Text
                      style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11, marginBottom: 10 }}
                      selectable={true}
                    >
                      {orderData.orderId}
                    </Text>
                    <View
                      className={`px-4 py-1.5 rounded-full border ${getStatusColor(
                        orderData.status
                      )
                        .split(" ")
                        .slice(0, 3)
                        .join(" ")}`}
                    >
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13 }}
                        className={getStatusColor(orderData.status).split(" ")[1]}
                      >
                        {orderData.status.charAt(0).toUpperCase() +
                          orderData.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{ backgroundColor: isDark ? "#26262B" : "#F3F4F6", borderColor: cardBorder, borderWidth: 1 }}
                    className="rounded-xl p-4 mb-4"
                  >
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: textSecondary, fontSize: 12, marginBottom: 10 }}>
                      Customer Details
                    </Text>
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="person" size={15} color={textSecondary} />
                      <Text
                        style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 13, marginLeft: 8 }}
                      >
                        {orderData.userName || "N/A"}
                      </Text>
                    </View>
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="mail" size={15} color={textSecondary} />
                      <Text
                        style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 12, marginLeft: 8 }}
                      >
                        {orderData.email || "N/A"}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="finger-print" size={15} color={textSecondary} />
                      <Text
                        style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11, marginLeft: 8 }}
                        selectable={true}
                      >
                        User ID: {orderData.userId}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{ backgroundColor: isDark ? "#26262B" : "#F3F4F6", borderColor: cardBorder, borderWidth: 1 }}
                    className="rounded-xl p-4 mb-4"
                  >
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: textSecondary, fontSize: 12, marginBottom: 10 }}>
                      Order Timeline
                    </Text>
                    <View className="flex-row items-start mb-2">
                      <Ionicons name="calendar" size={15} color={textSecondary} />
                      <View className="flex-1 ml-2">
                        <Text
                          style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 12, marginBottom: 2 }}
                        >
                          Order Date
                        </Text>
                        <Text
                          style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}
                        >
                          {new Date(orderData.orderDate).toLocaleDateString(
                            "en-US",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-start mb-2">
                      <Ionicons name="time" size={15} color={textSecondary} />
                      <View className="flex-1 ml-2">
                        <Text
                          style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 12, marginBottom: 2 }}
                        >
                          Created At
                        </Text>
                        <Text
                          style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}
                        >
                          {new Date(orderData.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-start">
                      <Ionicons name="sync" size={15} color={textSecondary} />
                      <View className="flex-1 ml-2">
                        <Text
                          style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 12, marginBottom: 2 }}
                        >
                          Last Updated
                        </Text>
                        <Text
                          style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}
                        >
                          {new Date(orderData.updatedAt).toLocaleDateString(
                            "en-US",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={{ backgroundColor: isDark ? "#26262B" : "#F3F4F6", borderColor: cardBorder, borderWidth: 1 }}
                    className="rounded-xl p-4 mb-4"
                  >
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: textSecondary, fontSize: 12, marginBottom: 10 }}>
                      Order Items ({orderData.items.length})
                    </Text>
                    {orderData.items.map((item: any, index: number) => {
                      const itemExistsInStore = items.some(
                        (storeItem) => storeItem.id === item.itemId
                      );

                      return (
                        <View
                          key={`${item.itemId}-${index}`}
                          style={{
                            marginBottom: index < orderData.items.length - 1 ? 12 : 0,
                            paddingBottom: index < orderData.items.length - 1 ? 12 : 0,
                            borderBottomWidth: index < orderData.items.length - 1 ? 1 : 0,
                            borderBottomColor: cardBorder,
                          }}
                        >
                          {!itemExistsInStore && (
                            <View className="bg-red-500/20 border border-red-500/30 rounded-lg p-2 mb-2">
                              <View className="flex-row items-center">
                                <Ionicons
                                  name="alert-circle"
                                  size={15}
                                  color="#EF4444"
                                />
                                <Text
                                  style={{ fontFamily: "Poppins_500Medium", color: "#EF4444", fontSize: 11, marginLeft: 6 }}
                                >
                                  This item no longer exists in catalog
                                </Text>
                              </View>
                            </View>
                          )}
                          <View className="flex-row items-center mb-2">
                            <View className="relative">
                              <Image
                                source={{ uri: item.images[0] }}
                                className="w-14 h-14 rounded-lg"
                              />
                              {!itemExistsInStore && (
                                <View className="absolute inset-0 bg-black/60 rounded-lg items-center justify-center">
                                  <Ionicons
                                    name="close-circle"
                                    size={22}
                                    color="#EF4444"
                                  />
                                </View>
                              )}
                            </View>
                            <View className="flex-1 ml-3">
                              <Text
                                style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 13 }}
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                              <Text
                                style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}
                              >
                                Item ID: {item.itemId.slice(0, 8)}...
                              </Text>
                            </View>
                            <Text
                              style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 14 }}
                            >
                              ₹{item.totalPrice}
                            </Text>
                          </View>
                          <View className="ml-1 flex-row flex-wrap gap-2">
                            {item.selectedSize && (
                              <View style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }} className="px-2 py-0.5 rounded-md">
                                <Text
                                  style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}
                                >
                                  Size:{" "}
                                  <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary }}>
                                    {item.selectedSize}
                                  </Text>
                                </Text>
                              </View>
                            )}
                            <View style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }} className="px-2 py-0.5 rounded-md">
                              <Text
                                style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}
                              >
                                Qty:{" "}
                                <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary }}>
                                  {item.quantity}
                                </Text>
                              </Text>
                            </View>
                            <View style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }} className="px-2 py-0.5 rounded-md">
                              <Text
                                style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}
                              >
                                Base:{" "}
                                <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary }}>₹{item.price}</Text>
                              </Text>
                            </View>
                            {item.sizePrice > 0 && (
                              <View style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }} className="px-2 py-0.5 rounded-md">
                                <Text
                                  style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}
                                >
                                  Size Price:{" "}
                                  <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary }}>
                                    ₹{item.sizePrice}
                                  </Text>
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <View
                    style={{ backgroundColor: isDark ? "#26262B" : "#F3F4F6", borderColor: cardBorder, borderWidth: 1 }}
                    className="rounded-xl p-4 mb-4"
                  >
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: textSecondary, fontSize: 12, marginBottom: 10 }}>
                      Payment Details
                    </Text>

                    <View className="flex-row justify-between items-center mb-2">
                      <Text
                        style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 13 }}
                      >
                        Subtotal
                      </Text>
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 13 }}
                      >
                        ₹{orderData.totalAmount}
                      </Text>
                    </View>

                    {orderData.transactionFees > 0 && (
                      <View className="flex-row justify-between items-center mb-2">
                        <Text
                          style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 13 }}
                        >
                          Transaction Fees
                        </Text>
                        <Text
                          style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 13 }}
                        >
                          ₹{orderData.transactionFees}
                        </Text>
                      </View>
                    )}

                    <View style={{ borderTopWidth: 1, borderTopColor: cardBorder, paddingTop: 8, marginBottom: 12 }} className="flex-row justify-between items-center">
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 14 }}
                      >
                        Total Amount
                      </Text>
                      <Text
                        style={{ fontFamily: "Poppins_700Bold", color: "#41B8F0", fontSize: 17 }}
                      >
                        ₹{orderData.finalAmount}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Ionicons
                        name={
                          orderData.paymentStatus === "completed"
                            ? "checkmark-circle"
                            : orderData.paymentStatus === "pending"
                            ? "time"
                            : "close-circle"
                        }
                        size={16}
                        color={
                          orderData.paymentStatus === "completed"
                            ? "#10B981"
                            : orderData.paymentStatus === "pending"
                            ? "#F59E0B"
                            : "#EF4444"
                        }
                      />
                      <Text
                        style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 13, marginLeft: 8 }}
                      >
                        Payment:
                        <Text
                          style={{ fontFamily: "Poppins_600SemiBold" }}
                          className={
                            orderData.paymentStatus === "completed"
                              ? "text-green-500"
                              : orderData.paymentStatus === "pending"
                              ? "text-yellow-500"
                              : "text-red-500"
                          }
                        >
                          {" "}
                          {orderData.paymentStatus.charAt(0).toUpperCase() +
                            orderData.paymentStatus.slice(1)}
                        </Text>
                      </Text>
                    </View>
                  </View>

                  {orderData.status === "confirmed" && (
                    <TouchableOpacity
                      style={{ backgroundColor: "#41B8F0" }}
                      className="rounded-xl py-4 items-center mb-3 shadow-sm"
                      onPress={handleMarkAsDelivered}
                      disabled={updatingStatus}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", fontSize: 15 }}
                      >
                        {updatingStatus
                          ? "Marking as Delivered..."
                          : "Mark as Delivered"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {orderData.status === "delivered" && (
                    <View className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-3.5 mb-3">
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: "#3B82F6", textAlign: "center", fontSize: 13 }}
                      >
                        ✓ This order has been delivered
                      </Text>
                    </View>
                  )}

                  {orderData.status !== "confirmed" &&
                    orderData.status !== "delivered" && (
                      <View className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-3.5 mb-3">
                        <Text
                          style={{ fontFamily: "Poppins_500Medium", color: "#F59E0B", textAlign: "center", fontSize: 13 }}
                        >
                          Order status: {orderData.status}
                          {"\n"}
                          Only confirmed orders can be delivered
                        </Text>
                      </View>
                    )}

                  <TouchableOpacity
                    style={{ backgroundColor: isDark ? "#2A2A30" : "#E5E7EB" }}
                    className="rounded-xl py-3.5 items-center"
                    onPress={() => setShowOrderModal(false)}
                    activeOpacity={0.7}
                    disabled={updatingStatus}
                  >
                    <Text
                      style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 15 }}
                    >
                      Close
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {updatingStatus && (
              <View className="absolute inset-0 bg-black/60 rounded-2xl items-center justify-center">
                <ActivityIndicator size="large" color="#41B8F0" />
                <Text style={{ fontFamily: "Poppins_500Medium", color: "#FFFFFF", marginTop: 12 }}>Updating...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
