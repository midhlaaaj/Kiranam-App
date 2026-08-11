import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney } from '@/utils/format';

export default function SecurePaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { makeRazorpayPayment } = useApp();

  const amount = params.amount ? parseInt(params.amount as string, 10) : 500;
  const label = (params.label as string) || 'Monthly Contribution';
  const campaignId = params.campaignId as string | undefined;

  const [loading, setLoading] = useState(false);

  const handlePayNow = async () => {
    setLoading(true);
    try {
      const record = await makeRazorpayPayment(amount, label, campaignId);
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
      Alert.alert('Payment not completed', e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    }
  };

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
  buttonContainer: {
    marginTop: 'auto',
    width: '100%',
    paddingBottom: 24,
  },
});
