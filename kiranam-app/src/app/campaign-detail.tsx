import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { GalleryLightbox } from '@/components/GalleryLightbox';
import { ArrowLeft, Heart, Share2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney } from '@/utils/format';

export default function CampaignDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { campaigns } = useApp();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const campaignId = params.id as string | undefined;
  const campaign = campaigns.find(c => c.id === campaignId) || campaigns[0];

  const handleShare = () => {
    if (!campaign) return;
    Share.share({
      message: `Help support "${campaign.title}" on Kiranam! Every contribution makes a difference. Join here: https://kiranam.org`,
    });
  };

  // Landed here from the "close to goal" push notification (?share=1) —
  // open the share sheet immediately instead of making them find the icon.
  // Runs before the `!campaign` early return below so this hook is always
  // called on every render, not just when a campaign happens to be loaded.
  useEffect(() => {
    if (params.share === '1') handleShare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.share]);

  if (!campaign) return null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Cover Image Header */}
        <TouchableOpacity
          style={styles.coverImageArea}
          activeOpacity={campaign.coverImageUrl ? 0.9 : 1}
          disabled={!campaign.coverImageUrl}
          onPress={() => setLightboxIndex(0)}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#0C0C0D" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButtonIcon} onPress={handleShare} activeOpacity={0.8}>
            <Share2 size={18} color="#0C0C0D" />
          </TouchableOpacity>
          {campaign.coverImageUrl ? (
            <Image source={{ uri: campaign.coverImageUrl }} style={styles.coverImage} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.coverPlaceholderContent}>
              <Heart size={26} color="#D8A8A8" strokeWidth={1.5} />
              <Text style={styles.coverPlaceholderText}>campaign cover image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Content Details Block */}
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{campaign.title}</Text>
          
          <View style={styles.raisedContainer}>
            <Text style={styles.raisedText}>{formatMoney(campaign.raised)}</Text>
            <Text style={styles.goalText}>of {formatMoney(campaign.goal)} goal</Text>
          </View>
          
          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${campaign.pct}%` }]} />
          </View>
          <Text style={styles.percentText}>{campaign.pct}% funded</Text>

          {/* Narrative Text */}
          <Text style={styles.storyText}>
            Harsh winters leave hundreds of families without adequate warmth. Your contribution funds thick woollen blankets, distributed directly to elderly residents and children across rural Kerala communities identified by our on-ground volunteers.
          </Text>

          {/* Horizontal Gallery slider */}
          {campaign.galleryUrls.length > 0 && (
            <>
              <Text style={styles.galleryTitle}>Gallery</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryList}>
                {campaign.galleryUrls.map((url, i) => (
                  <TouchableOpacity
                    key={url}
                    activeOpacity={0.85}
                    onPress={() => setLightboxIndex(campaign.coverImageUrl ? i + 1 : i)}
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
        images={campaign.coverImageUrl ? [campaign.coverImageUrl, ...campaign.galleryUrls] : campaign.galleryUrls}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />

      {/* Sticky Bottom Actions Container */}
      <View style={styles.stickyFooter}>
        <Button
          title="Donate Now"
          onPress={() => router.push({
            pathname: '/choose-amount',
            params: { campaignId: campaign.id, campaignTitle: campaign.title }
          })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  coverImageArea: {
    width: '100%',
    height: 236,
    backgroundColor: '#FBEAEA',
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
    padding: 26,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 23,
    color: '#0C0C0D',
    letterSpacing: -0.6,
    lineHeight: 28,
    marginBottom: 14,
  },
  raisedContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 10,
  },
  raisedText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 24,
    color: '#0C0C0D',
    letterSpacing: -0.4,
  },
  goalText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#7A756E',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1EEEA',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#EC2028',
  },
  percentText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#7A756E',
    marginBottom: 16,
  },
  storyText: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    lineHeight: 24,
    color: '#4A4640',
    marginBottom: 24,
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
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 26,
    borderTopWidth: 1,
    borderTopColor: '#F1EEEA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
});
