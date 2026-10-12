// src/components/admin/TransactionSearchBar.tsx
import React, { useState, useEffect } from "react";
import { View, TextInput, ActivityIndicator, TouchableOpacity } from "react-native";
import { Search, X } from "lucide-react-native";

interface TransactionSearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  loading?: boolean;
}

const TransactionSearchBar: React.FC<TransactionSearchBarProps> = React.memo(
  ({ searchTerm, onSearchChange, loading = false }) => {
    const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

    // Debounce search input
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        onSearchChange(localSearchTerm);
      }, 300);

      return () => clearTimeout(timeoutId);
    }, [localSearchTerm, onSearchChange]);

    // Update local state when prop changes
    useEffect(() => {
      setLocalSearchTerm(searchTerm);
    }, [searchTerm]);

    return (
      <View className="px-4 pt-3 pb-1">
        <View
          className="bg-white border border-[#A0B3D0] rounded-2xl px-4 py-3 flex-row items-center"
          style={{ boxShadow: '0px 2px 8px rgba(12, 53, 114, 0.06)' } as any}
        >
          <Search size={20} color="#2175C0" />
          <TextInput
            value={localSearchTerm}
            onChangeText={setLocalSearchTerm}
            placeholder="Search by Order ID, User ID, Event ID..."
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-3 text-[#0C3572] text-base"
            style={{ fontFamily: "Outfit_500Medium" }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {localSearchTerm.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setLocalSearchTerm("");
                onSearchChange("");
              }}
              className="p-1 rounded-full bg-slate-100 mr-1"
              activeOpacity={0.7}
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          )}
          {loading && (
            <ActivityIndicator size="small" color="#EEB170" className="ml-2" />
          )}
        </View>
      </View>
    );
  }
);

export default TransactionSearchBar;
