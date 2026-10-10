import React, { useEffect, useRef, useState } from 'react';
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

  const [phase, setPhase] = useState<'checkout' | 'initiating' | 'opening' | 'verifying' | 'done' | 'error'>('checkout');
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

  // Lock already paid ones
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
    if (!couponCode) return;
    try {
      setCouponError('');
      const res = await validateCoupon(couponCode, eventId);
      setValidCoupon(res);
      showAlert("Success", "Coupon applied!");
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon");
      setValidCoupon(null);
    }
  };

  const calculateTotal = () => {
    let baseEventFee = 0;
    if (eventData?.event?.paymentRequired) {
      const isHost = user?.isHostCollegeStudent;
      baseEventFee = isHost ? eventData.event.registrationFee?.host || 0 : eventData.event.registrationFee?.other || 0;
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
    if (validCoupon.minCartValue > total) return 0;
    if (validCoupon.discountType === 'flat') {
      return validCoupon.discountValue > total ? total : validCoupon.discountValue;
    }
    return total * (validCoupon.discountValue / 100);
  };
  const discount = calculateDiscount();
  const finalAmount = total - discount;

  const startPayment = async () => {
    try {
      setPhase('initiating');
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
      else if (hasFood) pType = 'event_and_accommodation_and_food'; // fallback

      const res = await initiateEventPayment({
        eventId,
        teamId: teamId || undefined,
        paymentType: pType,
        couponCode: validCoupon ? validCoupon.code : undefined,
        accommodation: accToPay,
        food: foodToPay
      });

      setPhase('opening');
      const redirectUrl = 'app://events/Payment';
      const result = await WebBrowser.openAuthSessionAsync(res.paymentUrl, redirectUrl);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        setPhase('verifying');
        await pollAndFinish(res.merchantOrderId);
        return;
      }

      if (result.type === 'success' && result.url) {
        setPhase('verifying');
        const redirectedUrl = new URL(result.url);
        const statusParam = redirectedUrl.searchParams.get('status');
        const orderId = redirectedUrl.searchParams.get('merchantOrderId') || res.merchantOrderId;
        await pollAndFinish(orderId, statusParam || undefined);
        return;
      }

      setPhase('verifying');
      await pollAndFinish(res.merchantOrderId);
    } catch (err: any) {
      setPhase('error');
      setErrorMessage(err?.message || 'Failed to start payment');
    }
  };

  const pollAndFinish = async (merchantOrderId: string, knownStatus?: string) => {
    try {
      const payment = await getPaymentStatus(merchantOrderId);
      const status = payment.status;
      setPhase('done');

      if (status === 'success') {
        showAlert(
          'Payment Successful',
          'Your registration is now confirmed!',
          [{ text: 'View Registration', onPress: () => {
            queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] });
            queryClient.invalidateQueries({ queryKey: ['events', 'mine'] });
            router.dismissAll();
            router.push({ pathname: '/events/MyEventDetails', params: { eventId } });
          }}]
        );
      } else if (status === 'failure') {
        showAlert(
          'Payment Failed',
          'Your payment could not be processed. Please try again.',
          [{ text: 'Go Back', style: 'cancel', onPress: () => setPhase('checkout') }]
        );
      } else {
        showAlert(
          'Payment Pending',
          'Your payment is still processing. Check your profile shortly.',
          [{ text: 'OK', onPress: () => {
            queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] });
            queryClient.invalidateQueries({ queryKey: ['events', 'mine'] });
            router.dismissAll();
            router.push({ pathname: '/events/MyEventDetails', params: { eventId } });
          }}]
        );
      }
    } catch (err: any) {
      showAlert('Notice', 'Could not confirm payment status automatically. Please check your profile in a few minutes.');
      router.dismissAll();
      router.push({ pathname: '/events/MyEventDetails', params: { eventId } });
    }
  };

  if (eventLoading || (phase !== 'checkout' && phase !== 'done' && phase !== 'error')) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0C3572" className="mb-4" />
        <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-lg">
          {phase === 'initiating' ? 'Preparing Checkout...' : 
           phase === 'opening' ? 'Opening Payment Gateway...' : 
           phase === 'verifying' ? 'Verifying Payment...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  if (phase === 'done' || phase === 'error') {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <View className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${phase === 'done' ? 'bg-green-500' : 'bg-red-500'}`}>
          <Ionicons name={phase === 'done' ? "checkmark" : "close"} size={40} color="white" />
        </View>
        <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#0C3572] text-xl text-center mb-2">
          {phase === 'done' ? 'Payment Processed' : 'Payment Failed'}
        </Text>
        {phase === 'error' && (
          <TouchableOpacity onPress={() => setPhase('checkout')} className="bg-[#0C3572] px-8 py-3 rounded-xl mt-6">
            <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-white">Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center space-x-4 px-6 pt-14 pb-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-[#F2F5F8]">
          <Ionicons name="arrow-back" size={20} color="#0C3572" />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-2xl">
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
            Registration Fee
          </Text>
          <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#0C3572] text-3xl">
            ₹{eventData?.event?.paymentRequired ? (user?.isHostCollegeStudent ? eventData.event.registrationFee?.host : eventData.event.registrationFee?.other) : 0}
          </Text>
        </View>
        
        {/* Accommodation Section */}
        <View className="mb-4">
          <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-xl mb-1">
            Stay & Food
          </Text>
          <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-sm mb-4">
            Add accommodation (₹{ACCOMMODATION_PRICE}/day) or food (₹{FOOD_PRICE}/day) to your registration.
          </Text>

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
                    <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-xs">Campus Hostel</Text>
                  </View>
                  {accLocked ? (
                    <View className="bg-green-100 px-3 py-1 rounded-full">
                      <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-green-700 text-xs">Paid</Text>
                    </View>
                  ) : (
                    <Switch value={accommodation[day]} onValueChange={() => toggleAcc(day)} thumbColor={accommodation[day] ? '#0C3572' : '#f4f3f4'} trackColor={{ true: '#EEB170', false: '#d1d5db' }} />
                  )}
                </View>

                <View className="flex-row justify-between items-center">
                  <View>
                    <Text style={{ fontFamily: 'Outfit_500Medium' }} className="text-[#0C3572]">Meals</Text>
                    <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-xs">3 Meals Included</Text>
                  </View>
                  {foodLocked ? (
                    <View className="bg-green-100 px-3 py-1 rounded-full">
                      <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-green-700 text-xs">Paid</Text>
                    </View>
                  ) : (
                    <Switch value={food[day]} onValueChange={() => toggleFood(day)} thumbColor={food[day] ? '#0C3572' : '#f4f3f4'} trackColor={{ true: '#EEB170', false: '#d1d5db' }} />
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
          <View className="flex-row space-x-3">
            <TextInput
              value={couponCode}
              onChangeText={setCouponCode}
              placeholder="Enter code"
              placeholderTextColor="#A0ABC0"
              autoCapitalize="characters"
              className="flex-1 bg-[#F2F5F8] px-4 py-3 rounded-xl border border-gray-100 text-[#0C3572]"
              style={{ fontFamily: 'Outfit_500Medium' }}
            />
            <TouchableOpacity 
              onPress={handleApplyCoupon} 
              className="bg-[#0C3572] px-6 justify-center rounded-xl"
            >
              <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#EEB170]">Apply</Text>
            </TouchableOpacity>
          </View>
          {couponError ? (
            <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-red-500 mt-2 text-xs">
              {couponError}
            </Text>
          ) : null}
          {validCoupon ? (
            <View className="flex-row items-center mt-3 bg-green-50 p-2 rounded-lg">
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-green-700 ml-2 text-sm">
                Coupon applied: -₹{discount.toFixed(2)}
              </Text>
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
            disabled={finalAmount === 0}
            className={`px-10 py-4 rounded-xl flex-row items-center ${finalAmount === 0 ? 'bg-gray-200' : 'bg-[#0C3572]'}`}
          >
            <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className={`text-lg ${finalAmount === 0 ? 'text-gray-400' : 'text-[#EEB170]'}`}>
              Pay Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PaymentScreen;
