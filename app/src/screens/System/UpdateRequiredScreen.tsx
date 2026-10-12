import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { ArrowUpCircle, ExternalLink } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/state/themeStore';

interface UpdateRequiredScreenProps {
  currentVersion: string;
  requiredVersion: string;
  updateUrl?: string;
  isOptional?: boolean;
}

const UpdateRequiredScreen: React.FC<UpdateRequiredScreenProps> = ({
  currentVersion,
  requiredVersion,
  updateUrl,
}) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();

  const bgColor = isDark ? '#131316' : '#F8FAFC';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';

  const handleUpdate = () => {
    if (updateUrl) {
      Linking.openURL(updateUrl);
    }
  };

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

      {/* Update Icon Frame */}
      <View
        style={{
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.15)',
          borderColor: 'rgba(56, 189, 248, 0.35)',
          borderWidth: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <ArrowUpCircle size={44} color="#38BDF8" />
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
        Update Required
      </Text>

      <Text
        style={{
          fontFamily: 'Poppins_400Regular',
          fontSize: 14,
          lineHeight: 22,
          color: textSecondary,
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        A fresh update is ready for Saturnalia '26! Version{' '}
        <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#38BDF8' }}>{requiredVersion}</Text> brings crucial
        improvements and is required to continue.
      </Text>

      <View
        style={{
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          borderWidth: 1,
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 16,
          marginBottom: 32,
        }}
      >
        <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 12, color: textSecondary }}>
          Current version: {currentVersion} → Required: {requiredVersion}
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleUpdate}
        activeOpacity={0.8}
        style={{
          backgroundColor: '#38BDF8',
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 36,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#38BDF8',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Text
          style={{
            fontFamily: 'Poppins_700Bold',
            fontSize: 14,
            color: '#000000',
            letterSpacing: 0.3,
            marginRight: 8,
          }}
        >
          Update Now
        </Text>
        <ExternalLink size={16} color="#000000" />
      </TouchableOpacity>
    </View>
  );
};

export default UpdateRequiredScreen;
