import { Suspense } from 'react';
import Link from 'next/link';
import { HeartHandshake, Search, UserRoundCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeading } from '@/components/PageHeading';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import {
  buttonPrimary,
  inputClass,
  pillTabClass,
  pillTabItemClass,
  staggerDelay,
  tableCellClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';

async function getApprovedVolunteers(query: string) {
  const supabase = await createClient();

  let request = supabase
    .from('profiles')
    .select('id, full_name, phone, created_at')
    .eq('role', 'volunteer')
    .order('created_at', { ascending: false });

  if (query) {
    request = request.or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`);
  }

  const { data: volunteers } = await request;

  const ids = (volunteers || []).map((v) => v.id);

  const [{ data: referrals }, { data: assignments }] = await Promise.all([
    ids.length
      ? supabase.from('referrals').select('volunteer_id, referral_code').in('volunteer_id', ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from('contributor_assignments').select('volunteer_id').in('volunteer_id', ids)
      : Promise.resolve({ data: [] }),
  ]);

  const referralByVolunteer = new Map((referrals || []).map((r) => [r.volunteer_id, r.referral_code]));
  const assignmentCounts = new Map<string, number>();
  (assignments || []).forEach((a) => {
    assignmentCounts.set(a.volunteer_id, (assignmentCounts.get(a.volunteer_id) || 0) + 1);
  });

  return (volunteers || []).map((v) => ({
    ...v,
    referralCode: referralByVolunteer.get(v.id) ?? '—',
    assignedCount: assignmentCounts.get(v.id) ?? 0,
  }));
}

async function getPendingApplicants(query: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('volunteer_applications')
    .select('id, created_at, profiles!volunteer_applications_profile_id_fkey(id, full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const rows = (data || []) as unknown as {
    id: string;
    created_at: string;
    profiles: { id: string; full_name: string; phone: string | null } | null;
  }[];

  if (!query) return rows;
  const q = query.toLowerCase();
  return rows.filter(
    (r) => r.profiles?.full_name?.toLowerCase().includes(q) || r.profiles?.phone?.toLowerCase().includes(q)
  );
}

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const activeTab = tab === 'pending' ? 'pending' : 'approved';

  return (
    <div>
      <PageHeading title="Volunteers" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className={pillTabClass}>
          <Link
            href={`/volunteers?tab=approved${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={pillTabItemClass(activeTab === 'approved')}
          >
            Approved
          </Link>
          <Link
            href={`/volunteers?tab=pending${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={pillTabItemClass(activeTab === 'pending')}
          >
            Pending
          </Link>
        </div>

        <form className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-kiranam-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name or phone…"
              className={`${inputClass} w-64 pl-9`}
            />
          </div>
          {tab && <input type="hidden" name="tab" value={tab} />}
          <button type="submit" className={buttonPrimary}>
            Search
          </button>
        </form>
      </div>

      <Suspense fallback={<SkeletonTable rows={7} cols={4} />}>
        <VolunteersTable activeTab={activeTab} q={q} />
      </Suspense>
    </div>
  );
}

async function VolunteersTable({ activeTab, q }: { activeTab: 'approved' | 'pending'; q?: string }) {
  const [volunteers, applicants] = await Promise.all([getApprovedVolunteers(q || ''), getPendingApplicants(q || '')]);

  return (
    <div className={tableWrapClass}>
      {activeTab === 'approved' ? (
        volunteers.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title={q ? 'No approved volunteers match your search' : 'No approved volunteers yet'}
            description={q ? 'Try a different name or phone number.' : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableCellClass}>Name</th>
                <th className={tableCellClass}>Phone</th>
                <th className={tableCellClass}>Referral Code</th>
                <th className={tableCellClass}>Assigned Contributors</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((v, i) => (
                <tr key={v.id} className={tableRowClass} style={staggerDelay(i)}>
                  <td className={tableCellClass}>
                    <Link href={`/volunteers/${v.id}`} className="font-semibold text-kiranam-ink hover:text-kiranam-primary hover:underline">
                      {v.full_name || 'Unnamed'}
                    </Link>
                  </td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>{v.phone}</td>
                  <td className={`${tableCellClass} font-mono text-kiranam-muted`}>{v.referralCode}</td>
                  <td className={`${tableCellClass} text-kiranam-muted tabular-nums`}>{v.assignedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : applicants.length === 0 ? (
        <EmptyState
          icon={UserRoundCheck}
          title={q ? 'No pending applications match your search' : 'No pending applications'}
          description={q ? 'Try a different name or phone number.' : 'New volunteer applications will show up here.'}
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Name</th>
              <th className={tableCellClass}>Phone</th>
              <th className={tableCellClass}>Applied</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((a, i) => (
              <tr key={a.id} className={tableRowClass} style={staggerDelay(i)}>
                <td className={tableCellClass}>
                  <Link
                    href={`/volunteers/${a.profiles?.id}`}
                    className="font-semibold text-kiranam-ink hover:text-kiranam-primary hover:underline"
                  >
                    {a.profiles?.full_name || 'Unnamed'}
                  </Link>
                </td>
                <td className={`${tableCellClass} text-kiranam-muted`}>{a.profiles?.phone}</td>
                <td className={`${tableCellClass} text-kiranam-muted`}>
                  {new Date(a.created_at).toLocaleDateString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
