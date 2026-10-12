// src/components/layout/Header.tsx
import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Menu, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/state/userStore';
import { useThemeStore } from '@/state/themeStore';
import { useAdminDrawerStore } from '@/state/adminDrawerStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderType {
  userProfile?: any;
  setShowBottomNav?: (x: boolean) => void;
}

const Header: React.FC<HeaderType> = ({ userProfile: userProfileProp }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { openDrawer } = useAdminDrawerStore();
  const { userData } = useUserStore();

  const userProfile = userProfileProp ?? userData;
  const roles: string[] = Array.isArray(userProfile?.roles) ? userProfile.roles : [];
  const isAdmin = roles.some((r) => r !== 'user');

  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const iconColor = isDark ? "#FFFFFF" : "#111827";

  return (
    <View
      style={{
        paddingTop: insets.top + 6,
        paddingBottom: 12,
        paddingHorizontal: 20,
        backgroundColor: bgColor,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#2A2A30' : '#D5D5D5',
      }}
    >
      {/* Left button: Hamburger (admin) or back */}
      {isAdmin ? (
        <TouchableOpacity
          onPress={openDrawer}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          activeOpacity={0.7}
        >
          <Menu size={20} color="#41B8F0" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40, height: 40 }} />
      )}

      {/* Center Logo */}
      <View style={{ height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('@/assets/logo.png')}
          style={{ height: 28, width: 120 }}
          resizeMode="contain"
        />
      </View>

      {/* Right button: Notifications */}
      <TouchableOpacity
        onPress={() => router.push('/notifications')}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={0.7}
      >
        <Bell size={20} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
};

export default Header;