import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  X,
  CreditCard,
  Calendar,
  Tag,
  CheckCircle,
  DollarSign,
  Users,
  MapPin,
  FileText,
} from "lucide-react-native";
import { PaymentTransaction } from "@/types/adminTypes";
import { useThemeStore } from "@/state/themeStore";

interface PaymentTransactionModalProps {
  visible: boolean;
  transaction: PaymentTransaction | null;
  loading: boolean;
  onClose: () => void;
}

const PaymentTransactionModal: React.FC<PaymentTransactionModalProps> = ({
  visible,
  transaction,
  loading,
  onClose,
}) => {
  const { isDark } = useThemeStore();
  const bgColor = isDark ? "#131316" : "#E0E0E0";
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";
  const innerBg = isDark ? "#26262B" : "#F3F4F6";

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const formatAmount = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const DetailRow = ({
    icon,
    label,
    value,
    valueColor,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    valueColor?: string;
  }) => (
    <View style={{ borderBottomWidth: 1, borderBottomColor: cardBorder }} className="flex-row items-start py-3">
      <View className="mr-3 mt-0.5">{icon}</View>
      <View className="flex-1">
        <Text
          style={{ fontFamily: "Poppins_500Medium", color: textSecondary, fontSize: 12, marginBottom: 2 }}
        >
          {label}
        </Text>
        <Text
          style={{ fontFamily: "Poppins_600SemiBold", color: valueColor || textPrimary, fontSize: 14 }}
          selectable
        >
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        {/* Header */}
        <View
          style={{ backgroundColor: "#41B8F0" }}
          className="pt-12 pb-6 px-6 flex-row rounded-b-2xl items-center justify-between shadow-sm"
        >
          <View className="flex-1">
            <Text
              style={{ fontFamily: "Poppins_700Bold", color: "#FFFFFF", fontSize: 20 }}
            >
              Payment Details
            </Text>
            {transaction && (
              <Text
                style={{ fontFamily: "Poppins_500Medium", color: "#FFFFFF", fontSize: 12, opacity: 0.9, marginTop: 2 }}
              >
                {transaction.merchantOrderId}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="ml-4 p-2 rounded-full bg-white/20"
            activeOpacity={0.7}
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#41B8F0" />
            <Text style={{ fontFamily: "Poppins_500Medium", color: textSecondary, marginTop: 12 }}>
              Loading transaction...
            </Text>
          </View>
        ) : !transaction ? (
          <View className="flex-1 items-center justify-center px-6">
            <FileText size={56} color={textSecondary} />
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, textAlign: "center", marginTop: 16, fontSize: 16 }}>
              No payment transaction found
            </Text>
            <Text style={{ fontFamily: "Poppins_400Regular", color: textSecondary, textAlign: "center", marginTop: 8, fontSize: 13 }}>
              This registration may not have a completed payment or the payment status is not "completed"
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 50 }}
          >
            {/* Status Section */}
            <View
              style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
              className="mx-4 mt-4 rounded-2xl p-5 shadow-sm"
            >
              <View className="flex-row items-center justify-center mb-4">
                <CheckCircle size={22} color="#10B981" />
                <Text
                  style={{ fontFamily: "Poppins_700Bold", color: "#10B981", fontSize: 16, marginLeft: 8 }}
                >
                  PAYMENT SUCCESS
                </Text>
              </View>

              {/* Amount Breakdown */}
              <View
                style={{ backgroundColor: innerBg, borderColor: cardBorder, borderWidth: 1 }}
                className="rounded-xl p-4"
              >
                <Text
                  style={{ fontFamily: "Poppins_700Bold", color: textPrimary, textAlign: "center", fontSize: 28, marginBottom: 4 }}
                >
                  {formatAmount(transaction.finalAmount)}
                </Text>

                {transaction.originalAmount !== transaction.finalAmount && (
                  <View className="items-center">
                    <Text
                      style={{ fontFamily: "Poppins_400Regular", color: textSecondary, fontSize: 14, textDecorationLine: "line-through" }}
                    >
                      {formatAmount(transaction.originalAmount)}
                    </Text>
                    {transaction.discountAmount > 0 && (
                      <Text
                        style={{ fontFamily: "Poppins_600SemiBold", color: "#10B981", fontSize: 14, marginTop: 2 }}
                      >
                        Discount: -{formatAmount(transaction.discountAmount)}
                      </Text>
                    )}
                  </View>
                )}

                {transaction.transactionFees > 0 && (
                  <Text
                    style={{ fontFamily: "Poppins_400Regular", color: textSecondary, textAlign: "center", fontSize: 12, marginTop: 4 }}
                  >
                    Transaction Fees: +{formatAmount(transaction.transactionFees)}
                  </Text>
                )}
              </View>
            </View>

            {/* Basic Transaction Details */}
            <View
              style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
              className="mx-4 mt-4 rounded-2xl p-5 shadow-sm"
            >
              <Text
                style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 15, marginBottom: 8 }}
              >
                Transaction Information
              </Text>

              <DetailRow
                icon={<CreditCard size={17} color="#41B8F0" />}
                label="Merchant Order ID"
                value={transaction.merchantOrderId}
              />

              <DetailRow
                icon={<Tag size={17} color={textSecondary} />}
                label="Transaction ID"
                value={transaction.id}
              />

              <DetailRow
                icon={<DollarSign size={17} color={textSecondary} />}
                label="Payment Type"
                value={transaction.paymentType.toUpperCase()}
              />

              <DetailRow
                icon={<Calendar size={17} color={textSecondary} />}
                label="Created At"
                value={formatDate(transaction.createdAt)}
              />

              {transaction.completedAt && (
                <DetailRow
                  icon={<Calendar size={17} color="#10B981" />}
                  label="Completed At"
                  value={formatDate(transaction.completedAt)}
                />
              )}
            </View>

            {/* Event Registration Details */}
            {transaction.processedIntentions?.eventRegistration && (
              <View
                style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                className="mx-4 mt-4 rounded-2xl p-5 shadow-sm"
              >
                <Text
                  style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 15, marginBottom: 8 }}
                >
                  Event Registration
                </Text>

                <DetailRow
                  icon={<MapPin size={17} color="#41B8F0" />}
                  label="Event ID"
                  value={transaction.processedIntentions.eventRegistration.eventId}
                />

                <DetailRow
                  icon={<Users size={17} color={textSecondary} />}
                  label="Event Type"
                  value={transaction.processedIntentions.eventRegistration.eventType.toUpperCase()}
                />

                {transaction.processedIntentions.eventRegistration.teamName && (
                  <DetailRow
                    icon={<Users size={17} color="#41B8F0" />}
                    label="Team Name"
                    value={
                      transaction.processedIntentions.eventRegistration.teamName
                    }
                  />
                )}

                {transaction.processedIntentions.eventRegistration.teamId && (
                  <DetailRow
                    icon={<Tag size={17} color={textSecondary} />}
                    label="Team ID"
                    value={transaction.processedIntentions.eventRegistration.teamId}
                  />
                )}

                <DetailRow
                  icon={<DollarSign size={17} color={textSecondary} />}
                  label="Registration Amount"
                  value={formatAmount(
                    transaction.processedIntentions.eventRegistration.amount
                  )}
                />
              </View>
            )}

            {/* Accommodation Details */}
            {transaction.processedIntentions?.accommodation && (
              <View
                style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                className="mx-4 mt-4 rounded-2xl p-5 shadow-sm"
              >
                <Text
                  style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 15, marginBottom: 8 }}
                >
                  Accommodation
                </Text>

                <DetailRow
                  icon={<DollarSign size={17} color={textSecondary} />}
                  label="Accommodation Total"
                  value={formatAmount(
                    transaction.processedIntentions.accommodation.amount || 0
                  )}
                />
              </View>
            )}

            {/* Food Details */}
            {transaction.processedIntentions?.food && (
              <View
                style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                className="mx-4 mt-4 rounded-2xl p-5 shadow-sm"
              >
                <Text
                  style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 15, marginBottom: 8 }}
                >
                  Food
                </Text>

                <DetailRow
                  icon={<DollarSign size={17} color={textSecondary} />}
                  label="Food Total"
                  value={formatAmount(
                    transaction.processedIntentions.food.amount || 0
                  )}
                />
              </View>
            )}

            {/* Coupon Details */}
            {transaction.couponCode && transaction.couponDetails && (
              <View
                style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }}
                className="mx-4 mt-4 mb-4 rounded-2xl p-5 shadow-sm"
              >
                <Text
                  style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 15, marginBottom: 8 }}
                >
                  Coupon Applied
                </Text>

                <DetailRow
                  icon={<Tag size={17} color="#10B981" />}
                  label="Coupon Code"
                  value={transaction.couponCode}
                  valueColor="#10B981"
                />

                <DetailRow
                  icon={<DollarSign size={17} color="#10B981" />}
                  label="Discount Type"
                  value={transaction.couponDetails.discountType.toUpperCase()}
                />

                <DetailRow
                  icon={<DollarSign size={17} color="#10B981" />}
                  label="Discount Value"
                  value={
                    transaction.couponDetails.discountType === "flat"
                      ? formatAmount(transaction.couponDetails.discountValue)
                      : `${transaction.couponDetails.discountValue}%`
                  }
                />
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

export default PaymentTransactionModal;
