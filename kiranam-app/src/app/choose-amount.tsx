import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TextInput, StatusBar, Keyboard, InputAccessoryView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { validateAmount } from '@/utils/validators';
import { formatMoney } from '@/utils/format';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MIN_AMOUNT = 30;

export default function ChooseAmountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { commitmentAmount, setCommitmentAmount, campaigns } = useApp();

  const customAmountAccessoryId = 'customAmountAccessory';

  const campaignId = params.campaignId as string | undefined;
  const campaignTitle = params.campaignTitle as string | undefined;
  const isCommitmentMode = !campaignId;
  const isOnboarding = params.onboarding === '1';

  const campaign = campaignId ? campaigns.find((c) => c.id === campaignId) : undefined;
  // Cap donations at what's actually left to fill the campaign, so a person
  // can't pledge more than the campaign still needs.
  const remaining = campaign ? Math.max(0, campaign.goal - campaign.raised) : null;

  const [selectedAmount, setSelectedAmount] = useState<number | null>(campaignId ? 100 : commitmentAmount);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const amountOptions = [
    { value: 30, label: formatMoney(30), sub: 'Minimum' },
    { value: 50, label: formatMoney(50), sub: null },
    { value: 100, label: formatMoney(100), sub: 'Recommended' },
    { value: 250, label: formatMoney(250), sub: null },
    { value: 500, label: formatMoney(500), sub: null },
    { value: 1000, label: formatMoney(1000), sub: null },
  ];

  const handleSelectOption = (value: number) => {
    if (remaining !== null && value > remaining) return;
    setSelectedAmount(value);
    setIsCustomOpen(false);
    setCustomAmount('');
  };

  const handleCustomBoxPress = () => {
    setIsCustomOpen(true);
    setSelectedAmount(null);
    setAmountError('');
  };

  const handleCustomAmountChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '');
    const capped = remaining !== null && numeric ? Math.min(parseInt(numeric, 10), remaining).toString() : numeric;
    setCustomAmount(capped);
    setSelectedAmount(capped ? parseInt(capped, 10) : null);
    setAmountError('');
  };

  const currentFinalAmount = selectedAmount;

  const validateCurrentAmount = () => {
    const err = validateAmount(currentFinalAmount ?? '', {
      min: MIN_AMOUNT,
      max: remaining ?? undefined,
      label: 'a contribution amount',
    });
    setAmountError(err || '');
    return !err;
  };

  const handleContinue = () => {
    if (!validateCurrentAmount() || !currentFinalAmount) return;

    // Route to secure payment
    router.push({
      pathname: '/secure-payment',
      params: {
        amount: currentFinalAmount,
        label: campaignTitle || 'Monthly Contribution',
        campaignId: campaignId
      }
    });
  };

  const handleSave = async () => {
    if (!validateCurrentAmount() || !currentFinalAmount) return;
    setSaveState('saving');
    const { error } = await setCommitmentAmount(currentFinalAmount);
    if (error) {
      setSaveState('idle');
      Alert.alert('Could not save', error);
      return;
    }
    setSaveState('saved');
    setTimeout(() => {
      if (isOnboarding) {
        router.replace('/(tabs)/home');
      } else {
        router.back();
      }
    }, 900);
  };

  const handleSkip = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Back button (or Skip, when reached as part of onboarding — there's
              nothing meaningful to go "back" to in that case) */}
          {isOnboarding ? (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#0C0C0D" />
            </TouchableOpacity>
          )}

          {/* Titles */}
          <Text style={styles.title}>
            {campaignTitle 
              ? `Support Campaign:\n${campaignTitle}` 
              : "Choose your monthly\ncontribution"}
          </Text>
          <Text style={styles.subtitle}>
            {campaignTitle
              ? "Your donation goes directly to fund active on-ground relief operations."
              : "You can change or pause this commitment anytime."}
          </Text>

          {remaining !== null && (
            <Text style={styles.remainingHint}>
              Only {formatMoney(remaining)} left to fully fund this campaign
            </Text>
          )}

          {/* Amount Chips Grid */}
          <View style={styles.gridContainer}>
            {amountOptions.map((opt) => {
              const isSelected = selectedAmount === opt.value && !isCustomOpen;
              const isDisabled = remaining !== null && opt.value > remaining;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, isSelected ? styles.activeChip : null, isDisabled ? styles.disabledChip : null]}
                  onPress={() => handleSelectOption(opt.value)}
                  activeOpacity={isDisabled ? 1 : 0.55}
                  disabled={isDisabled}
                >
                  <Text style={[styles.chipLabel, isSelected ? styles.activeChipLabel : null, isDisabled ? styles.disabledChipLabel : null]}>
                    {opt.label}
                  </Text>
                  {opt.sub && (
                    <Text style={[styles.chipSubText, isSelected ? styles.activeChipSubText : null]}>
                      {opt.sub}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Amount Expander Box */}
          <TouchableOpacity 
            style={[styles.customBox, isCustomOpen ? styles.activeCustomBox : null]} 
            onPress={handleCustomBoxPress}
            activeOpacity={0.9}
          >
            {isCustomOpen ? (
              <View style={styles.customBoxActiveInner}>
                <Text style={styles.customBoxActiveTitle}>Custom Amount</Text>
                <View style={styles.customInputRow}>
                  <Text style={styles.customCurrencySymbol}>₹</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="Enter amount"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    value={customAmount}
                    onChangeText={handleCustomAmountChange}
                    autoFocus
                    inputAccessoryViewID={Platform.OS === 'ios' ? customAmountAccessoryId : undefined}
                  />
                </View>
              </View>
            ) : (
              <Text style={styles.customBoxText}>Custom Amount</Text>
            )}
          </TouchableOpacity>
          {!!amountError && <Text style={styles.amountErrorText}>{amountError}</Text>}

          {/* Continue/Save button at bottom */}
          <View style={styles.buttonContainer}>
            {isCommitmentMode ? (
              <Button
                title={saveState === 'saved' ? 'Saved' : 'Save'}
                onPress={handleSave}
                disabled={!currentFinalAmount || saveState !== 'idle'}
                loading={saveState === 'saving'}
              />
            ) : (
              <Button
                title="Continue"
                onPress={handleContinue}
                disabled={!currentFinalAmount}
              />
            )}
          </View>
        </ScrollView>
        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={customAmountAccessoryId}>
            <View style={styles.accessoryBar}>
              <TouchableOpacity onPress={() => Keyboard.dismiss()} hitSlop={8}>
                <Text style={styles.accessoryDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F8F6',
    marginBottom: 20,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  skipButtonText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#7A756E',
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 25,
    color: '#0C0C0D',
    letterSpacing: -0.6,
    lineHeight: 33,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#7A756E',
    lineHeight: 20,
    marginBottom: 24,
  },
  remainingHint: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#B0752E',
    backgroundColor: '#FBF3E7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chip: {
    width: '48%',
    backgroundColor: '#F9F8F6',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeChip: {
    backgroundColor: '#EC2028',
    // shadow
    shadowColor: '#EC2028',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 3,
  },
  chipLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 17,
    color: '#0C0C0D',
  },
  activeChipLabel: {
    color: '#FFFFFF',
  },
  chipSubText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#B0ADA8',
    marginTop: 2,
  },
  activeChipSubText: {
    color: 'rgba(255,255,255,0.8)',
  },
  disabledChip: {
    opacity: 0.4,
  },
  disabledChipLabel: {
    color: '#B0ADA8',
  },
  customBox: {
    width: '100%',
    backgroundColor: '#F9F8F6',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  activeCustomBox: {
    backgroundColor: '#EC2028',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    // shadow
    shadowColor: '#EC2028',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 3,
  },
  customBoxText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 15,
    color: '#0C0C0D',
  },
  amountErrorText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#BA1A1A',
    marginTop: -20,
    marginBottom: 16,
  },
  customBoxActiveInner: {
    width: '100%',
  },
  customBoxActiveTitle: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  customCurrencySymbol: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 22,
    color: '#FFFFFF',
    marginRight: 6,
  },
  customTextInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 22,
    color: '#FFFFFF',
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  buttonContainer: {
    marginTop: 'auto',
    width: '100%',
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9F8F6',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCD9D3',
  },
  accessoryDoneText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#EC2028',
  },
});
