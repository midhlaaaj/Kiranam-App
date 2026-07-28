import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera } from 'lucide-react-native';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentAvatarUrl: string;
  onSaveName: (name: string) => Promise<{ error: string | null }>;
  onSavePhoto: (localUri: string) => Promise<{ error: string | null; url?: string }>;
}

export function EditProfileModal({ visible, onClose, currentName, currentAvatarUrl, onSaveName, onSavePhoto }: EditProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [previewUri, setPreviewUri] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setPreviewUri('');
    }
  }, [visible, currentName]);

  const getInitials = (value: string) =>
    value.split(' ').filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 2);

  const handlePickPhoto = async () => {
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
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setPreviewUri(uri);
    setUploadingPhoto(true);
    const { error } = await onSavePhoto(uri);
    setUploadingPhoto(false);
    if (error) {
      Alert.alert('Could not update photo', error);
      setPreviewUri('');
    }
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setSaving(true);
    const { error } = await onSaveName(trimmed);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save changes', error);
      return;
    }
    onClose();
  };

  const displayUri = previewUri || currentAvatarUrl;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrapper}>
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
              <Text style={styles.avatarHint}>{uploadingPhoto ? 'Uploading…' : 'Tap to change photo'}</Text>
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#B0ADA8"
            />

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
    fontFamily: 'Inter',
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
