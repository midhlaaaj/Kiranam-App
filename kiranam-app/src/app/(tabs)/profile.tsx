import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { ChevronRight, Pencil, HeartHandshake, Clock3 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { EditProfileModal } from '@/components/EditProfileModal';
import { formatMoney } from '@/utils/format';
import { friendlyError } from '@/utils/errors';

export default function ProfileScreen() {
  const router = useRouter();
  const {
    userName,
    phone,
    userEmail,
    userAvatarUrl,
    isEmailVerified,
    hasCommitment,
    commitmentAmount,
    isAutopayEnabled,
    setAutopayEnabled,
    isVolunteer,
    signOut,
    deleteAccount,
    updateName,
    updateProfilePhoto,
    updateEmail,
  } = useApp();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const applyAutopayChange = async (val: boolean) => {
    const { error } = await setAutopayEnabled(val);
    if (error) Alert.alert('Could not update autopay', friendlyError(error));
  };

  const handlePause = () => {
    if (isAutopayEnabled) {
      Alert.alert(
        'Pause Contributions',
        'Are you sure you want to pause your monthly commitments? This turns off auto-pay — you can resume anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Pause', style: 'destructive', onPress: () => applyAutopayChange(false) },
        ]
      );
    } else {
      applyAutopayChange(true);
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* User Card Header */}
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
        </View>

        {/* Contribution Settings */}
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

        {/* Personal Info */}
        <Text style={styles.sectionHeader}>Personal Information</Text>
        <View style={styles.sectionCard}>
          <View style={styles.infoField}>
            <Text style={styles.infoFieldLabel}>Name</Text>
            <Text style={styles.infoFieldValue}>{userName}</Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.infoFieldLabel}>Phone</Text>
            <Text style={styles.infoFieldValue}>{phone || '+91 98765 43210'}</Text>
          </View>
          <View style={[styles.infoField, styles.noBorder]}>
            <Text style={styles.infoFieldLabel}>
              Email {userEmail && (
                <Text style={isEmailVerified ? styles.infoFieldVerified : styles.infoFieldUnverified}>
                  {isEmailVerified ? '· Verified' : '· Pending verification'}
                </Text>
              )}
            </Text>
            <Text style={styles.infoFieldValue}>{userEmail || 'Not set'}</Text>
          </View>
        </View>

        {/* Volunteering */}
        <Text style={styles.sectionHeader}>Volunteering</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={[styles.actionRow, styles.noBorder]}
            activeOpacity={isVolunteer ? 1 : 0.7}
            disabled={isVolunteer}
            onPress={() => router.push('/volunteer-application')}
          >
            <View style={styles.volunteerRowLeft}>
              <View style={styles.volunteerIconBg}>
                {isVolunteer ? (
                  <Clock3 size={18} color="#EC2028" strokeWidth={2} />
                ) : (
                  <HeartHandshake size={18} color="#EC2028" strokeWidth={2} />
                )}
              </View>
              <View>
                <Text style={styles.actionRowText}>Become a Volunteer</Text>
                {isVolunteer && <Text style={styles.volunteerPendingText}>Application pending review</Text>}
              </View>
            </View>
            {!isVolunteer && <ChevronRight size={16} color="#D8D5D0" />}
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
        currentEmail={userEmail}
        onSaveName={updateName}
        onSavePhoto={updateProfilePhoto}
        onSaveEmail={updateEmail}
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
    paddingBottom: 110, // Prevent overlapping tab bar
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
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 24,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'Inter-Bold',
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
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
    marginBottom: 3,
  },
  rowSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#7A756E',
    marginBottom: 3,
  },
  rowValue: {
    fontFamily: 'Inter-Bold',
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
  infoField: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  infoFieldLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#7A756E',
    marginBottom: 4,
  },
  infoFieldSubText: {
    textTransform: 'none',
  },
  infoFieldVerified: {
    textTransform: 'none',
    color: '#22A559',
  },
  infoFieldUnverified: {
    textTransform: 'none',
    color: '#B0ADA8',
  },
  infoFieldValue: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#0C0C0D',
  },
  volunteerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  volunteerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volunteerPendingText: {
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
    fontWeight: '500',
    fontSize: 14,
    color: '#0C0C0D',
  },
  logoutText: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
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
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
