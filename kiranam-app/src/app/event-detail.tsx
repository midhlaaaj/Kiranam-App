import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { GalleryLightbox } from '@/components/GalleryLightbox';
import { ArrowLeft, Calendar, MapPin, Image as ImageIcon, Share2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { events } = useApp();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const eventId = params.id as string | undefined;
  const event = events.find(e => e.id === eventId) || events[0];

  if (!event) return null;

  const handleShare = () => {
    Share.share({
      message: `Join "${event.title}" — a Kiranam event. See details and RSVP: https://kiranam.org`,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Cover Image Header */}
        <TouchableOpacity
          style={styles.coverImageArea}
          activeOpacity={event.coverImageUrl ? 0.9 : 1}
          disabled={!event.coverImageUrl}
          onPress={() => setLightboxIndex(0)}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#0C0C0D" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButtonIcon} onPress={handleShare} activeOpacity={0.8}>
            <Share2 size={18} color="#0C0C0D" />
          </TouchableOpacity>
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
    paddingBottom: 40,
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
    top: 50,
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
    top: 50,
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
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7A756E',
    textTransform: 'uppercase',
    letterSpacing: 0.04,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
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
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
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
    fontFamily: 'Inter',
    fontWeight: '700',
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
