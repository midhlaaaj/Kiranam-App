import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Share, StatusBar, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { EditReferralCodeModal } from '@/components/EditReferralCodeModal';
import { statusMeta } from '@/utils/volunteerStatus';
import {
  Users,
  Clock3,
  AlertCircle,
  Copy,
  Share2,
  Pencil,
  ChevronRight,
  BellRing,
  Bell,
  Gift,
  Check,
  Circle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney } from '@/utils/format';
import { referralJoinUrl } from '@/utils/links';

export default function VolunteerDashboardScreen() {
  const router = useRouter();
  const {
    userName,
    myReferralCode,
    isReferralCodeDefault,
    hasReferredContributor,
    updateReferralCode,
    volunteerMembers,
    notifications,
    profileLoading,
    hasCommitment,
    commitmentAmount,
    nextDueDate,
    isPaidThisCycle,
    refreshAll,
  } = useApp();
  const [copied, setCopied] = useState(false);
  const [editCodeVisible, setEditCodeVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const firstName = userName.split(' ')[0];
  const pendingCount = volunteerMembers.filter((m) => m.status === 'due').length;
  const overdueCount = volunteerMembers.filter((m) => m.status === 'overdue').length;
  const unreadNotificationsCount = notifications.filter((n) => n.unread).length;
  const topMembers = volunteerMembers.slice(0, 3);


  const handleCopy = async () => {
    await Clipboard.setStringAsync(myReferralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    Share.share({
      message: `Join me on Kiranam and make a difference! Use my referral code ${myReferralCode} when you sign up: ${referralJoinUrl(myReferralCode)}`,
    });
  };

  // Getting Started checklist — same pattern as the contributor home screen's,
  // minus a "set your monthly amount" step: that's a dedicated screen shown
  // during signup itself for volunteers now, not a checklist item here.
  const setupSteps = [
    { key: 'referral', label: 'Set up your referral code', done: !isReferralCodeDefault, onPress: () => setEditCodeVisible(true) },
    { key: 'invite', label: 'Invite your first contributor', done: hasReferredContributor, onPress: handleShare },
  ];
  const showSetupCard = !profileLoading && setupSteps.some((s) => !s.done);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EC2028" colors={['#EC2028']} />}
      >
        {/* Header greeting and Bell Icon */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/notifications')} activeOpacity={0.7}>
            <Bell size={20} color="#0C0C0D" />
            {unreadNotificationsCount > 0 && <View style={styles.bellBadge} />}
          </TouchableOpacity>
        </View>

        {/* My Giving — a volunteer can also be a personal contributor.
            Moved here from the profile tab so it's the first thing seen. */}
        <LinearGradient
          colors={['#FF3B3B', '#EC2028', '#7A0D12', '#3D0709']}
          locations={[0, 0.3, 0.65, 1]}
          start={{ x: 0.29, y: 0.05 }}
          end={{ x: 0.71, y: 0.95 }}
          style={styles.givingCard}
        >
          <View style={styles.givingHeader}>
            <Text style={styles.givingLabel}>Monthly Commitment</Text>
            {!profileLoading && hasCommitment && (
              <View style={styles.activeBadge}>
                <View style={styles.activeBadgeDot} />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>

          {!profileLoading && hasCommitment ? (
            <>
              <View style={styles.givingAmountRow}>
                <Text style={styles.givingAmount}>
                  {formatMoney(commitmentAmount)}
                  <Text style={styles.givingUnit}> /month</Text>
                </Text>
                <TouchableOpacity onPress={() => router.push('/choose-amount')} activeOpacity={0.7}>
                  <Text style={styles.updateLink}>Change</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.givingDueDate}>
                {isPaidThisCycle ? `Paid · Next due ${nextDueDate}` : `Next due ${nextDueDate}`}
              </Text>
              {isPaidThisCycle ? (
                <View style={styles.paidBadge}>
                  <Check size={15} color="#22A559" strokeWidth={3} />
                  <Text style={styles.paidBadgeText}>Paid for this cycle</Text>
                </View>
              ) : (
                <Button
                  title="Quick Pay"
                  onPress={() => router.push({ pathname: '/secure-payment', params: { amount: commitmentAmount, label: 'Monthly Contribution' } })}
                  style={styles.givingButton}
                />
              )}
            </>
          ) : (
            <>
              <Text style={styles.givingAmount}>Not set yet</Text>
              <Text style={styles.givingDueDate}>Start your own recurring monthly contribution.</Text>
              <Button
                title="Set Up Monthly Giving"
                onPress={() => router.push('/choose-amount')}
                style={styles.givingButton}
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

        {/* Contribution stats — pending/overdue workload for assigned contributors */}
        <FlatList
          data={[
            { key: 'assigned', label: 'Assigned Contributors', value: volunteerMembers.length.toString(), Icon: Users },
            { key: 'pending', label: 'Pending Contributions', value: pendingCount.toString(), Icon: Clock3 },
            { key: 'overdue', label: 'Overdue Contributions', value: overdueCount.toString(), Icon: AlertCircle },
          ]}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiListContainer}
          renderItem={({ item }) => (
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconBg}>
                <item.Icon size={18} color="#EC2028" />
              </View>
              <Text style={styles.kpiValue}>{item.value}</Text>
              <Text style={styles.kpiLabel}>{item.label}</Text>
            </View>
          )}
        />

        {/* Referral Code — compact ticket-style card, redesigned away from
            the previous full dark hero card, sitting right above Quick Actions */}
        <View style={styles.referralCompactCard}>
          <View style={styles.referralCompactIconBox}>
            <Gift size={20} color="#EC2028" />
          </View>
          <View style={styles.referralCompactInfo}>
            <Text style={styles.referralCompactLabel}>Your Referral Code</Text>
            <Text style={styles.referralCompactCode}>{myReferralCode}</Text>
          </View>
          <View style={styles.referralCompactActions}>
            <TouchableOpacity style={styles.referralCompactIconButton} onPress={handleCopy} activeOpacity={0.7}>
              {copied ? (
                <Text style={styles.referralCompactCopiedText}>✓</Text>
              ) : (
                <Copy size={16} color="#0C0C0D" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.referralCompactIconButton} onPress={handleShare} activeOpacity={0.7}>
              <Share2 size={16} color="#0C0C0D" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.referralCompactIconButton}
              onPress={() => setEditCodeVisible(true)}
              activeOpacity={0.7}
            >
              <Pencil size={16} color="#0C0C0D" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionRow}
            activeOpacity={0.8}
            onPress={() => router.push('/(volunteer-tabs)/contributors')}
          >
            <View style={styles.quickActionIconBox}>
              <Users size={20} color="#EC2028" />
            </View>
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionTitle}>View Assigned Contributors</Text>
              <Text style={styles.quickActionSubtitle}>Track registration and payment status</Text>
            </View>
            <ChevronRight size={16} color="#B0ADA8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionRow}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/(volunteer-tabs)/contributors', params: { filter: 'due' } })}
          >
            <View style={styles.quickActionIconBox}>
              <BellRing size={20} color="#EC2028" />
            </View>
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionTitle}>Send Reminders</Text>
              <Text style={styles.quickActionSubtitle}>Follow up on due and overdue contributors</Text>
            </View>
            <ChevronRight size={16} color="#B0ADA8" />
          </TouchableOpacity>
        </View>

        {/* Assigned Contributors preview */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Assigned Contributors</Text>
          <TouchableOpacity onPress={() => router.push('/(volunteer-tabs)/contributors')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.membersPreviewContainer}>
          {topMembers.map((item, index) => {
            const meta = statusMeta(item.status);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.memberRow, index === topMembers.length - 1 ? styles.noBorder : null]}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/volunteer-contributor-detail', params: { id: item.id } })}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {item.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberJoined}>{item.joinedLabel}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusPillText, { color: meta.text }]}>{meta.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <EditReferralCodeModal
        visible={editCodeVisible}
        onClose={() => setEditCodeVisible(false)}
        currentCode={myReferralCode}
        onSave={updateReferralCode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
  },
  setupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginTop: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  setupCardTitle: {
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
  },
  setupStepLabelDone: {
    color: '#B0ADA8',
    textDecorationLine: 'line-through',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
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
    fontFamily: 'Inter-Bold',
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
    backgroundColor: '#F9F8F6',
    alignItems: 'center',
    justifyContent: 'center',
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
  givingCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
  },
  givingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    zIndex: 1,
  },
  givingLabel: {
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
  givingAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updateLink: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  givingAmount: {
    fontFamily: 'Inter-ExtraBold',
    fontWeight: '800',
    fontSize: 30,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  givingUnit: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  givingDueDate: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  givingButton: {
    backgroundColor: '#EC2028',
    height: 48,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  paidBadgeText: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
  },
  referralCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#EFC9CA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
  },
  referralCompactIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FBEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralCompactInfo: {
    flex: 1,
  },
  referralCompactLabel: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B0ADA8',
    textTransform: 'uppercase',
    letterSpacing: 0.06,
    marginBottom: 3,
  },
  referralCompactCode: {
    fontFamily: 'Inter-ExtraBold',
    fontWeight: '800',
    fontSize: 18,
    color: '#0C0C0D',
    letterSpacing: 0.4,
  },
  referralCompactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  referralCompactIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9F8F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralCompactCopiedText: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 14,
    color: '#22A559',
  },
  kpiListContainer: {
    paddingRight: 20,
    paddingBottom: 24,
    gap: 12,
  },
  kpiCard: {
    width: 158,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  kpiIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  kpiValue: {
    fontFamily: 'Inter-ExtraBold',
    fontWeight: '800',
    fontSize: 20,
    color: '#0C0C0D',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  kpiLabel: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#7A756E',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 17,
    color: '#0C0C0D',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  seeAllText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#EC2028',
  },
  quickActionsContainer: {
    gap: 10,
    marginBottom: 24,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F9F8F6',
    borderRadius: 18,
    padding: 14,
  },
  quickActionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FBEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionInfo: {
    flex: 1,
  },
  quickActionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#7A756E',
  },
  membersPreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0C0C0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 12,
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
    fontSize: 12,
    color: '#7A756E',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusPillText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
