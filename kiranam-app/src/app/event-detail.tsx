import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { GalleryLightbox } from '@/components/GalleryLightbox';
import { DetailNotFound } from '@/components/DetailNotFound';
import { ArrowLeft, Calendar, MapPin, Image as ImageIcon, Share2 } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { shareWithCoverImage } from '@/utils/share';
import { eventShareMessage } from '@/utils/links';

export default function EventDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { events } = useApp();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const eventId = params.id as string | undefined;
  // Only fall back to the first event when no id was given — a stale or
  // deleted id must not silently show a different event.
  const event = eventId ? events.find(e => e.id === eventId) : events[0];

  if (!event) {
    return (
      <DetailNotFound
        loading={events.length === 0}
        title="Event not found"
        message="This event may have ended or been removed."
      />
    );
  }

  const handleShare = () => {
    shareWithCoverImage(
      eventShareMessage(event.title),
      event.coverImageUrl
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Cover Image Header */}
        <TouchableOpacity
          style={styles.coverImageArea}
          activeOpacity={event.coverImageUrl ? 0.9 : 1}
          disabled={!event.coverImageUrl}
          onPress={() => setLightboxIndex(0)}
        >
          {/* Hidden (not just covered) while the lightbox is open — Android's
              `elevation` shadow on these buttons can bleed through a
              transparent Modal's backdrop due to how the GPU compositor
              draws Z-depth shadows, so simply overlaying them isn't
              reliable; not rendering them at all is. */}
          {lightboxIndex === null && (
            <>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <ArrowLeft size={20} color="#0C0C0D" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareButtonIcon}
                onPress={handleShare}
                activeOpacity={0.8}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Share"
              >
                <Share2 size={18} color="#0C0C0D" />
              </TouchableOpacity>
            </>
          )}
          {event.coverImageUrl ? (
            <Image source={{ uri: event.coverImageUrl }} style={styles.coverImage} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.coverPlaceholderContent}>
              <ImageIcon size={26} color="#C7C3BD" strokeWidth={1.5} />
              <Text style={styles.coverPlaceholderText}>event cover image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Content Details Block */}
        <View style={styles.detailsContainer}>
          {/* Status Badge */}
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {event.isPast ? "Past Event" : "Upcoming Event"}
            </Text>
          </View>

          <Text style={styles.title}>{event.title}</Text>
          
          {/* Meta Rows */}
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <View style={styles.iconCircle}>
                <Calendar size={16} color="#0C0C0D" />
              </View>
              <Text style={styles.metaText}>{event.dateStr} · {event.timeStr || 'All Day'}</Text>
            </View>
            
            <View style={styles.metaRow}>
              <View style={styles.iconCircle}>
                <MapPin size={16} color="#0C0C0D" />
              </View>
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.descText}>{event.desc}</Text>

          {/* Highlights Section */}
          {event.galleryUrls.length > 0 && (
            <>
              <Text style={styles.galleryTitle}>Highlights</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryList}>
                {event.galleryUrls.map((url, i) => (
                  <TouchableOpacity
                    key={url}
                    activeOpacity={0.85}
                    onPress={() => setLightboxIndex(event.coverImageUrl ? i + 1 : i)}
                  >
                    <Image source={{ uri: url }} style={styles.galleryCard} contentFit="cover" transition={200} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </ScrollView>

      <GalleryLightbox
        visible={lightboxIndex !== null}
        images={event.coverImageUrl ? [event.coverImageUrl, ...event.galleryUrls] : event.galleryUrls}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
  },
  scrollContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  coverImageArea: {
    width: '100%',
    height: 236,
    backgroundColor: '#F4F1EE',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  shareButtonIcon: {
    position: 'absolute',
    top: 12,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  coverPlaceholderContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  coverPlaceholderText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#B0ADA8',
    textTransform: 'uppercase',
  },
  detailsContainer: {
    padding: 22,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1EEEA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
  },
  statusBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11.5,
    color: '#7A756E',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 23,
    color: '#0C0C0D',
    letterSpacing: -0.6,
    lineHeight: 28,
    marginBottom: 16,
  },
  metaContainer: {
    gap: 12,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9F8F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#0C0C0D',
  },
  descText: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    lineHeight: 24,
    color: '#4A4640',
    marginBottom: 22,
  },
  galleryTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#0C0C0D',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  galleryList: {
    gap: 12,
    paddingRight: 20,
  },
  galleryCard: {
    width: 132,
    height: 100,
    borderRadius: 18,
    backgroundColor: '#F4F1EE',
    overflow: 'hidden',
  },
});
