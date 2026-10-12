import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { showAlert } from "@/components";
import { useEffect, useState } from "react";
import { Poll, Update, FirebaseEvent } from "@/types/models";
import {
  createPoll,
  getAllPolls,
  togglePollStatus,
} from "@/api/admin";
import { Input } from "@/components";
import {
  ArrowLeft,
  Upload,
  Plus,
  X,
  Power,
  PowerOff,
  MessageSquarePlus,
  ChevronDown,
  Trash2,
} from "lucide-react-native";
import { createUpdate, getUpdates, deleteUpdate } from "@/api/admin";
import { subscribeToEvents } from "@/api/events";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { useThemeStore } from "@/state/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PollScreen() {
  const navigation = useAdminNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();

  const [data, setData] = useState<Poll[]>([]);
  const [createData, setCreateData] = useState<Partial<Poll>>({
    options: [""],
  });
  const [updateData, setUpdateData] = useState<Partial<Update>>({});
  const [updates, setUpdates] = useState<Update[]>([]);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Polls" | "Updates">("Polls");
  const [events, setEvents] = useState<FirebaseEvent[]>([]);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [linkType, setLinkType] = useState<'none' | 'event' | 'external'>('none');

  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";

  useEffect(() => {
    setLoading(true);
    const unsubscribe = getAllPolls((polls) => {
      setData(polls);
      setLoading(false);
    });

    const unsubscribeEvents = subscribeToEvents((fetchedEvents) => {
      setEvents(fetchedEvents);
    });

    const unsubscribeUpdates = getUpdates((fetchedUpdates) => {
      setUpdates(fetchedUpdates);
    });

    return () => {
      unsubscribe();
      unsubscribeEvents();
      unsubscribeUpdates();
    };
  }, []);

  const handleToggleStatus = async (item: Poll) => {
    setTogglingId(item.id);
    try {
      await togglePollStatus(item.id, item.isActive);
      setData(
        data.map((d) =>
          d.id === item.id ? { ...d, isActive: !d.isActive } : d
        )
      );
    } catch (error) {
      showAlert("Error", "Failed to update poll status.");
      console.error(error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreatePoll = async () => {
    if (!createData.question) {
      showAlert("Error", "Please enter a question");
      return;
    }
    if (
      !createData.options ||
      createData.options.length < 2 ||
      createData.options.some((o) => o.trim() === "")
    ) {
      showAlert("Error", "Please enter at least two non-empty options");
      return;
    }

    setCreating(true);
    try {
      const votes: { [key: string]: number } = {};
      createData.options.forEach((option) => {
        votes[option] = 0;
      });

      await createPoll({
        question: createData.question,
        options: createData.options,
        votes: votes,
      });

      setCreateData({ options: [""] });
      showAlert("Success", "Poll created successfully!");
    } catch (error) {
      showAlert("Error", "Failed to create poll");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateUpdate = async () => {
    if (!updateData.title || !updateData.description) {
      showAlert("Error", "Please fill in all required fields (Title, Description)");
      return;
    }

    if (linkType === 'external' && !updateData.link) {
      showAlert("Error", "Please provide the external link URL");
      return;
    }

    if (linkType === 'event' && !updateData.eventId) {
      showAlert("Error", "Please select an event");
      return;
    }

    setUpdating(true);
    try {
      await createUpdate({
        title: updateData.title,
        description: updateData.description,
        linkType: linkType,
        link: linkType === 'external' ? updateData.link : undefined,
        eventId: linkType === 'event' ? updateData.eventId : undefined,
        eventName: linkType === 'event' ? updateData.eventName : undefined,
      });

      setUpdateData({});
      setLinkType('none');
      showAlert("Success", "Update broadcasted successfully!");
    } catch (error) {
      showAlert("Error", "Failed to create update");
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUpdate = async (id: string, title: string) => {
    showAlert(
      "Delete Update",
      `Are you sure you want to delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(id);
            try {
              const success = await deleteUpdate(id);
              if (success) {
                showAlert("Success", "Update deleted successfully!");
              } else {
                showAlert("Error", "Failed to delete update");
              }
            } catch (error) {
              showAlert("Error", "Failed to delete update");
              console.error(error);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleOptionChange = (text: string, index: number) => {
    const newOptions = [...(createData.options || [])];
    newOptions[index] = text;
    setCreateData({ ...createData, options: newOptions });
  };

  const addOption = () => {
    setCreateData({
      ...createData,
      options: [...(createData.options || []), ""],
    });
  };

  const removeOption = (index: number) => {
    const newOptions = [...(createData.options || [])];
    newOptions.splice(index, 1);
    setCreateData({ ...createData, options: newOptions });
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
            Polls & Broadcasts
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              fontSize: 12,
              color: "#41B8F0",
              marginTop: 1,
            }}
          >
            Manage interactive community updates
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 4,
          borderBottomWidth: 1,
          borderBottomColor: cardBorder,
        }}
      >
        {(["Polls", "Updates"] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                borderBottomWidth: 2,
                borderBottomColor: isActive ? "#41B8F0" : "transparent",
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 15,
                  color: isActive ? "#41B8F0" : textSecondary,
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "Polls" ? (
          <View>
            {/* Create Poll Card */}
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
                Create New Poll
              </Text>

              <Input
                label="Poll Question"
                value={createData.question || ""}
                onChangeText={(value) => {
                  setCreateData({
                    ...createData,
                    question: value,
                  });
                }}
                placeholder="What's your favourite event?"
                style={{ marginBottom: 14 }}
              />

              {createData.options?.map((option, index) => (
                <View
                  key={index}
                  style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Input
                      value={option}
                      onChangeText={(text) => handleOptionChange(text, index)}
                      placeholder={`Option ${index + 1}`}
                    />
                  </View>
                  {createData.options && createData.options.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeOption(index)}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      activeOpacity={0.7}
                    >
                      <X size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: isDark ? "rgba(65, 184, 240, 0.1)" : "#E0F2FE",
                  marginBottom: 16,
                  marginTop: 4,
                }}
                onPress={addOption}
                activeOpacity={0.7}
              >
                <Plus size={16} color="#41B8F0" />
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    color: "#41B8F0",
                    marginLeft: 6,
                    fontSize: 13,
                  }}
                >
                  Add Option
                </Text>
              </TouchableOpacity>

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
                onPress={handleCreatePoll}
                activeOpacity={0.8}
              >
                {creating ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", marginLeft: 8 }}>
                      Creating...
                    </Text>
                  </>
                ) : (
                  <>
                    <Upload size={18} color="#FFFFFF" />
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", marginLeft: 8 }}>
                      Create Poll
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Polls List */}
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: textPrimary,
                fontSize: 18,
                marginBottom: 14,
              }}
            >
              Active Polls ({data.length})
            </Text>

            {loading ? (
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#41B8F0" />
                <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, marginTop: 12 }}>
                  Loading polls...
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
                <Text style={{ fontFamily: "Poppins_500Medium", color: textSecondary, textAlign: "center" }}>
                  No polls yet. Create your first poll above!
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
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        color: textPrimary,
                        fontSize: 16,
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      {item.question}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                        backgroundColor: item.isActive ? "#10B98120" : "#EF444420",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          color: item.isActive ? "#10B981" : "#EF4444",
                          fontSize: 10,
                        }}
                      >
                        {item.isActive ? "ACTIVE" : "INACTIVE"}
                      </Text>
                    </View>
                  </View>

                  {item.options.map((option, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 6,
                        borderBottomWidth: i < item.options.length - 1 ? 1 : 0,
                        borderBottomColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 13 }}>
                        {option}
                      </Text>
                      <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 13 }}>
                        {item.votes[option] || 0} votes
                      </Text>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={{
                      marginTop: 14,
                      backgroundColor: item.isActive
                        ? (isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2")
                        : (isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5"),
                      paddingVertical: 10,
                      borderRadius: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => handleToggleStatus(item)}
                    disabled={togglingId === item.id}
                    activeOpacity={0.75}
                  >
                    {togglingId === item.id ? (
                      <ActivityIndicator color={item.isActive ? "#EF4444" : "#10B981"} size="small" />
                    ) : (
                      <>
                        {item.isActive ? (
                          <PowerOff size={16} color="#EF4444" />
                        ) : (
                          <Power size={16} color="#10B981" />
                        )}
                        <Text
                          style={{
                            fontFamily: "Poppins_600SemiBold",
                            color: item.isActive ? "#EF4444" : "#10B981",
                            marginLeft: 6,
                            fontSize: 13,
                          }}
                        >
                          {item.isActive ? "Deactivate Poll" : "Activate Poll"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <View>
            {/* Create Update Form */}
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
                Create Broadcast Update
              </Text>

              <Input
                label="Update Title"
                value={updateData.title || ""}
                onChangeText={(value) => {
                  setUpdateData({
                    ...updateData,
                    title: value,
                  });
                }}
                placeholder="e.g., Event Schedule Change"
                style={{ marginBottom: 14 }}
              />

              <Input
                label="Update Description"
                value={updateData.description || ""}
                onChangeText={(value) => {
                  setUpdateData({
                    ...updateData,
                    description: value,
                  });
                }}
                placeholder="Describe the update in detail..."
                multiline
                numberOfLines={4}
                style={{ marginBottom: 14 }}
              />

              {/* Action Button Link Type */}
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 13, marginBottom: 8 }}>
                Action Button (Optional)
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {(["none", "external", "event"] as const).map((type) => {
                  const isSelected = linkType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setLinkType(type)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: isSelected
                          ? (isDark ? "rgba(65, 184, 240, 0.15)" : "#E0F2FE")
                          : cardBg,
                        borderWidth: 1,
                        borderColor: isSelected ? "#41B8F0" : cardBorder,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          color: isSelected ? "#41B8F0" : textSecondary,
                          fontSize: 12,
                          textTransform: "capitalize",
                        }}
                      >
                        {type === "none" ? "None" : type === "external" ? "Link" : "Event"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {linkType === 'external' ? (
                <Input
                  label="External Link"
                  value={updateData.link || ""}
                  onChangeText={(value) => {
                    setUpdateData({
                      ...updateData,
                      link: value,
                    });
                  }}
                  placeholder="https://example.com/info"
                  style={{ marginBottom: 16 }}
                />
              ) : linkType === 'event' ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 13, marginBottom: 6 }}>
                    Select Event
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowEventDropdown(!showEventDropdown)}
                    style={{
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F3F4F6",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: cardBorder,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins_500Medium",
                        color: updateData.eventName ? textPrimary : textSecondary,
                      }}
                    >
                      {updateData.eventName || "Choose an event"}
                    </Text>
                    <ChevronDown size={18} color="#41B8F0" />
                  </TouchableOpacity>

                  {showEventDropdown && (
                    <View
                      style={{
                        backgroundColor: cardBg,
                        borderRadius: 12,
                        marginTop: 6,
                        maxHeight: 180,
                        borderWidth: 1,
                        borderColor: cardBorder,
                      }}
                    >
                      <ScrollView>
                        {events.map((event) => (
                          <TouchableOpacity
                            key={event.eventId}
                            onPress={() => {
                              setUpdateData({
                                ...updateData,
                                eventId: event.eventId,
                                eventName: event.title,
                              });
                              setShowEventDropdown(false);
                            }}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: cardBorder,
                            }}
                          >
                            <Text style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 13 }}>
                              {event.title}
                            </Text>
                            <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}>
                              {event.category}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ) : null}

              <TouchableOpacity
                style={{
                  backgroundColor: "#41B8F0",
                  opacity: updating ? 0.7 : 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                disabled={updating}
                onPress={handleCreateUpdate}
                activeOpacity={0.8}
              >
                {updating ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", marginLeft: 8 }}>
                      Broadcasting...
                    </Text>
                  </>
                ) : (
                  <>
                    <MessageSquarePlus size={18} color="#FFFFFF" />
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", marginLeft: 8 }}>
                      Broadcast Update
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Updates List */}
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: textPrimary,
                fontSize: 18,
                marginBottom: 14,
              }}
            >
              All Updates ({updates.length})
            </Text>

            {loading ? (
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#41B8F0" />
                <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, marginTop: 12 }}>
                  Loading updates...
                </Text>
              </View>
            ) : updates.length === 0 ? (
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
                <Text style={{ fontFamily: "Poppins_500Medium", color: textSecondary, textAlign: "center" }}>
                  No updates yet. Create your first update above!
                </Text>
              </View>
            ) : (
              updates.map((update) => (
                <View
                  key={update.id}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 20,
                    padding: 18,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: cardBorder,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        color: textPrimary,
                        fontSize: 16,
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      {update.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteUpdate(update.id, update.title)}
                      disabled={deletingId === update.id}
                      style={{
                        backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
                        padding: 8,
                        borderRadius: 10,
                      }}
                      activeOpacity={0.7}
                    >
                      {deletingId === update.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Trash2 size={16} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      color: textSecondary,
                      fontSize: 13,
                      marginBottom: 10,
                      lineHeight: 18,
                    }}
                  >
                    {update.description}
                  </Text>

                  {update.linkType === 'external' && update.link && (
                    <View
                      style={{
                        backgroundColor: isDark ? "rgba(65, 184, 240, 0.1)" : "#E0F2FE",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 11, marginRight: 6 }}>
                        LINK:
                      </Text>
                      <Text style={{ fontFamily: "Poppins_400Regular", color: textPrimary, fontSize: 11, flex: 1 }} numberOfLines={1}>
                        {update.link}
                      </Text>
                    </View>
                  )}

                  {update.linkType === 'event' && update.eventName && (
                    <View
                      style={{
                        backgroundColor: isDark ? "rgba(65, 184, 240, 0.1)" : "#E0F2FE",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 11, marginRight: 6 }}>
                        EVENT:
                      </Text>
                      <Text style={{ fontFamily: "Poppins_400Regular", color: textPrimary, fontSize: 11, flex: 1 }} numberOfLines={1}>
                        {update.eventName}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
