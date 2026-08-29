import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { validateRequired, validateEmail } from '@/utils/validators';
import { friendlyError } from '@/utils/errors';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { X, Camera } from 'lucide-react-native';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentAvatarUrl: string;
  currentEmail: string;
  onSaveName: (name: string) => Promise<{ error: string | null }>;
  onSavePhoto: (localUri: string) => Promise<{ error: string | null; url?: string }>;
  onSaveEmail: (email: string) => Promise<{ error: string | null }>;
}

export function EditProfileModal({ visible, onClose, currentName, currentAvatarUrl, currentEmail, onSaveName, onSavePhoto, onSaveEmail }: EditProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [emailError, setEmailError] = useState('');
  const [previewUri, setPreviewUri] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setEmail(currentEmail);
      setEmailError('');
      setPreviewUri('');
    }
  }, [visible, currentName, currentEmail]);

  const getInitials = (value: string) =>
    value.split(' ').filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 2);

  const stagePickedPhoto = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    setPreviewUri(result.assets[0].uri);
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a profile picture.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    stagePickedPhoto(result);
  };

  const handleChooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    stagePickedPhoto(result);
  };

  const handlePickPhoto = () => {
    Alert.alert('Change Profile Photo', undefined, [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handleChooseFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const nameError = validateRequired(name, 'Name');
    if (nameError) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    // Email is optional (it can be added later, per the Getting Started
    // checklist), so only validate format when something's actually typed.
    const emailValidationError = trimmedEmail ? validateEmail(trimmedEmail) : null;
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }
    setEmailError('');
    setSaving(true);

    if (previewUri) {
      const { error: photoError } = await onSavePhoto(previewUri);
      if (photoError) {
        setSaving(false);
        Alert.alert('Could not update photo', friendlyError(photoError));
        return;
      }
    }

    // Only calls onSaveEmail when the address actually changed — it kicks
    // off a real confirmation-email send, which shouldn't refire just
    // because the user re-saved their name/photo with the same email.
    if (trimmedEmail && trimmedEmail !== currentEmail) {
      const { error: emailSaveError } = await onSaveEmail(trimmedEmail);
      if (emailSaveError) {
        setSaving(false);
        Alert.alert('Could not update email', friendlyError(emailSaveError));
        return;
      }
    }

    const { error } = await onSaveName(trimmedName);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save changes', friendlyError(error));
      return;
    }
    onClose();
  };

  const displayUri = previewUri || currentAvatarUrl;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrapper}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Edit Profile</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                <X size={18} color="#7A756E" />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} style={styles.avatarWrap}>
                {displayUri ? (
                  <Image source={{ uri: displayUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{getInitials(name)}</Text>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Camera size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarHint}>{previewUri ? 'Tap Save Changes to apply' : 'Tap to change photo'}</Text>
            </View>

            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />

            <Input
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError('');
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={emailError}
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 22,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 8,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#0C0C0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 28,
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EC2028',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#7A756E',
  },
  saveButton: {
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
