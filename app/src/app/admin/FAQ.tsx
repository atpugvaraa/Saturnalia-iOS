import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { ArrowLeft, Plus, Edit, Trash2, HelpCircle } from "lucide-react-native";
import { FAQ } from "@/types/models";
import { getFAQs, createFAQ, updateFAQ, deleteFAQ } from "@/api/admin";
import Input from "@/components/ui/Input";
import { showAlert } from "@/components";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { useThemeStore } from "@/state/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FAQManagement() {
  const navigation = useAdminNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();

  const [data, setData] = useState<FAQ[]>([]);
  const [createData, setCreateData] = useState<Partial<FAQ>>({
    order: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<FAQ>>({});
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";

  const loadData = async () => {
    try {
      const res = await getFAQs();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteFAQ = async (item: FAQ) => {
    showAlert(
      "Delete FAQ",
      "Are you sure you want to delete this FAQ?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(item.id);
            const success = await deleteFAQ(item.id);
            if (success) {
              await loadData();
              showAlert("Success", "FAQ deleted successfully!");
            } else {
              showAlert("Error", "Failed to delete FAQ");
            }
            setDeletingId(null);
          },
        },
      ]
    );
  };

  const handleCreateFAQ = async () => {
    if (!createData.question || !createData.answer) {
      showAlert("Error", "Please fill in all required fields (Question, Answer)");
      return;
    }

    setCreating(true);
    try {
      await createFAQ({
        question: createData.question,
        answer: createData.answer,
        order: createData.order || 0,
      });

      await loadData();
      setCreateData({ order: 0 });
      showAlert("Success", "FAQ created successfully!");
    } catch (error) {
      showAlert("Error", "Failed to create FAQ");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateFAQ = async () => {
    if (!editingId) return;

    try {
      const updates: Partial<FAQ> = {};
      if (editData.question) updates.question = editData.question;
      if (editData.answer) updates.answer = editData.answer;
      if (editData.order !== undefined) updates.order = editData.order;

      const success = await updateFAQ(editingId, updates);

      if (success) {
        await loadData();
        setEditingId(null);
        setEditData({});
        showAlert("Success", "FAQ updated successfully!");
      } else {
        showAlert("Error", "Failed to update FAQ");
      }
    } catch (error) {
      showAlert("Error", "Failed to update FAQ");
      console.error(error);
    }
  };

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
          activeOpacity={0.7}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
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
            FAQ Management
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              fontSize: 12,
              color: "#41B8F0",
              marginTop: 1,
            }}
          >
            Create and manage frequently asked questions
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Create FAQ Section */}
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: cardBorder,
          }}
        >
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              color: textPrimary,
              fontSize: 18,
              marginBottom: 16,
            }}
          >
            Create New FAQ
          </Text>

          <Input
            label="Question"
            value={createData.question || ""}
            onChangeText={(value: string) => {
              setCreateData({
                ...createData,
                question: value,
              });
            }}
            placeholder="e.g., How do I register for events?"
            style={{ marginBottom: 14 }}
          />

          <Input
            label="Answer"
            value={createData.answer || ""}
            onChangeText={(value: string) => {
              setCreateData({
                ...createData,
                answer: value,
              });
            }}
            placeholder="Provide a detailed answer..."
            multiline
            numberOfLines={4}
            style={{ marginBottom: 14 }}
          />

          <Input
            label="Display Order"
            value={createData.order?.toString() || "0"}
            onChangeText={(value: string) => {
              setCreateData({
                ...createData,
                order: parseInt(value) || 0,
              });
            }}
            placeholder="0"
            keyboardType="numeric"
            style={{ marginBottom: 16 }}
          />

          <TouchableOpacity
            style={{
              backgroundColor: "#41B8F0",
              opacity: creating ? 0.7 : 1,
              paddingVertical: 14,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            disabled={creating}
            onPress={handleCreateFAQ}
            activeOpacity={0.8}
          >
            {creating ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    color: "#FFFFFF",
                    fontSize: 15,
                    marginLeft: 8,
                  }}
                >
                  Creating...
                </Text>
              </>
            ) : (
              <>
                <Plus size={18} color="#FFFFFF" />
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    color: "#FFFFFF",
                    fontSize: 15,
                    marginLeft: 8,
                  }}
                >
                  Create FAQ
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing FAQs */}
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            color: textPrimary,
            fontSize: 18,
            marginBottom: 14,
          }}
        >
          Active FAQs ({data.length})
        </Text>

        {loading ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#41B8F0" />
            <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, marginTop: 12 }}>
              Loading FAQs...
            </Text>
          </View>
        ) : data.length === 0 ? (
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 20,
              padding: 32,
              alignItems: "center",
              borderWidth: 1,
              borderColor: cardBorder,
            }}
          >
            <HelpCircle size={42} color={textSecondary} />
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                color: textSecondary,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              No FAQs yet. Create your first FAQ above!
            </Text>
          </View>
        ) : (
          data.map((item, index) => (
            <View
              key={item.id || index}
              style={{
                backgroundColor: cardBg,
                borderRadius: 20,
                padding: 18,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: cardBorder,
              }}
            >
              {editingId === item.id ? (
                // Edit Mode
                <View>
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      color: textPrimary,
                      fontSize: 16,
                      marginBottom: 14,
                    }}
                  >
                    Editing FAQ
                  </Text>

                  <Input
                    label="Question"
                    value={editData.question || item.question}
                    onChangeText={(value: string) => {
                      setEditData({
                        ...editData,
                        question: value,
                      });
                    }}
                    style={{ marginBottom: 12 }}
                  />

                  <Input
                    label="Answer"
                    value={editData.answer || item.answer}
                    onChangeText={(value: string) => {
                      setEditData({
                        ...editData,
                        answer: value,
                      });
                    }}
                    multiline
                    numberOfLines={4}
                    style={{ marginBottom: 12 }}
                  />

                  <Input
                    label="Display Order"
                    value={editData.order?.toString() || item.order.toString()}
                    onChangeText={(value: string) => {
                      setEditData({
                        ...editData,
                        order: parseInt(value) || item.order,
                      });
                    }}
                    keyboardType="numeric"
                    style={{ marginBottom: 14 }}
                  />

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: "#41B8F0",
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                      onPress={handleUpdateFAQ}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF" }}>
                        Save
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                      onPress={() => {
                        setEditingId(null);
                        setEditData({});
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontFamily: "Poppins_500Medium", color: textSecondary }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // View Mode
                <View>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#41B8F020",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                        marginTop: 2,
                      }}
                    >
                      <HelpCircle size={18} color="#41B8F0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          color: textPrimary,
                          fontSize: 15,
                        }}
                      >
                        {item.question}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Poppins_400Regular",
                          color: textSecondary,
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        Display Order: {item.order}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins_400Regular",
                        color: textSecondary,
                        fontSize: 13,
                        lineHeight: 18,
                      }}
                    >
                      {item.answer}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: isDark ? "rgba(65, 184, 240, 0.15)" : "#E0F2FE",
                        paddingVertical: 10,
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onPress={() => {
                        setEditingId(item.id);
                        setEditData({
                          question: item.question,
                          answer: item.answer,
                          order: item.order,
                        });
                      }}
                      activeOpacity={0.75}
                    >
                      <Edit size={16} color="#41B8F0" />
                      <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", marginLeft: 6, fontSize: 13 }}>
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
                        paddingVertical: 10,
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onPress={() => handleDeleteFAQ(item)}
                      disabled={deletingId === item.id}
                      activeOpacity={0.75}
                    >
                      {deletingId === item.id ? (
                        <>
                          <ActivityIndicator color="#EF4444" size="small" />
                          <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#EF4444", marginLeft: 6, fontSize: 13 }}>
                            Deleting...
                          </Text>
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} color="#EF4444" />
                          <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#EF4444", marginLeft: 6, fontSize: 13 }}>
                            Delete
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
