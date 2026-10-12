import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { Wrench, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/state/themeStore';

interface MaintenanceScreenProps {
  onRetry?: () => void;
}

const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onRetry }) => {
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

      {/* Maintenance Icon Frame */}
      <View
        style={{
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: isDark ? 'rgba(255, 186, 0, 0.12)' : 'rgba(255, 186, 0, 0.15)',
          borderColor: 'rgba(255, 186, 0, 0.35)',
          borderWidth: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Wrench size={42} color="#FFBA00" />
      </View>

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
        Under Maintenance
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
        We're currently fine-tuning Saturnalia '26 to bring you an extraordinary experience. Please check back in a few moments!
      </Text>

      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.8}
          style={{
            backgroundColor: '#FFBA00',
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 32,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#FFBA00',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <RefreshCw size={18} color="#000000" style={{ marginRight: 8 }} />
          <Text
            style={{
              fontFamily: 'Poppins_700Bold',
              fontSize: 14,
              color: '#000000',
              letterSpacing: 0.3,
            }}
          >
            Retry Connection
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default MaintenanceScreen;
