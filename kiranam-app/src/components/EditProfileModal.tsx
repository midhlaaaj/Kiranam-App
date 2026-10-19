import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as ImagePicker from 'expo-image-picker';
import { friendlyError } from '@/utils/errors';
import { Button } from '@/components/Button';
import { X, Camera } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_MAX_HEIGHT = Dimensions.get('window').height * 0.85;

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentAvatarUrl: string;
  onSavePhoto: (localUri: string) => Promise<{ error: string | null; url?: string }>;
}

export function EditProfileModal({ visible, onClose, currentName, currentAvatarUrl, onSavePhoto }: EditProfileModalProps) {
  const insets = useSafeAreaInsets();
  const [previewUri, setPreviewUri] = useState('');
  const [saving, setSaving] = useState(false);

  // A staged-but-unsaved photo is discarded whenever the sheet closes, so it
  // always reopens showing the current photo.
  const handleClose = () => {
    setPreviewUri('');
    onClose();
  };

  const getInitials = (value: string) =>
    value.split(' ').filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 2);

  const stagePickedPhoto = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    setPreviewUri(result.assets[0].uri);
  };

  const handleTakePhoto = async () => {
    try {
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
    } catch {
      Alert.alert('Camera unavailable', 'We could not open the camera on this device.');
    }
  };

  const handleChooseFromLibrary = async () => {
    try {
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
    } catch {
      Alert.alert('Photos unavailable', 'We could not open your photo library.');
    }
  };

  const handlePickPhoto = () => {
    Alert.alert('Change Profile Photo', undefined, [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handleChooseFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!previewUri) return;
    setSaving(true);
    try {
      const { error } = await onSavePhoto(previewUri);
      if (error) {
        Alert.alert('Could not update photo', friendlyError(error));
        return;
      }
      handleClose();
    } catch (e) {
      Alert.alert('Could not update photo', friendlyError(e instanceof Error ? e.message : 'Something went wrong.'));
    } finally {
      setSaving(false);
    }
  };

  const displayUri = previewUri || currentAvatarUrl;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* react-native-keyboard-controller's KeyboardAwareScrollView,
              not the core KeyboardAvoidingView — RN's <Modal> on Android
              renders in its own native window with a hardcoded, unreliable
              keyboard-resize behavior that plain KeyboardAvoidingView
              couldn't work around no matter how the content was sized.
              This library handles both platforms itself (per Expo's own
              keyboard-handling guide) and also scrolls to whichever field
              is actually focused. */}
          <KeyboardAwareScrollView
            style={styles.sheetScroll}
            contentContainerStyle={[styles.sheetContent, { paddingBottom: 24 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bottomOffset={20}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Profile Photo</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                activeOpacity={0.7}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={18} color="#7A756E" />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={handlePickPhoto}
                activeOpacity={0.8}
                style={styles.avatarWrap}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
              >
                {displayUri ? (
                  <Image source={{ uri: displayUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{getInitials(currentName)}</Text>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Camera size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.7} hitSlop={8}>
                <Text style={styles.changePhotoText}>{previewUri ? 'Choose a different photo' : 'Change photo'}</Text>
              </TouchableOpacity>
              {!!previewUri && <Text style={styles.avatarHint}>Tap Save Photo to apply</Text>}
            </View>

            <Button
              title="Save Photo"
              onPress={handleSave}
              loading={saving}
              disabled={!previewUri}
              style={styles.saveButton}
            />

            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </View>
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
  sheet: {
    width: '100%',
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
  changePhotoText: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    fontSize: 14,
    color: '#EC2028',
    marginTop: 2,
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
