import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert, Linking, StatusBar, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp, VolunteerMember } from '@/context/AppContext';
import { Input } from '@/components/Input';
import { statusMeta } from '@/utils/volunteerStatus';
import { Search, Send } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterTab = 'all' | 'active' | 'due' | 'overdue' | 'inactive';

export default function ContributorsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { volunteerMembers, refreshUserData } = useApp();
  const initialFilter = (params.filter as FilterTab) || 'all';
  const [selectedTab, setSelectedTab] = useState<FilterTab>(
    ['all', 'active', 'due', 'overdue', 'inactive'].includes(initialFilter) ? initialFilter : 'all'
  );
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUserData();
    setRefreshing(false);
  }, [refreshUserData]);

  const filteredMembers = volunteerMembers.filter((m) => {
    const matchesTab = selectedTab === 'all' ? true : m.status === selectedTab;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === '' || m.name.toLowerCase().includes(q) || m.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
    return matchesTab && matchesQuery;
  });

  const getInitials = (name: string) => name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);

  // Opens WhatsApp with a pre-filled reminder so the volunteer sends it
  // themselves — the app has no server-side WhatsApp sending capability
  // of its own (that lives in the comm center's admin tooling), so this
  // is the only honest way to offer a "remind" action here.
  const handleRemind = async (member: VolunteerMember) => {
    const digits = member.phone.replace(/\D/g, '');
    const message = `Hi ${member.name}, this is a friendly reminder about your Kiranam contribution. Thank you for your support!`;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert("Couldn't open WhatsApp", 'Please make sure WhatsApp is installed.');
    }
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'due', label: 'Due' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'inactive', label: 'Inactive' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contributors</Text>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search by name or mobile..."
          value={query}
          onChangeText={setQuery}
          containerStyle={styles.searchInputContainer}
        />
        <View style={styles.searchIcon}>
          <Search size={16} color="#B0ADA8" />
        </View>
      </View>

      {/* Horizontally-scrolling filter pills */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filterTabs.map((tab) => {
            const isSelected = selectedTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterPill, isSelected ? styles.activeFilterPill : null]}
                onPress={() => setSelectedTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, isSelected ? styles.activeFilterText : null]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Contributor List */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EC2028" colors={['#EC2028']} />}
        renderItem={({ item }) => {
          const meta = statusMeta(item.status);
          return (
            <TouchableOpacity
              style={styles.memberCard}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/volunteer-contributor-detail', params: { id: item.id } })}
            >
              <View style={styles.memberTop}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{getInitials(item.name)}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberJoined}>{item.joinedLabel}</Text>
                  <Text style={styles.memberPhone}>{item.phone}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusPillText, { color: meta.text }]}>{meta.label}</Text>
                </View>
              </View>
              {(item.status === 'due' || item.status === 'overdue') && (
                <TouchableOpacity style={styles.remindButton} onPress={() => handleRemind(item)} activeOpacity={0.8}>
                  <Send size={14} color="#FFFFFF" />
                  <Text style={styles.remindButtonText}>Remind</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No contributors match this search.</Text>
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
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 24,
    color: '#0C0C0D',
    letterSpacing: -0.6,
  },
  searchContainer: {
    paddingHorizontal: 20,
    position: 'relative',
    justifyContent: 'center',
  },
  searchInputContainer: {
    marginBottom: 12,
  },
  searchIcon: {
    position: 'absolute',
    right: 36,
    top: 18,
  },
  filterScrollWrapper: {
    height: 48,
    marginBottom: 12,
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
    paddingBottom: 110,
    gap: 12,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1EEEA',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0C0C0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
    marginBottom: 2,
  },
  memberJoined: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#B0ADA8',
    marginBottom: 2,
  },
  memberPhone: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#7A756E',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
  },
  remindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EC2028',
    borderRadius: 20,
    paddingVertical: 11,
    marginTop: 12,
  },
  remindButtonText: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
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
