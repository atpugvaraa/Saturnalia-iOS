import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/state/userStore';
import { initiateEventPayment, getPaymentStatus, validateCoupon, CouponResponse } from '@/api/payments';
import { showAlert } from '@/components';
import * as WebBrowser from 'expo-web-browser';
import Header from "@/components/layout/Header";

const ACCOMMODATION_PRICE = 300;
const FOOD_PRICE = 200;

interface DayInfo {
  key: string;
  title: string;
  date: string;
}

const FESTIVAL_DAYS: DayInfo[] = [
  { key: 'day0', title: 'Day 0', date: 'Pre-Fest / Arrival Day' },
  { key: 'day1', title: 'Day 1', date: 'Festival Day 1' },
  { key: 'day2', title: 'Day 2', date: 'Festival Day 2' },
  { key: 'day3', title: 'Day 3', date: 'Festival Day 3' },
  { key: 'day4', title: 'Day 4', date: 'Festival Day 4 / Departure' },
];

export default function AccommodationScreen() {
  const router = useRouter();
  const { userData: user, refreshUserProfile } = useUserStore();

  const [phase, setPhase] = useState<'select' | 'initiating' | 'opening' | 'verifying'>('select');
  const [selectedAcc, setSelectedAcc] = useState<Record<string, boolean>>({
    day0: false, day1: false, day2: false, day3: false, day4: false,
  });
  const [selectedFood, setSelectedFood] = useState<Record<string, boolean>>({
    day0: false, day1: false, day2: false, day3: false, day4: false,
  });

  const [couponCode, setCouponCode] = useState('');
  const [validCoupon, setValidCoupon] = useState<CouponResponse | null>(null);
  const [couponError, setCouponError] = useState('');

  // Refresh profile on mount to ensure accommodation and food states are fresh
  useFocusEffect(
    useCallback(() => {
      refreshUserProfile().catch(() => {});
    }, [refreshUserProfile])
  );

  // Sync state with user's already owned days
  useEffect(() => {
    if (user?.accommodation) {
      setSelectedAcc(prev => ({ ...prev, ...user.accommodation }));
    }
    if (user?.food) {
      setSelectedFood(prev => ({ ...prev, ...user.food }));
    }
  }, [user]);

  const toggleAcc = (day: string) => {
    if (user?.accommodation?.[day]) return;
    setSelectedAcc(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const toggleFood = (day: string) => {
    if (user?.food?.[day]) return;
    setSelectedFood(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const handleApplyCoupon = async () => {
    const trimmed = couponCode.trim().toUpperCase();
    if (!trimmed) return;
    try {
      setCouponError('');
      const res = await validateCoupon(trimmed, "");
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

  // Calculate fees only for newly selected (not yet owned) days
  const calculateTotal = () => {
    let total = 0;
    Object.entries(selectedAcc).forEach(([day, selected]) => {
      if (selected && !user?.accommodation?.[day]) total += ACCOMMODATION_PRICE;
    });
    Object.entries(selectedFood).forEach(([day, selected]) => {
      if (selected && !user?.food?.[day]) total += FOOD_PRICE;
    });
    return total;
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
        // intermediate network retry
      }
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    return await getPaymentStatus(merchantOrderId);
  };

  const handlePay = async () => {
    if (total === 0) {
      showAlert("No changes", "You have not selected any new accommodation or meal days to purchase.");
      return;
    }

    try {
      setPhase('initiating');

      const accToPay: Record<string, boolean> = {};
      const foodToPay: Record<string, boolean> = {};

      Object.entries(selectedAcc).forEach(([day, selected]) => {
        if (selected && !user?.accommodation?.[day]) accToPay[day] = true;
      });
      Object.entries(selectedFood).forEach(([day, selected]) => {
        if (selected && !user?.food?.[day]) foodToPay[day] = true;
      });

      let pType = 'accommodation';
      const hasAcc = Object.keys(accToPay).length > 0;
      const hasFood = Object.keys(foodToPay).length > 0;
      if (hasAcc && hasFood) {
        pType = 'accommodation_and_food';
      } else if (hasFood) {
        pType = 'accommodation_and_food';
      }

      let appliedCoupon: string | undefined = undefined;
      if (validCoupon) {
        if (validCoupon.minCartValue && total < validCoupon.minCartValue) {
          showAlert(
            "Coupon Condition Not Met",
            `Coupon "${validCoupon.code}" requires a minimum cart value of ₹${validCoupon.minCartValue}. Please select more options or remove the coupon.`
          );
          setPhase('select');
          return;
        }
        appliedCoupon = validCoupon.code;
      }

      const res = await initiateEventPayment({
        eventId: "",
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
      const payment = await pollPaymentStatusWithRetry(orderId);
      const status = payment?.status || urlStatus || 'pending';

      if (status === 'success') {
        await refreshUserProfile();
        handleRemoveCoupon();
        setPhase('select');
        showAlert(
          "Accommodation Confirmed!",
          "Your stay and meal pass have been booked successfully and updated in your profile."
        );
      } else if (status === 'failure') {
        setPhase('select');
        showAlert(
          "Payment Failed",
          "Your payment could not be processed by the gateway. Please try again."
        );
      } else {
        setPhase('select');
        if (browserResultType === 'cancel' || browserResultType === 'dismiss') {
          showAlert(
            "Payment Incomplete",
            "The payment window was closed before completion. If your payment was deducted, it will update shortly; otherwise you can try again."
          );
        } else {
          showAlert(
            "Payment Processing",
            "Your payment is still being processed. Please refresh your profile shortly."
          );
        }
      }
    } catch (err: any) {
      setPhase('select');
      showAlert("Payment Error", err.message || "Failed to initiate payment");
    }
  };

  const bookedDaysList = FESTIVAL_DAYS.filter(
    d => user?.accommodation?.[d.key] || user?.food?.[d.key]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#transparent" }}>
      <Header />
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Bar */}
        <View className="flex-row items-center space-x-3 mb-4 mt-2">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="#0C3572" />
          </TouchableOpacity>
          <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#0C3572] text-2xl ml-2">
            Accommodation & Meals
          </Text>
        </View>

        {/* Existing Booking Summary Card */}
        {bookedDaysList.length > 0 ? (
          <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl mb-6 shadow-sm">
            <View className="flex-row items-center mb-2">
              <Ionicons name="checkmark-done-circle" size={22} color="#059669" />
              <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-emerald-800 text-base ml-2">
                Active Campus Pass
              </Text>
            </View>
            <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-emerald-700 text-xs mb-3 leading-5">
              Hostel room keys and meal verification will be issued at the hospitality desk.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {bookedDaysList.map(d => (
                <View key={d.key} className="bg-white px-3 py-1.5 rounded-xl border border-emerald-300 flex-row items-center">
                  <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-emerald-800 text-xs">
                    {d.title}: {user?.accommodation?.[d.key] ? "Hostel" : ""}{user?.accommodation?.[d.key] && user?.food?.[d.key] ? " + " : ""}{user?.food?.[d.key] ? "Meals" : ""}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className="bg-blue-50 border border-blue-200 p-4 rounded-2xl mb-6 shadow-sm">
            <View className="flex-row items-center mb-1">
              <Ionicons name="information-circle" size={20} color="#2175C0" />
              <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-base ml-2">
                Campus Stay & Dining
              </Text>
            </View>
            <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-xs leading-5">
              Select the festival days you need campus hostel accommodation (₹{ACCOMMODATION_PRICE}/day) and 3 meals/day food pass (₹{FOOD_PRICE}/day). Previously booked days are locked and preserved.
            </Text>
          </View>
        )}

        {/* Day by Day Cards */}
        {FESTIVAL_DAYS.map((day) => {
          const accLocked = user?.accommodation?.[day.key] || false;
          const foodLocked = user?.food?.[day.key] || false;

          return (
            <View key={day.key} className="mb-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <View className="flex-row justify-between items-center mb-3">
                <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#0C3572] text-lg">
                  {day.title}
                </Text>
                <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-xs">
                  {day.date}
                </Text>
              </View>

              {/* Accommodation Option */}
              <View className="flex-row justify-between items-center py-2.5 border-b border-gray-100">
                <View className="flex-1 pr-4">
                  <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-sm">
                    Hostel Stay
                  </Text>
                  <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-xs">
                    Campus hostel room (₹{ACCOMMODATION_PRICE}/day)
                  </Text>
                </View>
                {accLocked ? (
                  <View className="bg-green-100 px-3 py-1 rounded-full flex-row items-center">
                    <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                    <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-green-700 text-xs ml-1">
                      Paid
                    </Text>
                  </View>
                ) : (
                  <Switch
                    value={selectedAcc[day.key]}
                    onValueChange={() => toggleAcc(day.key)}
                    trackColor={{ false: '#d1d5db', true: '#EEB170' }}
                    thumbColor={selectedAcc[day.key] ? '#0C3572' : '#f4f3f4'}
                  />
                )}
              </View>

              {/* Food Option */}
              <View className="flex-row justify-between items-center py-2.5 pt-3">
                <View className="flex-1 pr-4">
                  <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-sm">
                    Meal Pass
                  </Text>
                  <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-xs">
                    3 fresh meals included (₹{FOOD_PRICE}/day)
                  </Text>
                </View>
                {foodLocked ? (
                  <View className="bg-green-100 px-3 py-1 rounded-full flex-row items-center">
                    <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                    <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-green-700 text-xs ml-1">
                      Paid
                    </Text>
                  </View>
                ) : (
                  <Switch
                    value={selectedFood[day.key]}
                    onValueChange={() => toggleFood(day.key)}
                    trackColor={{ false: '#d1d5db', true: '#EEB170' }}
                    thumbColor={selectedFood[day.key] ? '#0C3572' : '#f4f3f4'}
                  />
                )}
              </View>
            </View>
          );
        })}

        {/* Promo Code Card */}
        <View className="bg-white border border-gray-100 p-5 rounded-2xl mb-6 shadow-sm">
          <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] mb-3">
            Have a promo code?
          </Text>
          <View className="flex-row space-x-2 gap-2">
            <TextInput
              value={couponCode}
              onChangeText={setCouponCode}
              placeholder="Enter coupon code"
              placeholderTextColor="#A0ABC0"
              autoCapitalize="characters"
              className="flex-1 bg-[#F2F5F8] px-4 py-3 rounded-xl text-[#0C3572] border border-gray-100"
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
            <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-red-500 text-xs mt-2">
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
                  Requires minimum cart value of ₹{validCoupon.minCartValue} (current: ₹{total}).
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View className="bg-white border-t border-gray-100 px-6 py-5 flex-row justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.08)] pb-8">
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
          onPress={handlePay}
          disabled={phase !== 'select' || total === 0}
          className={`px-10 py-4 rounded-xl flex-row items-center space-x-2 ${
            total === 0 || phase !== 'select' ? 'bg-gray-200' : 'bg-[#0C3572]'
          }`}
        >
          {phase !== 'select' && (
            <ActivityIndicator color="#EEB170" size="small" style={{ marginRight: 8 }} />
          )}
          <Text
            style={{ fontFamily: 'Outfit_600SemiBold' }}
            className={`text-lg ${total === 0 || phase !== 'select' ? 'text-gray-400' : 'text-[#EEB170]'}`}
          >
            {phase === 'initiating' ? 'Initiating...' :
             phase === 'opening' ? 'Opening...' :
             phase === 'verifying' ? 'Verifying...' :
             total === 0 ? 'Select Days' : 'Pay Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
