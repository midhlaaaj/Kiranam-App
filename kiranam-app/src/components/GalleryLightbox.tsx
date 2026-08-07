import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, FlatList, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GalleryLightboxProps {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

// Full-screen photo viewer: swipe or use the arrow buttons to move between
// photos, tap the X (or the backdrop) to close.
export function GalleryLightbox({ visible, images, initialIndex, onClose }: GalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  const goTo = (next: number) => {
    if (next < 0 || next >= images.length) return;
    setIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8} hitSlop={10}>
          <X size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {images.length > 1 && (
          <Text style={styles.counter}>{index + 1} / {images.length}</Text>
        )}

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
            <View style={styles.slide}>
              <Image source={{ uri: item }} style={styles.image} contentFit="contain" />
            </View>
          )}
        />

        {images.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft, index === 0 && styles.navButtonDisabled]}
              onPress={() => goTo(index - 1)}
              activeOpacity={0.8}
              disabled={index === 0}
              hitSlop={10}
            >
              <ChevronLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight, index === images.length - 1 && styles.navButtonDisabled]}
              onPress={() => goTo(index + 1)}
              activeOpacity={0.8}
              disabled={index === images.length - 1}
              hitSlop={10}
            >
              <ChevronRight size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
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
    top: 56,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    top: 66,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    zIndex: 10,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
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
