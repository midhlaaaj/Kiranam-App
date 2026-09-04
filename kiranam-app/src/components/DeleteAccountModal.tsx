import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { friendlyError } from '@/utils/errors';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

const CONFIRM_PHRASE = 'delete my account';
const SHEET_MAX_HEIGHT = Dimensions.get('window').height * 0.75;

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmed: () => Promise<{ error: string | null }>;
  onDeleted: () => void;
  description: string;
}

// Two-step deletion: the person must type an exact confirmation phrase
// before the "Delete" button even becomes tappable, and only then does the
// final destructive-action confirmation appear. Two deliberate speed bumps
// for an action that can't be undone.
export function DeleteAccountModal({ visible, onClose, onConfirmed, onDeleted, description }: DeleteAccountModalProps) {
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isMatch = typed.trim().toLowerCase() === CONFIRM_PHRASE;

  const handleClose = () => {
    setTyped('');
    onClose();
  };

  const handleDeletePress = () => {
    if (!isMatch) return;
    Alert.alert(
      'Delete Account',
      description,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await onConfirmed();
            setDeleting(false);
            if (error) {
              Alert.alert('Could not delete account', friendlyError(error));
              return;
            }
            setTyped('');
            onDeleted();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
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
                <Text style={styles.title}>Delete Account</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.7}>
                  <X size={18} color="#7A756E" />
                </TouchableOpacity>
              </View>

              <Text style={styles.description}>{description}</Text>

              <Text style={styles.instruction}>
                To confirm, type <Text style={styles.instructionPhrase}>delete my account</Text> below.
              </Text>
              <Input
                value={typed}
                onChangeText={setTyped}
                placeholder="delete my account"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Button
                title="Delete Account"
                onPress={handleDeletePress}
                disabled={!isMatch}
                loading={deleting}
                style={[styles.deleteButton, isMatch && styles.deleteButtonActive]}
              />

              <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
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
  description: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: '#7A756E',
    lineHeight: 20,
    marginBottom: 20,
  },
  instruction: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#0C0C0D',
    marginBottom: 10,
  },
  instructionPhrase: {
    fontWeight: '700',
  },
  deleteButton: {
    marginBottom: 10,
  },
  // Only applied once the confirmation phrase matches — Button's own
  // disabled state (gray) governs the button before that, same gray it
  // uses everywhere else, so this only needs to define the "armed" color.
  deleteButtonActive: {
    backgroundColor: '#BA1A1A',
    shadowColor: '#BA1A1A',
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
