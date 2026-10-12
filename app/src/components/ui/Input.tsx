// src/components/ui/Input.tsx
import React, { useState } from "react";
import { View, TextInput, Text, TouchableOpacity } from "react-native";
import { useThemeStore } from "@/state/themeStore";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  className?: string;
  editable?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  disabled = false,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
  maxLength,
  multiline = false,
  numberOfLines = 1,
  leftIcon,
  rightIcon,
  onRightIconPress,
  className = "",
  editable = true,
}) => {
  const { isDark } = useThemeStore();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const bg = isDark ? "#1C1C20" : "#FFFFFF";
  const border = error
    ? "#EF4444"
    : isFocused
    ? "#41B8F0"
    : isDark
    ? "rgba(255, 255, 255, 0.14)"
    : "#D1D5DB";
  const textColor = isDark ? "#FFFFFF" : "#111827";
  const labelColor = isDark ? "#FFFFFF" : "#111827";
  const placeholderColor = isDark ? "#9CA3AF" : "#6B7280";

  return (
    <View className={`mb-4 ${className}`}>
      {label && (
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            color: labelColor,
            fontSize: 14,
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          backgroundColor: bg,
          borderWidth: 1.5,
          borderColor: border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 10 : 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.04,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        {leftIcon && (
          <Text style={{ fontSize: 16, marginRight: 8 }}>{leftIcon}</Text>
        )}

        <TextInput
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          style={{
            flex: 1,
            fontFamily: "Poppins_500Medium",
            fontSize: 14.5,
            color: textColor,
            paddingVertical: 4,
          }}
          value={value}
          onChangeText={onChangeText}
          editable={editable && !disabled}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {(rightIcon || secureTextEntry) && (
          <TouchableOpacity
            onPress={secureTextEntry ? handleTogglePassword : onRightIconPress}
            disabled={!secureTextEntry && !onRightIconPress}
            style={{ paddingLeft: 8 }}
          >
            <Text style={{ fontSize: 16 }}>
              {secureTextEntry ? (showPassword ? "👁️" : "🙈") : rightIcon}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text
          style={{
            fontFamily: "Poppins_400Regular",
            color: "#EF4444",
            fontSize: 12,
            marginTop: 4,
            marginLeft: 2,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

export default Input;
