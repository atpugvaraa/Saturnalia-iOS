import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import { initiateEventPayment, getPaymentStatus } from '@/api/payments';
import { showAlert } from '@/components';

/**
 * PaymentScreen
 *
 * Route params:
 *   eventId  – required
 *   teamId   – optional (team events only)
 *
 * Flow:
 * 1. Calls /payments/initiate to get the Easebuzz checkout URL.
 * 2. Opens it with openAuthSessionAsync so the in-app browser closes
 *    automatically when Easebuzz redirects to our deep-link scheme.
 * 3. Parses the redirect URL to extract status & merchantOrderId.
 * 4. Polls /payments/:merchantOrderId once to confirm status in Firestore.
 * 5. Navigates the user to MyEventDetails with result.
 */
const PaymentScreen: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { eventId, teamId } = useLocalSearchParams<{ eventId: string; teamId?: string }>();

  const [phase, setPhase] = useState<'initiating' | 'opening' | 'verifying' | 'done' | 'error'>('initiating');
  const [errorMessage, setErrorMessage] = useState('');
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startPayment();
  }, []);

  const startPayment = async () => {
    try {
      setPhase('initiating');
      const { paymentUrl, merchantOrderId } = await initiateEventPayment(eventId, teamId || undefined);

      setPhase('opening');
      // The redirectUrl must match the app's registered scheme so that
      // openAuthSessionAsync can detect it and close the browser.
      // Our backend renders an HTML page that redirects to:
      //   app://events/Payment?status=success&merchantOrderId=SAT25-...
      const redirectUrl = 'app://events/Payment';
      const result = await WebBrowser.openAuthSessionAsync(paymentUrl, redirectUrl);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        // User closed the browser — check the actual status in case it completed.
        setPhase('verifying');
        await pollAndFinish(merchantOrderId);
        return;
      }

      if (result.type === 'success' && result.url) {
        // Parse the deep-link URL for status.
        setPhase('verifying');
        const redirectedUrl = new URL(result.url);
        const statusParam = redirectedUrl.searchParams.get('status');
        const orderId = redirectedUrl.searchParams.get('merchantOrderId') || merchantOrderId;
        await pollAndFinish(orderId, statusParam || undefined);
        return;
      }

      // Fallback: poll even if we don't recognise the result type.
      setPhase('verifying');
      await pollAndFinish(merchantOrderId);
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
          [{ text: 'View Registration', onPress: () => goToMyEvent() }]
        );
      } else if (status === 'failure') {
        showAlert(
          'Payment Failed',
          'Your payment was not completed. You can try again from the event details page.',
          [
            { text: 'Go Back', style: 'cancel', onPress: () => router.back() },
          ]
        );
      } else {
        // Still pending — let the user know
        showAlert(
          'Payment Pending',
          'We are waiting for payment confirmation. Your registration will be updated once the payment is verified.',
          [{ text: 'OK', onPress: () => goToMyEvent() }]
        );
      }
    } catch (err: any) {
      // Polling failed — show generic message
      setPhase('done');
      showAlert(
        'Payment Status Unknown',
        'We could not verify your payment status. Check your event registrations in a few minutes.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const goToMyEvent = async () => {
    // Clear the cache completely so the MyEventDetails screen is forced to show a loading
    // spinner and fetch the latest payment status from the server.
    queryClient.removeQueries({ queryKey: ['events', 'detail', eventId] });
    router.replace({ pathname: '/events/MyEventDetails', params: { eventId } });
  };

  return (
    <View className="flex-1 bg-[#DBE2ED]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-6 pt-16 pb-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#2175C0] items-center justify-center mr-4"
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text
          style={{ fontFamily: 'Outfit_700Bold' }}
          className="text-[#0C3572] text-xl"
        >
          Event Payment
        </Text>
      </View>

      {/* Body */}
      <View className="flex-1 items-center justify-center px-8">
        {(phase === 'initiating' || phase === 'opening' || phase === 'verifying') && (
          <View className="items-center">
            <View className="w-20 h-20 bg-[#0C3572] rounded-full items-center justify-center mb-6">
              <Ionicons name="card" size={36} color="#EEB170" />
            </View>
            <ActivityIndicator size="large" color="#2175C0" className="mb-4" />
            <Text
              style={{ fontFamily: 'Outfit_600SemiBold' }}
              className="text-[#0C3572] text-lg text-center mb-2"
            >
              {phase === 'initiating' && 'Preparing Payment…'}
              {phase === 'opening' && 'Opening Payment Gateway…'}
              {phase === 'verifying' && 'Verifying Payment…'}
            </Text>
            <Text
              style={{ fontFamily: 'Outfit_400Regular' }}
              className="text-[#2175C0] text-sm text-center"
            >
              {phase === 'initiating' && 'Getting your secure payment link from Easebuzz'}
              {phase === 'opening' && 'Complete your payment in the browser that just opened'}
              {phase === 'verifying' && 'Please wait while we confirm your payment status'}
            </Text>
          </View>
        )}

        {phase === 'done' && (
          <View className="items-center">
            <View className="w-20 h-20 bg-green-500 rounded-full items-center justify-center mb-6">
              <Ionicons name="checkmark" size={40} color="white" />
            </View>
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-[#0C3572] text-xl text-center mb-2"
            >
              Payment Processed
            </Text>
          </View>
        )}

        {phase === 'error' && (
          <View className="items-center">
            <View className="w-20 h-20 bg-red-500 rounded-full items-center justify-center mb-6">
              <Ionicons name="close" size={40} color="white" />
            </View>
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-[#0C3572] text-xl text-center mb-2"
            >
              Could Not Start Payment
            </Text>
            <Text
              style={{ fontFamily: 'Outfit_400Regular' }}
              className="text-[#2175C0] text-sm text-center mb-6"
            >
              {errorMessage}
            </Text>
            <TouchableOpacity
              onPress={startPayment}
              className="bg-[#0C3572] px-8 py-3 rounded-xl"
            >
              <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="text-white">
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default PaymentScreen;
