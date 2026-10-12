// src/components/admin/TransactionCard.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  CreditCard,
  Calendar,
  User,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
} from "lucide-react-native";
import { PaymentTransaction } from "@/types/adminTypes";

interface TransactionCardProps {
  transaction: PaymentTransaction;
  onPress: (transaction: PaymentTransaction) => void;
}

const TransactionCard: React.FC<TransactionCardProps> = React.memo(
  ({ transaction, onPress }) => {
    const getStatusBadge = (status: string) => {
      switch (status.toLowerCase()) {
        case "success":
          return {
            bg: "bg-emerald-50 border-emerald-200",
            text: "text-emerald-700",
            icon: <CheckCircle size={14} color="#10B981" />,
          };
        case "failed":
        case "failure":
          return {
            bg: "bg-rose-50 border-rose-200",
            text: "text-rose-700",
            icon: <XCircle size={14} color="#EF4444" />,
          };
        case "pending":
          return {
            bg: "bg-amber-50 border-amber-200",
            text: "text-amber-700",
            icon: <Clock size={14} color="#F59E0B" />,
          };
        default:
          return {
            bg: "bg-slate-100 border-slate-200",
            text: "text-slate-600",
            icon: <Clock size={14} color="#64748B" />,
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
        className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-[#A0B3D0]/60"
        style={{ boxShadow: "0px 4px 12px 0px rgba(12, 53, 114, 0.08)" } as any}
        activeOpacity={0.7}
      >
        {/* Header Row */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-8 h-8 rounded-full bg-[#EEB170]/20 items-center justify-center mr-2">
              <CreditCard size={18} color="#EEB170" />
            </View>
            <Text
              style={{ fontFamily: "Outfit_600SemiBold" }}
              className="text-[#0C3572] text-sm flex-1"
              numberOfLines={1}
            >
              {transaction.merchantOrderId}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            className={`flex-row items-center px-2.5 py-1 rounded-full border ${badge.bg}`}
          >
            {badge.icon}
            <Text
              style={{ fontFamily: "Outfit_600SemiBold" }}
              className={`ml-1 text-xs uppercase ${badge.text}`}
            >
              {transaction.status}
            </Text>
          </View>
        </View>

        {/* Amount Row */}
        <View className="flex-row items-center justify-between mb-3 bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
          <View>
            <Text
              style={{ fontFamily: "Outfit_700Bold" }}
              className="text-[#0C3572] text-2xl"
            >
              {formatAmount(transaction.finalAmount)}
            </Text>
            {transaction.originalAmount !== transaction.finalAmount && (
              <View className="flex-row items-center mt-0.5">
                <Text
                  style={{ fontFamily: "Outfit_400Regular" }}
                  className="text-slate-400 text-xs line-through"
                >
                  {formatAmount(transaction.originalAmount)}
                </Text>
                {transaction.discountAmount > 0 && (
                  <Text
                    style={{ fontFamily: "Outfit_600SemiBold" }}
                    className="text-emerald-600 text-xs ml-2"
                  >
                    -{formatAmount(transaction.discountAmount)} off
                  </Text>
                )}
              </View>
            )}
          </View>

          <View className="items-end">
            <View className="bg-[#DBE2ED] px-2.5 py-1 rounded-lg">
              <Text
                style={{ fontFamily: "Outfit_600SemiBold" }}
                className="text-[#0C3572] text-xs uppercase"
              >
                {transaction.paymentType.replace(/_/g, " ")}
              </Text>
            </View>
            {transaction.transactionFees > 0 && (
              <Text
                style={{ fontFamily: "Outfit_400Regular" }}
                className="text-slate-400 text-xs mt-1"
              >
                +₹{transaction.transactionFees} gateway fee
              </Text>
            )}
          </View>
        </View>

        {/* Event/Team Info */}
        {transaction.processedIntentions?.eventRegistration && (
          <View className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-2.5">
            <Text
              style={{ fontFamily: "Outfit_600SemiBold" }}
              className="text-[#2175C0] text-xs uppercase tracking-wider mb-1"
            >
              Event Registration
            </Text>
            <Text
              style={{ fontFamily: "Outfit_600SemiBold" }}
              className="text-[#0C3572] text-sm"
              numberOfLines={1}
            >
              {transaction.eventId}
            </Text>
            {transaction.processedIntentions.eventRegistration.teamName && (
              <Text
                style={{ fontFamily: "Outfit_500Medium" }}
                className="text-[#2175C0] text-xs mt-0.5"
                numberOfLines={1}
              >
                Team: {transaction.processedIntentions.eventRegistration.teamName}
              </Text>
            )}
          </View>
        )}

        {/* Coupon Info */}
        {transaction.couponCode && (
          <View className="flex-row items-center bg-emerald-50 border border-emerald-200/70 rounded-lg px-2.5 py-1.5 mb-2.5">
            <Sparkles size={14} color="#059669" />
            <Text
              style={{ fontFamily: "Outfit_600SemiBold" }}
              className="text-emerald-700 text-xs ml-1.5"
            >
              Coupon Applied: {transaction.couponCode}
            </Text>
          </View>
        )}

        {/* Footer Row */}
        <View className="flex-row items-center justify-between pt-2.5 border-t border-slate-100">
          <View className="flex-row items-center flex-1 mr-2">
            <User size={13} color="#2175C0" />
            <Text
              style={{ fontFamily: "Outfit_400Regular" }}
              className="text-[#2175C0] text-xs ml-1 flex-1"
              numberOfLines={1}
            >
              {transaction.userId}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Calendar size={13} color="#94A3B8" />
            <Text
              style={{ fontFamily: "Outfit_400Regular" }}
              className="text-slate-400 text-xs ml-1"
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
