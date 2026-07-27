import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SecurePaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { makePayment, isAutopayEnabled, setAutopayEnabled } = useApp();

  const amount = params.amount ? parseInt(params.amount as string, 10) : 500;
  const label = (params.label as string) || 'Monthly Contribution';
  const campaignId = params.campaignId as string | undefined;

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [loading, setLoading] = useState(false);

  const formatMoney = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  const handlePayNow = async () => {
    setLoading(true);
    try {
      const record = await makePayment(amount, label, campaignId);
      setLoading(false);
      // Route to success receipt page
      router.replace({
        pathname: '/receipt',
        params: {
          id: record.id,
          amount: record.amount,
          date: record.date,
          label: record.label
        }
      });
    } catch (e) {
      setLoading(false);
    }
  };

  const payMethods = [
    { key: 'upi', label: 'UPI' },
    { key: 'card', label: 'Card' },
    { key: 'netbanking', label: 'Netbanking' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Amount Summary */}
        <Text style={styles.amountLabel}>Amount to pay</Text>
        <Text style={styles.amountText}>{formatMoney(amount)}</Text>
        
        <View style={styles.securedRow}>
          <Lock size={12} color="#7A756E" />
          <Text style={styles.securedText}>Secured by Razorpay</Text>
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.methodsContainer}>
          {payMethods.map((m) => {
            const isSelected = paymentMethod === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.methodRow, isSelected ? styles.activeMethodRow : null]}
                onPress={() => setPaymentMethod(m.key as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.methodLabel}>{m.label}</Text>
                <View style={[styles.radioOuter, isSelected ? styles.radioOuterActive : null]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Autopay Toggle Widget */}
        <View style={styles.autopayBox}>
          <View style={styles.autopayInfo}>
            <Text style={styles.autopayTitle}>Enable Auto-pay</Text>
            <Text style={styles.autopaySubtitle}>Turn this off anytime from your profile.</Text>
          </View>
          <TouchableOpacity 
            style={[styles.toggleOuter, isAutopayEnabled ? styles.toggleOuterActive : null]}
            onPress={() => setAutopayEnabled(!isAutopayEnabled)}
            activeOpacity={0.8}
          >
            <View style={[styles.toggleKnob, isAutopayEnabled ? styles.toggleKnobActive : null]} />
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={loading ? "Processing..." : `Pay ${formatMoney(amount)} Now`}
            onPress={handlePayNow}
            loading={loading}
          />
        </View>
      </View>
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
    marginBottom: 20,
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
    fontSize: 18,
    color: '#0C0C0D',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },
  amountLabel: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: '#7A756E',
    textAlign: 'center',
    marginBottom: 6,
  },
  amountText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 46,
    color: '#0C0C0D',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 10,
  },
  securedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
  },
  securedText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#7A756E',
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#7A756E',
    textTransform: 'uppercase',
    letterSpacing: 0.04,
    marginBottom: 10,
  },
  methodsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F8F6',
    borderRadius: 28,
    height: 56,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeMethodRow: {
    backgroundColor: '#FDECEC',
    borderColor: '#FDECEC',
  },
  methodLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 15,
    color: '#0C0C0D',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E4E1DC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioOuterActive: {
    borderColor: '#EC2028',
    backgroundColor: '#EC2028',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  autopayBox: {
    backgroundColor: '#F9F8F6',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  autopayInfo: {
    flex: 1,
  },
  autopayTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
    marginBottom: 4,
  },
  autopaySubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#7A756E',
    lineHeight: 16,
  },
  toggleOuter: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E4E1DC',
    padding: 3,
    justifyContent: 'center',
  },
  toggleOuterActive: {
    backgroundColor: '#EC2028',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  buttonContainer: {
    marginTop: 'auto',
    width: '100%',
    paddingBottom: 24,
  },
});
