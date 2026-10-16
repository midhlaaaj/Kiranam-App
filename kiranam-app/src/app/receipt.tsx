import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Button } from '@/components/Button';
import { Check, Clipboard as CopyIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/utils/format';
import { KIRANAM_LOGO_DATA_URI, HCF_LOGO_DATA_URI, HCF_SEAL_DATA_URI } from '@/constants/receiptAssets';

export default function ReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userName, userEmail, phone, isCoordinator, payments } = useApp();

  // The post-payment flow passes every field; a push-notification deep link
  // only carries the id, so the rest is filled in from the payment history.
  const txnId = (params.id as string) || '';
  const record = payments.find((p) => p.id === txnId);
  const amountParam = params.amount ? parseInt(params.amount as string, 10) : NaN;
  const amount = Number.isFinite(amountParam) ? amountParam : record?.amount;
  const dateStr = (params.date as string) || record?.date;
  const label = (params.label as string) || record?.label;
  const homeRoute = isCoordinator ? '/(coordinator-tabs)/dashboard' : '/(tabs)/home';
  const receiptMissing = !txnId || amount === undefined || !dateStr || !label;

  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopyTxn = async () => {
    try {
      await Clipboard.setStringAsync(txnId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Could not copy', 'Please try again.');
    }
  };

  const receiptHtml = `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 40px; color: #0C0C0D; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; }
          .header-left img.kiranam-logo { height: 48px; display: block; }
          .header-left .title { text-align: left; font-size: 16px; font-weight: 700; color: #7A756E; margin-top: 10px; }
          .header-right { text-align: left; }
          .header-right img.hcf-logo { height: 60px; }
          .header-right .gov-line { font-size: 11px; color: #7A756E; margin-top: 6px; }
          .header-right .sra-line { font-size: 11px; color: #7A756E; }
          .address { text-align: left; font-size: 12px; line-height: 18px; color: #7A756E; margin-top: 10px; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 12px 0; border-bottom: 1px solid #EEEBE7; font-size: 14px; }
          td.label { color: #7A756E; }
          td.value { text-align: right; font-weight: 600; }
          .amount-row td { font-size: 18px; }
          .amount-row td.value { color: #EC2028; }
          .signoff { display: flex; justify-content: flex-end; margin-top: 44px; }
          .signoff-block { text-align: center; }
          .signoff-block img.seal { height: 90px; display: block; margin: 0 auto 8px; }
          .signoff-block .thanks { font-size: 13px; font-weight: 700; color: #0C0C0D; }
          .footer { margin-top: 40px; font-size: 11px; color: #B0ADA8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <img class="kiranam-logo" src="${KIRANAM_LOGO_DATA_URI}" />
            <div class="title">Payment Receipt</div>
            <div class="address">
              P.O.Kattippara, Poonoor<br />
              673573, Kerala, India<br />
              Ph: +91 9946661059<br />
              Email: support@kiranam.online<br />
              www.healthcarefoundation.in
            </div>
          </div>
          <div class="header-right">
            <img class="hcf-logo" src="${HCF_LOGO_DATA_URI}" />
            <div class="gov-line">Government of Kerala</div>
            <div class="sra-line">SRA No. 423/2010</div>
          </div>
        </div>

        <table style="margin-top: 32px;">
          <tr><td class="label">Name</td><td class="value">${userName || '-'}</td></tr>
          <tr><td class="label">Email</td><td class="value">${userEmail || '-'}</td></tr>
          <tr><td class="label">Mobile Number</td><td class="value">${phone || '-'}</td></tr>
          <tr class="amount-row"><td class="label">Amount</td><td class="value">${formatMoney(amount ?? 0)}</td></tr>
          <tr><td class="label">Transaction ID</td><td class="value">${txnId}</td></tr>
          <tr><td class="label">Date</td><td class="value">${dateStr}</td></tr>
        </table>

        <div class="signoff">
          <div class="signoff-block">
            <img class="seal" src="${HCF_SEAL_DATA_URI}" />
            <div class="thanks">Thank you for your contribution.</div>
          </div>
        </div>

        <div class="footer">This is a computer-generated receipt for your contribution to Kiranam.</div>
        <div class="footer" style="margin-top: 8px;">Health Care Foundation is approved under Section 80G of the Income Tax Act, 1961 (Approval No. AAATH8790C28KC02, valid for assessment years 2027-28 to 2031-32). Contributions may be eligible for deduction subject to the provisions of the Act.</div>
      </body>
    </html>
  `;

  const handleDownloadReceipt = async () => {
    if (receiptMissing) return;
    setDownloading(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: receiptHtml });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save Receipt' });
      } else {
        Alert.alert('Receipt ready', `Saved to ${uri}`);
      }
    } catch {
      Alert.alert('Could not create receipt', 'Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // The emailed (and WhatsApp) receipt is sent by the server for every
  // successful payment — see kiranam-admin's /api/receipts/send — so this
  // screen no longer emails it itself.

  if (receiptMissing) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Receipt not found</Text>
          <Text style={styles.notFoundText}>We couldn&apos;t find the details for this payment. You can find it under your contribution history.</Text>
          <Button title="Back to Home" onPress={() => router.replace(homeRoute)} />
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.amountDisplay}>{formatMoney(amount ?? 0)}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>For</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{label}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date &amp; Time</Text>
            <Text style={styles.detailValue}>{dateStr}</Text>
          </View>

          <View style={[styles.detailRow, styles.noBorder]}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <TouchableOpacity style={styles.copyRow} onPress={handleCopyTxn} activeOpacity={0.7}>
              <Text style={styles.txnText} numberOfLines={1} ellipsizeMode="tail">
                {txnId}
              </Text>
              <CopyIcon size={13} color="#7A756E" />
            </TouchableOpacity>
          </View>

          {copied && (
            <Text style={styles.copiedFeedback}>Copied to clipboard!</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title={downloading ? 'Preparing…' : 'Download Receipt'}
            onPress={handleDownloadReceipt}
            loading={downloading}
            style={styles.downloadButton}
          />
          <Button
            title="Back to Home"
            onPress={() => router.replace(homeRoute)}
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
  notFound: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  notFoundTitle: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 22,
    color: '#0C0C0D',
    textAlign: 'center',
  },
  notFoundText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: '#7A756E',
    textAlign: 'center',
    marginBottom: 10,
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
    fontFamily: 'Inter-Bold',
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
    marginBottom: 32,
  },
  amountDisplay: {
    textAlign: 'center',
    fontFamily: 'Inter-ExtraBold',
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
    gap: 12,
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
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    fontWeight: '600',
    color: '#0C0C0D',
    maxWidth: 160,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    gap: 6,
  },
  txnText: {
    flexShrink: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
    color: '#0C0C0D',
  },
  copiedFeedback: {
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#22A559',
    fontWeight: '600',
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  downloadButton: {
    marginBottom: 4,
    // The primary button's red drop shadow (offset 8 / radius 15) otherwise
    // bleeds down onto the outline button's top border right below it,
    // making that edge look faded/tinted instead of a clean grey line.
    shadowOpacity: 0,
    elevation: 0,
  },
});
