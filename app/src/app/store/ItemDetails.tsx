import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showAlert } from "@/components";
import { useStoreContext } from "@/state/StoreContext";
import { useThemeStore } from "@/state/themeStore";

const { width } = Dimensions.get("window");

const ItemDetailsScreen = () => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const router = useRouter();
  const { itemId } = useLocalSearchParams() as { itemId: string };
  /* Removed API call */
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  // Use store context
  const { cart, updateCart, isItemInCart: checkItemInCart } = useStoreContext();

  useEffect(() => {
    fetchItemDetails();
  }, [itemId]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      /* Removed API call */

      if (result.success) {
        setItem(result.data);
        // Set default size if available
        if (result.data.sizeOptions && result.data.sizeOptions.length > 0) {
          setSelectedSize(result.data.sizeOptions[0].size);
        }
      } else {
        showAlert("Error", result.error);
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

  const handleAddToCart = async () => {
    if (!item) return;

    if (item.sizeOptions.length > 0 && !selectedSize) {
      showAlert("Select Size", "Please select a size before adding to cart");
      return;
    }

    // Check if size is available (negative inventory means unlimited)
    const sizeOption = item.sizeOptions.find((s) => s.size === selectedSize);
    if (
      sizeOption &&
      sizeOption.qtyAvailable >= 0 &&
      sizeOption.qtyAvailable < quantity
    ) {
      showAlert(
        "Insufficient Stock",
        `Only ${sizeOption.qtyAvailable} items available in size ${selectedSize}`
      );
      return;
    }

    try {
      setAddingToCart(true);
      /* Removed API call */

      if (result.success) {
        // Update cart in context
        updateCart(result.data);
        showAlert("Success", "Item added to cart successfully");
      } else {
        showAlert("Error", result.error);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      showAlert("Error", "Failed to add item to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!item) return;

    if (item.sizeOptions.length > 0 && !selectedSize) {
      showAlert("Select Size", "Please select a size before purchasing");
      return;
    }

    try {
      setAddingToCart(true);
      /* Removed API call */

      if (result.success) {
        router.push("/store/Cart");
      } else {
        showAlert("Error", result.error);
      }
    } catch (error) {
      console.error("Error:", error);
      showAlert("Error", "Failed to proceed with purchase");
    } finally {
      setAddingToCart(false);
    }
  };

  const getTotalPrice = () => {
    if (!item) return 0;
    let price = item.price;

    if (selectedSize) {
      const sizeOption = item.sizeOptions.find((s) => s.size === selectedSize);
      if (sizeOption) {
        price += sizeOption.priceModifier;
      }
    }

    return price * quantity;
  };

  const getMaxQuantity = () => {
    if (!item) return 1;

    let maxQty = item.maxQtyPerUser;

    // Check size-specific inventory (negative means unlimited)
    if (selectedSize) {
      const sizeOption = item.sizeOptions.find((s) => s.size === selectedSize);
      if (sizeOption && sizeOption.qtyAvailable >= 0) {
        maxQty = Math.min(maxQty, sizeOption.qtyAvailable);
      }
      // If qtyAvailable is negative, it's unlimited - don't limit
    }

    // Check overall inventory (negative means unlimited)
    if (item.currentInventory >= 0) {
      maxQty = Math.min(maxQty, item.currentInventory);
    }
    // If currentInventory is negative, it's unlimited - don't limit

    return Math.max(1, maxQty);
  };

  const isItemInCartCheck = () => {
    if (!item) return false;
    return checkItemInCart(item.id);
  };

  const bgColor = isDark ? '#131316' : '#E0E0E0';
  const cardBg = isDark ? '#1C1C20' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A30' : '#D5D5D5';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#A0A0A0' : '#6B7280';
  const pillBg = isDark ? '#26262B' : '#F3F4F6';

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#41B8F0" />
        <Text
          style={{ fontFamily: "Poppins_500Medium", color: subTextColor, marginTop: 16 }}
        >
          Loading item details...
        </Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 18 }}>
          Item not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16, backgroundColor: '#41B8F0', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
        >
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
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
          ITEM DETAILS
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/store/Cart")}
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
          <Ionicons name="cart-outline" size={20} color="#41B8F0" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel */}
        <View style={{ marginVertical: 16 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / width
              );
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {item.images && item.images.length > 0 ? (
              item.images.map((image: string, index: number) => (
                <View
                  key={index}
                  style={{ width, paddingHorizontal: 20, height: 300 }}
                >
                  <Image
                    source={{ uri: image }}
                    style={{ width: '100%', height: '100%', borderRadius: 20, backgroundColor: cardBg }}
                    resizeMode="cover"
                  />
                </View>
              ))
            ) : (
              <View
                style={{ width, height: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}
              >
                <View style={{ width: '100%', height: '100%', borderRadius: 20, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="image-outline" size={64} color={subTextColor} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Image Indicators */}
          {item.images && item.images.length > 1 && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
              {item.images.map((_: any, index: number) => (
                <View
                  key={index}
                  style={{
                    height: 6,
                    borderRadius: 3,
                    marginHorizontal: 3,
                    width: index === currentImageIndex ? 20 : 6,
                    backgroundColor: index === currentImageIndex ? '#41B8F0' : (isDark ? '#323238' : '#D1D5DB'),
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Item Info */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text
                style={{ fontFamily: "Talina", fontSize: 26, color: textColor, flex: 1, marginRight: 12 }}
              >
                {item.name}
              </Text>
              <View style={{ backgroundColor: isDark ? 'rgba(65, 184, 240, 0.15)' : 'rgba(65, 184, 240, 0.12)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                <Text
                  style={{ fontFamily: "Poppins_600SemiBold", color: '#41B8F0', fontSize: 12, textTransform: 'uppercase' }}
                >
                  {item.category}
                </Text>
              </View>
            </View>

            <Text
              style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 14, lineHeight: 22 }}
            >
              {item.description}
            </Text>
          </View>

          {/* Price */}
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
              style={{ fontFamily: "Poppins_500Medium", color: subTextColor, fontSize: 13, marginBottom: 4 }}
            >
              Price
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={{ fontFamily: "Talina", fontSize: 32, color: textColor }}
              >
                ₹{getTotalPrice()}
              </Text>
            </View>
            {selectedSize &&
              item.sizeOptions?.find((s: any) => s.size === selectedSize)
                ?.priceModifier !== 0 && (
                <Text
                  style={{ fontFamily: "Poppins_400Regular", color: '#41B8F0', fontSize: 12, marginTop: 4 }}
                >
                  Base price: ₹{item.price} + ₹
                  {
                    item.sizeOptions?.find((s: any) => s.size === selectedSize)
                      ?.priceModifier
                  }{" "}
                  (size adjustment)
                </Text>
              )}
          </View>

          {/* Size Selection */}
          {item.sizeOptions && item.sizeOptions.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 16, marginBottom: 12 }}
              >
                Select Size
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {item.sizeOptions.map((sizeOption: any) => {
                  const isAvailable =
                    sizeOption.qtyAvailable === -1 ||
                    sizeOption.qtyAvailable > 0;
                  const isSelected = selectedSize === sizeOption.size;

                  return (
                    <TouchableOpacity
                      key={sizeOption.size}
                      disabled={!isAvailable}
                      onPress={() => setSelectedSize(sizeOption.size)}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 14,
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#41B8F0' : cardBorder,
                        backgroundColor: isSelected ? (isDark ? 'rgba(65, 184, 240, 0.15)' : '#E0F2FE') : cardBg,
                        opacity: isAvailable ? 1 : 0.4,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          fontSize: 15,
                          color: isSelected ? '#41B8F0' : textColor,
                        }}
                      >
                        {sizeOption.size}
                      </Text>
                      {sizeOption.priceModifier > 0 && isAvailable && (
                        <Text
                          style={{
                            fontFamily: "Poppins_400Regular",
                            fontSize: 11,
                            color: isSelected ? '#41B8F0' : subTextColor,
                            marginTop: 2,
                          }}
                        >
                          +₹{sizeOption.priceModifier}
                        </Text>
                      )}
                      {!isAvailable && (
                        <Text
                          style={{
                            fontFamily: "Poppins_400Regular",
                            fontSize: 11,
                            color: subTextColor,
                            marginTop: 2,
                          }}
                        >
                          Out
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Quantity Selection */}
          {isItemInCartCheck() ? null : (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 16, marginBottom: 12 }}
              >
                Quantity
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: cardBorder,
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: quantity <= 1 ? 0.4 : 1,
                  }}
                  disabled={quantity <= 1}
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={textColor}
                  />
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
                  onPress={() =>
                    setQuantity(Math.min(getMaxQuantity(), quantity + 1))
                  }
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: cardBorder,
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: quantity >= getMaxQuantity() ? 0.4 : 1,
                  }}
                  disabled={quantity >= getMaxQuantity()}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={textColor}
                  />
                </TouchableOpacity>

                <Text
                  style={{ fontFamily: "Poppins_400Regular", color: subTextColor, marginLeft: 16, fontSize: 13 }}
                >
                  Max: {getMaxQuantity()}
                </Text>
              </View>
            </View>
          )}

          {isItemInCartCheck() && (
            <View style={{ backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#DCFCE7', padding: 14, borderRadius: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
              <Text
                style={{ fontFamily: "Poppins_500Medium", color: '#22c55e', fontSize: 14, marginLeft: 8 }}
              >
                This item is already in your cart.
              </Text>
            </View>
          )}

          {/* Stock Info */}
          <View
            style={{
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: cardBorder,
              borderRadius: 20,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={
                  item.currentInventory < 0 || item.currentInventory > 10
                    ? "checkmark-circle"
                    : item.currentInventory === 0
                    ? "close-circle"
                    : "warning"
                }
                size={20}
                color={
                  item.currentInventory < 0 || item.currentInventory > 10
                    ? "#10B981"
                    : item.currentInventory === 0
                    ? "#EF4444"
                    : "#F59E0B"
                }
              />
              <Text
                style={{ fontFamily: "Poppins_500Medium", color: textColor, marginLeft: 8, fontSize: 14 }}
              >
                {item.currentInventory < 0
                  ? "In Stock"
                  : item.currentInventory > 10
                  ? "In Stock"
                  : item.currentInventory === 0
                  ? "Out of Stock"
                  : `Only ${item.currentInventory} left in stock`}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: cardBg,
          borderTopWidth: 1,
          borderTopColor: cardBorder,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom + 10, 24),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        {isItemInCartCheck() ? (
          <TouchableOpacity
            onPress={() => router.push("/store/Cart")}
            style={{ backgroundColor: '#41B8F0', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
          >
            <Ionicons name="cart" size={20} color="#FFFFFF" />
            <Text
              style={{ fontFamily: "Poppins_600SemiBold", color: '#FFFFFF', fontSize: 16, marginLeft: 8 }}
            >
              View Cart
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleAddToCart}
            disabled={addingToCart || item.currentInventory === 0}
            style={{
              backgroundColor: addingToCart || item.currentInventory === 0 ? (isDark ? '#2A2A30' : '#E5E7EB') : '#41B8F0',
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="cart-outline" size={20} color={addingToCart || item.currentInventory === 0 ? subTextColor : '#FFFFFF'} />
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 16,
                    color: addingToCart || item.currentInventory === 0 ? subTextColor : '#FFFFFF',
                    marginLeft: 8,
                  }}
                >
                  Add to Cart
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default ItemDetailsScreen;
