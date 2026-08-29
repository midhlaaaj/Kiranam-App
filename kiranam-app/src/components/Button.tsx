import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'dark' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  // StyleProp (not a bare ViewStyle) so callers can pass an array — e.g.
  // a base override plus a conditional variant, like a destructive button
  // that only takes its danger color once a confirmation gate is passed.
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  // `loading` intentionally does NOT fall through to the grayed-out
  // disabled style — a button that's mid-save should stay visually
  // prominent (its normal branded color) with a clearly visible spinner,
  // not fade to a pale, low-contrast gray that makes the spinner nearly
  // invisible. Only a genuinely disabled (e.g. invalid form) button grays out.
  const getButtonStyles = () => {
    if (disabled && !loading) return styles.disabledButton;
    switch (variant) {
      case 'secondary':
        return styles.secondaryButton;
      case 'dark':
        return styles.darkButton;
      case 'outline':
        return styles.outlineButton;
      case 'primary':
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyles = () => {
    if (disabled) return styles.disabledText;
    switch (variant) {
      case 'secondary':
        return styles.secondaryText;
      case 'dark':
        return styles.darkText;
      case 'outline':
        return styles.outlineText;
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.baseButton, getButtonStyles(), style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'outline' ? '#0C0C0D' : '#FFFFFF'} size="small" />
      ) : (
        <Text style={[styles.baseText, getTextStyles(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#EC2028',
    // iOS Shadow
    shadowColor: '#EC2028',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    // Android Shadow
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: '#F9F8F6',
  },
  darkButton: {
    backgroundColor: '#0C0C0D',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#E4E1DC',
  },
  disabledButton: {
    backgroundColor: '#F1EEEA',
  },
  baseText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#0C0C0D',
  },
  darkText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#0C0C0D',
  },
  disabledText: {
    color: '#C7C3BD',
  },
});
