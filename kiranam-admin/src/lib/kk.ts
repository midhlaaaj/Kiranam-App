// KK numbers come in two series: "KK<n>" (Indian mobile numbers) and "KKG<n>"
// (non-Indian numbers). Some Indian contributors were recorded under KKG by hand,
// so the series is never enforced against the phone's country.
export type KkSeries = 'KK' | 'KKG';

export const KK_NUMBER_RE = /^KKG?\d+$/i;
export const KK_FORMAT_ERROR = 'KK number must look like KK1 or KKG1.';

/** Series a new contributor would normally get, from their phone's country. */
export function defaultKkSeries(iso2: string | undefined): KkSeries {
  return iso2 === 'IN' ? 'KK' : 'KKG';
}

/** The number a series should continue from: the highest one that sits in the
 * real run of numbers. Isolated outliers far above the run — a phone number or
 * a typo saved as a KK number — are skipped, otherwise auto-assign would carry
 * on from them (KK9895681058). A number counts as an outlier when the next
 * number below it is more than `maxGap` away. */
export function currentKkHighWater(numbers: number[], maxGap = 500): number {
  const sorted = [...new Set(numbers)].sort((a, b) => b - a);
  for (let i = 0; i < sorted.length; i++) {
    const below = sorted[i + 1];
    if (below === undefined || sorted[i] - below <= maxGap) return sorted[i];
  }
  return 0;
}
