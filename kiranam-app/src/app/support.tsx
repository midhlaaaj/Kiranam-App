import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, ChevronRight, MessageSquare, Mail } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FaqItem {
  id: number;
  q: string;
  a: string;
}

export default function SupportScreen() {
  const router = useRouter();
  const [openFaqId, setOpenFaqId] = useState<number | null>(0); // Default open 0 as in mockup
  const [searchQuery, setSearchQuery] = useState('');

  const faqs: FaqItem[] = [
    { id: 0, q: 'Why did my payment fail?', a: 'Usually a bank decline or network issue. Try again, or use a different payment method.' },
    { id: 1, q: 'How do I change my monthly amount?', a: 'Go to Profile → Contribution Settings and tap Update next to your current amount.' },
    { id: 2, q: 'Can I pause my contributions?', a: 'Yes — tap "Pause my contributions" in your Profile. You can resume anytime.' },
    { id: 3, q: 'How do I contact my volunteer?', a: 'Reach out via Support chat below and our team will connect you.' },
    { id: 4, q: 'Is my payment information secure?', a: 'All payments are processed securely by Razorpay. We never store card details.' },
  ];

  const handleToggleFaq = (id: number) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const WHATSAPP_NUMBER = '919876543210'; // TODO: replace with the real support WhatsApp number before submission
  const SUPPORT_EMAIL = 'support@kiranam.org';

  const handleWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp not installed', `Message us on WhatsApp at +${WHATSAPP_NUMBER}, or use email support instead.`);
      }
    });
  };

  const handleEmail = () => {
    const email = `mailto:${SUPPORT_EMAIL}`;
    Linking.canOpenURL(email).then(supported => {
      if (supported) {
        Linking.openURL(email);
      } else {
        Alert.alert('No email app found', `Reach us directly at ${SUPPORT_EMAIL}.`);
      }
    });
  };

  const filteredFaqs = faqs.filter(f => f.q.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Mock Search Input */}
        <View style={styles.searchBar}>
          <Search size={18} color="#B0ADA8" />
          <TextInput
            placeholder="Search for help"
            placeholderTextColor="#B0ADA8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* FAQs */}
        <Text style={styles.sectionHeader}>Frequently Asked Questions</Text>
        <View style={styles.faqList}>
          {filteredFaqs.map((faq, index) => {
            const isOpen = openFaqId === faq.id;
            return (
              <TouchableOpacity
                key={faq.id}
                style={styles.faqRow}
                onPress={() => handleToggleFaq(faq.id)}
                activeOpacity={0.8}
              >
                <View style={styles.faqQuestionRow}>
                  <Text style={styles.faqNumber}>0{index + 1}</Text>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <View style={[styles.chevronContainer, isOpen ? styles.chevronOpen : null]}>
                    <ChevronRight size={16} color="#B0ADA8" />
                  </View>
                </View>
                {isOpen && (
                  <Text style={styles.faqAnswer}>{faq.a}</Text>
                )}
              </TouchableOpacity>
            );
          })}
          {filteredFaqs.length === 0 && (
            <Text style={styles.noFaqsText}>No matches found. Try searching for other terms.</Text>
          )}
        </View>

        {/* Bottom CTA block */}
        <View style={styles.supportCTA}>
          <Text style={styles.ctaTitle}>Still need help?</Text>
          
          <TouchableOpacity style={styles.waButton} onPress={handleWhatsApp} activeOpacity={0.8}>
            <MessageSquare size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.waButtonText}>Chat with us on WhatsApp</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.mailButton} onPress={handleEmail} activeOpacity={0.8}>
            <Mail size={16} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.mailButtonText}>Email support</Text>
          </TouchableOpacity>
        </View>

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
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F8F6',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 24,
    color: '#0C0C0D',
    letterSpacing: -0.6,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F8F6',
    borderRadius: 28,
    height: 56,
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#0C0C0D',
    fontWeight: '600',
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
  faqList: {
    marginBottom: 28,
  },
  faqRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEEA',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faqNumber: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#D8D5D0',
    width: 16,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#0C0C0D',
    lineHeight: 18,
  },
  chevronContainer: {
    transform: [{ rotate: '0deg' }],
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  faqAnswer: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#7A756E',
    lineHeight: 20,
    marginTop: 10,
    paddingLeft: 30,
  },
  noFaqsText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#7A756E',
    textAlign: 'center',
    paddingVertical: 20,
  },
  supportCTA: {
    backgroundColor: '#0C0C0D',
    borderRadius: 22,
    padding: 16,
  },
  ctaTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  waButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22A559',
    borderRadius: 28,
    height: 50,
    marginBottom: 10,
  },
  waButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF',
  },
  mailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 28,
    height: 50,
  },
  mailButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
