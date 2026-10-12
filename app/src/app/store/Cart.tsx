// src/screens/App/Store/CartScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, showAlert } from "@/components";
import { useStoreContext } from "@/state/StoreContext";
import { useUserStore } from "@/state/userStore";
import { useThemeStore } from "@/state/themeStore";
import { initializeEasebuzzCheckout } from "react-native-easebuzz-sdk";

// Memoized Cart Item Card Component for better performance
interface CartItemCardProps {
  item: any;
  onRemove: (itemId: string, size?: string) => void;
  isUpdating: boolean;
}

const CartItemCard: React.FC<CartItemCardProps> = ({ item, onRemove, isUpdating }) => {
  const { isDark } = useThemeStore();
  const cardBg = isDark ? '#1C1C20' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A30' : '#D5D5D5';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#A0A0A0' : '#6B7280';

  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        borderWidth: 1,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={{ width: 68, height: 68, borderRadius: 14, backgroundColor: isDark ? '#26262B' : '#F3F4F6', marginRight: 14 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: 68, height: 68, borderRadius: 14, backgroundColor: isDark ? '#26262B' : '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
          <Ionicons name="shirt-outline" size={26} color="#41B8F0" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Poppins_600SemiBold', color: textColor, fontSize: 15 }} numberOfLines={1}>
          {item.name || item.itemName}
        </Text>
        {item.selectedSize ? (
          <Text style={{ fontFamily: 'Poppins_400Regular', color: subTextColor, fontSize: 12, marginTop: 2 }}>
            Size: <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#41B8F0' }}>{item.selectedSize}</Text> • Qty: {item.quantity}
          </Text>
        ) : (
          <Text style={{ fontFamily: 'Poppins_400Regular', color: subTextColor, fontSize: 12, marginTop: 2 }}>
            Qty: {item.quantity}
          </Text>
        )}
        <Text style={{ fontFamily: 'Talina', color: textColor, fontSize: 18, marginTop: 4 }}>
          ₹{item.price * item.quantity}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => onRemove(item.itemId, item.selectedSize)}
        disabled={isUpdating}
        style={{ padding: 10 }}
      >
        {isUpdating ? (
          <ActivityIndicator size="small" color="#EF4444" />
        ) : (
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const CartScreen = () => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const router = useRouter();
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Use store context
  const { cart, loading, refreshing, refresh, updateCart } = useStoreContext();

  // User data for coins
  const { userData, refreshUserProfile } = useUserStore();
  //refresh user profile on mount to get latest coins
  useEffect(() => {
    refreshUserProfile();
  }, []);
  const userCoins = userData?.coins || 0;

  // Discount state
  const [couponCode, setCouponCode] = useState("");
  const [useCoins, setUseCoins] = useState(false);
  /* Removed API call */
  const [calculatingDiscount, setCalculatingDiscount] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Payment status
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  // Payment response handler
  const handlePaymentResponse = (response: any) => {
    let parsedResponse;

    try {
      if (typeof response === "string") {
        parsedResponse = JSON.parse(response);
      } else if (typeof response === "object" && response !== null) {
        parsedResponse = response;
      } else {
        // Handle unexpected formats
        throw new Error(
          "Unexpected response format received from Easebuzz SDK."
        );
      }
    } catch (e) {
      console.error("Failed to parse the payment response:", e);
      showAlert(
        "Error",
        "Failed to read the payment result. Please check your transactions."
      );
      setPaymentStatus("Payment Failed: Parsing Error");
      return; // Stop execution if parsing fails
    }

    // From this point on, 'parsedResponse' is a guaranteed JavaScript object.
    // console.log("Normalized Parsed Response: ", parsedResponse);
    const transactionResult = parsedResponse.result;
    const detailedResponseObject = parsedResponse.payment_response; // This is usually an object
    const details = detailedResponseObject || null;

    // console.log("Transaction Result: ", transactionResult);
    // console.log("Detailed Response Object: ", detailedResponseObject);

    switch (transactionResult) {
      case "payment_successfull":
        setPaymentStatus("Payment Successful");
        showAlert(
          "Success",
          "Store payment was successful! Please check your Orders in Profile",
          [
            {
              text: "OK",
              onPress: () => {
                // Clear cart and navigate back to store
                updateCart(null);
                router.replace("/store");
              },
            },
          ]
        );
        break;

      case "payment_failed":
      case "error_server_error":
      case "error_noretry":
      case "retry_fail_error":
      case "trxn_not_allowed":
        setPaymentStatus("Payment Failed");
        showAlert(
          "Failure",
          `Payment failed. Reason: ${
            details?.error_Message || "Unknown error"
          }`,
          [
            {
              text: "OK",
              onPress: () => {
                // Clear cart and navigate back to store
                updateCart(null);
                router.replace("/store");
              },
            },
          ]
        );
        break;

      case "user_cancelled":
      case "back_pressed":
      case "bank_back_pressed":
        setPaymentStatus("Payment Cancelled by User");
        showAlert("Cancelled", "You cancelled the payment process.", [
          {
            text: "OK",
            onPress: () => {
              // Clear cart and navigate back to store
              updateCart(null);
              router.replace("/store");
            },
          },
        ]);
        break;

      case "txn_session_timeout":
        setPaymentStatus("Transaction Session Timeout");
        showAlert("Timeout", "The transaction session has expired.");
        break;

      case "invalid_input_data":
        setPaymentStatus("Invalid Input Data");
        showAlert("Error", "Invalid data was provided to the SDK.");
        break;

      default:
        setPaymentStatus(`Unknown Status: ${transactionResult}`);
        showAlert(
          "Unknown Response",
          "An unknown response was received from the payment gateway.",
          [
            {
              text: "OK",
              onPress: () => {
                // Clear cart and navigate back to store
                updateCart(null);
                router.replace("/store");
              },
            },
          ]
        );
        break;
    }
  };

  // Calculate discount when coupon or coins change

  const handleCalculateDiscount = useCallback(async () => {
    // If user intends to use coins, get the latest balance first
    if (useCoins) {
      await refreshUserProfile();
    }

    if (!cart || cart.items.length === 0) {
      setDiscountData(null);
      return;
    }

    if (!couponCode.trim() && !useCoins) {
      setDiscountData(null);
      return;
    }

    setCalculatingDiscount(true);
    try {
      /* Removed API call */

      if (result.success) {
        setDiscountData(result.data);
      } else {
        setDiscountData(null);
        if (couponCode.trim()) {
          showAlert("Error", result.error);
        }
      }
    } catch (error) {
      console.error("Error calculating discount:", error);
      setDiscountData(null);
    } finally {
      setCalculatingDiscount(false);
    }
  }, [cart, couponCode, useCoins, refreshUserProfile]);

  const handleToggleUseCoins = useCallback(async () => {
    const nextUseCoinsState = !useCoins;
    setUseCoins(nextUseCoinsState);

    // Call calculate discount immediately with the new value to avoid stale state
    handleCalculateDiscount();
  }, [useCoins, handleCalculateDiscount]);

  const handleRemoveCoupon = useCallback(() => {
    // Set coupon to empty and immediately re-calculate discounts
    setCouponCode("");

    // We need to re-calculate because coins might still be applied.
    // Use a timeout to ensure the state update is processed before calculating.
    setTimeout(() => {
      handleCalculateDiscount();
    }, 0);
  }, [handleCalculateDiscount]);

  /* Removed API call */

  const handleClearCart = useCallback(() => {
    /* Removed API call */
  }, [updateCart]);

  const handleCheckout = useCallback(async () => {
    if (!cart || cart.items.length === 0) {
      showAlert("Error", "Your cart is empty");
      return;
    }

    const finalAmount = discountData
      ? discountData.finalAmount
      : cart.totalAmount;
    const transactionFees = Math.ceil(finalAmount * 0.0175); // 1.75%
    const totalToPay = finalAmount + transactionFees;

    /* Removed API call */
  }, [cart, discountData, couponCode, useCoins, updateCart]);

  // Handle scroll event to show/hide scroll button
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    
    // Show button if not at bottom and content is scrollable
    setShowScrollButton(!isCloseToBottom && contentSize.height > layoutMeasurement.height);
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  // Memoize scroll view content style for better performance
  const scrollContentStyle = useMemo(() => ({ paddingBottom: 80 }), []);

  const bgColor = isDark ? '#131316' : '#E0E0E0';
  const cardBg = isDark ? '#1C1C20' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A30' : '#D5D5D5';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#A0A0A0' : '#6B7280';
  const inputBg = isDark ? '#26262B' : '#F3F4F6';

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#41B8F0" />
        <Text
          style={{ fontFamily: "Poppins_500Medium", color: subTextColor, marginTop: 16 }}
        >
          Loading cart...
        </Text>
      </View>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bgColor }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        {/* Top Header */}
        <View
          style={{
            paddingTop: Math.max(insets.top + 8, 44),
            paddingBottom: 14,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
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
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </TouchableOpacity>
          <Text
            style={{ fontFamily: "Talina", fontSize: 22, color: textColor, letterSpacing: 0.5 }}
          >
            MY CART
          </Text>
          {!isEmpty ? (
            <TouchableOpacity
              onPress={handleClearCart}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 42 }} />
          )}
        </View>

        {isEmpty ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
            <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Ionicons name="cart-outline" size={48} color={subTextColor} />
            </View>
            <Text
              style={{ fontFamily: "Talina", fontSize: 24, color: textColor, marginBottom: 8 }}
            >
              YOUR CART IS EMPTY
            </Text>
            <Text
              style={{ fontFamily: "Poppins_400Regular", color: subTextColor, textAlign: "center", marginBottom: 28, fontSize: 14 }}
            >
              Add items to your cart to see them here
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ backgroundColor: '#41B8F0', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, flexDirection: "row", alignItems: "center" }}
            >
              <Ionicons name="storefront-outline" size={20} color="#FFFFFF" />
              <Text
                style={{ fontFamily: "Poppins_600SemiBold", color: '#FFFFFF', marginLeft: 8, fontSize: 15 }}
              >
                Browse Store
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Cart Items List */}
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 160 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor="#41B8F0"
                />
              }
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={Platform.OS === 'android'}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {/* Items Count */}
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 16 }}
                >
                  {cart.items.length} {cart.items.length === 1 ? "Item" : "Items"} in Cart
                </Text>
              </View>

              {cart.items.map((item: any) => (
                <CartItemCard
                  key={`${item.itemId}-${item.selectedSize}`}
                  item={item}
                  onRemove={handleRemoveItem}
                  isUpdating={updatingItem === item.itemId}
                />
              ))}

              {/* Discounts & Promo Code */}
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  padding: 18,
                  marginVertical: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <Text
                    style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 16 }}
                  >
                    Discounts & Savings
                  </Text>
                  <Ionicons name="pricetag-outline" size={18} color="#41B8F0" />
                </View>

                {/* Coupon Input */}
                {discountData && discountData.couponApplied ? (
                  <View style={{ backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#DCFCE7', borderWidth: 1, borderColor: '#22c55e', borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#22c55e"
                      />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text
                          style={{ fontFamily: "Poppins_600SemiBold", color: '#22c55e', fontSize: 13 }}
                        >
                          Coupon Applied!
                        </Text>
                        <Text
                          style={{ fontFamily: "Poppins_400Regular", color: textColor, fontSize: 11 }}
                        >
                          {discountData.couponMessage}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={handleRemoveCoupon}>
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginBottom: 14 }}>
                    <TextInput
                      style={{
                        backgroundColor: inputBg,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: cardBorder,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        color: textColor,
                        fontFamily: "Poppins_500Medium",
                        fontSize: 14,
                      }}
                      placeholder="ENTER COUPON CODE"
                      placeholderTextColor={subTextColor}
                      value={couponCode}
                      onChangeText={(text) => setCouponCode(text.toUpperCase())}
                      autoCapitalize="characters"
                      editable={!calculatingDiscount}
                    />
                  </View>
                )}

                {/* Coins Toggle */}
                <TouchableOpacity
                  onPress={() => {
                    const nextUseCoinsState = !useCoins;
                    setUseCoins(nextUseCoinsState);
                    if (!nextUseCoinsState && discountData) {
                      setDiscountData(null);
                    }
                  }}
                  disabled={userCoins === 0 || calculatingDiscount}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <Ionicons
                      name={useCoins ? "checkbox" : "square-outline"}
                      size={22}
                      color={useCoins ? "#41B8F0" : subTextColor}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 14 }}
                      >
                        Use Saturnalia Coins
                      </Text>
                      <Text
                        style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 12 }}
                      >
                        Available: {userCoins} coins (10 coins = ₹1)
                      </Text>
                      {discountData && discountData.coinsUsed > 0 && (
                        <Text
                          style={{ fontFamily: "Poppins_500Medium", color: '#41B8F0', fontSize: 12, marginTop: 2 }}
                        >
                          Using: {discountData.coinsUsed} coins = -₹{discountData.coinsDiscount}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="diamond-outline" size={18} color="#41B8F0" />
                </TouchableOpacity>
                {userCoins === 0 && (
                  <Text
                    style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 11, marginTop: 6 }}
                  >
                    You have no Saturnalia Coins to use.
                  </Text>
                )}

                {/* Apply Button */}
                <TouchableOpacity
                  onPress={handleCalculateDiscount}
                  disabled={calculatingDiscount}
                  style={{
                    backgroundColor: '#41B8F0',
                    borderRadius: 14,
                    paddingVertical: 12,
                    alignItems: "center",
                    marginTop: 16,
                  }}
                >
                  {calculatingDiscount ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", fontSize: 14 }}>
                      Apply Discounts
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Summary Card */}
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  padding: 18,
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Text style={{ fontFamily: "Poppins_500Medium", color: subTextColor, fontSize: 13 }}>
                    Subtotal
                  </Text>
                  <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 15 }}>
                    ₹{cart.totalAmount}
                  </Text>
                </View>

                {discountData && discountData.couponDiscount > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <Text style={{ fontFamily: "Poppins_500Medium", color: '#22c55e', fontSize: 13 }}>
                      Coupon Discount
                    </Text>
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: '#22c55e', fontSize: 15 }}>
                      -₹{discountData.couponDiscount}
                    </Text>
                  </View>
                )}

                {discountData && discountData.coinsDiscount > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <Text style={{ fontFamily: "Poppins_500Medium", color: '#41B8F0', fontSize: 13 }}>
                      Coins Discount ({discountData.coinsUsed} coins)
                    </Text>
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: '#41B8F0', fontSize: 15 }}>
                      -₹{discountData.coinsDiscount}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Text style={{ fontFamily: "Poppins_500Medium", color: subTextColor, fontSize: 13 }}>
                    Total Items
                  </Text>
                  <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 15 }}>
                    {cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                  </Text>
                </View>

                {/* Transaction Fees */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 13 }}>
                    Transaction Fees
                  </Text>
                  <Text style={{ fontFamily: "Poppins_500Medium", color: subTextColor, fontSize: 13 }}>
                    ₹{discountData
                      ? Math.ceil(discountData.finalAmount * 0.015)
                      : Math.ceil(cart.totalAmount * 0.015)}
                  </Text>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: cardBorder, marginVertical: 10 }} />

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontFamily: "Talina", color: textColor, fontSize: 20 }}>
                    TOTAL
                  </Text>
                  <Text style={{ fontFamily: "Talina", color: '#41B8F0', fontSize: 24 }}>
                    ₹
                    {discountData
                      ? discountData.finalAmount + Math.ceil(discountData.finalAmount * 0.015)
                      : cart.totalAmount + Math.ceil(cart.totalAmount * 0.015)}
                  </Text>
                </View>

                {discountData && discountData.savings > 0 && (
                  <View style={{ marginTop: 12, backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#DCFCE7', borderRadius: 12, padding: 8 }}>
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: '#22c55e', textAlign: "center", fontSize: 12 }}>
                      You're saving ₹{discountData.savings}!
                    </Text>
                  </View>
                )}
              </View>

              {/* Checkout Button */}
              <TouchableOpacity
                onPress={handleCheckout}
                disabled={processingPayment || calculatingDiscount}
                style={{
                  backgroundColor: '#41B8F0',
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  opacity: processingPayment || calculatingDiscount ? 0.6 : 1,
                  shadowColor: '#41B8F0',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                {processingPayment || calculatingDiscount ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", fontSize: 16 }}>
                    Proceed to Checkout
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>

            {/* Scroll to Bottom Button */}
            {showScrollButton && (
              <TouchableOpacity
                onPress={scrollToBottom}
                style={{
                  position: 'absolute',
                  bottom: 24,
                  right: 20,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  borderRadius: 24,
                  width: 48,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <Ionicons name="chevron-down" size={24} color={textColor} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default CartScreen;
