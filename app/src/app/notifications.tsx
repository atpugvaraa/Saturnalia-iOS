// src/screens/App/NotificationsScreen.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StatusBar,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ArrowLeft, BellOff, CheckCircle } from "lucide-react-native";
import { useUserStore } from "@/state/userStore";
import { useThemeStore } from "@/state/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Poll, Update } from "@/types/models";
import { getAllPolls, voteOnPoll } from "@/api/admin";
import { getUpdates } from "@/api/admin";
import { showAlert } from "@/components";
import { getEvent } from "@/api/events";

const NotificationsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { userData: userProfile } = useUserStore();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Polls" | "Updates">("Polls");
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);

  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      const unsubscribePolls = getAllPolls((fetchedPolls: Poll[]) => {
        setPolls(fetchedPolls);
        setLoading(false);
      });

      const unsubscribeUpdates = getUpdates((fetchedUpdates: Update[]) => {
        setUpdates(fetchedUpdates);
      });

      return () => {
        if (typeof unsubscribePolls === 'function') unsubscribePolls();
        if (typeof unsubscribeUpdates === 'function') unsubscribeUpdates();
      };
    }, [])
  );

  const handleNavigateToEvent = useCallback(
    async (eventId: string) => {
      if (!eventId) {
        showAlert("Error", "Event information not available");
        return;
      }

      setIsLoadingEvent(true);
      try {
        const eventData = await getEvent(eventId);
        if (eventData) {
          router.push({ pathname: "/events/EventDetails", params: { eventData: JSON.stringify(eventData) } });
        } else {
          showAlert("Error", "Event not found. Please try again later.");
        }
      } catch (error) {
        showAlert("Error", "Failed to load event details");
      } finally {
        setIsLoadingEvent(false);
      }
    },
    [router]
  );

  const handleVote = async (pollId: string, option: string) => {
    if (!userProfile) {
      showAlert("Login Required", "You must be logged in to vote on polls.");
      return;
    }

    setVotingId(pollId);
    try {
      const response = await voteOnPoll(pollId, option, userProfile.userId);
      if (response.success) {
        setPolls((prevPolls) =>
          prevPolls.map((poll) => {
            if (poll.id === pollId) {
              const newVotes = { ...poll.votes };
              newVotes[option] = (newVotes[option] || 0) + 1;
              return {
                ...poll,
                votes: newVotes,
                voters: [...poll.voters, userProfile.userId],
              };
            }
            return poll;
          })
        );
      } else {
        showAlert("Error", response.message || "Failed to submit vote. You might have already voted.");
      }
    } catch (error) {
      showAlert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setVotingId(null);
    }
  };

  const renderUpdates = () => {
    if (loading) {
      return (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#41B8F0" />
          <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, marginTop: 12 }}>
            Loading updates...
          </Text>
        </View>
      );
    }

    if (updates.length === 0) {
      return (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: cardBg,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              borderWidth: 1,
              borderColor: cardBorder,
            }}
          >
            <BellOff size={36} color={textSecondary} />
          </View>
          <Text
            style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 18, marginBottom: 4, textAlign: "center" }}
          >
            No Updates Available
          </Text>
          <Text
            style={{ fontFamily: "Poppins_400Regular", color: textSecondary, textAlign: "center", fontSize: 13, paddingHorizontal: 30 }}
          >
            There are no updates at the moment. Check back soon!
          </Text>
        </View>
      );
    }

    return updates.map((update) => (
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
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            color: textPrimary,
            fontSize: 16,
            marginBottom: 6,
          }}
        >
          {update.title}
        </Text>
        <Text
          style={{
            fontFamily: "Poppins_400Regular",
            color: textSecondary,
            fontSize: 13,
            lineHeight: 19,
            marginBottom: 10,
          }}
        >
          {update.description}
        </Text>
        {update.linkType === 'external' && update.link && (
          <TouchableOpacity
            onPress={() => Linking.openURL(update.link!)}
            style={{
              backgroundColor: "#41B8F0",
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 4,
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", fontSize: 13 }}
            >
              Learn More
            </Text>
          </TouchableOpacity>
        )}
        {update.linkType === 'event' && update.eventId && (
          <TouchableOpacity
            onPress={() => handleNavigateToEvent(update.eventId!)}
            style={{
              borderWidth: 1,
              borderColor: "#41B8F0",
              backgroundColor: isDark ? "rgba(65, 184, 240, 0.1)" : "#E0F2FE",
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 4,
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 13 }}
            >
              View Event
            </Text>
          </TouchableOpacity>
        )}
      </View>
    ));
  };

  const renderPolls = () => {
    if (loading) {
      return (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#41B8F0" />
          <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, marginTop: 12 }}>
            Loading polls...
          </Text>
        </View>
      );
    }

    if (polls.length === 0) {
      return (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: cardBg,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              borderWidth: 1,
              borderColor: cardBorder,
            }}
          >
            <BellOff size={36} color={textSecondary} />
          </View>
          <Text
            style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 18, marginBottom: 4, textAlign: "center" }}
          >
            No Active Polls
          </Text>
          <Text
            style={{ fontFamily: "Poppins_400Regular", color: textSecondary, textAlign: "center", fontSize: 13, paddingHorizontal: 30 }}
          >
            There are no active polls right now. Check back later!
          </Text>
        </View>
      );
    }

    return polls.map((poll) => {
      const userHasVoted =
        userProfile && poll.voters.includes(userProfile.userId);
      const totalVotes = Object.values(poll.votes).reduce(
        (a: number, b: number) => a + b,
        0
      );

      return (
        <View
          key={poll.id}
          style={{
            backgroundColor: cardBg,
            borderRadius: 20,
            padding: 18,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: cardBorder,
          }}
        >
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              color: textPrimary,
              fontSize: 16,
              marginBottom: 4,
            }}
          >
            {poll.question}
          </Text>

          {userHasVoted && (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <CheckCircle size={14} color="#10B981" />
              <Text style={{ fontFamily: "Poppins_500Medium", color: "#10B981", fontSize: 12, marginLeft: 5 }}>
                You voted on this poll
              </Text>
            </View>
          )}

          <View style={{ marginTop: 8 }}>
            {poll.options.map((option: string, index: number) => {
              const voteCount = poll.votes[option] || 0;
              const percentage =
                totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

              if (userHasVoted) {
                return (
                  <View key={index} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 13 }}>
                        {option}
                      </Text>
                      <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#41B8F0", fontSize: 12 }}>
                        {percentage.toFixed(0)}% ({voteCount})
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          width: `${percentage}%`,
                          backgroundColor: "#41B8F0",
                          borderRadius: 4,
                        }}
                      />
                    </View>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleVote(poll.id, option)}
                  disabled={votingId === poll.id}
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F3F4F6",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: cardBorder,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  activeOpacity={0.75}
                >
                  {votingId === poll.id ? (
                    <ActivityIndicator color="#41B8F0" size="small" />
                  ) : (
                    <Text style={{ fontFamily: "Poppins_500Medium", color: textPrimary, fontSize: 14 }}>
                      {option}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              borderTopWidth: 1,
              borderTopColor: cardBorder,
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 11 }}>
              {new Date(poll.createdAt?.seconds ? poll.createdAt.seconds * 1000 : Date.now()).toLocaleDateString()}
            </Text>
            <Text style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 11 }}>
              {totalVotes} total votes
            </Text>
          </View>
        </View>
      );
    });
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
          onPress={() => router.back()}
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
            Notifications
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              fontSize: 12,
              color: "#41B8F0",
              marginTop: 1,
            }}
          >
            Latest polls and festival updates
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
        {activeTab === "Polls" ? renderPolls() : renderUpdates()}
      </ScrollView>
    </View>
  );
};

export default NotificationsScreen;
