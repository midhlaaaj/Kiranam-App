import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'white' | 'dark' | 'grey';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'white' }) => {
  const getCardStyle = () => {
    switch (variant) {
      case 'dark':
        return styles.darkCard;
      case 'grey':
        return styles.greyCard;
      case 'white':
      default:
        return styles.whiteCard;
    }
  };

  return <View style={[styles.baseCard, getCardStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: 26,
    padding: 16,
  },
  whiteCard: {
    backgroundColor: '#FFFFFF',
    // iOS Shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    // Android Shadow
    elevation: 2,
  },
  darkCard: {
    backgroundColor: '#0C0C0D',
  },
  greyCard: {
    backgroundColor: '#F9F8F6',
  },
});
