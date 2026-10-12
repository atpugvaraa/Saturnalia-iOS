import React from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface MetallicButtonProps {
  /** Text label displayed inside the button */
  title: string;
  /** Optional click / press handler */
  onPress?: () => void;
  /** Optional container style override */
  style?: StyleProp<ViewStyle>;
  /** Optional inner content style override */
  contentStyle?: StyleProp<ViewStyle>;
  /** Optional text style override */
  textStyle?: StyleProp<TextStyle>;
  /** Optional fixed button height (defaults to flexible pill) */
  height?: number;
  /** Corner radius (defaults to 18 for tags, 28 for large buttons) */
  borderRadius?: number;
  /** Text font size (defaults to 13) */
  fontSize?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Border stroke thickness in logical pixels (defaults to 1.5) */
  borderWidth?: number;
  /** Visual variant: standard metallic silver or amber */
  variant?: 'metallic' | 'amber';
  /** Optional custom child icon/elements */
  children?: React.ReactNode;
}

export const MetallicButton: React.FC<MetallicButtonProps> = ({
  title,
  onPress,
  style,
  contentStyle,
  textStyle,
  height,
  borderRadius = 18,
  fontSize = 13,
  disabled = false,
  borderWidth = 1.5,
  variant = 'metallic',
  children,
}) => {
  const innerRadius = Math.max(0, borderRadius - borderWidth);

  const rimColors =
    variant === 'amber'
      ? (['#FDE68A', '#F59E0B', '#B45309', '#78350F', '#451A03'] as const)
      : (['#E5E5EB', '#B0B0B8', '#5A5A62', '#2C2C30', '#141416'] as const);

  const innerColors =
    variant === 'amber'
      ? (['#2C220E', '#1F180A', '#151006'] as const)
      : (['#222225', '#1B1B1E', '#151517'] as const);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.touchable,
        {
          borderRadius,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {/* 1. Outer Metallic Gradient Rim (Simulates 135° directional specular reflection) */}
      <LinearGradient
        colors={rimColors as any}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.95, y: 0.95 }}
        style={[
          styles.outerBorder,
          {
            borderRadius,
            padding: borderWidth,
            height: height ?? undefined,
          },
        ]}
      >
        {/* 2. Recessed Dark Interior Surface */}
        <LinearGradient
          colors={innerColors as any}
          locations={[0, 0.4, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            styles.innerSurface,
            {
              borderRadius: innerRadius,
              height: height ? height - borderWidth * 2 : undefined,
            },
            contentStyle,
          ]}
        >
          {/* 3. Subtle Inner Bevel Lip (Micro-highlight along top interior edge) */}
          <View
            style={[
              styles.innerBevelHighlight,
              {
                borderRadius: innerRadius,
                left: borderRadius * 0.35,
                right: borderRadius * 0.35,
                backgroundColor:
                  variant === 'amber'
                    ? 'rgba(253, 230, 138, 0.2)'
                    : 'rgba(255, 255, 255, 0.12)',
              },
            ]}
          />

          {/* 4. Content Row: Title Text & Optional Children */}
          <View style={styles.contentRow}>
            {children}
            <Text
              style={[
                styles.label,
                { fontSize },
                variant === 'amber' && { color: '#FDE68A' },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        </LinearGradient>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  touchable: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  outerBorder: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerSurface: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerBevelHighlight: {
    position: 'absolute',
    top: 0.5,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: {
    fontFamily: 'Poppins_500Medium',
    color: '#FAFAFA',
    letterSpacing: 0.25,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default MetallicButton;
