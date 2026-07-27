'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Calendar,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/contributors', label: 'Contributors', icon: Users },
  { href: '/volunteers', label: 'Volunteers', icon: HeartHandshake },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/contributions', label: 'Contributions', icon: Wallet },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  // WhatsApp comm center — merged in as a normal internal route (used to
  // be a separate deployment reached via a magic-link SSO bridge; now
  // it's just part of this app and shares the same session natively).
  { href: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ease-out ${
              isActive
                ? 'bg-kiranam-primary-soft text-kiranam-primary'
                : 'text-kiranam-muted hover:bg-kiranam-surface-alt hover:text-kiranam-ink'
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-kiranam-primary" />
            )}
            <Icon size={17} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
