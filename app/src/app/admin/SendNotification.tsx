// src/screens/Admin/SendNotification.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { showAlert } from '@/components';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { Ionicons } from '@expo/vector-icons';
import { ArrowLeft, Bell, Send, TestTube } from 'lucide-react-native';
import { getToken } from '@/api/auth';
import { API_BASE_URL } from '@/config/api';
import { useThemeStore } from '@/state/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SendNotification = () => {
  const navigation = useAdminNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState('all');
  const [sending, setSending] = useState(false);

  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";

  const NOTIFICATION_API = `${API_BASE_URL}/admin/notifications`;

  const handleSendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      showAlert('Error', 'Please enter both title and message');
      return;
    }
    const token = await getToken();

    showAlert(
      'Send Notification',
      `Send notification to ${topic === 'all' ? 'all users' : `topic: ${topic}`}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setSending(true);

              const notificationData = {
                audience: topic,
                title: title.trim(),
                body: body.trim(),
              };

              setTimeout(async () => {
                try {
                  const response = await fetch(NOTIFICATION_API, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(notificationData),
                  });

                  const responseData = await response.json();

                  if (response.ok) {
                    showAlert('Success', responseData.message || 'Notification sent successfully!');
                    setTitle('');
                    setBody('');
                    setTopic('all');
                  } else {
                    throw new Error(responseData.message || 'Failed to send notification');
                  }
                } catch (error: any) {
                  showAlert('Error', error.message || 'Failed to send notification. Please try again.');
                } finally {
                  setSending(false);
                }
              }, 1000);

            } catch (error: any) {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    if (!title.trim() || !body.trim()) {
      showAlert('Error', 'Please enter both title and message to test');
      return;
    }

    try {
      showAlert(
        'Test Notification',
        `Title: ${title}\nMessage: ${body}\nAudience: ${topic}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      showAlert('Error', 'Failed to test notification');
    }
  };

  const topicOptions = [
    { label: 'All Users', value: 'all', description: 'Sends to all registered app users' },
    { label: 'Host College Students', value: 'host', description: 'Sends only to host college students' },
    { label: 'Visiting Students', value: 'outside', description: 'Sends to outside participants only' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: cardBorder,
          backgroundColor: bgColor,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate("Dashboard")}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Talina",
              fontSize: 22,
              color: textPrimary,
              letterSpacing: 0.5,
            }}
          >
            Push Notifications
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              fontSize: 12,
              color: "#41B8F0",
              marginTop: 1,
            }}
          >
            Send broadcast messages to users
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Title */}
        <View style={{ marginBottom: 18 }}>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              color: textPrimary,
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            Notification Title
          </Text>
          <TextInput
            style={{
              backgroundColor: cardBg,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: textPrimary,
              borderWidth: 1,
              borderColor: cardBorder,
              fontFamily: "Poppins_500Medium",
              fontSize: 14,
            }}
            placeholder="Enter notification title..."
            placeholderTextColor={textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              color: textSecondary,
              fontSize: 11,
              marginTop: 4,
            }}
          >
            {title.length}/100 characters
          </Text>
        </View>

        {/* Notification Body */}
        <View style={{ marginBottom: 18 }}>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              color: textPrimary,
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            Message
          </Text>
          <TextInput
            style={{
              backgroundColor: cardBg,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: textPrimary,
              borderWidth: 1,
              borderColor: cardBorder,
              fontFamily: "Poppins_400Regular",
              fontSize: 14,
              minHeight: 110,
              textAlignVertical: "top",
            }}
            placeholder="Enter notification message..."
            placeholderTextColor={textSecondary}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={4}
            maxLength={300}
          />
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              color: textSecondary,
              fontSize: 11,
              marginTop: 4,
            }}
          >
            {body.length}/300 characters
          </Text>
        </View>

        {/* Topic Selection */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              color: textPrimary,
              fontSize: 14,
              marginBottom: 10,
            }}
          >
            Send To
          </Text>
          {topicOptions.map((option) => {
            const isSelected = topic === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 10,
                  backgroundColor: isSelected
                    ? (isDark ? "rgba(65, 184, 240, 0.15)" : "#E0F2FE")
                    : cardBg,
                  borderWidth: 1,
                  borderColor: isSelected ? "#41B8F0" : cardBorder,
                }}
                onPress={() => setTopic(option.value)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isSelected ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={isSelected ? "#41B8F0" : textSecondary}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      color: isSelected ? "#41B8F0" : textPrimary,
                      fontSize: 14,
                    }}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      color: textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Preview Card */}
        {(title.trim() || body.trim()) && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: textPrimary,
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              Preview
            </Text>
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: cardBorder,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#41B8F020",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Bell size={18} color="#41B8F0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      color: textPrimary,
                      fontSize: 15,
                      marginBottom: 2,
                    }}
                  >
                    {title || "Notification Title"}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      color: textSecondary,
                      fontSize: 13,
                      lineHeight: 18,
                    }}
                  >
                    {body || "Notification message will appear here..."}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      color: textSecondary,
                      fontSize: 10,
                      marginTop: 6,
                    }}
                  >
                    Just now
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            style={{
              backgroundColor: isDark ? "rgba(65, 184, 240, 0.15)" : "#E0F2FE",
              borderWidth: 1,
              borderColor: "#41B8F0",
              borderRadius: 14,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: !title.trim() || !body.trim() ? 0.5 : 1,
            }}
            onPress={handleTestNotification}
            disabled={!title.trim() || !body.trim()}
            activeOpacity={0.8}
          >
            <TestTube size={18} color="#41B8F0" />
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: "#41B8F0",
                marginLeft: 8,
                fontSize: 14,
              }}
            >
              Test Preview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: "#41B8F0",
              borderRadius: 14,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: sending || !title.trim() || !body.trim() ? 0.5 : 1,
            }}
            onPress={handleSendNotification}
            disabled={sending || !title.trim() || !body.trim()}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Send size={18} color="#FFFFFF" />
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    color: "#FFFFFF",
                    marginLeft: 8,
                    fontSize: 14,
                  }}
                >
                  Send Broadcast Notification
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default SendNotification;
