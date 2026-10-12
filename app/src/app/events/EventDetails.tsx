import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FirebaseEvent } from '@/types/models';
import MarkdownText from '@/components/display/MarkdownText';
import { useThemeStore } from '@/state/themeStore';
import { useUserStore } from '@/state/userStore';
import { getRegistrationDeadline } from '@/utils/dateUtils';
import RegistrationModal from '@/components/registration/RegistrationModal';
import { useEventDetail } from '@/hooks/useEventDetail';
import MetallicButton from '@/components/MetallicButton';

const EventDetailsScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useThemeStore();
  const { eventData } = useLocalSearchParams();
  const rawEvent = Array.isArray(eventData) ? eventData[0] : eventData;

  let event: FirebaseEvent | null = null;
  try {
    event = typeof rawEvent === 'string' ? JSON.parse(rawEvent) : (rawEvent as FirebaseEvent);
  } catch {
    event = null;
  }

  const [activeTab, setActiveTab] = useState<'about' | 'rules' | 'prizes' | 'details'>('about');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  const { userData: userProfile } = useUserStore();
  const userId = userProfile?.userId || '';

  const { data: eventDetailData, refresh: checkExistingRegistration } = useEventDetail(event?.eventId || '');
  const existingRegistration = eventDetailData?.myRegistration;
  const myTeam = eventDetailData?.myTeam;
  const isTeamEvent = event?.eventType === 'team';
  const isLeader = myTeam ? myTeam.leaderUserId === userId : false;
  const isPaid = existingRegistration?.paymentStatus === 'success' || !!myTeam?.paid;

  useFocusEffect(
    React.useCallback(() => {
      checkExistingRegistration();
    }, [event?.eventId, userId])
  );

  const handleRegisterClick = () => {
    if (!event) return;
    if (userProfile?.roles?.includes('admin') && !event.isPublic) return;

    if (event.eventType === 'externalLink' && event.externalUrl) {
      Linking.openURL(event.externalUrl);
      return;
    }

    if (existingRegistration) {
      if (existingRegistration.paymentStatus === 'pending' && (!isTeamEvent || isLeader)) {
        const params: Record<string, string> = { eventId: event.eventId };
        if (existingRegistration.teamId) params.teamId = existingRegistration.teamId;
        router.push({ pathname: '/events/Payment', params });
        return;
      }
      router.push({ pathname: '/events/MyEventDetails', params: { eventId: event.eventId } });
      return;
    }

    setShowRegistrationModal(true);
  };

  const handleRegistrationSuccess = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await checkExistingRegistration();
  };

  const handleModalClose = async () => {
    setShowRegistrationModal(false);
  };

  if (!event?.eventId) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          backgroundColor: isDark ? '#111114' : colors.background,
        }}
      >
        <Text style={{ fontFamily: 'Poppins_500Medium', color: '#FFFFFF', textAlign: 'center' }}>
          Event details are unavailable.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 16,
            backgroundColor: '#38BDF8',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 14,
          }}
        >
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#000000' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Formatting helpers
  const formatPrize = () => {
    const raw = event?.shortPrizes || event?.prizes;
    if (!raw) return '1,50,000';
    const clean = raw.replace(/[*#_~]/g, '').trim();
    const match = clean.match(/(\d[\d,]*000|\d[\d,]*\s*(?:k|lakh)?)/i);
    if (match) return match[1].replace(/^₹\s*/, '').replace(/^Rs\.?\s*/i, '');
    if (clean.length <= 15) return clean.replace(/^₹\s*/, '').replace(/^Rs\.?\s*/i, '');
    return '1,50,000';
  };

  const formatEventDateRange = () => {
    const start = event?.dateTime || event?.startDateTime;
    const end = event?.endDateTime;
    if (!start) return '13-14 Nov';
    const startDate = new Date(start);
    if (isNaN(startDate.getTime())) return '13-14 Nov';

    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });

    if (end) {
      const endDate = new Date(end);
      if (!isNaN(endDate.getTime()) && endDate.toDateString() !== startDate.toDateString()) {
        const endDay = endDate.getDate();
        const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
        if (startMonth === endMonth) {
          return `${startDay}-${endDay} ${startMonth}`;
        }
        return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
      }
    }
    return `${startDay} ${startMonth}`;
  };

  const getRegistrationCountText = () => {
    if (event?.registeredCount && event.registeredCount > 0) {
      if (event.registeredCount >= 1000) {
        return `${(event.registeredCount / 1000).toFixed(1)}K+ Registered`;
      }
      return `${event.registeredCount}+ Registered`;
    }
    return '1.2K+ Registered';
  };

  const getButtonTitle = () => {
    if (userProfile?.roles?.includes('admin') && !event?.isPublic) {
      return 'Registration Disabled (Private)';
    }
    if (existingRegistration) {
      if (isPaid) return 'View Registration';
      if (existingRegistration.paymentStatus === 'pending') {
        return isTeamEvent && !isLeader ? 'View Team (Payment Pending)' : 'Complete Payment';
      }
      return 'View Registration';
    }
    if (event?.paymentRequired) return 'Register Now';
    return 'Register for Free';
  };

  const prizeText = formatPrize();
  const venueText = event.venueName || 'CSED';
  const dateRangeText = formatEventDateRange();
  const registrationCount = getRegistrationCountText();
  const buttonTitle = getButtonTitle();

  const categoryTag = event.category || 'Technical';
  const subTag =
    event.eventType === 'team'
      ? 'Team'
      : event.eventType === 'individual'
      ? 'Individual'
      : 'Hackathon';

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#131316' : '#E0E0E0' }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Registration Modal */}
      <RegistrationModal
        visible={showRegistrationModal}
        event={event}
        onClose={handleModalClose}
        onSuccess={handleRegistrationSuccess}
      />

      {/* Scrollable Container with Continuous Padding matching image */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 10, 16),
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Image Card rounded from the top */}
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            overflow: 'hidden',
            backgroundColor: '#131316',
            position: 'relative',
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <Image
            source={event.coverImage ? { uri: event.coverImage } : require('@/assets/event.jpg')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />

          {/* Close / Back "X" Button (Top Left) */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Admin Public/Private Tag */}
          {userProfile?.roles?.includes('admin') && (
            <View
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: event.isPublic ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', fontSize: 12 }}>
                {event.isPublic ? 'Public' : 'Private'}
              </Text>
            </View>
          )}

          {/* Payment Pending Badge */}
          {existingRegistration && existingRegistration.paymentStatus === 'pending' && (
            <View
              style={{
                position: 'absolute',
                bottom: 28,
                left: 14,
                backgroundColor: '#F59E0B',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="time" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', fontSize: 12 }}>
                Payment Pending
              </Text>
            </View>
          )}
        </View>

        {/* Content Section below image with rounded top */}
        <View
          style={{
            backgroundColor: isDark ? '#131316' : '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            marginTop: -22,
            paddingTop: 12,
            paddingHorizontal: 16,
            paddingBottom: 24,
           
            zIndex: 2,
          }}
        >
          {/* Drag Pill / Handle Indicator below the image */}
          <View
            style={{
              width: 44,
              height: 4,
              borderRadius: 2,
              backgroundColor: isDark ? '#52525B' : '#CCCCCC',
              alignSelf: 'center',
              marginTop: 4,
              marginBottom: 16,
            }}
          />

          {/* Tags / Pills Row with Premium Metallic Border */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          {categoryTag ? (
            <MetallicButton
              title={categoryTag}
              borderRadius={12}
              fontSize={13}
            />
          ) : null}

          {subTag ? (
            <MetallicButton
              title={subTag}
              borderRadius={12}
              fontSize={13}
            />
          ) : null}
        </View>

        {/* Event Title */}
        <Text
          style={{
            fontFamily: 'Poppins_700Bold',
            fontSize: 26,
            lineHeight: 32,
            color: isDark ? '#FFFFFF' : '#000000',
            marginBottom: 12,
            letterSpacing: 0.3,
          }}
        >
          {event.title}
        </Text>

        {/* Meta Info Row: Trophy / Venue / Date */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 14,
          }}
        >
          {/* Prize */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="trophy-outline" size={17} color={isDark ? '#D1D5DB' : '#555555'} />
            <Text
              style={{
                fontFamily: 'Poppins_500Medium',
                fontSize: 14,
                color: isDark ? '#FFFFFF' : '#000000',
              }}
            >
              {prizeText}
            </Text>
          </View>

          {/* Venue */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="location-outline" size={17} color={isDark ? '#D1D5DB' : '#555555'} />
            <Text
              style={{
                fontFamily: 'Poppins_500Medium',
                fontSize: 14,
                color: isDark ? '#FFFFFF' : '#000000',
              }}
            >
              {venueText}
            </Text>
          </View>

          {/* Date */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="calendar-outline" size={17} color={isDark ? '#D1D5DB' : '#555555'} />
            <Text
              style={{
                fontFamily: 'Poppins_500Medium',
                fontSize: 14,
                color: isDark ? '#FFFFFF' : '#000000',
              }}
            >
              {dateRangeText}
            </Text>
          </View>
        </View>

        {/* Thin Divider */}
        <View style={{ height: 1, backgroundColor: isDark ? '#27272A' : '#D5D5D5', marginVertical: 4 }} />

        {/* Registration Count */}
        <View style={{ paddingVertical: 10 }}>
          <Text
            style={{
              fontFamily: 'Poppins_600SemiBold',
              fontSize: 14,
              color: '#38BDF8',
            }}
          >
            {registrationCount}
          </Text>
        </View>

        {/* Thin Divider */}
        <View style={{ height: 1, backgroundColor: isDark ? '#27272A' : '#D5D5D5', marginBottom: 16 }} />

        {/* Short Description Overview */}
        {event.shortDescription ? (
          <Text
            style={{
              fontFamily: 'Poppins_400Regular',
              fontSize: 14,
              lineHeight: 22,
              color: isDark ? '#FFFFFF' : '#000000',
              marginBottom: 16,
            }}
          >
            {event.shortDescription}
          </Text>
        ) : null}

        {/* Navigation Tabs for detailed information */}
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginBottom: 18,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#27272A' : '#E5E7EB',
            paddingBottom: 8,
          }}
        >
          {(['about', 'rules', 'prizes', 'details'] as const).map((tab) => {
            const isTabActive = activeTab === tab;
            const tabLabels = {
              about: 'About',
              rules: 'Rules',
              prizes: 'Prizes',
              details: 'Details',
            };

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: isTabActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  borderWidth: 1,
                  borderColor: isTabActive ? '#38BDF8' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: isTabActive ? 'Poppins_600SemiBold' : 'Poppins_500Medium',
                    fontSize: 13,
                    color: isTabActive ? '#38BDF8' : '#9CA3AF',
                  }}
                >
                  {tabLabels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        {activeTab === 'about' && (
          <View style={{ marginBottom: 16 }}>
            {event.description ? (
              <MarkdownText
                lightMode={!isDark}
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  fontFamily: 'Poppins_400Regular',
                  color: isDark ? '#FFFFFF' : '#000000',
                }}
              >
                {event.description}
              </MarkdownText>
            ) : (
              <Text style={{ fontFamily: 'Poppins_400Regular', color: isDark ? '#9CA3AF' : '#555555', fontSize: 14 }}>
                No additional description available.
              </Text>
            )}

            {/* Registration Deadline */}
            <View
              style={{
                marginTop: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Ionicons name="alarm-outline" size={18} color={isDark ? '#9CA3AF' : '#555555'} />
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: isDark ? '#9CA3AF' : '#555555' }}>
                Registration Deadline:{' '}
                <Text style={{ fontFamily: 'Poppins_600SemiBold', color: isDark ? '#FFFFFF' : '#000000' }}>
                  {getRegistrationDeadline(event.registrationDeadline) || 'TBA'}
                </Text>
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'rules' && (
          <View style={{ marginBottom: 16 }}>
            {event.rules ? (
              <MarkdownText
                lightMode={!isDark}
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  fontFamily: 'Poppins_400Regular',
                  color: isDark ? '#FFFFFF' : '#000000',
                }}
              >
                {event.rules}
              </MarkdownText>
            ) : (
              <Text style={{ fontFamily: 'Poppins_400Regular', color: isDark ? '#9CA3AF' : '#555555', fontSize: 14 }}>
                No rules specified for this event.
              </Text>
            )}
          </View>
        )}

        {activeTab === 'prizes' && (
          <View style={{ marginBottom: 16 }}>
            {event.prizes ? (
              <MarkdownText
                lightMode={!isDark}
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  fontFamily: 'Poppins_400Regular',
                  color: isDark ? '#FFFFFF' : '#000000',
                }}
              >
                {event.prizes}
              </MarkdownText>
            ) : (
              <Text style={{ fontFamily: 'Poppins_400Regular', color: isDark ? '#9CA3AF' : '#555555', fontSize: 14 }}>
                Prize details are not available.
              </Text>
            )}
          </View>
        )}

        {activeTab === 'details' && (
          <View style={{ gap: 20, marginBottom: 16 }}>
            {/* Registration Fee */}
            {event.paymentRequired && (
              <View style={{ gap: 4 }}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: isDark ? '#9CA3AF' : '#555555' }}>
                  Registration Fee
                </Text>
                <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 15, color: isDark ? '#FFFFFF' : '#000000' }}>
                  {userProfile?.isHostCollegeStudent
                    ? `Host College: ₹${event.registrationFee?.host ?? 0}`
                    : `Other Colleges: ₹${event.registrationFee?.other ?? 0}`}
                </Text>
              </View>
            )}

            {/* Team Size */}
            {event.eventType === 'team' && (
              <View style={{ gap: 4 }}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: isDark ? '#9CA3AF' : '#555555' }}>
                  Team Size
                </Text>
                <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 15, color: isDark ? '#FFFFFF' : '#000000' }}>
                  {event.minTeamSize != null && event.maxTeamSize != null
                    ? event.minTeamSize === event.maxTeamSize
                    ? `${event.minTeamSize} members`
                    : `${event.minTeamSize} - ${event.maxTeamSize} members`
                    : event.maxTeamSize != null
                    ? `Up to ${event.maxTeamSize} members`
                    : event.minTeamSize != null
                    ? `Minimum ${event.minTeamSize} members`
                    : 'Team event'}
                </Text>
              </View>
            )}

            {/* Coordinators */}
            {event.coordinators && event.coordinators.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: isDark ? '#9CA3AF' : '#555555' }}>
                  Event Coordinators
                </Text>
                {event.coordinators.map((coordinator, index) => (
                  <View key={index} style={{ gap: 2 }}>
                    <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 15, color: isDark ? '#FFFFFF' : '#000000' }}>
                      {coordinator.name}
                    </Text>
                    {coordinator.email ? (
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: isDark ? '#9CA3AF' : '#555555' }}>
                        {coordinator.email}
                      </Text>
                    ) : null}
                    {coordinator.phone ? (
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: isDark ? '#9CA3AF' : '#555555' }}>
                        {coordinator.phone}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        </View>
      </ScrollView>

      {/* Floating Bottom Action Button with NO background bar */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom + 12, 20),
          backgroundColor: 'transparent',
        }}
      >
        <MetallicButton
          title={buttonTitle}
          onPress={handleRegisterClick}
          disabled={userProfile?.roles?.includes('admin') && !event.isPublic}
          height={56}
          borderRadius={28}
          fontSize={16}
          variant={
            existingRegistration?.paymentStatus === 'pending' && (!isTeamEvent || isLeader)
              ? 'amber'
              : 'metallic'
          }
          style={{ width: '100%', alignSelf: 'stretch' }}
          contentStyle={{ width: '100%', height: 53 }}
          textStyle={{ fontFamily: 'Poppins_700Bold', letterSpacing: 0.3 }}
        />
      </View>
    </View>
  );
};

export default EventDetailsScreen;