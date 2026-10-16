import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showAlert } from "@/components";
import { useThemeStore } from "@/state/themeStore";
import { fetchStoreItem, StoreItem } from "@/api/store";

const { width } = Dimensions.get("window");

const ItemDetailsScreen = () => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const router = useRouter();
  const { itemId } = useLocalSearchParams() as { itemId: string };

  const [item, setItem] = useState<StoreItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    fetchItemDetails();
  }, [itemId]);

  const fetchItemDetails = async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await fetchStoreItem(itemId);
      if (data) {
        setItem(data);
      } else {
        showAlert("Error", "Item not found");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching item details:", error);
      showAlert("Error", "Failed to load item details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textColor = isDark ? "#FFFFFF" : "#111827";
  const subTextColor = isDark ? "#A0A0A0" : "#6B7280";

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text
          style={{
            fontFamily: "Poppins_500Medium",
            color: subTextColor,
            marginTop: 16,
          }}
        >
          Loading merchandise details...
        </Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            color: textColor,
            fontSize: 18,
          }}
        >
          Product Not Found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 16,
            backgroundColor: "#38BDF8",
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF" }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = item.image || item.imageUrl;
  const totalPrice = (item.price || 0) * quantity;

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top + 8, 44),
          paddingBottom: 14,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: bgColor,
          borderBottomWidth: 1,
          borderBottomColor: cardBorder,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: cardBorder,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={20} color={textColor} />
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: "Talina",
            fontSize: 22,
            color: textColor,
            letterSpacing: 0.5,
          }}
        >
          MERCHANDISE
        </Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image Section with question.png fallback */}
        <View style={{ marginVertical: 16, paddingHorizontal: 20, alignItems: "center" }}>
          <View
            style={{
              width: "100%",
              height: 310,
              borderRadius: 24,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: cardBorder,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            {imageUrl && !imgError ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: "100%", height: "100%", borderRadius: 16 }}
                resizeMode="contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <Image
                source={require("@/assets/question.png")}
                style={{ width: "80%", height: "80%" }}
                resizeMode="contain"
              />
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Item Info */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: "Talina",
                  fontSize: 26,
                  color: textColor,
                  flex: 1,
                  marginRight: 12,
                }}
              >
                {item.name}
              </Text>
              <View
                style={{
                  backgroundColor: isDark
                    ? "rgba(56, 189, 248, 0.15)"
                    : "rgba(56, 189, 248, 0.12)",
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(56, 189, 248, 0.3)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    color: "#38BDF8",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  Official Fest Merch
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: subTextColor,
                fontSize: 14,
                lineHeight: 22,
                marginTop: 4,
              }}
            >
              {item.description || "Exclusive official Saturnalia commemorative merchandise."}
            </Text>
          </View>

          {/* Price Card */}
          <View
            style={{
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: cardBorder,
              borderRadius: 20,
              padding: 18,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                color: subTextColor,
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              Price
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={{ fontFamily: "Talina", fontSize: 32, color: textColor }}>
                ₹{item.price}
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  fontSize: 13,
                  color: subTextColor,
                  marginLeft: 8,
                }}
              >
                per piece
              </Text>
            </View>
          </View>

          {/* Quantity Selection */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: textColor,
                fontSize: 16,
                marginBottom: 12,
              }}
            >
              Quantity
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: quantity <= 1 ? 0.4 : 1,
                }}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={textColor} />
              </TouchableOpacity>

              <Text
                style={{
                  fontFamily: "Poppins_700Bold",
                  color: textColor,
                  fontSize: 22,
                  marginHorizontal: 24,
                }}
              >
                {quantity}
              </Text>

              <TouchableOpacity
                onPress={() => setQuantity(quantity + 1)}
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={20} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Festival Pickup Notice */}
          <View
            style={{
              backgroundColor: isDark ? "rgba(56, 189, 248, 0.1)" : "#F0F9FF",
              borderColor: "rgba(56, 189, 248, 0.3)",
              borderWidth: 1,
              borderRadius: 18,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <Ionicons name="information-circle" size={18} color="#38BDF8" style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#38BDF8", fontSize: 13 }}>
                Campus Collection
              </Text>
            </View>
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: isDark ? "#CBD5E1" : "#334155",
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Merchandise is collected in person at the central festival store counter during festival days.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: cardBg,
          borderTopWidth: 1,
          borderTopColor: cardBorder,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom + 10, 24),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 10,
          elevation: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontFamily: "Poppins_500Medium", color: subTextColor, fontSize: 11 }}>
            Total Amount
          </Text>
          <Text style={{ fontFamily: "Talina", fontSize: 24, color: textColor }}>
            ₹{totalPrice}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            showAlert(
              "Collect at Festival Store",
              `You can purchase and collect ${quantity}x "${item.name}" at the official Saturnalia Merchandise Counter during festival days.`
            );
          }}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#38BDF8",
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 24,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="bag-check-outline" size={18} color="#000000" style={{ marginRight: 8 }} />
          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              color: "#000000",
              fontSize: 14,
            }}
          >
            Collect at Desk
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ItemDetailsScreen;
