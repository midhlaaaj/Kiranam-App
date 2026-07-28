import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';

const CONFIRM_PHRASE = 'delete my account';

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
              Alert.alert('Could not delete account', error);
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrapper}>
          <View style={styles.sheet}>
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
            <TextInput
              style={styles.input}
              value={typed}
              onChangeText={setTyped}
              placeholder="delete my account"
              placeholderTextColor="#B0ADA8"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.deleteButton, !isMatch && styles.deleteButtonDisabled]}
              onPress={handleDeletePress}
              disabled={!isMatch || deleting}
              activeOpacity={0.85}
            >
              <Text style={[styles.deleteButtonText, !isMatch && styles.deleteButtonTextDisabled]}>
                {deleting ? 'Deleting…' : 'Delete Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
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
  deleteButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#BA1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  deleteButtonDisabled: {
    backgroundColor: '#F1EEEA',
  },
  deleteButtonText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: '#FFFFFF',
  },
  deleteButtonTextDisabled: {
    color: '#C7C3BD',
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
