import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';

// Exports contributors as CSV shaped for wacrm's contact importer: name,
// phone, and a custom "monthly_contribution" field (since contributors have
// varying monthly amounts) so it can be re-imported there for WhatsApp
// broadcasts.
function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  await verifyAdmin();
  const supabase = await createClient();

  const { data: contributors } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'contributor')
    .order('full_name');

  const ids = (contributors || []).map((c) => c.id);
  const { data: commitments } = ids.length
    ? await supabase.from('commitments').select('contributor_id, monthly_amount').in('contributor_id', ids)
    : { data: [] };
  const monthlyByContributor = new Map((commitments || []).map((c) => [c.contributor_id, c.monthly_amount]));

  const header = ['name', 'phone', 'monthly_contribution'];
  const rows = (contributors || []).map((c) => [
    c.full_name || '',
    c.phone || '',
    monthlyByContributor.get(c.id)?.toString() || '',
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="kiranam-contributors.csv"',
    },
  });
}
