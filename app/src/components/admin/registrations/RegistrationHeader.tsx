import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Download } from "lucide-react-native";
import SearchBar from "../../admin/RegistrationSearchBar";
import { useThemeStore } from "@/state/themeStore";

interface RegistrationHeaderProps {
  isExporting: boolean;
  displaySearchInput: string;
  activeSearchQuery: string;
  selectedStatus: string;
  statuses: string[];
  isTeamEvent: boolean;
  registrationCount: number;
  selectedCollegeFilter: string;
  onExport: () => void;
  onSearch: (searchTerm: string) => void;
  onClearSearch: () => void;
  onStatusChange: (status: string) => void;
  onCollegeFilterChange: (filter: string) => void;
}

const getStatusText = (status: string) => {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "awaited":
      return "Awaited";
    case "pending":
      return "Pending";
    case "payment_pending":
      return "Payment Pending";
    case "rejected":
      return "Rejected";
    default:
      return "Unknown";
  }
};

export default function RegistrationHeader({
  isExporting,
  displaySearchInput,
  activeSearchQuery,
  selectedStatus,
  statuses,
  isTeamEvent,
  registrationCount,
  selectedCollegeFilter,
  onExport,
  onSearch,
  onClearSearch,
  onStatusChange,
  onCollegeFilterChange,
}: RegistrationHeaderProps) {
  const { isDark } = useThemeStore();
  const cardBg = isDark ? "#1C1C20" : "#FFFFFF";
  const cardBorder = isDark ? "#2A2A30" : "#D5D5D5";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#A0A0A0" : "#6B7280";

  const collegeFilters = ["all", "thapar", "outside"];

  return (
    <View className="p-6 pb-0">
      {/* Export Button */}
      <TouchableOpacity
        style={{ backgroundColor: "#41B8F0" }}
        className={`rounded-2xl p-4 mb-4 flex-row items-center justify-center shadow-sm ${
          isExporting ? "opacity-50" : ""
        }`}
        onPress={onExport}
        disabled={isExporting}
        activeOpacity={0.8}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Download size={20} color="#FFFFFF" />
        )}
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF", fontSize: 16, marginLeft: 8 }}>
          {isExporting ? "Exporting..." : "Export to CSV"}
        </Text>
      </TouchableOpacity>

      {/* Search and Filter */}
      <View className="mb-4">
        <SearchBar
          searchInput={displaySearchInput}
          onSearch={onSearch}
          onClear={onClearSearch}
          searchQuery={activeSearchQuery}
        />

        {/* Status Filter */}
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 13, marginBottom: 8, marginTop: 4 }}>
          Status
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2.5 mb-3">
            {statuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={{
                  backgroundColor: selectedStatus === status ? "#41B8F0" : cardBg,
                  borderColor: selectedStatus === status ? "#41B8F0" : cardBorder,
                  borderWidth: 1,
                }}
                className="px-4 py-2 rounded-full"
                onPress={() => onStatusChange(status)}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    color: selectedStatus === status ? "#FFFFFF" : textSecondary,
                    fontSize: 13,
                    textTransform: "capitalize",
                  }}
                >
                  {status === "all" ? "All" : getStatusText(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* College Filter */}
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 13, marginBottom: 8 }}>
          College
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2.5">
            {collegeFilters.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={{
                  backgroundColor: selectedCollegeFilter === filter ? "#41B8F0" : cardBg,
                  borderColor: selectedCollegeFilter === filter ? "#41B8F0" : cardBorder,
                  borderWidth: 1,
                }}
                className="px-4 py-2 rounded-full"
                onPress={() => onCollegeFilterChange(filter)}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    color: selectedCollegeFilter === filter ? "#FFFFFF" : textSecondary,
                    fontSize: 13,
                    textTransform: "capitalize",
                  }}
                >
                  {filter === "all" ? "All" : filter === "thapar" ? "Thapar" : "Outside"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Results Count */}
      {registrationCount > 0 && (
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: textPrimary, fontSize: 16, marginBottom: 12 }}>
          {isTeamEvent
            ? `${registrationCount} Team${
                registrationCount !== 1 ? "s" : ""
              } ${activeSearchQuery ? "Found" : "Loaded"}`
            : `${registrationCount} Registration${
                registrationCount !== 1 ? "s" : ""
              } ${activeSearchQuery ? "Found" : "Loaded"}`}
        </Text>
      )}
    </View>
  );
}
