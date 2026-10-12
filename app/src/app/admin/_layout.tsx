import { Stack } from 'expo-router';
import { useThemeStore } from '@/state/themeStore';

export default function AdminLayout() {
  const { isDark } = useThemeStore();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: isDark ? '#131316' : '#E0E0E0' },
      }}
    />
  );
}
