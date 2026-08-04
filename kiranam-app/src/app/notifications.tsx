import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, StatusBar, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, NotificationRecord } from '@/context/AppContext';
import { ArrowLeft, CreditCard, Flag, Info, Check, MoreVertical, Trash2, CheckCheck, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, deleteAllNotifications } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'contribution' | 'campaign' | 'system'>('all');
  const [menuVisible, setMenuVisible] = useState(false);

  const hasUnread = notifications.some((n) => n.unread);

  const handleMarkAllRead = () => {
    setMenuVisible(false);
    markAllNotificationsAsRead();
  };

  const handleDeleteAll = () => {
    setMenuVisible(false);
    if (hasUnread) {
      Alert.alert(
        'Unread messages',
        'You have unread notifications. Delete all messages anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete All', style: 'destructive', onPress: () => deleteAllNotifications() },
        ]
      );
      return;
    }
    deleteAllNotifications();
  };

  const filteredNotifications = notifications.filter(n => {
    if (selectedFilter === 'all') return true;
    return n.cat === selectedFilter;
  });

  const handleRowClick = (item: NotificationRecord) => {
    markNotificationAsRead(item.id);
    if (item.deepLink) {
      router.push(item.deepLink as never);
    }
  };

  const getIcon = (item: NotificationRecord) => {
    if (item.isContribution) {
      return <CreditCard size={16} color="#EC2028" />;
    }
    if (item.isCampaign) {
      return <Flag size={16} color="#EC2028" />;
    }
    return <Info size={16} color="#7A756E" />;
  };

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'contribution', label: 'Contributions' },
    { key: 'campaign', label: 'Campaigns' },
    { key: 'system', label: 'System' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.clearButton} onPress={() => setMenuVisible(true)} activeOpacity={0.7}>
          <MoreVertical size={18} color="#7A756E" />
        </TouchableOpacity>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuSheet}>
            <TouchableOpacity style={styles.menuItem} onPress={handleMarkAllRead} activeOpacity={0.7}>
              <CheckCheck size={18} color="#0C0C0D" />
              <Text style={styles.menuItemText}>Mark all as read</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={handleDeleteAll} activeOpacity={0.7}>
              <Trash2 size={18} color="#EC2028" />
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>Delete all messages</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Horizontal categories picker */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterContainer}
        >
          {filterTabs.map((tab) => {
            const isSelected = selectedFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterPill,
                  isSelected ? styles.activeFilterPill : null
                ]}
                onPress={() => setSelectedFilter(tab.key as any)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.filterText,
                  isSelected ? styles.activeFilterText : null
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notifications Vertical List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleRowClick(item)}
          >
            <View style={[
              styles.notifCard,
              item.unread ? styles.unreadNotifCard : null
            ]}>
              <View style={styles.iconCircle}>
                {getIcon(item)}
              </View>
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifDesc}>{item.desc}</Text>
                <Text style={styles.notifTime}>{item.time}</Text>
              </View>
              {item.unread && (
                <View style={styles.unreadDot} />
              )}
              {item.deepLink && (
                <ChevronRight size={16} color="#D8D5D0" />
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Check size={28} color="#22A559" strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
            <Text style={styles.emptySubtitle}>
              New updates about your contributions and campaigns will appear here.
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F8F6',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 24,
    color: '#0C0C0D',
    letterSpacing: -0.6,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F8F6',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,12,13,0.15)',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1EEEA',
    paddingVertical: 6,
    minWidth: 200,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
  },
  menuItemDanger: {
    color: '#EC2028',
  },
  filterScrollWrapper: {
    height: 48,
    marginBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F9F8F6',
  },
  activeFilterPill: {
    backgroundColor: '#0C0C0D',
  },
  filterText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#7A756E',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F9F8F6',
  },
  unreadNotifCard: {
    backgroundColor: '#FDF4F4', // Pink tint for unread notification matching mockup
    borderColor: '#FDF4F4',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F9F8F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifInfo: {
    flex: 1,
  },
  notifTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
    marginBottom: 4,
  },
  notifDesc: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#7A756E',
    lineHeight: 18,
    marginBottom: 6,
  },
  notifTime: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#B0ADA8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EC2028',
    alignSelf: 'flex-start',
    marginTop: 4,
    flexShrink: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EAF7EF',
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
