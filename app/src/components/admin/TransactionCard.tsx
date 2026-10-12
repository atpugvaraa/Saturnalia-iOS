// src/components/admin/TransactionCard.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  CreditCard,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
} from "lucide-react-native";
import { PaymentTransaction } from "@/types/adminTypes";
import { useThemeStore } from "@/state/themeStore";

interface TransactionCardProps {
  transaction: PaymentTransaction;
  onPress: (transaction: PaymentTransaction) => void;
}

const TransactionCard: React.FC<TransactionCardProps> = React.memo(
  ({ transaction, onPress }) => {
    const { isDark } = useThemeStore();

    const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
    const cardBorder = isDark ? "#2A2A30" : "#E5E7EB";
    const textPrimary = isDark ? "#FFFFFF" : "#111827";
    const textSecondary = isDark ? "#A0A0A0" : "#6B7280";
    const subCardBg = isDark ? "rgba(255, 255, 255, 0.04)" : "#F9FAFB";

    const getStatusBadge = (status: string) => {
      switch (status.toLowerCase()) {
        case "success":
          return {
            bg: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5",
            border: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0",
            text: "#10B981",
            icon: <CheckCircle size={13} color="#10B981" />,
          };
        case "failed":
        case "failure":
          return {
            bg: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2",
            border: isDark ? "rgba(239, 68, 68, 0.3)" : "#FECACA",
            text: "#EF4444",
            icon: <XCircle size={13} color="#EF4444" />,
          };
        case "pending":
          return {
            bg: isDark ? "rgba(245, 158, 11, 0.15)" : "#FFFBEB",
            border: isDark ? "rgba(245, 158, 11, 0.3)" : "#FDE68A",
            text: "#F59E0B",
            icon: <Clock size={13} color="#F59E0B" />,
          };
        default:
          return {
            bg: isDark ? "rgba(156, 163, 175, 0.15)" : "#F3F4F6",
            border: isDark ? "rgba(156, 163, 175, 0.3)" : "#E5E7EB",
            text: textSecondary,
            icon: <Clock size={13} color={textSecondary} />,
          };
      }
    };

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "Invalid Date";
      }
    };

    const formatAmount = (amount: number) => {
      return `₹${amount.toLocaleString("en-IN")}`;
    };

    const badge = getStatusBadge(transaction.status);

    return (
      <TouchableOpacity
        onPress={() => onPress(transaction)}
        style={{
          backgroundColor: cardBg,
          borderRadius: 20,
          padding: 16,
          marginHorizontal: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: cardBorder,
        }}
        activeOpacity={0.75}
      >
        {/* Header Row */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#41B8F020",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <CreditCard size={16} color="#41B8F0" />
            </View>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: textPrimary,
                fontSize: 13,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {transaction.merchantOrderId}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              backgroundColor: badge.bg,
              borderWidth: 1,
              borderColor: badge.border,
            }}
          >
            {badge.icon}
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: badge.text,
                fontSize: 11,
                textTransform: "uppercase",
                marginLeft: 4,
              }}
            >
              {transaction.status}
            </Text>
          </View>
        </View>

        {/* Amount Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            backgroundColor: subCardBg,
            padding: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: cardBorder,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: textPrimary,
                fontSize: 20,
              }}
            >
              {formatAmount(transaction.finalAmount)}
            </Text>
            {transaction.originalAmount !== transaction.finalAmount && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                <Text
                  style={{
                    fontFamily: "Poppins_400Regular",
                    color: textSecondary,
                    fontSize: 11,
                    textDecorationLine: "line-through",
                  }}
                >
                  {formatAmount(transaction.originalAmount)}
                </Text>
                {transaction.discountAmount > 0 && (
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      color: "#10B981",
                      fontSize: 11,
                      marginLeft: 6,
                    }}
                  >
                    -{formatAmount(transaction.discountAmount)} off
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <View
              style={{
                backgroundColor: isDark ? "rgba(65, 184, 240, 0.15)" : "#E0F2FE",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  color: "#41B8F0",
                  fontSize: 11,
                  textTransform: "uppercase",
                }}
              >
                {transaction.paymentType.replace(/_/g, " ")}
              </Text>
            </View>
            {transaction.transactionFees > 0 && (
              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  color: textSecondary,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                +₹{transaction.transactionFees} fee
              </Text>
            )}
          </View>
        </View>

        {/* Event/Team Info */}
        {transaction.processedIntentions?.eventRegistration && (
          <View
            style={{
              backgroundColor: subCardBg,
              borderWidth: 1,
              borderColor: cardBorder,
              borderRadius: 12,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: "#41B8F0",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 2,
              }}
            >
              Event Registration
            </Text>
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                color: textPrimary,
                fontSize: 13,
              }}
              numberOfLines={1}
            >
              {transaction.eventId}
            </Text>
            {transaction.processedIntentions.eventRegistration.teamName && (
              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  color: textSecondary,
                  fontSize: 11,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                Team: {transaction.processedIntentions.eventRegistration.teamName}
              </Text>
            )}
          </View>
        )}

        {/* Coupon Info */}
        {transaction.couponCode && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5",
              borderWidth: 1,
              borderColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#A7F3D0",
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginBottom: 10,
            }}
          >
            <Sparkles size={13} color="#10B981" />
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                color: "#10B981",
                fontSize: 11,
                marginLeft: 6,
              }}
            >
              Coupon: {transaction.couponCode}
            </Text>
          </View>
        )}

        {/* Footer Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: cardBorder,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
            <User size={12} color="#41B8F0" />
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: textSecondary,
                fontSize: 11,
                marginLeft: 4,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {transaction.userId}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Calendar size={12} color={textSecondary} />
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                color: textSecondary,
                fontSize: 11,
                marginLeft: 4,
              }}
            >
              {formatDate(transaction.createdAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

export default TransactionCard;
