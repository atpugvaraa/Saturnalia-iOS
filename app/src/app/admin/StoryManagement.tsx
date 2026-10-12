import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  StatusBar,
  Modal,
  FlatList,
} from "react-native";
import { showAlert, Input } from "@/components";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Upload,
  Trash2,
  ImagePlus,
  Calendar,
  Layers,
  Check,
  ChevronDown,
  X,
} from "lucide-react-native";
import {
  adminListStories,
  adminCreateStory,
  adminDeleteStory,
  adminUploadMedia,
  adminListEvents,
  BackendStory,
  AdminEvent,
} from "@/api/admin";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { useThemeStore } from "@/state/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useContentCacheStore } from "@/state/contentCacheStore";

export default function StoryManagement() {
  const navigation = useAdminNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();

  const [stories, setStories] = useState<BackendStory[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [order, setOrder] = useState("0");
  const [selectedImageUris, setSelectedImageUris] = useState<string[]>([]);
  const [showEventPicker, setShowEventPicker] = useState(false);

  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";

  const loadData = async () => {
    setLoading(true);
    try {
      const [storiesRes, eventsRes] = await Promise.all([
        adminListStories(),
        adminListEvents().catch(() => []),
      ]);
      setStories(storiesRes);
      setEvents(eventsRes);
    } catch (e: any) {
      console.error("loadData stories error:", e);
      showAlert("Error", e?.message || "Failed to load stories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pickImages = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert("Permission Required", "Please allow gallery access to pick story images.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((a) => a.uri);
        setSelectedImageUris((prev) => [...prev, ...uris]);
      }
    } catch (err: any) {
      console.error("pickImages error:", err);
      showAlert("Error", "Failed to select images");
    }
  };

  const removeSelectedImage = (indexToRemove: number) => {
    setSelectedImageUris((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreateStory = async () => {
    if (!name.trim()) {
      showAlert("Validation Error", "Please provide a name for the story.");
      return;
    }
    if (selectedImageUris.length === 0) {
      showAlert("Validation Error", "Please select at least one image for the story.");
      return;
    }

    setCreating(true);
    try {
      // 1. Upload all selected images to ImageKit
      const uploadedUrls: string[] = [];
      for (const uri of selectedImageUris) {
        const res = await adminUploadMedia(uri, {
          folder: "stories",
        });
        uploadedUrls.push(res.url);
      }

      // 2. Create story in backend
      await adminCreateStory({
        name: name.trim(),
        eventId: selectedEvent ? selectedEvent.eventId || selectedEvent.id : undefined,
        images: uploadedUrls,
        order: parseInt(order, 10) || 0,
      });

      // 3. Invalidate user session cache
      useContentCacheStore.getState().invalidateStories();

      // Reset form
      setName("");
      setSelectedEvent(null);
      setOrder("0");
      setSelectedImageUris([]);

      showAlert("Success", "Story created and published successfully!");
      await loadData();
    } catch (error: any) {
      console.error("handleCreateStory error:", error);
      showAlert("Error", error.message || "Failed to create story");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteStory = (story: BackendStory) => {
    showAlert(
      "Delete Story",
      `Are you sure you want to delete "${story.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(story.id);
            try {
              await adminDeleteStory(story.id);
              useContentCacheStore.getState().invalidateStories();
              setStories((prev) => prev.filter((s) => s.id !== story.id));
              showAlert("Success", "Story deleted successfully");
            } catch (err: any) {
              showAlert("Error", err.message || "Failed to delete story");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
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
          onPress={() => navigation.goBack()}
          style={{
            padding: 8,
            marginRight: 12,
            borderRadius: 12,
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={textPrimary} />
        </TouchableOpacity>
        <View>
          <Text
            style={{
              fontFamily: "Talina",
              color: textPrimary,
              fontSize: 22,
            }}
          >
            Story Management
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              color: textSecondary,
              fontSize: 13,
              marginTop: 2,
            }}
          >
            Create and organize home screen event stories
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Story Form */}
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
            Create New Story
          </Text>

          {/* Story Name */}
          <Input
            label="Story Name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Battle of the Bands or Day 1 Recap"
            style={{ marginBottom: 14 }}
          />

          {/* Attached Event Picker Button */}
          <View style={{ marginBottom: 14 }}>
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                color: textPrimary,
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Link to Event (Optional)
            </Text>
            <TouchableOpacity
              onPress={() => setShowEventPicker(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: cardBorder,
                backgroundColor: cardBg,
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Calendar size={18} color="#FFBA00" />
                <Text
                  style={{
                    fontFamily: "Poppins_400Regular",
                    color: selectedEvent ? textPrimary : textSecondary,
                    fontSize: 14,
                    marginLeft: 10,
                  }}
                  numberOfLines={1}
                >
                  {selectedEvent ? selectedEvent.title : "None (select event)"}
                </Text>
              </View>
              <ChevronDown size={18} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Order */}
          <View style={{ marginBottom: 16 }}>
            <Input
              label="Sort Order"
              value={order}
              onChangeText={setOrder}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          {/* Image Upload Header & Picker */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                color: textPrimary,
                fontSize: 14,
              }}
            >
              Story Images ({selectedImageUris.length}) *
            </Text>
            <TouchableOpacity
              onPress={pickImages}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: "rgba(176, 24, 102, 0.14)",
              }}
              activeOpacity={0.8}
            >
              <ImagePlus size={16} color="#B01866" />
              <Text
                style={{
                  fontFamily: "Poppins_500Medium",
                  color: "#B01866",
                  fontSize: 12,
                  marginLeft: 6,
                }}
              >
                Add Images
              </Text>
            </TouchableOpacity>
          </View>

          {/* Image Previews Grid */}
          {selectedImageUris.length === 0 ? (
            <TouchableOpacity
              onPress={pickImages}
              style={{
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: isDark ? "#3A3A42" : "#CBD5E1",
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
              }}
              activeOpacity={0.8}
            >
              <ImagePlus size={36} color="#B01866" />
              <Text
                style={{
                  fontFamily: "Poppins_500Medium",
                  color: textPrimary,
                  fontSize: 14,
                  marginTop: 8,
                }}
              >
                Tap to pick story slides / photos
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  color: textSecondary,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                You can select multiple photos at once
              </Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 6, marginBottom: 20 }}
            >
              {selectedImageUris.map((uri, idx) => (
                <View
                  key={`${uri}-${idx}`}
                  style={{
                    position: "relative",
                    width: 80,
                    height: 120,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: cardBorder,
                  }}
                >
                  <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => removeSelectedImage(idx)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: "rgba(0, 0, 0, 0.65)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={{
              backgroundColor: "#B01866",
              opacity: creating ? 0.7 : 1,
              paddingVertical: 14,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            disabled={creating}
            onPress={handleCreateStory}
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
                  Uploading & Creating Story...
                </Text>
              </>
            ) : (
              <>
                <Upload size={18} color="#FFFFFF" />
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    color: "#FFFFFF",
                    fontSize: 15,
                    marginLeft: 8,
                  }}
                >
                  Publish Story
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Stories */}
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            color: textPrimary,
            fontSize: 18,
            marginBottom: 16,
          }}
        >
          All Stories ({stories.length})
        </Text>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#B01866" />
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: textSecondary,
                fontSize: 14,
                marginTop: 12,
              }}
            >
              Loading stories from server...
            </Text>
          </View>
        ) : stories.length === 0 ? (
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
            <Layers size={40} color={textSecondary} />
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                color: textSecondary,
                fontSize: 15,
                textAlign: "center",
                marginTop: 10,
              }}
            >
              No stories published yet. Create your first story above!
            </Text>
          </View>
        ) : (
          stories.map((item) => {
            const rawImages =
              item.images && item.images.length > 0
                ? item.images
                : item.items
                ? item.items.map((i) => i.url)
                : [];
            const coverImage = rawImages.length > 0 ? rawImages[0] : null;

            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 60,
                    height: 80,
                    borderRadius: 10,
                    backgroundColor: isDark ? "#282830" : "#E2E8F0",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                    overflow: "hidden",
                  }}
                >
                  {coverImage ? (
                    <Image
                      source={{ uri: coverImage }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Layers size={24} color="#B01866" />
                  )}
                </View>

                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      color: textPrimary,
                      fontSize: 15,
                    }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      marginTop: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins_500Medium",
                        color: "#B01866",
                        fontSize: 12,
                      }}
                    >
                      {rawImages.length} {rawImages.length === 1 ? "Slide" : "Slides"}
                    </Text>

                    {item.order !== undefined ? (
                      <Text
                        style={{
                          fontFamily: "Poppins_400Regular",
                          color: textSecondary,
                          fontSize: 12,
                        }}
                      >
                        Order: {item.order}
                      </Text>
                    ) : null}
                  </View>

                  {item.eventId ? (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                      <Calendar size={12} color={textSecondary} />
                      <Text
                        style={{
                          fontFamily: "Poppins_400Regular",
                          color: textSecondary,
                          fontSize: 11,
                          marginLeft: 4,
                        }}
                        numberOfLines={1}
                      >
                        Event: {item.eventId}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteStory(item)}
                  disabled={deletingId === item.id}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                  }}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Trash2 size={18} color="#EF4444" />
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Event Selection Modal */}
      <Modal
        visible={showEventPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEventPicker(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "75%",
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  color: textPrimary,
                  fontSize: 18,
                }}
              >
                Link Event to Story
              </Text>
              <TouchableOpacity onPress={() => setShowEventPicker(false)}>
                <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    color: "#B01866",
                    fontSize: 15,
                  }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setSelectedEvent(null);
                setShowEventPicker(false);
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: !selectedEvent
                  ? "rgba(176, 24, 102, 0.15)"
                  : "transparent",
                marginBottom: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_500Medium",
                  color: !selectedEvent ? "#B01866" : textPrimary,
                  fontSize: 14,
                }}
              >
                None
              </Text>
              {!selectedEvent && <Check size={18} color="#B01866" />}
            </TouchableOpacity>

            <FlatList
              data={events}
              keyExtractor={(item) => item.eventId || item.id}
              renderItem={({ item }) => {
                const isSelected =
                  selectedEvent &&
                  (selectedEvent.eventId || selectedEvent.id) === (item.eventId || item.id);
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedEvent(item);
                      setShowEventPicker(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: isSelected
                        ? "rgba(176, 24, 102, 0.15)"
                        : "transparent",
                      marginBottom: 4,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Poppins_500Medium",
                          color: isSelected ? "#B01866" : textPrimary,
                          fontSize: 14,
                        }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {item.category ? (
                        <Text
                          style={{
                            fontFamily: "Poppins_400Regular",
                            color: textSecondary,
                            fontSize: 12,
                          }}
                        >
                          {item.category}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && <Check size={18} color="#B01866" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
