import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Image } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/state/themeStore';

interface NoInternetScreenProps {
  onRetry?: () => void;
}

const NoInternetScreen: React.FC<NoInternetScreenProps> = ({ onRetry }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();

  const bgColor = isDark ? '#131316' : '#F8FAFC';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* No Internet Image from Assets */}
      <Image
        source={require('@/assets/noInternet.png')}
        style={{
          width: 140,
          height: 140,
          marginBottom: 24,
        }}
        resizeMode="contain"
      />

      <Text
        style={{
          fontFamily: 'Talina',
          fontSize: 26,
          color: textPrimary,
          textAlign: 'center',
          letterSpacing: 0.5,
          marginBottom: 12,
        }}
      >
        No Internet Connection
      </Text>

      <Text
        style={{
          fontFamily: 'Poppins_400Regular',
          fontSize: 14,
          lineHeight: 22,
          color: textSecondary,
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        You appear to be offline. Check your connection to access festival schedules, live updates, and tickets.
      </Text>

      {/* Retry Button */}
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.8}
          style={{
            backgroundColor: '#41B8F0',
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 36,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#41B8F0',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <RefreshCw size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text
            style={{
              fontFamily: 'Poppins_700Bold',
              fontSize: 14,
              color: '#FFFFFF',
            }}
          >
            Retry Connection
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default NoInternetScreen;
