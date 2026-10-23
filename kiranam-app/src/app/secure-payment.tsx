import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatMoney } from '@/utils/format';
import { friendlyError } from '@/utils/errors';

export default function SecurePaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { makeRazorpayPayment } = useApp();

  const amount = params.amount ? parseInt(params.amount as string, 10) : NaN;
  const label = (params.label as string) || 'Monthly Contribution';
  const campaignId = params.campaignId as string | undefined;
  // Set only by the "Pay again" flow (Home/Dashboard), which already
  // warned the contributor they've paid this cycle and got an explicit
  // "Continue" — lets this one request through the normal one-payment-
  // per-cycle guard in makeRazorpayPayment.
  const allowRepeat = params.allowRepeat === '1';

  const [loading, setLoading] = useState(false);

  const handlePayNow = async () => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setLoading(true);
    try {
      const record = await makeRazorpayPayment(amount, label, campaignId, allowRepeat);
      setLoading(false);
      // Route to success receipt page
      router.replace({
        pathname: '/receipt',
        params: {
          from: 'payment',
          id: record.id,
          amount: record.amount,
          date: record.date,
          label: record.label
        }
      });
    } catch (e) {
      setLoading(false);
      Alert.alert('Payment not completed', e instanceof Error ? friendlyError(e.message) : 'Something went wrong. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Secure Payment" />

      <View style={styles.content}>
        {/* Amount Summary */}
        <Text style={styles.amountLabel}>Amount to pay</Text>
        <Text style={styles.amountText}>{Number.isFinite(amount) && amount > 0 ? formatMoney(amount) : '—'}</Text>
        {!(Number.isFinite(amount) && amount > 0) && (
          <Text style={styles.invalidText}>No amount selected. Go back and choose an amount.</Text>
        )}
        
        <View style={styles.securedRow}>
          <Lock size={12} color="#7A756E" />
          <Text style={styles.securedText}>Secured by Razorpay</Text>
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={loading ? "Processing..." : Number.isFinite(amount) && amount > 0 ? `Pay ${formatMoney(amount)} Now` : 'Pay Now'}
            onPress={handlePayNow}
            loading={loading}
            disabled={!Number.isFinite(amount) || amount <= 0}
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
    fontFamily: 'Inter-ExtraBold',
    fontWeight: '800',
    fontSize: 46,
    color: '#0C0C0D',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 10,
  },
  invalidText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#BA1A1A',
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
  buttonContainer: {
    marginTop: 'auto',
    width: '100%',
    paddingBottom: 24,
  },
});
