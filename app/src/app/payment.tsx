import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { getPaymentStatus, Payment } from '@/api/payments';
import { useUserStore } from '@/state/userStore';
import { useThemeStore } from '@/state/themeStore';

export default function PaymentReturnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ merchantOrderId?: string; status?: string }>();

  const merchantOrderId = params.merchantOrderId || '';
  const initialStatus = params.status || 'pending';

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [resolvedStatus, setResolvedStatus] = useState<string>(initialStatus);

  const bgColor = isDark ? '#131316' : '#F3F4F6';
  const cardBg = isDark ? '#1C1C22' : '#FFFFFF';
  const cardBorder = isDark ? '#2B2B34' : '#E5E7EB';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      if (!merchantOrderId) {
        setLoading(false);
        return;
      }

      try {
        let p: Payment | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            p = await getPaymentStatus(merchantOrderId);
            if (p && (p.status === 'success' || p.status === 'failure')) {
              break;
            }
          } catch (e) {
            // retry
          }
          await new Promise((r) => setTimeout(r, 1200));
        }

        if (!isMounted) return;

        if (p) {
          setPayment(p);
          setResolvedStatus(p.status);
          if (p.status === 'success') {
            await useUserStore.getState().refreshUserProfile();
            queryClient.invalidateQueries({ queryKey: ['events'] });
          }
        }
      } catch (err) {
        console.error('Error verifying payment on return:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [merchantOrderId, queryClient]);

  const eventId = payment?.processedIntentions?.eventRegistration?.eventId || payment?.eventId;
  const isSuccess = resolvedStatus === 'success';

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, paddingTop: insets.top, paddingBottom: insets.bottom, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={{ width: '100%', maxWidth: 400, backgroundColor: cardBg, borderRadius: 24, borderWidth: 1, borderColor: cardBorder, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#41B8F0" style={{ marginBottom: 20 }} />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: textPrimary, marginBottom: 8, textAlign: 'center' }}>
              Confirming Payment…
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: textSecondary, textAlign: 'center' }}>
              Please wait while we verify your transaction status.
            </Text>
          </>
        ) : isSuccess ? (
          <>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="checkmark-circle" size={44} color="#22c55e" />
            </View>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 22, color: textPrimary, marginBottom: 8, textAlign: 'center' }}>
              Payment Successful!
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: textSecondary, textAlign: 'center', marginBottom: 28 }}>
              Your registration has been confirmed. You are all set for Saturnalia 2026!
            </Text>

            {eventId ? (
              <TouchableOpacity
                onPress={() => router.replace({ pathname: '/events/MyEventDetails', params: { eventId } })}
                style={{ width: '100%', backgroundColor: '#41B8F0', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 12 }}
                activeOpacity={0.8}
              >
                <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', fontSize: 15 }}>
                  View Registration
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={() => router.replace('/profile/UserEvents')}
              style={{ width: '100%', backgroundColor: isDark ? '#2A2A32' : '#E5E7EB', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 12 }}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: 'Poppins_600SemiBold', color: textPrimary, fontSize: 15 }}>
                My Events
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              style={{ paddingVertical: 8 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: 'Poppins_500Medium', color: '#41B8F0', fontSize: 14 }}>
                Back to Home
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="close-circle" size={44} color="#ef4444" />
            </View>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 22, color: textPrimary, marginBottom: 8, textAlign: 'center' }}>
              Payment Failed
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: textSecondary, textAlign: 'center', marginBottom: 28 }}>
              Your transaction could not be processed by the payment gateway. If any amount was debited, it will be refunded automatically.
            </Text>

            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/events')}
              style={{ width: '100%', backgroundColor: '#41B8F0', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 12 }}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', fontSize: 15 }}>
                Browse Events
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              style={{ paddingVertical: 8 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: 'Poppins_500Medium', color: textSecondary, fontSize: 14 }}>
                Back to Home
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
