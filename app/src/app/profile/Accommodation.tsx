import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/state/userStore';
import { initiateEventPayment, validateCoupon, CouponResponse } from '@/api/payments';
import { showAlert } from '@/components';
import * as WebBrowser from 'expo-web-browser';
import Header from "@/components/layout/Header";

export default function AccommodationScreen() {
  const router = useRouter();
  const { userData: user } = useUserStore();
  
  const [loading, setLoading] = useState(false);
  const [accommodation, setAccommodation] = useState<Record<string, boolean>>({
    day0: false,
    day1: false,
    day2: false,
    day3: false,
    day4: false,
  });
  const [food, setFood] = useState<Record<string, boolean>>({
    day0: false,
    day1: false,
    day2: false,
    day3: false,
    day4: false,
  });

  const [couponCode, setCouponCode] = useState('');
  const [validCoupon, setValidCoupon] = useState<CouponResponse | null>(null);
  const [couponError, setCouponError] = useState('');

  const ACCOMMODATION_PRICE = 300;
  const FOOD_PRICE = 200;

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
      const res = await validateCoupon(couponCode, "");
      setValidCoupon(res);
      showAlert("Success", "Coupon applied!");
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon");
      setValidCoupon(null);
    }
  };

  const calculateTotal = () => {
    let total = 0;
    Object.entries(accommodation).forEach(([day, selected]) => {
      if (selected && !user?.accommodation?.[day]) total += ACCOMMODATION_PRICE;
    });
    Object.entries(food).forEach(([day, selected]) => {
      if (selected && !user?.food?.[day]) total += FOOD_PRICE;
    });
    return total;
  };

  const calculateDiscount = (total: number) => {
    if (!validCoupon) return 0;
    if (validCoupon.minCartValue > total) return 0;
    if (validCoupon.discountType === 'flat') {
      return validCoupon.discountValue > total ? total : validCoupon.discountValue;
    } else {
      return total * (validCoupon.discountValue / 100);
    }
  };

  const total = calculateTotal();
  const discount = calculateDiscount(total);
  const finalAmount = total - discount;

  const handlePay = async () => {
    if (total === 0) {
      showAlert("No changes", "You have not selected any new options to pay for.");
      return;
    }

    try {
      setLoading(true);
      
      const accToPay: Record<string, boolean> = {};
      const foodToPay: Record<string, boolean> = {};
      
      Object.entries(accommodation).forEach(([day, selected]) => {
        if (selected && !user?.accommodation?.[day]) accToPay[day] = true;
      });
      Object.entries(food).forEach(([day, selected]) => {
        if (selected && !user?.food?.[day]) foodToPay[day] = true;
      });

      let pType = 'accommodation';
      if (Object.keys(accToPay).length > 0 && Object.keys(foodToPay).length > 0) {
        pType = 'accommodation_and_food';
      } else if (Object.keys(foodToPay).length > 0) {
        pType = 'accommodation_and_food'; // using this for food alone too
      }

      const res = await initiateEventPayment({
        eventId: "",
        paymentType: pType,
        couponCode: validCoupon ? validCoupon.code : undefined,
        accommodation: accToPay,
        food: foodToPay
      });

      const redirectUrl = 'app://events/Payment';
      await WebBrowser.openAuthSessionAsync(res.paymentUrl, redirectUrl);
      
      showAlert("Notice", "Payment initiated. Please check My Events or refresh your profile to see changes once payment is successful.");
      router.back();
      
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#transparent" }}>
      <Header />
      <ScrollView 
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center space-x-4 mb-8 mt-2">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="#0C3572" />
          </TouchableOpacity>
          <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 26, color: '#0C3572' }}>
            Accommodation
          </Text>
        </View>
        <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] mb-6">
          Select the days you need accommodation and food. Previous payments will be locked.
        </Text>

        {['day0', 'day1', 'day2', 'day3', 'day4'].map((day) => {
          const accLocked = user?.accommodation?.[day] || false;
          const foodLocked = user?.food?.[day] || false;

          return (
            <View key={day} className="mb-6 bg-[#F2F5F8] p-4 rounded-xl border border-gray-100">
              <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] text-lg mb-4 capitalize">
                {day}
              </Text>
              
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text style={{ fontFamily: 'Outfit_500Medium' }} className="text-[#0C3572]">Accommodation</Text>
                  <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-sm">₹{ACCOMMODATION_PRICE}/day</Text>
                </View>
                {accLocked ? (
                  <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-green-600">Paid</Text>
                ) : (
                  <Switch
                    value={accommodation[day]}
                    onValueChange={() => toggleAcc(day)}
                    trackColor={{ false: '#d1d5db', true: '#EEB170' }}
                    thumbColor={accommodation[day] ? '#0C3572' : '#f4f3f4'}
                  />
                )}
              </View>

              <View className="flex-row justify-between items-center">
                <View>
                  <Text style={{ fontFamily: 'Outfit_500Medium' }} className="text-[#0C3572]">Food</Text>
                  <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-sm">₹{FOOD_PRICE}/day</Text>
                </View>
                {foodLocked ? (
                  <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-green-600">Paid</Text>
                ) : (
                  <Switch
                    value={food[day]}
                    onValueChange={() => toggleFood(day)}
                    trackColor={{ false: '#d1d5db', true: '#EEB170' }}
                    thumbColor={food[day] ? '#0C3572' : '#f4f3f4'}
                  />
                )}
              </View>
            </View>
          );
        })}

        {(total > 0 || validCoupon) && (
          <View className="bg-[#F2F5F8] border border-gray-100 p-4 rounded-xl mb-6">
            <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#0C3572] mb-2">Have a coupon code?</Text>
            <View className="flex-row space-x-2">
              <TextInput
                value={couponCode}
                onChangeText={setCouponCode}
                placeholder="Enter coupon code"
                placeholderTextColor="#A0ABC0"
                className="flex-1 bg-white px-4 py-2 rounded-xl text-[#0C3572] border border-gray-200"
                style={{ fontFamily: 'Outfit_400Regular' }}
              />
              <TouchableOpacity
                onPress={handleApplyCoupon}
                className="bg-[#0C3572] px-4 justify-center rounded-xl"
              >
                <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-[#EEB170]">Apply</Text>
              </TouchableOpacity>
            </View>
            {couponError ? <Text className="text-red-500 text-xs mt-2">{couponError}</Text> : null}
            {validCoupon ? <Text className="text-green-600 text-xs mt-2 font-bold">Coupon applied: -₹{discount.toFixed(2)}</Text> : null}
          </View>
        )}

        <View className="h-10" />
      </ScrollView>

      {/* Footer */}
      <View className="bg-white border-t border-gray-200 px-6 py-4 flex-row justify-between items-center shadow-lg pt-4 pb-8">
        <View>
          <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-[#2175C0] text-sm">Total to Pay</Text>
          <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-[#0C3572] text-2xl">
            ₹{finalAmount.toFixed(2)}
          </Text>
          {discount > 0 && (
            <Text style={{ fontFamily: 'Outfit_400Regular' }} className="text-gray-400 text-xs line-through">
              ₹{total.toFixed(2)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handlePay}
          disabled={loading || total === 0}
          className={`px-8 py-3 rounded-xl flex-row items-center space-x-2 ${
            total === 0 || loading ? 'bg-gray-300' : 'bg-[#0C3572]'
          }`}
        >
          {loading && <ActivityIndicator color="#EEB170" size="small" />}
          <Text
            style={{ fontFamily: 'Outfit_600SemiBold' }}
            className={`text-lg ${total === 0 || loading ? 'text-gray-500' : 'text-[#EEB170]'}`}
          >
            Pay Now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
