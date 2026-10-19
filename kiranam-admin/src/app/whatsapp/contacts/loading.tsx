import { ContactsPageSkeleton } from '@/components/whatsapp/contacts/contacts-skeleton'

// Route-level loading state for Contacts, mirroring the loaded page at every width.
export default function ContactsLoading() {
  return <ContactsPageSkeleton />
}
