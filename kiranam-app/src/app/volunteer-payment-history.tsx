import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, PaymentRecord } from '@/context/AppContext';
import { ArrowLeft, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VolunteerPaymentHistoryScreen() {
  const router = useRouter();
  const { payments } = useApp();

  const formatMoney = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  const handleRowPress = (item: PaymentRecord) => {
    if (item.ok) {
      router.push({
        pathname: '/receipt',
        params: { id: item.id, amount: item.amount, date: item.date, label: item.label },
      });
      return;
    }
    Alert.alert(
      'Payment failed',
      `Your ${formatMoney(item.amount)} payment for "${item.label}" on ${item.date} didn't go through — usually a bank decline or network issue.`,
      [
        { text: 'Dismiss', style: 'cancel' },
        {
          text: 'Try again',
          onPress: () => router.push({ pathname: '/secure-payment', params: { amount: item.amount, label: item.label } }),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Contributions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleRowPress(item)}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentLeft}>
                <View style={[styles.statusIconBg, item.ok ? styles.successIconBg : styles.failedIconBg]}>
                  {item.ok ? (
                    <ShieldCheck size={16} color="#22A559" />
                  ) : (
                    <Text style={styles.failedTextSymbol}>✕</Text>
                  )}
                </View>
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={[styles.paymentDate, !item.ok && styles.failedDateText]}>
                    {item.ok ? item.date : `${item.date} · Failed`}
                  </Text>
                </View>
              </View>
              <View style={styles.paymentRight}>
                <Text style={[styles.paymentAmount, !item.ok && styles.failedAmountText]}>{formatMoney(item.amount)}</Text>
                <ChevronRight size={16} color="#D8D5D0" />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Text style={styles.emptyCurrencyIcon}>₹</Text>
            </View>
            <Text style={styles.emptyTitle}>No contributions yet</Text>
            <Text style={styles.emptySubtitle}>Your first payment will show up here once you make one.</Text>
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
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 17,
    color: '#0C0C0D',
    letterSpacing: -0.3,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    fontSize: 14,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
    marginBottom: 3,
  },
  paymentDate: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#B0ADA8',
  },
  failedDateText: {
    color: '#EC2028',
    fontWeight: '600',
  },
  paymentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentAmount: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: '#0C0C0D',
  },
  failedAmountText: {
    color: '#C7C3BD',
    textDecorationLine: 'line-through',
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
    backgroundColor: '#F9F8F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyCurrencyIcon: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '400',
    color: '#C7C3BD',
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
    maxWidth: 220,
  },
});
