export type Granularity = 'daily' | 'weekly' | 'monthly';

function toLocalYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalYYYYMM(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function bucketKey(date: Date, granularity: Granularity): string {
  if (granularity === 'daily') return toLocalYYYYMMDD(date);
  if (granularity === 'monthly') return toLocalYYYYMM(date);
  const d = new Date(date);
  const dayIndex = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dayIndex);
  return toLocalYYYYMMDD(d);
}

export function bucketLabel(key: string, granularity: Granularity): string {
  const now = new Date();
  
  if (granularity === 'daily') {
    const todayKey = toLocalYYYYMMDD(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = toLocalYYYYMMDD(yesterday);
    
    if (key === todayKey) return 'Today';
    if (key === yesterdayKey) return 'Yesterday';
    
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }
  
  if (granularity === 'weekly') {
    // Current Monday
    const currentMon = new Date(now);
    const dayIndex = (currentMon.getDay() + 6) % 7;
    currentMon.setDate(currentMon.getDate() - dayIndex);
    const currentWeekKey = toLocalYYYYMMDD(currentMon);
    
    // Last Monday
    const lastMon = new Date(currentMon);
    lastMon.setDate(currentMon.getDate() - 7);
    const lastWeekKey = toLocalYYYYMMDD(lastMon);
    
    if (key === currentWeekKey) return 'This Week';
    if (key === lastWeekKey) return 'Last Week';
    
    // Formatting Mon - Sun range
    const [y, m, d] = key.split('-').map(Number);
    const mon = new Date(y, m - 1, d);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    
    const formatDayMonth = (dt: Date) => dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const formatDayOnly = (dt: Date) => dt.toLocaleDateString('en-IN', { day: 'numeric' });
    
    if (mon.getMonth() === sun.getMonth()) {
      return `${formatDayOnly(mon)} - ${formatDayMonth(sun)}`;
    } else {
      return `${formatDayMonth(mon)} - ${formatDayMonth(sun)}`;
    }
  }
  
  if (granularity === 'monthly') {
    // Standard short month name, e.g. "Jan", "Feb", "Dec"
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 2).toLocaleDateString('en-IN', { month: 'short' });
  }
  
  return key;
}

export function getBucketsForPage(granularity: Granularity, page: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  
  if (granularity === 'daily') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - (page * 12 + i));
      keys.push(toLocalYYYYMMDD(d));
    }
  } else if (granularity === 'weekly') {
    const currentMon = new Date(now);
    const dayIndex = (currentMon.getDay() + 6) % 7;
    currentMon.setDate(currentMon.getDate() - dayIndex);
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentMon);
      d.setDate(currentMon.getDate() - 7 * (page * 12 + i));
      keys.push(toLocalYYYYMMDD(d));
    }
  } else if (granularity === 'monthly') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - (page * 12 + i), 1);
      keys.push(toLocalYYYYMM(d));
    }
  }
  
  return keys;
}
