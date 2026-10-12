import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react-native";
import { FAQ } from "@/types/models";
import { listPublicFAQs } from "@/api/faq";
import { useThemeStore } from "@/state/themeStore";

export default function FAQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const bgColor = isDark ? '#131316' : '#E0E0E0';
  const cardBg = isDark ? '#1C1C20' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A30' : '#D5D5D5';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subTextColor = isDark ? '#A0A0A0' : '#6B7280';

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      const publicFAQs = await listPublicFAQs();
      setFaqs(publicFAQs);
    } catch (error) {
      console.error("Error loading FAQs:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (faqId: string) => {
    setExpandedId(expandedId === faqId ? null : faqId);
  };

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
            FAQS
          </Text>
          <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: '#41B8F0' }}>
            Frequently Asked Questions
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
      >
        {loading ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 64 }}>
            <ActivityIndicator size="large" color="#41B8F0" />
            <Text style={{ fontFamily: "Poppins_500Medium", color: subTextColor, marginTop: 16 }}>
              Loading FAQs...
            </Text>
          </View>
        ) : faqs.length === 0 ? (
          <View
            style={{
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: cardBorder,
              borderRadius: 24,
              padding: 32,
              alignItems: "center",
              marginTop: 24,
            }}
          >
            <HelpCircle size={48} color={subTextColor} />
            <Text
              style={{ fontFamily: "Poppins_600SemiBold", color: textColor, textAlign: "center", marginTop: 16, fontSize: 16 }}
            >
              No FAQs available at the moment
            </Text>
            <Text style={{ fontFamily: "Poppins_400Regular", color: subTextColor, textAlign: "center", marginTop: 4, fontSize: 13 }}>
              Check back soon for helpful guides and information.
            </Text>
          </View>
        ) : (
          <View>
            {faqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <TouchableOpacity
                  key={faq.id}
                  onPress={() => toggleExpanded(faq.id)}
                  style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: isExpanded ? '#41B8F0' : cardBorder,
                    borderRadius: 20,
                    padding: 18,
                    marginBottom: 12,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        color: isExpanded ? '#41B8F0' : textColor,
                        fontSize: 16,
                        flex: 1,
                        marginRight: 12,
                        lineHeight: 22,
                      }}
                    >
                      {faq.question}
                    </Text>
                    <View style={{ marginTop: 2 }}>
                      {isExpanded ? (
                        <ChevronUp size={20} color="#41B8F0" />
                      ) : (
                        <ChevronDown size={20} color={subTextColor} />
                      )}
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: isDark ? '#2A2A30' : '#F3F4F6' }}>
                      <Text
                        style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 14, lineHeight: 22 }}
                      >
                        {faq.answer}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Still have questions */}
            <View
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
                borderRadius: 20,
                padding: 20,
                marginTop: 12,
                marginBottom: 20,
              }}
            >
              <Text
                style={{ fontFamily: "Poppins_600SemiBold", color: textColor, fontSize: 16, marginBottom: 6 }}
              >
                Still have questions?
              </Text>
              <Text
                style={{ fontFamily: "Poppins_400Regular", color: subTextColor, fontSize: 13, lineHeight: 20 }}
              >
                Reach out to our organizing team or submit a query through Report a Problem.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
