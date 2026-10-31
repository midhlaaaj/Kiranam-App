"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/whatsapp/supabase/client";

/**
 * contact id → KK / KKG number for contacts synced from a Kiranam profile.
 * Looked up through the existing kiranam_contact_details() function; ids are
 * fetched once and cached, so re-renders and new conversations only ask for
 * what is missing. Contacts without a KK number simply have no entry.
 */
export function useKkNumbers(contactIds: (string | null | undefined)[]): Map<string, string> {
  const [numbers, setNumbers] = useState<Map<string, string>>(new Map());
  const asked = useRef<Set<string>>(new Set());

  const key = contactIds.filter(Boolean).join(",");

  useEffect(() => {
    const missing = key.split(",").filter((id) => id && !asked.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => asked.current.add(id));

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const found: [string, string][] = [];
      for (let i = 0; i < missing.length; i += 300) {
        const { data } = await supabase.rpc("kiranam_contact_details", {
          contact_ids: missing.slice(i, i + 300),
        });
        for (const row of (data ?? []) as { contact_id: string; kk_number: string | null }[]) {
          if (row.kk_number) found.push([row.contact_id, row.kk_number]);
        }
      }
      if (!cancelled && found.length > 0) {
        setNumbers((prev) => new Map([...prev, ...found]));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return numbers;
}
