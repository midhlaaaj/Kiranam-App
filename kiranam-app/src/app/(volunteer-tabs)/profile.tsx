import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { ChevronRight, Pencil } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { EditProfileModal } from '@/components/EditProfileModal';

export default function VolunteerProfileScreen() {
  const router = useRouter();
  const {
    userName,
    phone,
    userAvatarUrl,
    myReferralCode,
    signOut,
    deleteAccount,
    updateName,
    updateProfilePhoto,
    hasCommitment,
    commitmentAmount,
    isAutopayEnabled,
    setAutopayEnabled,
  } = useApp();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const handlePause = () => {
    if (isAutopayEnabled) {
      Alert.alert(
        'Pause Contributions',
        'Are you sure you want to pause your monthly commitments? This turns off auto-pay — you can resume anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Pause', style: 'destructive', onPress: () => setAutopayEnabled(false) },
        ]
      );
    } else {
      setAutopayEnabled(true);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/');
  };

  const handleAccountDeleted = () => {
    setDeleteModalVisible(false);
    router.replace('/');
  };

  const getInitials = (name: string) =>
    name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2);

  const formatMoney = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Identity Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.editButton}
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
          <Text style={styles.userPhone}>{phone || '+91 98765 43210'}</Text>
          <View style={styles.volunteerBadge}>
            <Text style={styles.volunteerBadgeText}>Volunteer · {myReferralCode}</Text>
          </View>
        </View>

        {/* Contribution Settings — the commitment amount editor, matching
            the contributor profile's layout so it's consistent across roles */}
        <Text style={styles.sectionHeader}>Contribution Settings</Text>
        <View style={styles.sectionCard}>
          <View style={styles.profileRow}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowSubtitle}>Monthly commitment</Text>
              <Text style={styles.rowValue}>{hasCommitment ? formatMoney(commitmentAmount) : 'Not set'}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/choose-amount')} activeOpacity={0.7}>
              <Text style={styles.actionLink}>{hasCommitment ? 'Update' : 'Set up'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.paddingRow} onPress={handlePause} activeOpacity={0.7}>
            <Text style={styles.actionLink}>{isAutopayEnabled ? 'Pause my contributions' : 'Resume my contributions'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={[styles.actionRow, styles.noBorder]}
            activeOpacity={0.7}
            onPress={() => router.push('/volunteer-payment-history')}
          >
            <Text style={styles.actionRowText}>My Contribution History</Text>
            <ChevronRight size={16} color="#D8D5D0" />
          </TouchableOpacity>
        </View>

        {/* Account Options */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.sectionCard}>
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

          <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={handleLogout}>
            <Text style={styles.actionRowText}>Log Out</Text>
            <ChevronRight size={16} color="#D8D5D0" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, styles.noBorder]} onPress={() => setDeleteModalVisible(true)} activeOpacity={0.7}>
            <Text style={styles.logoutText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirmed={deleteAccount}
        onDeleted={handleAccountDeleted}
        description="This permanently deletes your account and volunteer history. This cannot be undone."
      />

      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        currentName={userName}
        currentAvatarUrl={userAvatarUrl}
        onSaveName={updateName}
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
    paddingBottom: 110,
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
    fontFamily: 'Inter',
    fontWeight: '600',
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
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 24,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 19,
    color: '#0C0C0D',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  userPhone: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#7A756E',
    marginBottom: 10,
  },
  volunteerBadge: {
    backgroundColor: '#FBEAEA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  volunteerBadgeText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#EC2028',
  },
  sectionHeader: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B0ADA8',
    textTransform: 'uppercase',
    letterSpacing: 0.08,
    marginBottom: 12,
    marginTop: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F1EEEA',
    paddingHorizontal: 16,
    marginBottom: 20,
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
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 19,
    color: '#0C0C0D',
  },
  actionLink: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#EC2028',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  actionRowText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    color: '#0C0C0D',
  },
  logoutText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#EC2028',
  },
});
