import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, LayoutChangeEvent } from 'react-native';

const CONTAINER_PADDING = 3;

interface SegmentedToggleProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

// Two/three-way pill toggle (Active/Completed, Upcoming/Past, …) with a
// sliding black indicator instead of the background snapping instantly
// between segments.
export function SegmentedToggle<T extends string>({ options, value, onChange }: SegmentedToggleProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const segmentWidth = containerWidth > 0 ? (containerWidth - CONTAINER_PADDING * 2) / options.length : 0;

  useEffect(() => {
    if (!segmentWidth) return;
    Animated.timing(translateX, {
      toValue: activeIndex * segmentWidth,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, segmentWidth, translateX]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            { width: segmentWidth, transform: [{ translateX }] },
          ]}
        />
      )}
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={styles.segment}
          onPress={() => onChange(option.value)}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, value === option.value ? styles.segmentTextActive : null]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F4F2EF',
    borderRadius: 24,
    padding: CONTAINER_PADDING,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  indicator: {
    position: 'absolute',
    top: CONTAINER_PADDING,
    bottom: CONTAINER_PADDING,
    left: CONTAINER_PADDING,
    backgroundColor: '#0C0C0D',
    borderRadius: 21,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 21,
  },
  segmentText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#7A756E',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
});
