import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';

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
    if (code.length < 4) {
      setError('Referral code must be at least 4 characters.');
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrapper}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Edit Referral Code</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                <X size={18} color="#7A756E" />
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Letters and numbers only, 4-20 characters. New members enter this code when signing up.
            </Text>

            <Text style={styles.label}>Referral Code</Text>
            <TextInput
              style={[styles.input, !!error && styles.inputError]}
              value={code}
              onChangeText={handleChange}
              placeholder="YOURCODE"
              placeholderTextColor="#B0ADA8"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
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
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Inter',
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
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#7A756E',
    marginBottom: 8,
  },
  input: {
    height: 50,
    backgroundColor: '#F9F8F6',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E4E1DC',
    paddingHorizontal: 16,
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.4,
    color: '#0C0C0D',
  },
  inputError: {
    borderColor: '#BA1A1A',
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#BA1A1A',
    marginTop: 8,
  },
  saveButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EC2028',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
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
