import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  StatusBar,
  TextInput,
} from "react-native";
import { showAlert, Input } from "@/components";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Edit2,
  Plus,
  ShoppingBag,
  Image as ImageIcon,
  X,
} from "lucide-react-native";
import {
  adminListStoreItems,
  adminCreateStoreItem,
  adminUpdateStoreItem,
  adminDeleteStoreItem,
  StoreItem,
} from "@/api/store";
import { adminUploadMedia } from "@/api/admin";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { useThemeStore } from "@/state/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StoreManagement() {
  const navigation = useAdminNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();

  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await adminListStoreItems();
      setItems(res);
    } catch (e: any) {
      console.error("loadData store items error:", e);
      showAlert("Error", e?.message || "Failed to load store items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setImageUrl("");
    setSelectedImageUri(null);
  };

  const handleStartEdit = (item: StoreItem) => {
    setEditingId(item.id);
    setName(item.name || "");
    setDescription(item.description || "");
    setPrice(item.price ? String(item.price) : "0");
    setImageUrl(item.image || item.imageUrl || "");
    setSelectedImageUri(null);
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert("Permission Required", "Please allow gallery access to upload product images.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error("pickImage error:", err);
      showAlert("Error", "Failed to select image");
    }
  };

  const handleSaveProduct = async () => {
    if (!name.trim()) {
      showAlert("Validation Error", "Please provide a product name.");
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      showAlert("Validation Error", "Please provide a valid non-negative price.");
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = imageUrl.trim();

      // If user selected a new local file from gallery, upload to ImageKit
      if (selectedImageUri) {
        setUploadingImage(true);
        const uploaded = await adminUploadMedia(selectedImageUri, {
          folder: "store",
        });
        finalImageUrl = uploaded.url;
        setUploadingImage(false);
      }

      if (editingId) {
        await adminUpdateStoreItem(editingId, {
          name: name.trim(),
          description: description.trim(),
          price: numPrice,
          image: finalImageUrl,
        });
        showAlert("Success", "Store product updated successfully!");
      } else {
        await adminCreateStoreItem({
          name: name.trim(),
          description: description.trim(),
          price: numPrice,
          image: finalImageUrl,
        });
        showAlert("Success", "New store product added successfully!");
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      console.error("handleSaveProduct error:", error);
      showAlert("Error", error.message || "Failed to save product");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleDeleteItem = async (item: StoreItem) => {
    showAlert(
      "Delete Product",
      `Are you sure you want to delete "${item.name}" from the store?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await adminDeleteStoreItem(item.id);
              showAlert("Deleted", "Product removed from store.");
              if (editingId === item.id) {
                resetForm();
              }
              await loadData();
            } catch (err: any) {
              showAlert("Error", err.message || "Failed to delete product");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const currentPreviewUri = selectedImageUri || imageUrl.trim();

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
          backgroundColor: bgColor,
          borderBottomWidth: 1,
          borderBottomColor: cardBorder,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: cardBorder,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <ArrowLeft size={20} color={textPrimary} />
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
            STORE MANAGEMENT
          </Text>
          <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: "#38BDF8" }}>
            Festival Shop & Merchandise
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Add / Edit Form Card */}
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: cardBorder,
            padding: 18,
            marginBottom: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.06,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: isDark ? "rgba(56, 189, 248, 0.15)" : "#E0F2FE",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                {editingId ? <Edit2 size={16} color="#38BDF8" /> : <Plus size={18} color="#38BDF8" />}
              </View>
              <Text
                style={{
                  fontFamily: "Poppins_700Bold",
                  fontSize: 16,
                  color: textPrimary,
                }}
              >
                {editingId ? "Edit Store Product" : "Add New Store Product"}
              </Text>
            </View>

            {editingId && (
              <TouchableOpacity
                onPress={resetForm}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEE2E2",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                }}
              >
                <X size={14} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: "#EF4444" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Product Name */}
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                fontSize: 12,
                color: textSecondary,
                marginBottom: 6,
              }}
            >
              Product Name *
            </Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="e.g. Saturnalia Official Hoodie"
            />
          </View>

          {/* Product Price */}
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                fontSize: 12,
                color: textSecondary,
                marginBottom: 6,
              }}
            >
              Price (in ₹) *
            </Text>
            <Input
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 799"
              keyboardType="numeric"
            />
          </View>

          {/* Product Description */}
          <View style={{ marginBottom: 14 }}>
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                fontSize: 12,
                color: textSecondary,
                marginBottom: 6,
              }}
            >
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Curated in a way that you wear to feel the vibes of Saturnalia..."
              placeholderTextColor={isDark ? "#8E8E93" : "#9CA3AF"}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: isDark ? "#26262B" : "#F3F4F6",
                borderColor: cardBorder,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                color: textPrimary,
                fontFamily: "Poppins_400Regular",
                fontSize: 13,
                textAlignVertical: "top",
                minHeight: 70,
              }}
            />
          </View>

          {/* Product Image Section */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                fontSize: 12,
                color: textSecondary,
                marginBottom: 6,
              }}
            >
              Product Image (Optional - falls back to question.png)
            </Text>

            {/* Image Preview */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? "#26262B" : "#F8FAFC",
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: 14,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 12,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                {currentPreviewUri ? (
                  <Image
                    source={{ uri: currentPreviewUri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="contain"
                  />
                ) : (
                  <Image
                    source={require("@/assets/question.png")}
                    style={{ width: "75%", height: "75%" }}
                    resizeMode="contain"
                  />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 12,
                    color: textPrimary,
                    marginBottom: 2,
                  }}
                >
                  {currentPreviewUri ? "Image Selected" : "Default question.png"}
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins_400Regular",
                    fontSize: 11,
                    color: textSecondary,
                    lineHeight: 16,
                  }}
                >
                  {currentPreviewUri
                    ? "Product image will display in center card."
                    : "No image set: question.png will show as fallback."}
                </Text>

                {currentPreviewUri ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedImageUri(null);
                      setImageUrl("");
                    }}
                    style={{ marginTop: 6 }}
                  >
                    <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: "#EF4444" }}>
                      Clear Image
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Pick from Gallery Button */}
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.8}
              style={{
                backgroundColor: isDark ? "rgba(56, 189, 248, 0.12)" : "#E0F2FE",
                borderColor: "rgba(56, 189, 248, 0.3)",
                borderWidth: 1,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              <Upload size={15} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: "#38BDF8" }}>
                Upload from Gallery
              </Text>
            </TouchableOpacity>

            {/* Direct Image URL fallback input */}
            <Input
              value={imageUrl}
              onChangeText={(txt) => {
                setImageUrl(txt);
                setSelectedImageUri(null);
              }}
              placeholder="Or paste image URL (https://...)"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSaveProduct}
            disabled={saving || uploadingImage}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#38BDF8",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#000000" style={{ marginRight: 8 }} />
            ) : (
              <ShoppingBag size={17} color="#000000" style={{ marginRight: 8 }} />
            )}
            <Text
              style={{
                fontFamily: "Poppins_700Bold",
                fontSize: 14,
                color: "#000000",
              }}
            >
              {saving
                ? uploadingImage
                  ? "Uploading Media..."
                  : "Saving Product..."
                : editingId
                ? "Update Store Product"
                : "Add to Store"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Existing Products List Section */}
        <View style={{ marginBottom: 12 }}>
          <Text
            style={{
              fontFamily: "Talina",
              fontSize: 19,
              color: textPrimary,
              marginBottom: 4,
            }}
          >
            EXISTING PRODUCTS ({items.length})
          </Text>
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: textSecondary }}>
            All items currently available on the user-facing store page.
          </Text>
        </View>

        {loading ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, marginTop: 10 }}>
              Loading store products...
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: cardBorder,
              padding: 24,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShoppingBag size={36} color={textSecondary} style={{ marginBottom: 10 }} />
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 15 }}>
              No Store Items Yet
            </Text>
            <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 12, textAlign: "center", marginTop: 4 }}>
              Use the form above to add merchandise products to the Saturnalia shop.
            </Text>
          </View>
        ) : (
          items.map((prod) => {
            const hasCustomImg = !!(prod.image || prod.imageUrl);
            const isDeleting = deletingId === prod.id;

            return (
              <View
                key={prod.id}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  padding: 14,
                  marginBottom: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.2 : 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                {/* Thumbnail */}
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    backgroundColor: isDark ? "#26262B" : "#F1F5F9",
                    borderWidth: 1,
                    borderColor: cardBorder,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    marginRight: 12,
                  }}
                >
                  {hasCustomImg ? (
                    <Image
                      source={{ uri: prod.image || prod.imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Image
                      source={require("@/assets/question.png")}
                      style={{ width: "75%", height: "75%" }}
                      resizeMode="contain"
                    />
                  )}
                </View>

                {/* Details */}
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 14,
                      color: textPrimary,
                    }}
                    numberOfLines={1}
                  >
                    {prod.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins_700Bold",
                      fontSize: 14,
                      color: "#38BDF8",
                      marginVertical: 2,
                    }}
                  >
                    ₹{prod.price}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      fontSize: 11,
                      color: textSecondary,
                    }}
                    numberOfLines={2}
                  >
                    {prod.description || "No description provided."}
                  </Text>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: "column", gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => handleStartEdit(prod)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: isDark ? "rgba(56, 189, 248, 0.15)" : "#E0F2FE",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Edit2 size={15} color="#38BDF8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteItem(prod)}
                    disabled={isDeleting}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Trash2 size={15} color="#EF4444" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
