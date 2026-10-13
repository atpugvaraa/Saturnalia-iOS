import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { showAlert } from "@/components";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { ArrowLeft, Clock, AlertTriangle, Hotel, CheckCircle2, Trash2, XCircle, CreditCard, ChevronRight } from "lucide-react-native";
import { useUserStore } from "@/state/userStore";
import { useThemeStore } from "@/state/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RegistrationStatusCard from "@/components/registration/RegistrationStatusCard";
import TeamDetailsCard from "@/components/registration/TeamDetailsCard";
import EventTicketCard from "@/components/registration/EventTicketCard";
import TeamSubmissionModal from "@/components/registration/TeamSubmissionModal";
import { useEventDetail } from "@/hooks/useEventDetail";
import { useDeleteTeam, useRemoveTeamMember, useUnregisterForEvent, useConfirmTeam } from "@/hooks/useEventMutations";

const MyEventDetailsScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C22" : "#FFFFFF";
  const cardBorder = isDark ? "#2B2B34" : "#E2E8F0";
  const textPrimary = isDark ? "#FFFFFF" : "#0F172A";
  const textSecondary = isDark ? "#94A3B8" : "#64748B";

  const { eventId } = useLocalSearchParams() as { eventId: string };

  const { userData: userProfile } = useUserStore();
  const userId = userProfile?.userId || "";

  const { data: detailData, loading, refresh } = useEventDetail(eventId);
  const eventData = detailData?.event || null;
  const registration = detailData?.myRegistration || null;
  const teamData = detailData?.myTeam || null;

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const [submittingTeam, setSubmittingTeam] = useState(false);
  const [isSubmissionModalVisible, setIsSubmissionModalVisible] = useState(false);

  const deleteTeamMutation = useDeleteTeam();
  const removeTeamMemberMutation = useRemoveTeamMember();
  const unregisterMutation = useUnregisterForEvent();
  const confirmTeamMutation = useConfirmTeam();

  const handleRemoveMember = (memberUserId: string, memberName: string) => {
    if (!teamData) {
      showAlert("Error", "Team data not available");
      return;
    }

    showAlert("Remove Member", `Remove ${memberName} from the team?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          if (!teamData?.teamId) return;
          removeTeamMemberMutation.mutate(
            { teamRef: teamData.teamId, userId: memberUserId },
            {
              onError: (error: any) => showAlert("Error", error.message || "Failed to remove member"),
            }
          );
        },
      },
    ]);
  };

  const handleDeleteTeam = () => {
    if (!teamData) {
      showAlert("Error", "Team data not available");
      return;
    }

    const isConfirmed = teamData.status === "confirmed";
    const title = isConfirmed ? "Delete Confirmed Team" : "Delete Team";
    const message = isConfirmed
      ? "Your team registration is currently confirmed. Are you sure you want to delete this team? This will cancel the event registration for you and all your teammates."
      : "Are you sure you want to delete this team? This will cancel the event registration for the whole team.";

    showAlert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Delete Team",
        style: "destructive",
        onPress: () => {
          if (!teamData?.teamId) return;
          deleteTeamMutation.mutate(teamData.teamId, {
            onSuccess: () => router.back(),
            onError: (error: any) => showAlert("Error", error.message || "Failed to delete team"),
          });
        },
      },
    ]);
  };

  const handleCancelRegistration = () => {
    showAlert("Cancel Registration", "Are you sure you want to cancel your registration for this event?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: () => {
          unregisterMutation.mutate(eventId, {
            onSuccess: () => router.back(),
            onError: (error: any) => showAlert("Error", error.message || "Failed to cancel registration"),
          });
        },
      },
    ]);
  };

  const handleCompleteRegistration = async () => {
    if (!eventData || !teamData) return;

    if (
      eventData.minTeamSize &&
      (teamData.members?.length ?? 0) < eventData.minTeamSize
    ) {
      showAlert(
        "Insufficient Team Size",
        `Your team needs at least ${
          eventData.minTeamSize
        } members before registration can be completed. Currently you have ${
          teamData.members.length
        } member${
          teamData.members.length !== 1 ? "s" : ""
        }.\n\nPlease share the invite code with your teammates.`
      );
      return;
    }

    showAlert(
      "Complete Registration",
      "Are you satisfied with your team? Once confirmed, your team registration will be finalized.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete Registration",
          onPress: () => {
            if (!teamData?.teamId) return;
            setSubmittingTeam(true);
            confirmTeamMutation.mutate(teamData.teamId, {
              onSuccess: () => {
                showAlert("Success", "Team registration has been successfully confirmed!");
                refresh();
              },
              onError: (err: any) => {
                showAlert("Error", err.message || "Failed to complete team registration");
              },
              onSettled: () => {
                setSubmittingTeam(false);
              },
            });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color="#FFBA00" />
      </View>
    );
  }

  if (!registration) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 18, color: textPrimary, textAlign: "center" }}>
          Registration not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 16,
            backgroundColor: "#FFBA00",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 14,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#000000", fontSize: 14 }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLeader = teamData?.leaderUserId === userId;
  const hasAccommodation = Object.values(userProfile?.accommodation || {}).some(Boolean) || Object.values(userProfile?.food || {}).some(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          paddingHorizontal: 16,
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
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            flexShrink: 0,
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: "Talina",
              fontSize: 19,
              color: textPrimary,
              letterSpacing: 0.4,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {eventData?.title || registration.eventName}
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_500Medium",
              fontSize: 11,
              color: "#41B8F0",
              marginTop: 1,
            }}
          >
            Registration Details
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
      >
        {/* Registration Status Card with Team Constraints */}
        <RegistrationStatusCard
          status={
            eventData?.eventType === 'team' && teamData
              ? (registration.paymentStatus === 'pending' ? 'payment_pending' : (teamData.status as any || 'pending'))
              : (registration.paymentStatus === 'pending' ? 'payment_pending' : (registration.status || 'pending'))
          }
          eventCategory={registration.eventCategory || eventData?.category || ''}
          eventType={(eventData?.eventType === 'team' ? 'team' : 'individual')}
          registeredAt={registration.registeredAt || new Date().toISOString()}
          minTeamSize={eventData?.minTeamSize}
          maxTeamSize={eventData?.maxTeamSize}
          currentTeamSize={teamData?.members?.length}
        />

        {/* Event Ticket Pass with QR Code */}
        {registration.status !== "rejected" && (
          <EventTicketCard registration={registration} eventData={eventData} />
        )}

        {/* Team Details for Team Events */}
        {eventData?.eventType === "team" && teamData && (
          <TeamDetailsCard
            teamData={teamData}
            eventData={eventData}
            userId={userId}
            isLeader={isLeader}
            submittingTeam={submittingTeam}
            onRemoveMember={handleRemoveMember}
            onSubmitTeam={handleCompleteRegistration}
          />
        )}

        {/* Payment Pending Notice for Team Members (non-leader) */}
        {registration.paymentStatus === 'pending' && eventData?.eventType === 'team' && !isLeader && (
          <View
            style={{
              backgroundColor: isDark ? 'rgba(255, 186, 0, 0.1)' : 'rgba(255, 186, 0, 0.12)',
              borderColor: 'rgba(255, 186, 0, 0.35)',
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              width: '100%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Clock size={16} color="#FFBA00" style={{ marginRight: 8, flexShrink: 0 }} />
              <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#FFBA00', fontSize: 14, flexShrink: 1 }}>
                Waiting for Team Leader Payment
              </Text>
            </View>
            <Text style={{ fontFamily: 'Poppins_400Regular', color: isDark ? '#FDE68A' : '#92400E', fontSize: 13, lineHeight: 19 }}>
              The registration fee for this team event must be completed by your team leader to confirm the team's registration.
            </Text>
          </View>
        )}

        {/* Payment Action Area */}
        {registration.paymentStatus === 'pending' && (eventData?.eventType === 'individual' || isLeader) && (
          <View style={{ marginBottom: 16, width: '100%' }}>
            <View
              style={{
                backgroundColor: isDark ? 'rgba(255, 186, 0, 0.12)' : 'rgba(255, 186, 0, 0.12)',
                borderColor: 'rgba(255, 186, 0, 0.35)',
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                width: '100%',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <AlertTriangle size={16} color="#FFBA00" style={{ marginRight: 8, flexShrink: 0 }} />
                <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#FFBA00', fontSize: 14, flexShrink: 1 }}>
                  Payment Pending
                </Text>
              </View>
              <Text style={{ fontFamily: 'Poppins_400Regular', color: isDark ? '#FDE68A' : '#92400E', fontSize: 13, lineHeight: 19 }}>
                {eventData?.eventType === 'team'
                  ? 'Complete payment to confirm your team\'s registration. Payment covers the entire team.'
                  : 'Complete payment to confirm your registration.'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/events/Payment',
                params: {
                  eventId,
                  ...(teamData?.teamId ? { teamId: teamData.teamId } : {}),
                },
              })}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#FFBA00',
                borderRadius: 14,
                height: 52,
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#FFBA00',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <CreditCard size={17} color="#000000" style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: 'Poppins_700Bold', color: '#000000', fontSize: 14, letterSpacing: 0.3 }}>
                Complete Payment
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Accommodation & Food Card */}
        {!userProfile?.isHostCollegeStudent && (
          <View
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
              borderWidth: 1,
              borderRadius: 18,
              padding: 16,
              marginBottom: 16,
              width: '100%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.25 : 0.04,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, minWidth: 0 }}>
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(65, 184, 240, 0.15)' : 'rgba(65, 184, 240, 0.1)',
                    padding: 7,
                    borderRadius: 10,
                    marginRight: 8,
                    flexShrink: 0,
                  }}
                >
                  <Hotel size={18} color="#41B8F0" />
                </View>
                <Text
                  style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: textPrimary, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  Accommodation & Food
                </Text>
              </View>

              {hasAccommodation && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    borderWidth: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 10,
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={11} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#10B981' }}>
                    Pass Active
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={{
                fontFamily: 'Poppins_400Regular',
                fontSize: 12,
                color: textSecondary,
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              {hasAccommodation
                ? 'You have booked accommodation or meal passes. You can add more days or review details in your profile.'
                : eventData?.eventType === 'team' && !isLeader
                  ? 'Accommodation is individual per person. Book your hostel stay and meals separately from the team registration.'
                  : 'Attending Saturnalia from outside? Book hostel accommodation (₹300/day) and meal passes (₹200/day).'}
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/profile/Accommodation')}
              activeOpacity={0.8}
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: cardBorder,
                borderWidth: 1,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: 12,
                  color: '#41B8F0',
                  marginRight: 4,
                }}
              >
                {hasAccommodation ? "Manage Accommodation" : "Book Accommodation & Food"}
              </Text>
              <ChevronRight size={15} color="#41B8F0" />
            </TouchableOpacity>
          </View>
        )}

        {/* Rejected Status Notice */}
        {eventData?.eventType === "individual" && registration.status === "rejected" && (
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              borderWidth: 1,
              borderRadius: 16,
              padding: 14,
              marginBottom: 16,
              width: '100%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <XCircle size={16} color="#EF4444" style={{ marginRight: 6, flexShrink: 0 }} />
              <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#EF4444', fontSize: 13, flexShrink: 1 }}>
                Registration Not Approved
              </Text>
            </View>
            <Text style={{ fontFamily: 'Poppins_400Regular', color: isDark ? '#FECACA' : '#991B1B', fontSize: 12, lineHeight: 18 }}>
              Your registration has been rejected. Please contact event organizers for additional information.
            </Text>
          </View>
        )}

        {/* Team Leader Delete Team Action */}
        {eventData?.eventType === "team" &&
          teamData &&
          isLeader && (
            <View style={{ marginBottom: 16, width: '100%' }}>
              <TouchableOpacity
                onPress={handleDeleteTeam}
                activeOpacity={0.8}
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  width: '100%',
                }}
              >
                <Trash2 size={15} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#EF4444', fontSize: 13 }}>
                  Delete Team
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Individual Event Cancel Registration Action */}
        {eventData?.eventType === "individual" &&
          registration.status !== "rejected" && (
            <View style={{ marginBottom: 16, width: '100%' }}>
              <TouchableOpacity
                onPress={handleCancelRegistration}
                activeOpacity={0.8}
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  width: '100%',
                }}
              >
                <XCircle size={15} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#EF4444', fontSize: 13 }}>
                  Cancel Registration
                </Text>
              </TouchableOpacity>
            </View>
          )}
      </ScrollView>

      <TeamSubmissionModal
        visible={isSubmissionModalVisible}
        onClose={() => setIsSubmissionModalVisible(false)}
        event={eventData}
        teamData={teamData}
        onSubmitSuccess={() => {
          setIsSubmissionModalVisible(false);
          refresh();
        }}
      />
    </View>
  );
};

export default MyEventDetailsScreen;
