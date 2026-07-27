import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VolunteerProfileScreen() {
  const router = useRouter();
  const {
    userName,
    phone,
    myReferralCode,
    signOut,
    deleteAccount,
  } = useApp();

  const handleLogout = async () => {
    await signOut();
    router.replace('/');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and volunteer history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) {
              Alert.alert('Could not delete account', error);
              return;
            }
            router.replace('/');
          },
        },
      ]
    );
  };

  const getInitials = (name: string) =>
    name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Identity Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(userName)}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userPhone}>{phone || '+91 98765 43210'}</Text>
          <View style={styles.volunteerBadge}>
            <Text style={styles.volunteerBadgeText}>Volunteer · {myReferralCode}</Text>
          </View>
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

          <TouchableOpacity style={[styles.actionRow, styles.noBorder]} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <Text style={styles.logoutText}>Delete Account</Text>
          </TouchableOpacity>
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
    paddingBottom: 110,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
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
