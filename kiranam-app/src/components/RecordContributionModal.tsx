import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import type { Campaign } from '@/context/AppContext';
import { validateAmount } from '@/utils/validators';

interface RecordContributionModalProps {
  visible: boolean;
  onClose: () => void;
  contributorName: string;
  campaigns: Campaign[];
  onSubmit: (amount: number, campaignId: string | null, label: string, note?: string) => Promise<{ error: string | null }>;
}

type ContributionType = 'monthly' | 'campaign';

export function RecordContributionModal({ visible, onClose, contributorName, campaigns, onSubmit }: RecordContributionModalProps) {
  const [type, setType] = useState<ContributionType>('monthly');
  const [amount, setAmount] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');

  useEffect(() => {
    if (visible) {
      setType('monthly');
      setAmount('');
      setSelectedCampaignId(activeCampaigns[0]?.id ?? null);
      setNote('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleAmountChange = (text: string) => {
    setAmount(text.replace(/[^0-9]/g, ''));
  };

  const handleSave = async () => {
    const numericAmount = parseInt(amount, 10);
    const amountError = validateAmount(amount);
    if (amountError) {
      Alert.alert('Amount required', amountError);
      return;
    }
    if (type === 'campaign' && !selectedCampaignId) {
      Alert.alert('Select a campaign', 'Choose which campaign this contribution supports.');
      return;
    }

    const campaign = type === 'campaign' ? activeCampaigns.find((c) => c.id === selectedCampaignId) : undefined;
    const label = type === 'campaign' ? campaign?.title || 'Campaign Contribution' : 'Monthly Contribution';

    setSaving(true);
    const { error } = await onSubmit(numericAmount, type === 'campaign' ? selectedCampaignId : null, label, note);
    setSaving(false);

    if (error) {
      Alert.alert('Could not record contribution', error);
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrapper}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Record Contribution</Text>
                <Text style={styles.subtitle}>{contributorName}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                <X size={18} color="#7A756E" />
              </TouchableOpacity>
            </View>

            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeOption, type === 'monthly' && styles.typeOptionActive]}
                onPress={() => setType('monthly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeOptionText, type === 'monthly' && styles.typeOptionTextActive]}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, type === 'campaign' && styles.typeOptionActive]}
                onPress={() => setType('campaign')}
                activeOpacity={0.8}
                disabled={activeCampaigns.length === 0}
              >
                <Text style={[styles.typeOptionText, type === 'campaign' && styles.typeOptionTextActive]}>Campaign</Text>
              </TouchableOpacity>
            </View>

            {type === 'campaign' && (
              activeCampaigns.length === 0 ? (
                <Text style={styles.noCampaignsText}>No active campaigns right now.</Text>
              ) : (
                <>
                  <Text style={styles.label}>Campaign</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.campaignList} contentContainerStyle={{ gap: 8 }}>
                    {activeCampaigns.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.campaignChip, selectedCampaignId === c.id && styles.campaignChipActive]}
                        onPress={() => setSelectedCampaignId(c.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.campaignChipText, selectedCampaignId === c.id && styles.campaignChipTextActive]}>
                          {c.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )
            )}

            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor="#B0ADA8"
                keyboardType="number-pad"
              />
            </View>

            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Collected in cash"
              placeholderTextColor="#B0ADA8"
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || (type === 'campaign' && activeCampaigns.length === 0)}
              activeOpacity={0.85}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Record Contribution'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,12,13,0.5)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    width: '100%',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 19,
    color: '#0C0C0D',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#7A756E',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9F8F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F9F8F6',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: '#0C0C0D',
  },
  typeOptionText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13.5,
    color: '#7A756E',
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#7A756E',
    marginBottom: 8,
  },
  noCampaignsText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#B0ADA8',
    marginBottom: 20,
  },
  campaignList: {
    marginBottom: 20,
  },
  campaignChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F9F8F6',
    borderWidth: 1.5,
    borderColor: '#E4E1DC',
  },
  campaignChipActive: {
    backgroundColor: '#FBEAEA',
    borderColor: '#EC2028',
  },
  campaignChipText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13,
    color: '#0C0C0D',
  },
  campaignChipTextActive: {
    color: '#EC2028',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: '#F9F8F6',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E4E1DC',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  currencySymbol: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#0C0C0D',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#0C0C0D',
    padding: 0,
  },
  input: {
    height: 50,
    backgroundColor: '#F9F8F6',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E4E1DC',
    paddingHorizontal: 16,
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#0C0C0D',
    marginBottom: 20,
  },
  saveButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EC2028',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: '#FFFFFF',
  },
  cancelButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
  },
});
