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
import * as ImageManipulator from "expo-image-manipulator";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Video,
  ImagePlus,
  Calendar,
  Clock,
  Film,
  Check,
  ChevronDown,
} from "lucide-react-native";
import {
  adminListReels,
  adminCreateReel,
  adminDeleteReel,
  adminUploadMedia,
  adminListEvents,
  AdminEvent,
} from "@/api/admin";
import { Reel } from "@/types/models";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { useThemeStore } from "@/state/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useContentCacheStore } from "@/state/contentCacheStore";

export default function ReelsManagement() {
  const navigation = useAdminNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();

  const [reels, setReels] = useState<Reel[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [duration, setDuration] = useState("30");
  const [order, setOrder] = useState("0");
  const [showEventPicker, setShowEventPicker] = useState(false);

  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";

  const loadData = async () => {
    setLoading(true);
    try {
      const [reelsRes, eventsRes] = await Promise.all([
        adminListReels(),
        adminListEvents().catch(() => []),
      ]);
      setReels(reelsRes);
      setEvents(eventsRes);
    } catch (e: any) {
      console.error("loadData reels error:", e);
      showAlert("Error", e?.message || "Failed to load reels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pickVideo = async () => {
    try {
      // Android Photo Picker — no READ_MEDIA_VIDEO permission needed
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 60,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setVideoUri(result.assets[0].uri);
        if (result.assets[0].duration) {
          setDuration(Math.round(result.assets[0].duration / 1000).toString());
        }
      }
    } catch (err: any) {
      console.error("pickVideo error:", err);
      showAlert("Error", "Failed to select video");
    }
  };

  const pickThumbnail = async () => {
    try {
      // Android Photo Picker — no READ_MEDIA_IMAGES permission needed
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        // Crop to 9:16 using expo-image-manipulator
        const srcW = asset.width;
        const srcH = asset.height;
        const targetAspect = 9 / 16;
        const srcAspect = srcW / srcH;
        let cropW = srcW;
        let cropH = srcH;
        if (srcAspect > targetAspect) {
          cropW = Math.round(srcH * targetAspect);
        } else {
          cropH = Math.round(srcW / targetAspect);
        }
        const originX = Math.round((srcW - cropW) / 2);
        const originY = Math.round((srcH - cropH) / 2);
        const cropped = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ crop: { originX, originY, width: cropW, height: cropH } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        setThumbnailUri(cropped.uri);
      }
    } catch (err: any) {
      console.error("pickThumbnail error:", err);
      showAlert("Error", "Failed to select thumbnail");
    }
  };

  const handleCreateReel = async () => {
    if (!title.trim()) {
      showAlert("Validation Error", "Please provide a reel title.");
      return;
    }
    if (!videoUri) {
      showAlert("Validation Error", "Please pick a video file for the reel.");
      return;
    }

    setCreating(true);
    try {
      // 1. Upload video to ImageKit
      const videoUpload = await adminUploadMedia(videoUri, {
        folder: "reels",
        mimeType: "video/mp4",
      });

      // 2. Upload thumbnail if chosen
      let thumbUrl = "";
      if (thumbnailUri) {
        const thumbUpload = await adminUploadMedia(thumbnailUri, {
          folder: "reels/thumbnails",
          mimeType: "image/jpeg",
        });
        thumbUrl = thumbUpload.url;
      }

      // 3. Create reel in backend
      await adminCreateReel({
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoUpload.url,
        videoRef: videoUpload.ref,
        thumbnailUrl: thumbUrl,
        eventId: selectedEvent ? selectedEvent.eventId || selectedEvent.id : undefined,
        duration: parseInt(duration, 10) || 30,
        order: parseInt(order, 10) || 0,
      } as any);

      // 4. Invalidate user session cache
      useContentCacheStore.getState().invalidateReels();

      // Reset form
      setTitle("");
      setDescription("");
      setVideoUri(null);
      setThumbnailUri(null);
      setSelectedEvent(null);
      setDuration("30");
      setOrder("0");

      showAlert("Success", "Reel uploaded and published successfully!");
      await loadData();
    } catch (error: any) {
      console.error("handleCreateReel error:", error);
      showAlert("Error", error.message || "Failed to create reel");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteReel = (reel: Reel) => {
    showAlert(
      "Delete Reel",
      `Are you sure you want to delete "${reel.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(reel.id);
            try {
              await adminDeleteReel(reel.id);
              useContentCacheStore.getState().invalidateReels();
              setReels((prev) => prev.filter((r) => r.id !== reel.id));
              showAlert("Success", "Reel deleted successfully");
            } catch (err: any) {
              showAlert("Error", err.message || "Failed to delete reel");
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
            Reel Management
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              color: textSecondary,
              fontSize: 13,
              marginTop: 2,
            }}
          >
            Upload and manage short-form festival reels
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Reel Form */}
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
            Upload New Reel
          </Text>

          {/* Video Picker */}
          <TouchableOpacity
            style={{
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: videoUri ? "#A855F7" : isDark ? "#3A3A42" : "#CBD5E1",
              borderRadius: 16,
              padding: 18,
              marginBottom: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
            }}
            onPress={pickVideo}
            activeOpacity={0.8}
          >
            <Video size={36} color="#A855F7" />
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                color: textPrimary,
                fontSize: 14,
                marginTop: 8,
              }}
            >
              {videoUri ? "Video Selected (Tap to change)" : "Tap to pick Reel Video *"}
            </Text>
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: textSecondary,
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {videoUri ? videoUri.split("/").pop() : "MP4 video (up to 60s)"}
            </Text>
          </TouchableOpacity>

          {/* Optional Thumbnail Picker */}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: cardBorder,
              marginBottom: 14,
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
            }}
            onPress={pickThumbnail}
            activeOpacity={0.8}
          >
            <ImagePlus size={20} color="#C8E946" />
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                color: textPrimary,
                fontSize: 13,
                marginLeft: 10,
                flex: 1,
              }}
            >
              {thumbnailUri ? "Thumbnail Selected" : "Optional Custom Thumbnail"}
            </Text>
            {thumbnailUri && (
              <Image
                source={{ uri: thumbnailUri }}
                style={{ width: 36, height: 36, borderRadius: 6 }}
              />
            )}
          </TouchableOpacity>

          {/* Title */}
          <Input
            label="Reel Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Cultural Night Highlights"
            style={{ marginBottom: 14 }}
          />

          {/* Description */}
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Tell users what happens in this clip"
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
              Attached Event (Optional)
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
                <Calendar size={18} color="#A855F7" />
                <Text
                  style={{
                    fontFamily: "Poppins_400Regular",
                    color: selectedEvent ? textPrimary : textSecondary,
                    fontSize: 14,
                    marginLeft: 10,
                  }}
                  numberOfLines={1}
                >
                  {selectedEvent ? selectedEvent.title : "None (tap to select event)"}
                </Text>
              </View>
              <ChevronDown size={18} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Duration & Order */}
          <View
            style={{
              flexDirection: "row",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <View style={{ flex: 1 }}>
              <Input
                label="Duration (sec)"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder="30"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Display Order"
                value={order}
                onChangeText={setOrder}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={{
              backgroundColor: "#A855F7",
              opacity: creating ? 0.7 : 1,
              paddingVertical: 14,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            disabled={creating}
            onPress={handleCreateReel}
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
                  Uploading Reel...
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
                  Publish Reel
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Reels */}
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            color: textPrimary,
            fontSize: 18,
            marginBottom: 16,
          }}
        >
          All Reels ({reels.length})
        </Text>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#A855F7" />
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: textSecondary,
                fontSize: 14,
                marginTop: 12,
              }}
            >
              Loading reels from server...
            </Text>
          </View>
        ) : reels.length === 0 ? (
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
            <Film size={40} color={textSecondary} />
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                color: textSecondary,
                fontSize: 15,
                textAlign: "center",
                marginTop: 10,
              }}
            >
              No reels published yet. Upload your first reel above!
            </Text>
          </View>
        ) : (
          reels.map((item) => (
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
                  width: 56,
                  height: 80,
                  borderRadius: 10,
                  backgroundColor: isDark ? "#282830" : "#E2E8F0",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                  overflow: "hidden",
                }}
              >
                {item.thumbnailUrl ? (
                  <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <Video size={24} color="#41B8F0" />
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
                  {item.title}
                </Text>

                {item.description ? (
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      color: textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {item.description}
                  </Text>
                ) : null}

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 6,
                  }}
                >
                  {item.duration ? (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Clock size={12} color={textSecondary} />
                      <Text
                        style={{
                          fontFamily: "Poppins_400Regular",
                          color: textSecondary,
                          fontSize: 11,
                          marginLeft: 4,
                        }}
                      >
                        {item.duration}s
                      </Text>
                    </View>
                  ) : null}

                  {item.event ? (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Calendar size={12} color="#A855F7" />
                      <Text
                        style={{
                          fontFamily: "Poppins_500Medium",
                          color: "#A855F7",
                          fontSize: 11,
                          marginLeft: 4,
                        }}
                        numberOfLines={1}
                      >
                        {item.event.name}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteReel(item)}
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
          ))
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
                Attach Event to Reel
              </Text>
              <TouchableOpacity onPress={() => setShowEventPicker(false)}>
                <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    color: "#41B8F0",
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
                  ? "rgba(168, 85, 247, 0.15)"
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
                  color: !selectedEvent ? "#A855F7" : textPrimary,
                  fontSize: 14,
                }}
              >
                No Attached Event
              </Text>
              {!selectedEvent && <Check size={18} color="#A855F7" />}
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
                        ? "rgba(168, 85, 247, 0.15)"
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
                          color: isSelected ? "#A855F7" : textPrimary,
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
                    {isSelected && <Check size={18} color="#A855F7" />}
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
