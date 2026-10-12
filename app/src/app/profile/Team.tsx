import React, { useState, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Team } from '@/data/Team';
import { useThemeStore } from '@/state/themeStore';

const TeamMemberCard = memo(({ member, activeTab, cardBg, cardBorder, textColor, subTextColor }: { member: any, activeTab: string, cardBg: string, cardBorder: string, textColor: string, subTextColor: string }) => (
  <View style={{ width: '48%', marginBottom: 14 }}>
    <View
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        borderWidth: 1,
        borderRadius: 24,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {member.imageUrl ? (
        <Image 
          source={{ uri: member.imageUrl }} 
          style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: cardBorder }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: cardBorder, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={40} color={subTextColor} />
        </View>
      )}
      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <Text 
          style={{ fontFamily: 'Poppins_600SemiBold', color: textColor, fontSize: 15 }} 
          ellipsizeMode='tail' 
          numberOfLines={1}
        >
          {member.name}
        </Text>
        <Text 
          style={{ fontFamily: 'Poppins_500Medium', color: '#41B8F0', fontSize: 12, marginTop: 2, textAlign: 'center' }}
          numberOfLines={2}
        >
          {activeTab === 'app'
            ? member.position
            : ((member.position || '').trim()
                .split(/\s+/)
                .filter(Boolean)
                .map((w: string) => w[0])
                .join('')
                .toUpperCase() || member.position)}
        </Text>
      </View>
    </View>
  </View>
));

const TeamScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const [activeTab, setActiveTab] = useState('sat'); // 'sat' or 'app'

  const bgColor = isDark ? '#131316' : '#E0E0E0';
  const cardBg = isDark ? '#1C1C20' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A30' : '#D5D5D5';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#A0A0A0' : '#6B7280';

  const teamData = activeTab === 'sat' ? Team : [];

  const TabButton = ({ title, tabKey }: { title: string, tabKey: string }) => {
    const isSelected = activeTab === tabKey;
    return (
      <TouchableOpacity
        style={{
          flex: 1,
          alignItems: 'center',
          paddingVertical: 12,
          borderBottomWidth: 2,
          borderBottomColor: isSelected ? '#41B8F0' : 'transparent',
        }}
        onPress={() => setActiveTab(tabKey)}
      >
        <Text
          style={{
            fontFamily: isSelected ? 'Poppins_600SemiBold' : 'Poppins_500Medium',
            fontSize: 15,
            color: isSelected ? '#41B8F0' : subTextColor,
          }}
        >
          {title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <TeamMemberCard
      member={item}
      activeTab={activeTab}
      cardBg={cardBg}
      cardBorder={cardBorder}
      textColor={textColor}
      subTextColor={subTextColor}
    />
  ), [activeTab, cardBg, cardBorder, textColor, subTextColor]);

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top + 8, 44),
          paddingBottom: 16,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: bgColor,
          borderBottomWidth: 1,
          borderBottomColor: cardBorder,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: cardBorder,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontFamily: "Talina", fontSize: 24, color: textColor, letterSpacing: 0.5 }}
          >
            OUR TEAM
          </Text>
          <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: '#41B8F0' }}>
            Organizing Committee & Core Crew
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: cardBorder }}>
        <TabButton title="Saturnalia Committee" tabKey="sat" />
        <TabButton title="App Developers" tabKey="app" />
      </View>

      <FlatList
        data={teamData}
        keyExtractor={(item, index) => item.name + index}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
            <Ionicons name="code-slash-outline" size={48} color={subTextColor} />
            <Text style={{ fontFamily: 'Poppins_600SemiBold', color: textColor, fontSize: 16, marginTop: 12 }}>
              Saturnalia Dev Team
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', color: subTextColor, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              Crafted with precision for Saturnalia 2026.
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default TeamScreen;
