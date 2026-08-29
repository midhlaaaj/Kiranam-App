import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const ACTIVE_COLOR = '#EC2028';
const INACTIVE_COLOR = '#9A968F';

interface ItemLayout {
  x: number;
  width: number;
}

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [layouts, setLayouts] = useState<Record<number, ItemLayout>>({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  useEffect(() => {
    const layout = layouts[state.index];
    if (layout) {
      indicatorX.value = withSpring(layout.x, { damping: 24, stiffness: 200, mass: 0.7 });
      indicatorWidth.value = withSpring(layout.width, { damping: 24, stiffness: 200, mass: 0.7 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, layouts]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  return (
    <View style={styles.tabBar}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const label = (options.title ?? route.name) as string;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLayout = (e: LayoutChangeEvent) => {
          const { x, width } = e.nativeEvent.layout;
          setLayouts((prev) => ({ ...prev, [index]: { x, width } }));
        };

        return (
          <TabBarButton
            key={route.key}
            label={label}
            isFocused={isFocused}
            onPress={onPress}
            onLayout={onLayout}
            renderIcon={(color) =>
              options.tabBarIcon
                ? options.tabBarIcon({ focused: isFocused, color, size: 20 })
                : null
            }
          />
        );
      })}
    </View>
  );
}

function TabBarButton({
  label,
  isFocused,
  onPress,
  onLayout,
  renderIcon,
}: {
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
  renderIcon: (color: string) => React.ReactNode;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    // Single source of truth for the icon animation — driven only by focus
    // changes, so it never races with a separate press-triggered animation.
    scale.value = withSpring(isFocused ? 1.1 : 1, { damping: 14, stiffness: 220, mass: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onLayout={onLayout}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.iconContainer, bounceStyle]}>
        {renderIcon(isFocused ? ACTIVE_COLOR : INACTIVE_COLOR)}
      </Animated.View>
      <Text
        style={[styles.label, isFocused && styles.labelActive]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  indicator: {
    position: 'absolute',
    height: 48,
    borderRadius: 20,
    backgroundColor: '#FDECEC',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    color: INACTIVE_COLOR,
    marginTop: 3,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  labelActive: {
    color: ACTIVE_COLOR,
  },
});
