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
