import React, { useRef, useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, FlatList, useWindowDimensions, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface GalleryLightboxProps {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

// Full-screen photo viewer: swipe or use the arrow buttons to move between
// photos, tap the X (or the backdrop) to close.
export function GalleryLightbox({ visible, images, initialIndex, onClose }: GalleryLightboxProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* Modal children only mount while visible, so LightboxContent starts
          from `initialIndex` on every open without an effect to reset it. */}
      <LightboxContent images={images} initialIndex={initialIndex} onClose={onClose} />
    </Modal>
  );
}

function LightboxContent({ images, initialIndex, onClose }: Omit<GalleryLightboxProps, 'visible'>) {
  const [index, setIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<string>>(null);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const goTo = (next: number) => {
    if (next < 0 || next >= images.length) return;
    setIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  };

  return (
      <View style={styles.backdrop}>
        {/* The FlatList renders first, so it paints (and hit-tests) below
            the controls below it — with a horizontal, paging FlatList
            underneath, zIndex alone isn't reliably respected for touch
            priority on Android; sibling order is. */}
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(item, i) => `${item}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
          onMomentumScrollEnd={(e) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setIndex(next);
          }}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
              <Image source={{ uri: item }} style={styles.image} contentFit="contain" />
            </View>
          )}
        />

        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
          activeOpacity={0.8}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {images.length > 1 && (
          <Text style={[styles.counter, { top: insets.top + 22 }]}>{index + 1} / {images.length}</Text>
        )}

        {images.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft, index === 0 && styles.navButtonDisabled]}
              onPress={() => goTo(index - 1)}
              activeOpacity={0.8}
              disabled={index === 0}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Previous photo"
            >
              <ChevronLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight, index === images.length - 1 && styles.navButtonDisabled]}
              onPress={() => goTo(index + 1)}
              activeOpacity={0.8}
              disabled={index === images.length - 1}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Next photo"
            >
              <ChevronRight size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}
      </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    zIndex: 10,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonLeft: {
    left: 14,
  },
  navButtonRight: {
    right: 14,
  },
  navButtonDisabled: {
    opacity: 0.25,
  },
});
