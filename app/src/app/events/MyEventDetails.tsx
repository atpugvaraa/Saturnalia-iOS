import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Linking,
} from "react-native";
import { showAlert } from "@/components";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "@/state/userStore";
import { useCallback } from "react";
import { FirebaseEvent } from "@/types/models";
import Button from "@/components/ui/Button";
import Header from "@/components/layout/Header";
import RegistrationStatusCard from "@/components/registration/RegistrationStatusCard";
import TeamDetailsCard from "@/components/registration/TeamDetailsCard";
import EventTicketCard from "@/components/registration/EventTicketCard";
import TeamSubmissionModal from "@/components/registration/TeamSubmissionModal";
import { useEventDetail } from "@/hooks/useEventDetail";
import { useDeleteTeam, useRemoveTeamMember, useUnregisterForEvent } from "@/hooks/useEventMutations";

interface MyEventDetailsRouteParams {
  eventId: string;
}

const MyEventDetailsScreen: React.FC = () => {
  const router = useRouter();
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
  const [isSubmissionModalVisible, setIsSubmissionModalVisible] =
    useState(false);

  const deleteTeamMutation = useDeleteTeam();
  const removeTeamMemberMutation = useRemoveTeamMember();
  const unregisterMutation = useUnregisterForEvent();

  const handleRemoveMember = (memberUserId: string, memberName: string) => {
    if (!teamData) {
      showAlert("Error", "Team data not available");
      return;
    }

    showAlert("Remove member", `Remove ${memberName} from the team?`, [
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

    showAlert("Delete team", "This will cancel the whole team's registration.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
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

  const handleSubmitTeam = async () => {
    if (!eventData || !teamData) return;

    // Validate team size
    if (
      eventData.minTeamSize &&
      (teamData.members?.length ?? 0) < eventData.minTeamSize
    ) {
      showAlert(
        "Insufficient Team Size",
        `Your team needs at least ${
          eventData.minTeamSize
        } members to submit. Currently you have ${
          teamData.members.length
        } member${
          teamData.members.length !== 1 ? "s" : ""
        }.\n\nPlease share the invite code with your teammates before submitting.`
      );
      return;
    }

    setIsSubmissionModalVisible(true);
    // showAlert(
    //   'Submit Team',
    //   `Are you sure you want to submit your team for review? Your team has ${teamData.members.length} member${teamData.members.length !== 1 ? 's' : ''}.`,
    //   [
    //     { text: 'Cancel', style: 'cancel' },
    //     {
    //       text: 'Submit',
    //       onPress: async () => {
    //         try {
    //           setSubmittingTeam(true);
    //           // Submit with empty custom fields since they should have been filled during registration
    //           let referredBy = '';
    //           const result = await submitTeam(eventId, [], referredBy);

    //           if (result.success) {
    //             showAlert('Success', 'Team submitted successfully! Your registration is now awaiting admin approval.');
    //             await fetchRegistrationData();
    //           } else {
    //             showAlert('Error', result.error);
    //           }
    //         } catch (error: any) {
    //           showAlert('Error', error.message || 'Failed to submit team');
    //         } finally {
    //           setSubmittingTeam(false);
    //         }
    //       },
    //     },
    //   ]
    // );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-transparent items-center justify-center">
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFBA00" />
      </View>
    );
  }

  if (!registration) {
    return (
      <View className="flex-1 bg-transparent items-center justify-center px-6">
        <StatusBar barStyle="light-content" />
        <Text className="text-[#0C3572] text-xl text-center">
          Registration not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 bg-yellow-400 px-6 py-3 rounded-xl"
        >
          <Text className="text-black font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLeader = teamData?.leaderUserId === userId;

  return (
    <View className="flex-1 bg-transparent">
      {/* Header */}
      <Header />
      <View className="px-6 pt-12 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0C3572" />
        </TouchableOpacity>
        <Text
          style={{ fontFamily: "Outfit_700Bold" }}
          ellipsizeMode="tail"
          numberOfLines={1}
          className="text-[#0C3572] w-[80%] text-3xl"
        >
          {eventData?.title || registration.eventName}
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1 px-6 py-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Status Card */}
        <RegistrationStatusCard
          status={registration.paymentStatus === 'pending' ? 'payment_pending' : (registration.status || 'pending')}
          eventCategory={registration.eventCategory || eventData?.category || ''}
          eventType={(eventData?.eventType === 'team' ? 'team' : 'individual')}
          registeredAt={registration.registeredAt || new Date().toISOString()}
        />

        {/* Event Ticket with QR Code - Only show when confirmed */}
        {registration.status !== "rejected" && (
          <View className="mb-4">
            <EventTicketCard registration={registration} eventData={eventData} />

          </View>
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
            onSubmitTeam={handleSubmitTeam}
          />
        )}

        {/* Payment Pending for Team Members (non-leader) */}
        {registration.paymentStatus === 'pending' && eventData?.eventType === 'team' && !isLeader && (
          <View className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="time" size={20} color="#d97706" />
              <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-amber-800 ml-2 text-base">
                Waiting for Team Leader Payment
              </Text>
            </View>
            <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-amber-700 text-sm leading-5">
              The registration fee for this team event must be completed by your team leader to confirm the team's registration.
            </Text>
          </View>
        )}

        {/* Payment Button - shown when paymentStatus is pending for leader or individual */}
        {registration.paymentStatus === 'pending' && (eventData?.eventType === 'individual' || isLeader) && (
          <View className="mb-6">
            <View className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-3">
              <View className="flex-row items-center mb-2">
                <Ionicons name="warning" size={18} color="#d97706" />
                <Text
                  style={{ fontFamily: 'Outfit_600SemiBold' }}
                  className="text-amber-700 ml-2"
                >
                  Payment Pending
                </Text>
              </View>
              <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-amber-600 text-sm">
                {eventData?.eventType === 'team'
                  ? 'Complete payment to confirm your team\'s registration. Payment covers the entire team.'
                  : 'Complete payment to confirm your registration.'}
              </Text>
            </View>
            <Button
              title="Complete Payment"
              onPress={() => router.push({
                pathname: '/events/Payment',
                params: {
                  eventId,
                  ...(teamData?.teamId ? { teamId: teamData.teamId } : {}),
                },
              })}
              variant="none"
              className="bg-[#FEE59C] border-[#0C3572] border-2 flex-row items-center justify-center rounded-xl py-4"
              textClassName="text-[#0C3572] font-semibold"
            />
          </View>
        )}

        {/* Accommodation & Food Card */}
        {!userProfile?.isHostCollegeStudent && (
          <View className="mb-6 bg-white border border-[#DBE2ED] rounded-2xl p-5 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Ionicons name="bed-outline" size={22} color="#0C3572" />
                <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-lg ml-2">
                  Accommodation & Food
                </Text>
              </View>
              {(Object.values(userProfile?.accommodation || {}).some(Boolean) || Object.values(userProfile?.food || {}).some(Boolean)) ? (
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-green-700 text-xs">
                    Pass Active
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-sm mb-4 leading-5">
              {(Object.values(userProfile?.accommodation || {}).some(Boolean) || Object.values(userProfile?.food || {}).some(Boolean))
                ? 'You have booked accommodation or meal passes. You can add more days or view details from your profile.'
                : eventData?.eventType === 'team' && !isLeader
                  ? 'Accommodation is individual per person. Book your hostel stay and meals separately from the team registration.'
                  : 'Attending Saturnalia from outside? Book hostel accommodation (₹300/day) and meal passes (₹200/day).'}
            </Text>
            <Button
              title={(Object.values(userProfile?.accommodation || {}).some(Boolean) || Object.values(userProfile?.food || {}).some(Boolean)) ? "Manage Accommodation" : "Book Accommodation & Food"}
              onPress={() => router.push('/profile/Accommodation')}
              variant="none"
              className="bg-[#0C3572] rounded-xl py-3 items-center justify-center"
              textClassName="text-[#EEB170] font-semibold"
            />
          </View>
        )}

        {/* Rejected Status Message for Individual Events */}
        {eventData?.eventType === "individual" &&
          registration.status === "rejected" && (
            <View className="mb-6 bg-red-900/20 border border-red-600/30 rounded-lg p-4">
              <Text className="text-red-400 text-sm font-semibold mb-2">
                Registration Rejected
              </Text>
              <Text className="text-red-400 text-sm">
                Your registration has been rejected. Please contact the event
                organizers for more information.
              </Text>
            </View>
          )}

        {/* Team Management Actions - Only available for leader when status is pending */}
        {eventData?.eventType === "team" &&
          teamData &&
          teamData.status === "pending" &&
          isLeader && (
            <View className="mb-6">
              <Button
                title="Delete Team"
                onPress={handleDeleteTeam}
                variant="outline"
                className="bg-transparent border-[#BA1415] border-2  flex-row items-center justify-center"
              />
            </View>
          )}

        {/* Individual Event Actions */}
        {eventData?.eventType === "individual" &&
          registration.status !== "rejected" && (
            <View className="mb-6">
              <Button
                title="Cancel Registration"
                onPress={handleCancelRegistration}
                variant="outline"
                className="bg-transparent border-[#BA1415] border-2 flex-row items-center justify-center"
              />
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
        }}
      />
    </View>
  );
};

export default MyEventDetailsScreen;
