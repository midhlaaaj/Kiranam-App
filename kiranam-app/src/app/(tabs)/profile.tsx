import { useTabBarPadding } from '@/components/AnimatedTabBar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { ChevronRight, Pencil, HeartHandshake, Clock3 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { EditProfileModal } from '@/components/EditProfileModal';
import { formatMoney } from '@/utils/format';
import { friendlyError } from '@/utils/errors';
import { getInitials } from '@/utils/initials';

export default function ProfileScreen() {
  const tabBarPadding = useTabBarPadding();
  const router = useRouter();
  const {
    userName,
    phone,
    userAvatarUrl,
    hasCommitment,
    commitmentAmount,
    isAutopayEnabled,
    mandateStatus,
    enableAutopay,
    disableAutopay,
    contributionPaused,
    setContributionPaused,
    isCoordinator,
    signOut,
    deleteAccount,
    updateProfilePhoto,
  } = useApp();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [autopayBusy, setAutopayBusy] = useState(false);
  const [pauseBusy, setPauseBusy] = useState(false);

  const handleToggleAutopay = async () => {
    setAutopayBusy(true);
    const { error } = isAutopayEnabled ? await disableAutopay() : await enableAutopay(commitmentAmount);
    setAutopayBusy(false);
    if (error) Alert.alert('Could not update autopay', friendlyError(error));
  };

  // Pausing is a heavier action than turning autopay off on its own — it
  // also cancels any live mandate outright and stops WhatsApp broadcasts
  // reaching this contributor, so it gets an explicit warning step rather
  // than firing on a single tap the way the autopay toggle does.
  const handlePauseContributions = () => {
    Alert.alert(
      'Pause your contributions?',
      "This will turn off autopay (if it's on) and stop WhatsApp updates from Kiranam until you resume. Your giving history is kept either way.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause',
          style: 'destructive',
          onPress: async () => {
            setPauseBusy(true);
            const { error } = await setContributionPaused(true);
            setPauseBusy(false);
            if (error) Alert.alert('Could not pause', friendlyError(error));
          },
        },
      ]
    );
  };

  const handleResumeContributions = async () => {
    setPauseBusy(true);
    const { error } = await setContributionPaused(false);
    setPauseBusy(false);
    if (error) Alert.alert('Could not resume', friendlyError(error));
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/');
  };

  const handleAccountDeleted = () => {
    setDeleteModalVisible(false);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]} showsVerticalScrollIndicator={false}>
        
        {/* User Card Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.editButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Edit profile photo"
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.7}
          >
            <Pencil size={14} color="#0C0C0D" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          {userAvatarUrl ? (
            <Image source={{ uri: userAvatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(userName)}</Text>
            </View>
          )}
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userPhone}>{phone || 'Phone not set'}</Text>
        </View>

        {/* Contribution Settings */}
        <Text style={styles.sectionHeader}>Contribution Settings</Text>
        <View style={styles.sectionCard}>
          <View style={styles.profileRow}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowSubtitle}>Monthly commitment</Text>
              <Text style={styles.rowValue}>{hasCommitment ? formatMoney(commitmentAmount) : 'Not set'}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/choose-amount')} activeOpacity={0.7} hitSlop={12} accessibilityRole="button">
              <Text style={styles.actionLink}>{hasCommitment ? 'Update' : 'Set up'}</Text>
            </TouchableOpacity>
          </View>

          {!contributionPaused && hasCommitment && (
            <TouchableOpacity style={[styles.paddingRow, styles.rowBorder]} onPress={handleToggleAutopay} activeOpacity={0.7} disabled={autopayBusy}>
              <Text style={styles.actionLink}>
                {autopayBusy ? 'Working…' : isAutopayEnabled ? 'Turn off Autopay' : 'Turn on Autopay'}
              </Text>
              {isAutopayEnabled && mandateStatus && mandateStatus !== 'authenticated' && mandateStatus !== 'active' && (
                <Text style={styles.mandateWarningText}>Mandate {mandateStatus} — tap to fix</Text>
              )}
            </TouchableOpacity>
          )}

          {hasCommitment && (
            <TouchableOpacity
              style={[styles.paddingRow, styles.noBorder]}
              onPress={contributionPaused ? handleResumeContributions : handlePauseContributions}
              activeOpacity={0.7}
              disabled={pauseBusy}
            >
              <Text style={[styles.actionLink, contributionPaused ? null : styles.pauseLinkText]}>
                {pauseBusy ? 'Working…' : contributionPaused ? 'Resume my contributions' : 'Pause my contributions'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionHeader}>Personal Information</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={[styles.actionRow, styles.noBorder]} activeOpacity={0.7} onPress={() => router.push('/personal-details')}>
            <Text style={styles.actionRowText}>Name, phone &amp; email</Text>
            <ChevronRight size={16} color="#D8D5D0" />
          </TouchableOpacity>
        </View>

        {/* Coordinator */}
        <Text style={styles.sectionHeader}>Coordinator</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={[styles.actionRow, styles.noBorder]}
            activeOpacity={isCoordinator ? 1 : 0.7}
            disabled={isCoordinator}
            onPress={() => router.push('/coordinator-application')}
          >
            <View style={styles.coordinatorRowLeft}>
              <View style={styles.coordinatorIconBg}>
                {isCoordinator ? (
                  <Clock3 size={18} color="#EC2028" strokeWidth={2} />
                ) : (
                  <HeartHandshake size={18} color="#EC2028" strokeWidth={2} />
                )}
              </View>
              <View>
                <Text style={styles.actionRowText}>Become a Coordinator</Text>
                {isCoordinator && <Text style={styles.coordinatorPendingText}>Application pending review</Text>}
              </View>
            </View>
            {!isCoordinator && <ChevronRight size={16} color="#D8D5D0" />}
          </TouchableOpacity>
        </View>

        {/* Account Options */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => router.push('/about')}>
            <Text style={styles.actionRowText}>About Kiranam</Text>
            <ChevronRight size={16} color="#D8D5D0" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() => router.push('/support')}
          >
            <Text style={styles.actionRowText}>Support</Text>
            <ChevronRight size={16} color="#D8D5D0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => router.push('/privacy-policy')}>
            <Text style={styles.actionRowText}>Privacy Policy</Text>
            <ChevronRight size={16} color="#D8D5D0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => router.push('/terms')}>
            <Text style={styles.actionRowText}>Terms &amp; Conditions</Text>
            <ChevronRight size={16} color="#D8D5D0" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, styles.noBorder]} onPress={() => setDeleteModalVisible(true)} activeOpacity={0.7}>
            <Text style={styles.logoutText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>

      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirmed={deleteAccount}
        onDeleted={handleAccountDeleted}
        description="This permanently deletes your account and contribution history. This cannot be undone."
      />

      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        currentName={userName}
        currentAvatarUrl={userAvatarUrl}
        onSavePhoto={updateProfilePhoto}
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
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1EEEA',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  editButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: '#0C0C0D',
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#0C0C0D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
    marginBottom: 10,
  },
  avatarText: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'Inter-Bold',
    fontSize: 19,
    color: '#0C0C0D',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  userPhone: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#7A756E',
  },
  sectionHeader: {
    fontFamily: 'Inter-Bold',
    fontSize: 11.5,
    color: '#B0ADA8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F1EEEA',
    paddingHorizontal: 16,
    marginBottom: 12,
    // Subtle shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  paddingRow: {
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  mandateWarningText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#BA1A1A',
    marginTop: 3,
  },
  pauseLinkText: {
    color: '#7A756E',
  },
  rowInfo: {
    flex: 1,
  },
  rowSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#7A756E',
    marginBottom: 3,
  },
  rowValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 19,
    color: '#0C0C0D',
  },
  actionLink: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: '#EC2028',
  },
  coordinatorRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coordinatorIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinatorPendingText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#7A756E',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  actionRowText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#0C0C0D',
  },
  logoutText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#EC2028',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  logoutButton: {
    backgroundColor: '#EC2028',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
