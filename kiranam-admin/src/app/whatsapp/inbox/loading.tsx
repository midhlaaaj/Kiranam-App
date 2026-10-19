import { InboxPageSkeleton } from '@/components/whatsapp/inbox/inbox-skeleton'

// Route-level loading state for the inbox: the same two-pane skeleton the page
// uses while its own search-params boundary resolves, so there's no flash.
export default function InboxLoading() {
  return <InboxPageSkeleton />
}
