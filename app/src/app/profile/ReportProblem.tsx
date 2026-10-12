import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, StatusBar } from "react-native";
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "@/state/themeStore";

export default function ReportProblemScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const [step, setStep] = useState(1);
  const [issueType, setIssueType] = useState<string | null>(null);

  const bgColor = isDark ? '#131316' : '#E0E0E0';
  const cardBg = isDark ? '#1C1C20' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A30' : '#D5D5D5';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#A0A0A0' : '#6B7280';

  const handleSelectIssue = (type: string) => {
    setIssueType(type);
    setStep(2);
  };

  const handleSelectUrgency = () => {
    setStep(3);
  };

  const handleContactSupport = () => {
    Linking.openURL("tel:+919999999999");
  };

  const step2Options: Record<string, { title: string, options: { id: string, label: string, desc: string }[] }> = {
    'Payment / Refund Issue': {
      title: 'What specific payment issue are you facing?',
      options: [
        { id: 'p1', label: 'Money deducted but payment failed', desc: 'Amount left your account but app shows failed' },
        { id: 'p2', label: 'Did not receive refund', desc: 'Refund was promised but not received' },
        { id: 'p3', label: 'Unable to make payment', desc: 'Payment page is not loading or failing' },
      ]
    },
    'Event Registration': {
      title: 'What issue are you having with events?',
      options: [
        { id: 'e1', label: 'Cannot register for an event', desc: 'Registration button is not working or gives error' },
        { id: 'e2', label: 'Did not receive confirmation', desc: 'Registered successfully but no pass/ticket shown' },
        { id: 'e3', label: 'Event details are incorrect', desc: 'Timing, location, or rules seem wrong' },
      ]
    },
    'Account / Login': {
      title: 'What account issue are you experiencing?',
      options: [
        { id: 'a1', label: 'Cannot log in', desc: 'Authentication fails or stuck on login screen' },
        { id: 'a2', label: 'Profile details are incorrect', desc: 'Wrong college, name, or other details' },
        { id: 'a3', label: 'Cannot update information', desc: 'Profile edits are not saving' },
      ]
    },
    'App Crash / Bug': {
      title: 'What kind of bug did you find?',
      options: [
        { id: 'b1', label: 'App crashes completely', desc: 'App closes unexpectedly' },
        { id: 'b2', label: 'A specific feature is broken', desc: 'Something is not working as intended' },
        { id: 'b3', label: 'UI or Display issue', desc: 'Text cut off, images not loading, etc.' },
      ]
    },
    'Other': {
      title: 'How is this impacting you?',
      options: [
        { id: 'high', label: 'I cannot use the app at all', desc: 'Critical issue blocking usage' },
        { id: 'medium', label: 'A specific feature is broken', desc: 'Can still use other parts' },
        { id: 'low', label: 'Just a minor glitch or typo', desc: 'Not blocking anything important' },
      ]
    },
    'Accommodation': {
      title: 'What accommodation issue are you facing?',
      options: [
        { id: 'ac1', label: 'Hostel allotment issue', desc: 'Not allotted a room or wrong hostel' },
        { id: 'ac2', label: 'Room condition / facilities', desc: 'Issues with bed, fan, cleanliness, etc.' },
        { id: 'ac3', label: 'Check-in / Check-out problem', desc: 'Issues with timings or guards' },
      ]
    }
  };

  const currentStep2Data = step2Options[issueType || 'Other'] || step2Options['Other'];

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
          onPress={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              router.back();
            }
          }}
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
            REPORT A PROBLEM
          </Text>
          <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: '#41B8F0' }}>
            {step === 1 ? 'Step 1 of 3: Select Category' : step === 2 ? 'Step 2 of 3: Specific Detail' : 'Step 3 of 3: Support Contact'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <View>
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 18, marginBottom: 16, textAlign: "center" }}>
              What kind of issue are you facing?
            </Text>
            
            {[
              { id: 'payment', label: 'Payment / Refund Issue', icon: 'card-outline' },
              { id: 'event', label: 'Event Registration', icon: 'calendar-outline' },
              { id: 'account', label: 'Account / Login', icon: 'person-outline' },
              { id: 'accommodation', label: 'Accommodation', icon: 'home-outline' },
              { id: 'app', label: 'App Crash / Bug', icon: 'bug-outline' },
              { id: 'other', label: 'Other', icon: 'help-circle-outline' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
                onPress={() => handleSelectIssue(item.label)}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(65, 184, 240, 0.15)' : '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Ionicons name={item.icon as any} size={22} color="#41B8F0" />
                </View>
                <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 16, flex: 1 }}>
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={subTextColor} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && currentStep2Data && (
          <View>
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 18, marginBottom: 4, textAlign: "center" }}>
              {currentStep2Data.title}
            </Text>
            <Text style={{ fontFamily: "Poppins_500Medium", color: '#41B8F0', textAlign: "center", marginBottom: 20 }}>
              Category: {issueType}
            </Text>

            {currentStep2Data.options.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  borderRadius: 20,
                  padding: 18,
                  marginBottom: 12,
                }}
                activeOpacity={0.7}
                onPress={handleSelectUrgency}
              >
                <Text style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 16 }}>
                  {item.label}
                </Text>
                <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 13, marginTop: 4 }}>
                  {item.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 3 && (
          <View style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, borderRadius: 28, padding: 24, alignItems: "center" }}>
            <View style={{ width: 72, height: 72, backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7', borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Ionicons name="checkmark-circle" size={44} color="#22c55e" />
            </View>
            
            <Text style={{ fontFamily: "Talina", color: textColor, fontSize: 22, textAlign: "center", marginBottom: 8 }}>
              INFORMATION RECEIVED
            </Text>
            
            <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, textAlign: "center", fontSize: 14, marginBottom: 24, lineHeight: 22 }}>
              Based on your answers, we've routed this to our fast-response helpdesk team. You can reach out immediately below.
            </Text>

            <View style={{ backgroundColor: isDark ? '#26262B' : '#F3F4F6', width: '100%', borderRadius: 18, padding: 18, marginBottom: 20, alignItems: 'center' }}>
              <Text style={{ fontFamily: "Poppins_500Medium", color: subTextColor, fontSize: 12, marginBottom: 4 }}>
                Direct Helpline
              </Text>
              <Text style={{ fontFamily: "Poppins_700Bold", color: '#41B8F0', fontSize: 22 }}>
                +91 99999 99999
              </Text>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#41B8F0', width: '100%', paddingVertical: 15, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}
              onPress={handleContactSupport}
            >
              <Ionicons name="call" size={18} color="#FFFFFF" />
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: '#FFFFFF', fontSize: 16, marginLeft: 8 }}>
                Call Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ paddingVertical: 12 }}
              onPress={() => router.back()}
            >
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: subTextColor, fontSize: 14 }}>
                Return to Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
