import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { validateReferralCode } from '@/utils/validators';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

const SHEET_MAX_HEIGHT = Dimensions.get('window').height * 0.75;

interface EditReferralCodeModalProps {
  visible: boolean;
  onClose: () => void;
  currentCode: string;
  onSave: (code: string) => Promise<{ error: string | null }>;
}

export function EditReferralCodeModal({ visible, onClose, currentCode, onSave }: EditReferralCodeModalProps) {
  const [code, setCode] = useState(currentCode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setCode(currentCode);
      setError('');
    }
  }, [visible, currentCode]);

  const handleChange = (text: string) => {
    // Keep it constrained to what the backend will normalize to, so the
    // preview the volunteer sees while typing matches what actually saves.
    setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (error) setError('');
  };

  const handleSave = async () => {
    const codeError = validateReferralCode(code, { required: true });
    if (codeError) {
      setError(codeError);
      return;
    }
    if (code === currentCode) {
      onClose();
      return;
    }
    setSaving(true);
    const { error: saveError } = await onSave(code);
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrapper}>
          <View style={styles.sheet}>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Edit Referral Code</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                  <X size={18} color="#7A756E" />
                </TouchableOpacity>
              </View>

              <Text style={styles.hint}>
                Letters and numbers only, 4-20 characters. New members enter this code when signing up.
              </Text>

              <Input
                label="Referral Code"
                value={code}
                onChangeText={handleChange}
                placeholder="YOURCODE"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                error={error}
                inputStyle={styles.codeInputText}
              />

              <Button
                title="Save Changes"
                onPress={handleSave}
                loading={saving}
                style={styles.saveButton}
              />

              <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
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
  },
  sheetScroll: {
    maxHeight: SHEET_MAX_HEIGHT,
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 19,
    color: '#0C0C0D',
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9F8F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    lineHeight: 18,
    color: '#7A756E',
    marginBottom: 20,
  },
  // The referral code itself keeps a distinct bold/letter-spaced treatment
  // (it's a code people read character-by-character), applied via Input's
  // inputStyle override on top of the shared filled-input shape.
  codeInputText: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  saveButton: {
    marginTop: 20,
    marginBottom: 10,
  },
  cancelButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
  },
});
