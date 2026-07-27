import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, StatusBar } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { statusMeta } from '@/utils/volunteerStatus';
import { Copy, Share2, Users, UserCheck, Wallet } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReferralsScreen() {
  const { myReferralCode, volunteerMembers } = useApp();
  const [copied, setCopied] = useState(false);

  const activeMembers = volunteerMembers.filter((m) => m.status === 'active');
  const monthlyTotal = activeMembers.reduce((acc, m) => acc + m.monthlyAmount, 0);
  const formatMoney = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  const handleCopy = async () => {
    await Clipboard.setStringAsync(myReferralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    Share.share({
      message: `Join me on Kiranam and make a difference! Use my referral code ${myReferralCode} when you sign up.`,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Referrals</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Referral Code Card */}
        <Card variant="dark" style={styles.referralCard}>
          <View style={styles.glowOverlay} />
          <Text style={styles.referralLabel}>Your Referral Code</Text>
          <Text style={styles.referralCode}>{myReferralCode}</Text>
          <Text style={styles.referralHint}>
            Share this code so new members are added to your network.
          </Text>
          <View style={styles.referralActionsRow}>
            <TouchableOpacity style={styles.referralActionButton} onPress={handleCopy} activeOpacity={0.8}>
              <Copy size={16} color="#FFFFFF" />
              <Text style={styles.referralActionText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.referralActionButton} onPress={handleShare} activeOpacity={0.8}>
              <Share2 size={16} color="#FFFFFF" />
              <Text style={styles.referralActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconBg}>
              <Users size={18} color="#EC2028" />
            </View>
            <Text style={styles.kpiValue}>{volunteerMembers.length}</Text>
            <Text style={styles.kpiLabel}>Total Referred</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconBg}>
              <UserCheck size={18} color="#EC2028" />
            </View>
            <Text style={styles.kpiValue}>{activeMembers.length}</Text>
            <Text style={styles.kpiLabel}>Active Members</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconBg}>
              <Wallet size={18} color="#EC2028" />
            </View>
            <Text style={styles.kpiValue}>{formatMoney(monthlyTotal)}</Text>
            <Text style={styles.kpiLabel}>Monthly Total</Text>
          </View>
        </View>

        {/* Full referred members list */}
        <Text style={styles.sectionTitle}>Your Network</Text>
        <View style={styles.membersContainer}>
          {volunteerMembers.map((item, index) => {
            const meta = statusMeta(item.status);
            return (
              <View key={item.id} style={[styles.memberRow, index === volunteerMembers.length - 1 ? styles.noBorder : null]}>
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
              </View>
            );
          })}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  referralCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 22,
    marginBottom: 20,
  },
  glowOverlay: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#EC2028',
    opacity: 0.15,
  },
  referralLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.04,
    marginBottom: 8,
    zIndex: 1,
  },
  referralCode: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 10,
    zIndex: 1,
  },
  referralHint: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 18,
    zIndex: 1,
  },
  referralActionsRow: {
    flexDirection: 'row',
    gap: 10,
    zIndex: 1,
  },
  referralActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    paddingVertical: 13,
  },
  referralActionText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  kpiIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FBEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiValue: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 16,
    color: '#0C0C0D',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  kpiLabel: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#7A756E',
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 17,
    color: '#0C0C0D',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  membersContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
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
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'Inter',
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
