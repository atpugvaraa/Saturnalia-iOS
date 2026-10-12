import React, { memo } from "react";
import { View, TextInput } from "react-native";
import { useThemeStore } from "@/state/themeStore";

interface RegistrationSearchBarProps {
  searchInput: string; // Controlled value from parent
  onSearch: (term: string) => void; // Called on every change
  onClear: () => void; // Not used anymore but kept for compatibility
  searchQuery: string; // Not used anymore but kept for compatibility
}

const SearchBar = memo(
  ({ searchInput, onSearch }: RegistrationSearchBarProps) => {
    const { isDark } = useThemeStore();
    const bg = isDark ? "#1C1C20" : "#FFFFFF";
    const border = isDark ? "#2A2A30" : "#D5D5D5";
    const textColor = isDark ? "#FFFFFF" : "#111827";
    const placeholderColor = isDark ? "#A0A0A0" : "#9CA3AF";

    const handleTextChange = (text: string) => {
      onSearch(text);
    };

    return (
      <View className="flex-row items-center justify-center mb-4">
        <View className="flex-1">
          <TextInput
            value={searchInput}
            onChangeText={handleTextChange}
            placeholder="Search by name, email, or team name..."
            placeholderTextColor={placeholderColor}
            style={{
              backgroundColor: bg,
              borderColor: border,
              borderWidth: 1,
              color: textColor,
              fontFamily: "Poppins_400Regular",
            }}
            className="rounded-xl px-4 py-3 text-sm"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>
    );
  }
);

SearchBar.displayName = "SearchBar";

export default SearchBar;