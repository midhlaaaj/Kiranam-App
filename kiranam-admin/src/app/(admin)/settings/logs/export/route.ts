import { verifyAdmin } from '@/lib/dal';
import { areaLabel, areaOf, describeLogEntry } from '@/lib/auditDescriptions';
import { parseAuditFilters, queryAuditLog, resolveLogNames } from '@/lib/auditLogQuery';
import { formatDateTimeFull, isoDay } from '@/lib/format';

const MAX_ROWS = 5000;

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV of the Activity log with the same filters as the page. */
export async function GET(request: Request) {
  await verifyAdmin();
  const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filters = parseAuditFilters(sp);
  const { rows } = await queryAuditLog(filters, { from: 0, to: MAX_ROWS - 1 });
  const names = await resolveLogNames(rows);

  const lines = [
    ['Time (IST)', 'Admin', 'What happened', 'Area'].join(','),
    ...rows.map((r) =>
      [
        formatDateTimeFull(r.created_at),
        r.profiles?.full_name || r.profiles?.email || 'Unknown',
        describeLogEntry(r, names)
          .map((p) => (typeof p === 'string' ? p : p.text))
          .join(''),
        areaLabel(areaOf(r.action)),
      ]
        .map(csvCell)
        .join(',')
    ),
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kiranam-activity-${isoDay()}.csv"`,
    },
  });
}
