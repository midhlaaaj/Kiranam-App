import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TextInput, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChooseAmountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { commitmentAmount, setCommitmentAmount } = useApp();

  const campaignId = params.campaignId as string | undefined;
  const campaignTitle = params.campaignTitle as string | undefined;
  const isCommitmentMode = !campaignId;

  const [selectedAmount, setSelectedAmount] = useState<number | null>(campaignId ? 100 : commitmentAmount);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const amountOptions = [
    { value: 30, label: '₹30', sub: 'Minimum' },
    { value: 50, label: '₹50', sub: null },
    { value: 100, label: '₹100', sub: 'Recommended' },
    { value: 250, label: '₹250', sub: null },
    { value: 500, label: '₹500', sub: null },
    { value: 1000, label: '₹1,000', sub: null },
  ];

  const handleSelectOption = (value: number) => {
    setSelectedAmount(value);
    setIsCustomOpen(false);
    setCustomAmount('');
  };

  const handleCustomBoxPress = () => {
    setIsCustomOpen(true);
    setSelectedAmount(null);
  };

  const handleCustomAmountChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '');
    setCustomAmount(numeric);
    setSelectedAmount(numeric ? parseInt(numeric, 10) : null);
  };

  const currentFinalAmount = selectedAmount;

  const handleContinue = () => {
    if (!currentFinalAmount || currentFinalAmount <= 0) return;

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
    if (!currentFinalAmount || currentFinalAmount <= 0) return;
    setSaveState('saving');
    await setCommitmentAmount(currentFinalAmount);
    setSaveState('saved');
    setTimeout(() => router.back(), 900);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#0C0C0D" />
          </TouchableOpacity>

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

          {/* Amount Chips Grid */}
          <View style={styles.gridContainer}>
            {amountOptions.map((opt) => {
              const isSelected = selectedAmount === opt.value && !isCustomOpen;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, isSelected ? styles.activeChip : null]}
                  onPress={() => handleSelectOption(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipLabel, isSelected ? styles.activeChipLabel : null]}>
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
                    value={customAmount}
                    onChangeText={handleCustomAmountChange}
                    autoFocus
                  />
                </View>
              </View>
            ) : (
              <Text style={styles.customBoxText}>Custom Amount</Text>
            )}
          </TouchableOpacity>

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
    outlineStyle: 'none',
  },
  buttonContainer: {
    marginTop: 'auto',
    width: '100%',
  },
});
