import React, { useState } from 'react';
import { View, Text, StyleSheet, Clipboard, TouchableOpacity, ScrollView, Alert, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Check, Clipboard as CopyIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const txnId = (params.id as string) || 'TXN9284KLM2';
  const amount = params.amount ? parseInt(params.amount as string, 10) : 500;
  const dateStr = (params.date as string) || 'Jul 9, 2026, 10:42 AM';
  const label = (params.label as string) || 'Monthly Contribution';

  const [copied, setCopied] = useState(false);

  const formatMoney = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  const handleCopyTxn = () => {
    Clipboard.setString(txnId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    Alert.alert(
      "Receipt Downloaded",
      `Branded receipt PDF for ${formatMoney(amount)} has been successfully saved to your downloads.`,
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Success Circle animation */}
        <View style={styles.successContainer}>
          <View style={styles.successGlow}>
            <View style={styles.successCircle}>
              <Check size={30} color="#22A559" strokeWidth={3} />
            </View>
          </View>
          <Text style={styles.successTitle}>Payment Successful</Text>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.amountDisplay}>{formatMoney(amount)}</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>For</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{label}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date &amp; Time</Text>
            <Text style={styles.detailValue}>{dateStr}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <TouchableOpacity style={styles.copyRow} onPress={handleCopyTxn} activeOpacity={0.7}>
              <Text style={styles.txnText}>{txnId}</Text>
              <CopyIcon size={13} color="#7A756E" />
            </TouchableOpacity>
          </View>

          <View style={[styles.detailRow, styles.noBorder]}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>UPI</Text>
          </View>

          {copied && (
            <Text style={styles.copiedFeedback}>Copied to clipboard!</Text>
          )}
        </View>

        {/* Delivery Status chips */}
        <View style={styles.deliveryStatusRow}>
          <View style={styles.statusChip}>
            <View style={styles.smallCheck}>
              <Check size={10} color="#22A559" strokeWidth={3} />
            </View>
            <Text style={styles.statusChipText}>WhatsApp: Sent</Text>
          </View>
          <View style={styles.statusChip}>
            <View style={styles.smallCheck}>
              <Check size={10} color="#22A559" strokeWidth={3} />
            </View>
            <Text style={styles.statusChipText}>Email: Sent</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Download Receipt (PDF)"
            onPress={handleDownloadPDF}
            style={styles.downloadButton}
          />
          <Button
            title="Back to Home"
            onPress={() => router.replace('/(tabs)/home')}
            variant="outline"
          />
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
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 24,
    alignItems: 'center',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successGlow: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(34,165,89,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
    // shadow
    shadowColor: '#22A559',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  successTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 20,
    color: '#0C0C0D',
    letterSpacing: -0.4,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#F9F8F6',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  amountDisplay: {
    textAlign: 'center',
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 34,
    color: '#0C0C0D',
    letterSpacing: -0.8,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEBE7',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#7A756E',
  },
  detailValue: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#0C0C0D',
    maxWidth: 160,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
    color: '#0C0C0D',
  },
  copiedFeedback: {
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#22A559',
    fontWeight: '600',
    marginTop: 8,
  },
  deliveryStatusRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 36,
  },
  statusChip: {
    flex: 1,
    backgroundColor: '#F9F8F6',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  smallCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#0C0C0D',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  downloadButton: {
    marginBottom: 4,
  },
});
