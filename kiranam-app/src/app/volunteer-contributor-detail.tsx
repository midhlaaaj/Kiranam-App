import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { statusMeta } from '@/utils/volunteerStatus';
import { ArrowLeft, Phone, MessageCircle, Send, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HistoryRow {
  date: string;
  amount: number;
  ok: boolean;
}

export default function VolunteerContributorDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { volunteerMembers } = useApp();
  const [noteDraft, setNoteDraft] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const member = volunteerMembers.find((m) => m.id === params.id);

  useEffect(() => {
    if (!member) return;
    let cancelled = false;
    setHistoryLoading(true);
    supabase
      .from('contributions')
      .select('amount, status, created_at')
      .eq('contributor_id', member.id)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (cancelled) return;
        setHistory(
          (data || []).map((row) => ({
            date: new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            amount: Number(row.amount),
            ok: row.status === 'success',
          }))
        );
        setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member]);

  if (!member) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#0C0C0D" />
          </TouchableOpacity>
        </View>
        <Text style={styles.notFoundText}>Contributor not found.</Text>
      </SafeAreaView>
    );
  }

  const meta = statusMeta(member.status);
  const formatMoney = (amount: number) => '₹' + amount.toLocaleString('en-IN');
  const digitsOnly = member.phone.replace(/\s+/g, '');

  const handleCall = () => Linking.openURL(`tel:${digitsOnly}`);
  const handleWhatsApp = () => Linking.openURL(`https://wa.me/${digitsOnly.replace('+', '')}`);
  // Opens WhatsApp with a pre-filled reminder so the volunteer sends it
  // themselves — the app has no server-side WhatsApp sending capability
  // of its own (that lives in the comm center's admin tooling).
  const handleRemind = () => {
    const message = `Hi ${member.name}, this is a friendly reminder about your Kiranam contribution. Thank you for your support!`;
    Linking.openURL(`https://wa.me/${digitsOnly.replace('+', '')}?text=${encodeURIComponent(message)}`);
  };
  const handleAddNote = () => {
    if (!noteDraft.trim()) return;
    setNotes((prev) => [noteDraft.trim(), ...prev]);
    setNoteDraft('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contributor</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Identity block */}
        <View style={styles.identityBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {member.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberPhone}>{member.phone}</Text>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusPillText, { color: meta.text }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall} activeOpacity={0.8}>
            <Phone size={17} color="#0C0C0D" />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.waButton]} onPress={handleWhatsApp} activeOpacity={0.8}>
            <MessageCircle size={17} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, styles.waButtonText]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.remindActionButton]}
            onPress={handleRemind}
            activeOpacity={0.8}
          >
            <Send size={17} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, styles.waButtonText]}>Remind</Text>
          </TouchableOpacity>
        </View>

        {/* Contribution summary */}
        <Text style={styles.sectionHeader}>Contribution Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Monthly commitment</Text>
            <Text style={styles.summaryValue}>{formatMoney(member.monthlyAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Member since</Text>
            <Text style={styles.summaryValue}>{member.joinedLabel.replace('Joined ', '')}</Text>
          </View>
          <View style={[styles.summaryRow, styles.noBorder]}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={[styles.summaryValue, { color: meta.text }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Payment history */}
        <Text style={styles.sectionHeader}>Recent Payment History</Text>
        <View style={styles.summaryCard}>
          {historyLoading ? (
            <View style={[styles.summaryRow, styles.noBorder]}>
              <Text style={styles.summaryLabel}>Loading…</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={[styles.summaryRow, styles.noBorder]}>
              <Text style={styles.summaryLabel}>No payments yet.</Text>
            </View>
          ) : (
            history.map((row, index) => (
              <View key={`${row.date}-${index}`} style={[styles.summaryRow, index === history.length - 1 ? styles.noBorder : null]}>
                <Text style={styles.summaryLabel}>{row.date}</Text>
                <Text style={[styles.summaryValue, !row.ok && styles.failedValue]}>
                  {row.ok ? formatMoney(row.amount) : 'Missed'}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Notes */}
        <Text style={styles.sectionHeader}>Notes</Text>
        <View style={styles.noteInputRow}>
          <TextInput
            style={styles.noteInput}
            placeholder="Add a follow-up note..."
            placeholderTextColor="#B0ADA8"
            value={noteDraft}
            onChangeText={setNoteDraft}
          />
          <TouchableOpacity style={styles.addNoteButton} onPress={handleAddNote} activeOpacity={0.8}>
            <Plus size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {notes.length > 0 ? (
          <View style={styles.notesList}>
            {notes.map((note, i) => (
              <View key={i} style={styles.noteRow}>
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noNotesText}>No notes yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F8F6',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 17,
    color: '#0C0C0D',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  notFoundText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#7A756E',
    textAlign: 'center',
    marginTop: 40,
  },
  identityBlock: {
    alignItems: 'center',
    marginBottom: 22,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#0C0C0D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 24,
    color: '#FFFFFF',
  },
  memberName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 19,
    color: '#0C0C0D',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  memberPhone: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#7A756E',
    marginBottom: 10,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusPillText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F9F8F6',
  },
  actionButtonText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 13,
    color: '#0C0C0D',
  },
  waButton: {
    backgroundColor: '#22A559',
  },
  remindActionButton: {
    backgroundColor: '#EC2028',
  },
  waButtonText: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B0ADA8',
    textTransform: 'uppercase',
    letterSpacing: 0.08,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F1EEEA',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: '#7A756E',
  },
  summaryValue: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#0C0C0D',
  },
  failedValue: {
    color: '#BA1A1A',
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  noteInput: {
    flex: 1,
    height: 50,
    backgroundColor: '#F9F8F6',
    borderRadius: 25,
    paddingHorizontal: 18,
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#0C0C0D',
  },
  addNoteButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0C0C0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesList: {
    gap: 10,
  },
  noteRow: {
    backgroundColor: '#F9F8F6',
    borderRadius: 16,
    padding: 14,
  },
  noteText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: '#4A4640',
    lineHeight: 20,
  },
  noNotesText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#B0ADA8',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
