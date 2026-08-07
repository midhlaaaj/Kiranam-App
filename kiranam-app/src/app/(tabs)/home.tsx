import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, StatusBar, Platform, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { Bell, Heart, Calendar, ArrowRight, ShieldCheck, ChevronRight, Check, Circle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney } from '@/utils/format';

function SkeletonBlock({ style }: { style: any }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[style, { opacity, backgroundColor: 'rgba(255,255,255,0.3)' }]} />;
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    userName,
    userEmail,
    profileLoading,
    hasCommitment,
    commitmentAmount,
    nextDueDate,
    isPaidThisCycle,
    userAvatarUrl,
    campaigns,
    payments,
    events,
    totalContributed,
    campaignGiving,
    notifications
  } = useApp();

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const upcomingEvents = events.filter(e => !e.isPast).slice(0, 2);
  const recentPayments = payments.slice(0, 3);
  const unreadNotificationsCount = notifications.filter(n => n.unread).length;

  const setupSteps = [
    { key: 'amount', label: 'Set your monthly amount', done: hasCommitment, onPress: () => router.push('/choose-amount') },
    { key: 'photo', label: 'Add a profile photo', done: !!userAvatarUrl, onPress: () => router.push('/(tabs)/profile') },
    { key: 'email', label: 'Add your email', done: !!userEmail, onPress: () => router.push('/(tabs)/profile') },
  ];
  const showSetupCard = !profileLoading && setupSteps.some((s) => !s.done);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header greeting and Bell Icon */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
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

        {/* Commitment Summary Card */}
        <LinearGradient
          colors={['#FF3B3B', '#EC2028', '#7A0D12', '#3D0709']}
          locations={[0, 0.3, 0.65, 1]}
          start={{ x: 0.29, y: 0.05 }}
          end={{ x: 0.71, y: 0.95 }}
          style={styles.commitmentCard}
        >
          <View style={styles.commitmentHeader}>
            <Text style={styles.commitmentTitle}>Monthly Commitment</Text>
            {!profileLoading && hasCommitment && (
              <View style={styles.activeBadge}>
                <View style={styles.activeBadgeDot} />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          {profileLoading ? (
            <>
              <SkeletonBlock style={styles.skeletonAmount} />
              <SkeletonBlock style={styles.skeletonDueDate} />
              <SkeletonBlock style={styles.skeletonButton} />
            </>
          ) : hasCommitment ? (
            <>
              <Text style={styles.commitmentAmount}>
                {formatMoney(commitmentAmount)}
                <Text style={styles.commitmentUnit}> /month</Text>
              </Text>
              <Text style={styles.commitmentDueDate}>
                {isPaidThisCycle ? `Paid · Next due ${nextDueDate}` : `Next due ${nextDueDate}`}
              </Text>
              {isPaidThisCycle ? (
                <View style={styles.paidBadgeButton}>
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.paidBadgeButtonText}>Paid for this cycle</Text>
                </View>
              ) : (
                <Button
                  title="Quick Pay"
                  onPress={() => router.push({ pathname: '/secure-payment', params: { amount: commitmentAmount, label: 'Monthly Contribution' } })}
                  style={styles.quickPayButton}
                />
              )}
            </>
          ) : (
            <>
              <Text style={styles.commitmentAmount}>Not set yet</Text>
              <Text style={styles.commitmentDueDate}>Start a recurring monthly contribution.</Text>
              <Button
                title="Set Up Monthly Giving"
                onPress={() => router.push('/choose-amount')}
                style={styles.quickPayButton}
              />
            </>
          )}
        </LinearGradient>

        {/* Getting Started checklist — disappears once every step is done */}
        {showSetupCard && (
          <View style={styles.setupCard}>
            <Text style={styles.setupCardTitle}>Getting Started</Text>
            {setupSteps.map((step) => (
              <TouchableOpacity
                key={step.key}
                style={styles.setupStepRow}
                onPress={step.onPress}
                activeOpacity={0.7}
                disabled={step.done}
              >
                {step.done ? (
                  <View style={styles.setupStepCheckDone}>
                    <Check size={13} color="#FFFFFF" strokeWidth={3} />
                  </View>
                ) : (
                  <Circle size={20} color="#D8D5D0" strokeWidth={1.5} />
                )}
                <Text style={[styles.setupStepLabel, step.done ? styles.setupStepLabelDone : null]}>
                  {step.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Active Campaigns Slider */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Active Campaigns</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/campaigns')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {activeCampaigns.length === 0 ? (
          <View style={[styles.emptyStateCard, styles.campaignsEmptyStateCard]}>
            <View style={styles.emptyStateIconBox}>
              <Heart size={20} color="#D8A8A8" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyStateTitle}>No active campaigns</Text>
            <Text style={styles.emptyStateSubtitle}>Check back soon for new ways to give.</Text>
          </View>
        ) : (
          <FlatList
            data={activeCampaigns}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.campaignListContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.campaignCard}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/campaign-detail', params: { id: item.id } })}
              >
                {item.coverImageUrl ? (
                  <Image
                    source={{ uri: item.coverImageUrl }}
                    style={styles.campaignImagePlaceholder}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <LinearGradient
                    colors={['#FF3B3B', '#EC2028', '#7A0D12', '#3D0709']}
                    locations={[0, 0.3, 0.65, 1]}
                    start={{ x: 0.29, y: 0.05 }}
                    end={{ x: 0.71, y: 0.95 }}
                    style={styles.campaignImagePlaceholder}
                  >
                    <Heart size={20} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                  </LinearGradient>
                )}
                <Text style={styles.campaignCardTitle} numberOfLines={2}>{item.title}</Text>

                <View style={styles.progressRow}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${item.pct}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{item.pct}%</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Upcoming Events list */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/events')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {upcomingEvents.length === 0 ? (
          <View style={[styles.emptyStateCard, styles.eventsEmptyStateCard]}>
            <View style={styles.emptyStateIconBox}>
              <Calendar size={20} color="#B0ADA8" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyStateTitle}>No upcoming events</Text>
          </View>
        ) : (
          <View style={styles.eventsContainer}>
            {upcomingEvents.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.eventRow}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/event-detail', params: { id: item.id } })}
              >
                <View style={styles.eventIconBox}>
                  <Calendar size={20} color="#B0ADA8" />
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.eventSubtitle}>{item.dateStr} · {item.location}</Text>
                </View>
                <ChevronRight size={16} color="#B0ADA8" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Contributions */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Contributions</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentContributionsContainer}>
          {recentPayments.map((item, index) => (
            <View key={item.id} style={[styles.paymentRow, index === recentPayments.length - 1 ? styles.noBorder : null]}>
              <View style={styles.paymentLeft}>
                <View style={[styles.statusIconBg, item.ok ? styles.successIconBg : styles.failedIconBg]}>
                  {item.ok ? (
                    <ShieldCheck size={14} color="#22A559" />
                  ) : (
                    <Text style={styles.failedTextSymbol}>✕</Text>
                  )}
                </View>
                <View>
                  <Text style={styles.paymentDate}>{item.date}</Text>
                  <Text style={styles.paymentLabel} numberOfLines={1}>{item.label}</Text>
                </View>
              </View>
              <Text style={styles.paymentAmount}>{formatMoney(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Bottom Totals Summary Widget */}
        <View style={styles.totalsSummaryRow}>
          <View style={styles.totalBlock}>
            <Text style={styles.totalBlockLabel}>Total Contributed</Text>
            <Text style={styles.totalBlockValue}>{formatMoney(totalContributed)}</Text>
          </View>
          <View style={styles.totalBlock}>
            <Text style={styles.totalBlockLabel}>Campaign Giving</Text>
            <Text style={styles.totalBlockValue}>{formatMoney(campaignGiving)}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110, // Margin to prevent clipping behind absolute navigation bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: Platform.OS === 'android' ? 10 : 0,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#7A756E',
    marginBottom: 3,
  },
  userName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 23,
    color: '#0C0C0D',
    letterSpacing: -0.5,
  },
  bellButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EC2028',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  commitmentCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 26,
    padding: 24,
    marginBottom: 24,
  },
  commitmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    zIndex: 1,
  },
  commitmentTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.04,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74,222,128,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  activeBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4ADE80',
  },
  activeBadgeText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#4ADE80',
  },
  commitmentAmount: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 40,
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginBottom: 6,
    zIndex: 1,
  },
  commitmentUnit: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
  commitmentDueDate: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
    zIndex: 1,
  },
  quickPayButton: {
    backgroundColor: '#EC2028',
    height: 50,
    zIndex: 1,
  },
  paidBadgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: 1,
  },
  paidBadgeButtonText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: '#FFFFFF',
  },
  skeletonAmount: {
    width: 140,
    height: 36,
    borderRadius: 8,
    marginBottom: 10,
  },
  skeletonDueDate: {
    width: 110,
    height: 14,
    borderRadius: 6,
    marginBottom: 20,
  },
  skeletonButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
  },
  setupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  setupCardTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 13,
    color: '#0C0C0D',
    textTransform: 'uppercase',
    letterSpacing: 0.04,
    marginBottom: 14,
  },
  setupStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  setupStepCheckDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22A559',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupStepLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
  },
  setupStepLabelDone: {
    color: '#B0ADA8',
    textDecorationLine: 'line-through',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 17,
    color: '#0C0C0D',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#EC2028',
  },
  campaignListContainer: {
    paddingRight: 20,
    paddingBottom: 24,
    gap: 12,
  },
  campaignCard: {
    width: 172,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    // Shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  campaignImagePlaceholder: {
    width: '100%',
    height: 76,
    borderRadius: 14,
    backgroundColor: '#FBEAEA', // Pinkish background matching mockup
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  campaignCardTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13,
    color: '#0C0C0D',
    lineHeight: 18,
    height: 36,
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1EEEA',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#EC2028',
  },
  progressText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 11.5,
    color: '#0C0C0D',
  },
  eventsContainer: {
    gap: 10,
    marginBottom: 24,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F8F6',
    borderRadius: 22,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  // Matches campaignCard's total rendered height (padding + image + title + progress row)
  // so the empty state doesn't jump the layout smaller than a real card would be.
  campaignsEmptyStateCard: {
    height: 176,
  },
  // Matches the filled state's rendered height when showing the max of 2
  // upcoming events (2 eventRows at 76px each + the 10px gap between them) —
  // matching only 1 row's height left a visible jump whenever 2 events were
  // actually shown.
  eventsEmptyStateCard: {
    height: 76 * 2 + 10,
  },
  emptyStateIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#0C0C0D',
    marginBottom: 3,
  },
  emptyStateSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#7A756E',
    textAlign: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F9F8F6',
    borderRadius: 18,
    padding: 12,
  },
  eventIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EFEBE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13.5,
    color: '#0C0C0D',
    marginBottom: 2,
  },
  eventSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#7A756E',
  },
  recentContributionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconBg: {
    backgroundColor: '#EAF7EF',
  },
  failedIconBg: {
    backgroundColor: '#FDECEC',
  },
  failedTextSymbol: {
    color: '#EC2028',
    fontWeight: '800',
    fontSize: 12,
  },
  paymentDate: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#0C0C0D',
    marginBottom: 2,
  },
  paymentLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#7A756E',
    maxWidth: 180,
  },
  paymentAmount: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14.5,
    color: '#0C0C0D',
  },
  totalsSummaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  totalBlock: {
    flex: 1,
    backgroundColor: '#F9F8F6',
    borderRadius: 20,
    padding: 18,
  },
  totalBlockLabel: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#7A756E',
    textTransform: 'uppercase',
    letterSpacing: 0.04,
    marginBottom: 8,
  },
  totalBlockValue: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 20,
    color: '#0C0C0D',
    letterSpacing: -0.4,
  },
});
