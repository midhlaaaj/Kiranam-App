import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Share, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, EventRecord } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { Bell, Calendar, MapPin, Image as ImageIcon, Share2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EventsScreen() {
  const router = useRouter();
  const { events, notifications } = useApp();
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past'>('upcoming');

  const unreadNotificationsCount = notifications.filter(n => n.unread).length;
  const filteredEvents = events.filter(e => (selectedTab === 'upcoming' ? !e.isPast : e.isPast));

  const handleShare = (title: string) => {
    Share.share({
      message: `Join "${title}" — a Kiranam event. See details and RSVP: https://kiranam.org`,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
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

      {/* Toggle Tab */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'upcoming' ? styles.activeTabButton : null]}
          onPress={() => setSelectedTab('upcoming')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, selectedTab === 'upcoming' ? styles.activeTabText : null]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'past' ? styles.activeTabButton : null]}
          onPress={() => setSelectedTab('past')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, selectedTab === 'past' ? styles.activeTabText : null]}>Past</Text>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/event-detail', params: { id: item.id } })}
          >
            <Card style={styles.eventCard}>
              <View style={styles.eventImagePlaceholder}>
                <ImageIcon size={22} color="#C7C3BD" strokeWidth={1.5} />
                <Text style={styles.eventImageText}>event photo</Text>
                <TouchableOpacity
                  style={styles.shareIconButton}
                  onPress={() => handleShare(item.title)}
                  activeOpacity={0.8}
                  hitSlop={8}
                >
                  <Share2 size={15} color="#0C0C0D" />
                </TouchableOpacity>
              </View>

              {item.isPast && (
                <View style={styles.pastBadge}>
                  <Text style={styles.pastBadgeText}>Past Event</Text>
                </View>
              )}

              <Text style={styles.eventTitle}>{item.title}</Text>
              
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
            <View style={styles.emptyIconBg}>
              <Calendar size={28} color="#C7C3BD" />
            </View>
            <Text style={styles.emptyTitle}>No {selectedTab} events right now</Text>
            <Text style={styles.emptySubtitle}>
              {selectedTab === 'upcoming' 
                ? "Check back soon — new events are added as they're scheduled."
                : "No past events have been recorded."}
            </Text>
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
  eventImageText: {
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
  pastBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1EEEA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  pastBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7A756E',
    textTransform: 'uppercase',
    letterSpacing: 0.04,
  },
  eventTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#0C0C0D',
    letterSpacing: -0.2,
    marginBottom: 10,
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
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F9F8F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 17,
    color: '#0C0C0D',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#7A756E',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 240,
  },
});
