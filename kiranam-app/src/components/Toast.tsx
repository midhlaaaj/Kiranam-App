import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

// A friendlier, on-brand replacement for the raw `TypeError: ...` banners
// React Native/Expo show by default for uncaught errors — same bottom
// placement users already expect, but styled like the rest of the app
// (Card's 26px radius, Button's red shadow) instead of a bare system toast.
export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 16, mass: 0.9 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(80);
      opacity.setValue(0);
    }
  }, [message, translateY, opacity]);

  if (!message) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }], opacity }]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <View style={styles.iconBadge}>
          <AlertCircle size={16} color="#FFFFFF" strokeWidth={2.5} />
        </View>
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={10} style={styles.dismissButton}>
          <X size={16} color="#B0ADA8" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F7D3D4',
    shadowColor: '#EC2028',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 4,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EC2028',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '600',
    color: '#0C0C0D',
  },
  dismissButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
