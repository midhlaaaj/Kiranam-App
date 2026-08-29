import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Search, Check } from 'lucide-react-native';
import { COUNTRIES, Country } from '@/utils/countries';

interface CountryCodePickerProps {
  visible: boolean;
  selectedIso2: string;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export function CountryCodePicker({ visible, selectedIso2, onSelect, onClose }: CountryCodePickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.iso2.toLowerCase() === q
    );
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Country</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <X size={18} color="#7A756E" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <Search size={16} color="#7A756E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search country or code"
            placeholderTextColor="#B0ADA8"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.iso2}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => {
                onSelect(item);
                setQuery('');
                onClose();
              }}
            >
              <Text style={styles.flag}>{item.flag}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.dialCode}>+{item.dialCode}</Text>
              {item.iso2 === selectedIso2 && <Check size={16} color="#EC2028" strokeWidth={3} />}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
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
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 8,
    height: 46,
    backgroundColor: '#F9F8F6',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#0C0C0D',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  flag: {
    fontSize: 22,
  },
  name: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '500',
    color: '#0C0C0D',
  },
  dialCode: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#7A756E',
  },
});
