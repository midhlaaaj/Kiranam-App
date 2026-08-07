import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Share, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useApp, Campaign } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { SegmentedToggle } from '@/components/SegmentedToggle';
import { Bell, Heart, Share2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney } from '@/utils/format';

export default function CampaignsScreen() {
  const router = useRouter();
  const { campaigns, notifications } = useApp();
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed'>('active');

  const unreadNotificationsCount = notifications.filter(n => n.unread).length;
  const filteredCampaigns = campaigns.filter(c => c.status === selectedTab);


  const handleShare = (title: string) => {
    Share.share({
      message: `Help support "${title}" on Kiranam! Every contribution makes a difference. Join here: https://kiranam.org`,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campaigns</Text>
        <TouchableOpacity 
          style={styles.bellButton} 
          onPress={() => router.push('/notifications')}
          activeOpacity={0.7}
        >
          <Bell size={20} color="#0C0C0D" />
          {unreadNotificationsCount > 0 && (
            <View style={styles.bellBadge} />
          )}
        </TouchableOpacity>
      </View>

      {/* Segmented Tab Filter */}
      <SegmentedToggle
        options={[
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
        ]}
        value={selectedTab}
        onChange={setSelectedTab}
      />

      {/* Vertical Campaign Cards list */}
      <FlatList
        data={filteredCampaigns}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/campaign-detail', params: { id: item.id } })}
          >
            <Card style={styles.campaignCard}>
              {item.coverImageUrl ? (
                <View style={styles.campaignImageArea}>
                  <Image
                    source={{ uri: item.coverImageUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                  />
                  <TouchableOpacity
                    style={styles.shareIconButton}
                    onPress={() => handleShare(item.title)}
                    activeOpacity={0.8}
                    hitSlop={8}
                  >
                    <Share2 size={15} color="#0C0C0D" />
                  </TouchableOpacity>
                </View>
              ) : (
                <LinearGradient
                  colors={['#FF3B3B', '#EC2028', '#7A0D12', '#3D0709']}
                  locations={[0, 0.3, 0.65, 1]}
                  start={{ x: 0.29, y: 0.05 }}
                  end={{ x: 0.71, y: 0.95 }}
                  style={styles.campaignImageArea}
                >
                  <Heart size={22} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                  <TouchableOpacity
                    style={styles.shareIconButton}
                    onPress={() => handleShare(item.title)}
                    activeOpacity={0.8}
                    hitSlop={8}
                  >
                    <Share2 size={15} color="#0C0C0D" />
                  </TouchableOpacity>
                </LinearGradient>
              )}
              <Text style={styles.campaignTitle}>{item.title}</Text>
              
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.pct}%` }]} />
              </View>
              
              <Text style={styles.raisedGoalLabel}>
                <Text style={styles.boldText}>{formatMoney(item.raised)}</Text> raised of {formatMoney(item.goal)} goal
              </Text>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No {selectedTab} campaigns available.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 24,
    color: '#0C0C0D',
    letterSpacing: -0.6,
  },
  bellButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9F8F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EC2028',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110, // Avoid clipping behind pill tab bar
    gap: 16,
  },
  campaignCard: {
    padding: 16,
    //level 1 ambient shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  campaignImageArea: {
    width: '100%',
    height: 132,
    borderRadius: 18,
    backgroundColor: '#FBEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  shareIconButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  campaignTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#0C0C0D',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  progressBarBg: {
    width: '100%',
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F1EEEA',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3.5,
    backgroundColor: '#EC2028',
  },
  raisedGoalLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#7A756E',
  },
  boldText: {
    fontWeight: '700',
    color: '#0C0C0D',
    fontFamily: 'Inter',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#7A756E',
  },
});
