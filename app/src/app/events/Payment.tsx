import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Switch, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import { initiateEventPayment, getPaymentStatus, validateCoupon, CouponResponse } from '@/api/payments';
import { showAlert } from '@/components';
import { useEventDetail } from '@/hooks/useEventDetail';
import { useUserStore } from '@/state/userStore';

const ACCOMMODATION_PRICE = 300;
const FOOD_PRICE = 200;

const PaymentScreen: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { eventId, teamId } = useLocalSearchParams<{ eventId: string; teamId?: string }>();
  const { userData: user } = useUserStore();
  const { data: eventData, loading: eventLoading } = useEventDetail(eventId);

  const [phase, setPhase] = useState<'checkout' | 'initiating' | 'opening' | 'verifying' | 'done'>('checkout');
  const [errorMessage, setErrorMessage] = useState('');

  const [accommodation, setAccommodation] = useState<Record<string, boolean>>({
    day0: false, day1: false, day2: false, day3: false, day4: false,
  });
  const [food, setFood] = useState<Record<string, boolean>>({
    day0: false, day1: false, day2: false, day3: false, day4: false,
  });

  const [couponCode, setCouponCode] = useState('');
  const [validCoupon, setValidCoupon] = useState<CouponResponse | null>(null);
  const [couponError, setCouponError] = useState('');

  // Lock already paid days from user profile
  useEffect(() => {
    if (user?.accommodation) {
      setAccommodation(prev => ({ ...prev, ...user.accommodation }));
    }
    if (user?.food) {
      setFood(prev => ({ ...prev, ...user.food }));
    }
  }, [user]);

  const toggleAcc = (day: string) => {
    if (user?.accommodation?.[day]) return;
    setAccommodation(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const toggleFood = (day: string) => {
    if (user?.food?.[day]) return;
    setFood(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const handleApplyCoupon = async () => {
    const trimmed = couponCode.trim().toUpperCase();
    if (!trimmed) return;
    try {
      setCouponError('');
      const res = await validateCoupon(trimmed, eventId);
      setValidCoupon(res);
      showAlert("Success", `Coupon "${res.code}" applied!`);
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon");
      setValidCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setValidCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const calculateTotal = () => {
    let baseEventFee = 0;
    if (eventData?.event?.paymentRequired) {
      const isHost = user?.isHostCollegeStudent;
      if (
        eventData.event.eventType === 'team' &&
        eventData.event.paymentType === 'per_individual' &&
        eventData.myTeam?.members?.length
      ) {
        baseEventFee = eventData.myTeam.members.reduce((acc: number, m: any) => {
          return acc + (m.isHostCollegeStudent ? (eventData.event.registrationFee?.host || 0) : (eventData.event.registrationFee?.other || 0));
        }, 0);
      } else {
        baseEventFee = isHost ? (eventData.event.registrationFee?.host || 0) : (eventData.event.registrationFee?.other || 0);
      }
    }

    let accFoodFee = 0;
    Object.entries(accommodation).forEach(([day, selected]) => {
      if (selected && !user?.accommodation?.[day]) accFoodFee += ACCOMMODATION_PRICE;
    });
    Object.entries(food).forEach(([day, selected]) => {
      if (selected && !user?.food?.[day]) accFoodFee += FOOD_PRICE;
    });

    return baseEventFee + accFoodFee;
  };

  const total = calculateTotal();

  const calculateDiscount = () => {
    if (!validCoupon) return 0;
    if (validCoupon.minCartValue && total < validCoupon.minCartValue) return 0;
    if (validCoupon.discountType === 'flat') {
      return validCoupon.discountValue > total ? total : validCoupon.discountValue;
    }
    return total * (validCoupon.discountValue / 100);
  };

  const discount = calculateDiscount();
  const finalAmount = Math.max(0, total - discount);

  const pollPaymentStatusWithRetry = async (
    merchantOrderId: string,
    maxAttempts = 4,
    delayMs = 1500
  ) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const payment = await getPaymentStatus(merchantOrderId);
        if (payment?.status === 'success' || payment?.status === 'failure') {
          return payment;
        }
      } catch (e) {
        // ignore intermediate network error and retry
      }
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    return await getPaymentStatus(merchantOrderId);
  };

  const startPayment = async () => {
    if (finalAmount <= 0) return;
    try {
      setPhase('initiating');
      setErrorMessage('');

      const accToPay: Record<string, boolean> = {};
      const foodToPay: Record<string, boolean> = {};

      Object.entries(accommodation).forEach(([day, selected]) => {
        if (selected && !user?.accommodation?.[day]) accToPay[day] = true;
      });
      Object.entries(food).forEach(([day, selected]) => {
        if (selected && !user?.food?.[day]) foodToPay[day] = true;
      });

      let pType = 'event';
      const hasAcc = Object.keys(accToPay).length > 0;
      const hasFood = Object.keys(foodToPay).length > 0;
      if (hasAcc && hasFood) pType = 'event_and_accommodation_and_food';
      else if (hasAcc) pType = 'event_and_accommodation';
      else if (hasFood) pType = 'event_and_accommodation_and_food';

      // Check coupon minCartValue
      let appliedCoupon: string | undefined = undefined;
      if (validCoupon) {
        if (validCoupon.minCartValue && total < validCoupon.minCartValue) {
          showAlert(
            "Coupon Condition Not Met",
            `Coupon "${validCoupon.code}" requires a minimum cart value of ₹${validCoupon.minCartValue}. Please add more options or remove the coupon to proceed.`
          );
          setPhase('checkout');
          return;
        }
        appliedCoupon = validCoupon.code;
      }

      const res = await initiateEventPayment({
        eventId,
        teamId: teamId || eventData?.myTeam?.teamId || undefined,
        paymentType: pType,
        couponCode: appliedCoupon,
        accommodation: accToPay,
        food: foodToPay,
      });

      let orderId = res.merchantOrderId;
      let urlStatus: string | null = null;
      let browserResultType = 'success';

      if (res.paymentUrl.includes('/payments/dummy')) {
        setPhase('verifying');
        try {
          await fetch(res.paymentUrl, { headers: { Accept: 'application/json' } });
          urlStatus = 'success';
        } catch (e) {
          const redirectUrl = 'app://events/Payment';
          const result = await WebBrowser.openAuthSessionAsync(res.paymentUrl, redirectUrl);
          browserResultType = result.type;
        }
      } else {
        setPhase('opening');
        const redirectUrl = 'app://events/Payment';
        const result = await WebBrowser.openAuthSessionAsync(res.paymentUrl, redirectUrl);
        browserResultType = result.type;

        if (result.type === 'success' && result.url) {
          try {
            const redirectedUrl = new URL(result.url);
            urlStatus = redirectedUrl.searchParams.get('status');
            const paramId = redirectedUrl.searchParams.get('merchantOrderId');
            if (paramId) orderId = paramId;
          } catch (e) {}
        }
      }

      setPhase('verifying');
      await pollAndFinish(orderId, browserResultType, urlStatus);
    } catch (err: any) {
      setPhase('checkout');
      setErrorMessage(err?.message || 'Failed to start payment');
      showAlert('Payment Error', err?.message || 'Failed to start payment');
    }
  };

  const pollAndFinish = async (
    merchantOrderId: string,
    browserResultType: string,
    knownUrlStatus?: string | null
  ) => {
    try {
      const payment = await pollPaymentStatusWithRetry(merchantOrderId);
      const status = payment?.status || knownUrlStatus || 'pending';

      if (status === 'success') {
        await useUserStore.getState().refreshUserProfile();
        queryClient.invalidateQueries({ queryKey: ['events'] });
        setPhase('done');
        showAlert(
          'Payment Successful',
          'Your registration is now confirmed!',
          [{
            text: 'View Registration',
            onPress: () => {
              router.dismissAll();
              router.push({ pathname: '/events/MyEventDetails', params: { eventId } });
            }
          }]
        );
      } else if (status === 'failure') {
        setPhase('checkout');
        showAlert(
          'Payment Failed',
          'Your payment could not be processed by the gateway. Please try again.',
          [{ text: 'Try Again', onPress: () => setPhase('checkout') }]
        );
      } else {
        if (browserResultType === 'cancel' || browserResultType === 'dismiss') {
          setPhase('checkout');
          showAlert(
            'Payment Incomplete',
            'The payment window was closed before completion. If your payment was deducted, it will update shortly; otherwise you can retry.',
            [{ text: 'Try Again', onPress: () => setPhase('checkout') }]
          );
        } else {
          setPhase('checkout');
          showAlert(
            'Payment Processing',
            'Your payment is still being processed. Please check your registration status in a few moments.',
            [{
              text: 'View Registration',
              onPress: () => {
                queryClient.invalidateQueries({ queryKey: ['events'] });
                router.dismissAll();
                router.push({ pathname: '/events/MyEventDetails', params: { eventId } });
              }
            }]
          );
        }
      }
    } catch (err: any) {
      setPhase('checkout');
      showAlert(
        'Notice',
        'Could not confirm payment status automatically. If your account was debited, it will update shortly; otherwise you can retry.',
        [{ text: 'OK', onPress: () => setPhase('checkout') }]
      );
    }
  };

  if (eventLoading || (phase !== 'checkout' && phase !== 'done')) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <ActivityIndicator size="large" color="#0C3572" className="mb-4" />
        <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-lg text-center">
          {phase === 'initiating' ? 'Preparing Checkout...' :
           phase === 'opening' ? 'Opening Payment Gateway...' :
           phase === 'verifying' ? 'Verifying Payment Outcome...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  // 1. Check if user/team has ALREADY PAID for the event
  const isAlreadyPaid =
    eventData?.myRegistration?.paymentStatus === 'success' ||
    (eventData?.event?.eventType === 'team' && !!eventData?.myTeam?.paid);

  if (isAlreadyPaid) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
          <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
        </View>
        <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#0C3572] text-2xl text-center mb-2">
          Registration Already Paid
        </Text>
        <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-center mb-8 leading-6">
          You have already completed payment for this event and your registration is confirmed.
          If you need to book or update accommodation, you can manage it from the Accommodation page.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/profile/Accommodation')}
          className="bg-[#0C3572] w-full py-4 rounded-xl items-center mb-3"
        >
          <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#EEB170] text-base">
            Manage Accommodation & Food
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            router.dismissAll();
            router.push({ pathname: '/events/MyEventDetails', params: { eventId } });
          }}
          className="bg-[#F2F5F8] w-full py-4 rounded-xl items-center"
        >
          <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-base">
            View Registration
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Check if user is a team member who is NOT the leader
  const isTeamMemberNotLeader =
    eventData?.event?.eventType === 'team' &&
    !!eventData?.myTeam &&
    eventData.myTeam.leaderUserId !== user?.userId;

  if (isTeamMemberNotLeader) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-amber-100 items-center justify-center mb-6">
          <Ionicons name="people" size={44} color="#d97706" />
        </View>
        <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#0C3572] text-2xl text-center mb-2">
          Team Leader Payment Only
        </Text>
        <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-center mb-8 leading-6">
          Only your team leader can complete the registration fee payment for the team.
          You can book your individual accommodation and food passes from the Accommodation page.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/profile/Accommodation')}
          className="bg-[#0C3572] w-full py-4 rounded-xl items-center mb-3"
        >
          <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#EEB170] text-base">
            Book My Accommodation & Food
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            router.dismissAll();
            router.push({ pathname: '/events/MyEventDetails', params: { eventId } });
          }}
          className="bg-[#F2F5F8] w-full py-4 rounded-xl items-center"
        >
          <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-base">
            View Team Status
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isTeamEvent = eventData?.event?.eventType === 'team';

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center space-x-4 px-6 pt-14 pb-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-[#F2F5F8]">
          <Ionicons name="arrow-back" size={20} color="#0C3572" />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-2xl ml-3">
          Checkout
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-[#F9FBFC]"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Fee Card */}
        <View className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <Text style={{ fontFamily: 'Outfit_500Medium' }} className="text-[#2175C0] text-sm mb-1 uppercase tracking-wider">
            {isTeamEvent ? "Team Registration Fee" : "Registration Fee"}
          </Text>
          <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#0C3572] text-3xl">
            ₹{eventData?.event?.paymentRequired
              ? isTeamEvent && eventData.event.paymentType === 'per_individual' && eventData.myTeam?.members?.length
                ? eventData.myTeam.members.reduce((acc: number, m: any) => acc + (m.isHostCollegeStudent ? (eventData.event.registrationFee?.host || 0) : (eventData.event.registrationFee?.other || 0)), 0)
                : user?.isHostCollegeStudent
                  ? eventData.event.registrationFee?.host || 0
                  : eventData.event.registrationFee?.other || 0
              : 0}
          </Text>
          {isTeamEvent && (
            <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-xs mt-1">
              Covers all registered members of your team.
            </Text>
          )}
        </View>

        {/* Accommodation Section */}
        <View className="mb-4">
          <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-xl mb-1">
            Stay & Food (Optional)
          </Text>
          <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-sm mb-3">
            Add accommodation (₹{ACCOMMODATION_PRICE}/day) or food (₹{FOOD_PRICE}/day).
          </Text>

          {isTeamEvent && (
            <View className="bg-blue-50 border border-blue-200 p-3 rounded-xl mb-4 flex-row items-center">
              <Ionicons name="information-circle" size={20} color="#2175C0" />
              <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#0C3572] text-xs ml-2 flex-1">
                Accommodation selected here is for you (Team Leader) only. Other team members can book their stay individually from their profile.
              </Text>
            </View>
          )}

          {['day0', 'day1', 'day2', 'day3', 'day4'].map((day) => {
            const accLocked = user?.accommodation?.[day] || false;
            const foodLocked = user?.food?.[day] || false;
            return (
              <View key={day} className="mb-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-lg mb-4 capitalize">
                  {day}
                </Text>

                <View className="flex-row justify-between items-center mb-4">
                  <View>
                    <Text style={{ fontFamily: 'Outfit_500Medium' }} className="text-[#0C3572]">Accommodation</Text>
                    <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-xs">Campus Hostel (₹{ACCOMMODATION_PRICE}/day)</Text>
                  </View>
                  {accLocked ? (
                    <View className="bg-green-100 px-3 py-1 rounded-full flex-row items-center">
                      <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                      <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-green-700 text-xs ml-1">Paid</Text>
                    </View>
                  ) : (
                    <Switch
                      value={accommodation[day]}
                      onValueChange={() => toggleAcc(day)}
                      thumbColor={accommodation[day] ? '#0C3572' : '#f4f3f4'}
                      trackColor={{ true: '#EEB170', false: '#d1d5db' }}
                    />
                  )}
                </View>

                <View className="flex-row justify-between items-center">
                  <View>
                    <Text style={{ fontFamily: 'Outfit_500Medium' }} className="text-[#0C3572]">Meals</Text>
                    <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-xs">3 Meals Included (₹{FOOD_PRICE}/day)</Text>
                  </View>
                  {foodLocked ? (
                    <View className="bg-green-100 px-3 py-1 rounded-full flex-row items-center">
                      <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                      <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-green-700 text-xs ml-1">Paid</Text>
                    </View>
                  ) : (
                    <Switch
                      value={food[day]}
                      onValueChange={() => toggleFood(day)}
                      thumbColor={food[day] ? '#0C3572' : '#f4f3f4'}
                      trackColor={{ true: '#EEB170', false: '#d1d5db' }}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Coupon Code Card */}
        <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] mb-3">
            Have a promo code?
          </Text>
          <View className="flex-row space-x-3 gap-2">
            <TextInput
              value={couponCode}
              onChangeText={setCouponCode}
              placeholder="Enter code"
              placeholderTextColor="#A0ABC0"
              autoCapitalize="characters"
              className="flex-1 bg-[#F2F5F8] px-4 py-3 rounded-xl border border-gray-100 text-[#0C3572]"
              style={{ fontFamily: 'Outfit_500Medium' }}
            />
            {validCoupon ? (
              <TouchableOpacity
                onPress={handleRemoveCoupon}
                className="bg-red-100 px-5 justify-center rounded-xl"
              >
                <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-red-600">Remove</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleApplyCoupon}
                className="bg-[#0C3572] px-6 justify-center rounded-xl"
              >
                <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#EEB170]">Apply</Text>
              </TouchableOpacity>
            )}
          </View>
          {couponError ? (
            <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-red-500 mt-2 text-xs">
              {couponError}
            </Text>
          ) : null}
          {validCoupon ? (
            <View className="mt-3">
              <View className="flex-row items-center bg-green-50 p-2.5 rounded-lg">
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-green-700 ml-2 text-sm">
                  Coupon applied: -₹{discount.toFixed(2)}
                </Text>
              </View>
              {validCoupon.minCartValue && total < validCoupon.minCartValue ? (
                <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-amber-600 text-xs mt-1.5">
                  Note: Requires a minimum cart value of ₹{validCoupon.minCartValue} (current: ₹{total}).
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-6 py-5 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] pb-8">
        <View className="flex-row justify-between items-center">
          <View>
            <Text style={{ fontFamily: 'Outfit_500Medium' }} className="text-[#2175C0] text-sm">
              Total to Pay
            </Text>
            <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#0C3572] text-3xl">
              ₹{finalAmount.toFixed(2)}
            </Text>
            {discount > 0 && (
              <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-gray-400 text-xs line-through mt-0.5">
                Original: ₹{total.toFixed(2)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={startPayment}
            disabled={finalAmount <= 0}
            className={`px-10 py-4 rounded-xl flex-row items-center ${finalAmount <= 0 ? 'bg-gray-200' : 'bg-[#0C3572]'}`}
          >
            <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className={`text-lg ${finalAmount <= 0 ? 'text-gray-400' : 'text-[#EEB170]'}`}>
              Pay Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PaymentScreen;
