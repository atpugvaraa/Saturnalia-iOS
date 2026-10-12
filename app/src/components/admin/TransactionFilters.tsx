// src/components/admin/TransactionFilters.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Filter, X } from "lucide-react-native";
import { TransactionFilters } from "@/types/adminTypes";

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  onClearFilters: () => void;
}

const TransactionFiltersComponent: React.FC<TransactionFiltersProps> =
  React.memo(({ filters, onFiltersChange, onClearFilters }) => {
    const statusOptions = [
      { value: "all", label: "All Status" },
      { value: "success", label: "Success" },
      { value: "failed", label: "Failed" },
      { value: "pending", label: "Pending" },
    ];

    const paymentTypeOptions = [
      { value: "all", label: "All Types" },
      { value: "event", label: "Event" },
      { value: "accommodation", label: "Accommodation" },
      { value: "food", label: "Food" },
    ];

    const dateRangeOptions = [
      { value: "all", label: "All Time" },
      { value: "today", label: "Today" },
      { value: "week", label: "Last 7 Days" },
      { value: "month", label: "Last 30 Days" },
    ];

    const hasActiveFilters =
      filters.statusFilter !== "all" ||
      filters.paymentTypeFilter !== "all" ||
      filters.dateRange !== "all";

    return (
      <View className="px-4 py-2">
        {/* Filter Header */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <Filter size={16} color="#0C3572" />
            <Text
              style={{ fontFamily: "Outfit_600SemiBold" }}
              className="text-[#0C3572] text-sm ml-1.5"
            >
              Filter Transactions
            </Text>
          </View>

          {hasActiveFilters && (
            <TouchableOpacity
              onPress={onClearFilters}
              className="flex-row items-center bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-full"
              activeOpacity={0.7}
            >
              <X size={12} color="#E11D48" />
              <Text
                style={{ fontFamily: "Outfit_500Medium" }}
                className="text-rose-600 text-xs ml-1"
              >
                Clear Filters
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter */}
        <View className="mb-2.5">
          <Text
            style={{ fontFamily: "Outfit_600SemiBold" }}
            className="text-[#2175C0] text-xs uppercase tracking-wider mb-1.5"
          >
            Status
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {statusOptions.map((option) => {
                const isSelected = filters.statusFilter === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() =>
                      onFiltersChange({
                        ...filters,
                        statusFilter: option.value as any,
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-full border ${
                      isSelected
                        ? "bg-[#0C3572] border-[#0C3572]"
                        : "bg-white/90 border-[#A0B3D0]"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{ fontFamily: "Outfit_500Medium" }}
                      className={`text-xs ${
                        isSelected ? "text-white" : "text-[#0C3572]"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Payment Type Filter */}
        <View className="mb-2.5">
          <Text
            style={{ fontFamily: "Outfit_600SemiBold" }}
            className="text-[#2175C0] text-xs uppercase tracking-wider mb-1.5"
          >
            Payment Type
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {paymentTypeOptions.map((option) => {
                const isSelected = filters.paymentTypeFilter === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() =>
                      onFiltersChange({
                        ...filters,
                        paymentTypeFilter: option.value as any,
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-full border ${
                      isSelected
                        ? "bg-[#0C3572] border-[#0C3572]"
                        : "bg-white/90 border-[#A0B3D0]"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{ fontFamily: "Outfit_500Medium" }}
                      className={`text-xs ${
                        isSelected ? "text-white" : "text-[#0C3572]"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Date Range Filter */}
        <View className="mb-1">
          <Text
            style={{ fontFamily: "Outfit_600SemiBold" }}
            className="text-[#2175C0] text-xs uppercase tracking-wider mb-1.5"
          >
            Date Range
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {dateRangeOptions.map((option) => {
                const isSelected = filters.dateRange === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() =>
                      onFiltersChange({
                        ...filters,
                        dateRange: option.value as any,
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-full border ${
                      isSelected
                        ? "bg-[#0C3572] border-[#0C3572]"
                        : "bg-white/90 border-[#A0B3D0]"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{ fontFamily: "Outfit_500Medium" }}
                      className={`text-xs ${
                        isSelected ? "text-white" : "text-[#0C3572]"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  });

export default TransactionFiltersComponent;
