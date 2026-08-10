import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Share, StatusBar, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { Bell, Heart, Calendar, MapPin, Image as ImageIcon, Share2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney } from '@/utils/format';

export default function VolunteerExploreScreen() {
  const router = useRouter();
  const { campaigns, events, notifications, refreshCampaigns, refreshEvents } = useApp();
  const [mode, setMode] = useState<'campaigns' | 'events'>('campaigns');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshCampaigns(), refreshEvents()]);
    setRefreshing(false);
  }, [refreshCampaigns, refreshEvents]);

  const unreadNotificationsCount = notifications.filter((n) => n.unread).length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const upcomingEvents = events.filter((e) => !e.isPast);

  const handleShareCampaign = (title: string) => {
    Share.share({
      message: `Help support "${title}" on Kiranam! Every contribution makes a difference. Join here: https://kiranam.online`,
    });
  };

  const handleShareEvent = (title: string) => {
    Share.share({
      message: `Join "${title}" — a Kiranam event. See details and RSVP: https://kiranam.online`,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/notifications')} activeOpacity={0.7}>
          <Bell size={20} color="#0C0C0D" />
          {unreadNotificationsCount > 0 && <View style={styles.bellBadge} />}
        </TouchableOpacity>
      </View>

      {/* Segmented Tab Filter */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, mode === 'campaigns' ? styles.activeTabButton : null]}
          onPress={() => setMode('campaigns')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, mode === 'campaigns' ? styles.activeTabText : null]}>Campaigns</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, mode === 'events' ? styles.activeTabButton : null]}
          onPress={() => setMode('events')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, mode === 'events' ? styles.activeTabText : null]}>Events</Text>
        </TouchableOpacity>
      </View>

      {mode === 'campaigns' ? (
        <FlatList
          data={activeCampaigns}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EC2028" colors={['#EC2028']} />}
          renderItem={({ item }) => (
            <Card style={styles.campaignCard}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/campaign-detail', params: { id: item.id } })}
              >
                <View style={styles.campaignImageArea}>
                  <Heart size={22} color="#D8A8A8" strokeWidth={1.5} />
                  <Text style={styles.campaignImageText}>campaign photo</Text>
                  <TouchableOpacity
                    style={styles.shareIconButton}
                    onPress={() => handleShareCampaign(item.title)}
                    activeOpacity={0.8}
                    hitSlop={8}
                  >
                    <Share2 size={15} color="#0C0C0D" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.campaignTitle}>{item.title}</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${item.pct}%` }]} />
                </View>
                <Text style={styles.raisedGoalLabel}>
                  <Text style={styles.boldText}>{formatMoney(item.raised)}</Text> raised of {formatMoney(item.goal)} goal
                </Text>
              </TouchableOpacity>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No active campaigns available.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={upcomingEvents}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EC2028" colors={['#EC2028']} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/event-detail', params: { id: item.id } })}
            >
              <Card style={styles.eventCard}>
                <View style={styles.eventImagePlaceholder}>
                  <ImageIcon size={22} color="#C7C3BD" strokeWidth={1.5} />
                  <Text style={styles.campaignImageText}>event photo</Text>
                  <TouchableOpacity
                    style={styles.shareIconButton}
                    onPress={() => handleShareEvent(item.title)}
                    activeOpacity={0.8}
                    hitSlop={8}
                  >
                    <Share2 size={15} color="#0C0C0D" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.campaignTitle}>{item.title}</Text>
                <View style={styles.infoRow}>
                  <Calendar size={15} color="#7A756E" />
                  <Text style={styles.infoText}>{item.dateStr} · {item.timeStr}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MapPin size={15} color="#7A756E" />
                  <Text style={styles.infoText}>{item.location}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No upcoming events right now.</Text>
            </View>
          }
        />
      )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F4F2EF',
    borderRadius: 24,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 21,
  },
  activeTabButton: {
    backgroundColor: '#0C0C0D',
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#7A756E',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 16,
  },
  campaignCard: {
    padding: 16,
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
  },
  campaignImageText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#B0ADA8',
    textTransform: 'uppercase',
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
  eventCard: {
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 18,
    backgroundColor: '#F4F1EE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#4A4640',
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
