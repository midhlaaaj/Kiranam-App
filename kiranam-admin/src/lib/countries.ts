export interface Country {
  name: string;
  iso2: string;
  dialCode: string;
  flag: string;
}

function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

// Kept in sync with kiranam-app's src/utils/countries.ts (India first, same
// list) so a contributor registered from either surface sees the same
// country options.
const RAW_COUNTRIES: Omit<Country, 'flag'>[] = [
  { name: 'India', iso2: 'IN', dialCode: '91' },
  { name: 'Afghanistan', iso2: 'AF', dialCode: '93' },
  { name: 'Australia', iso2: 'AU', dialCode: '61' },
  { name: 'Bahrain', iso2: 'BH', dialCode: '973' },
  { name: 'Bangladesh', iso2: 'BD', dialCode: '880' },
  { name: 'Belgium', iso2: 'BE', dialCode: '32' },
  { name: 'Bhutan', iso2: 'BT', dialCode: '975' },
  { name: 'Brazil', iso2: 'BR', dialCode: '55' },
  { name: 'Canada', iso2: 'CA', dialCode: '1' },
  { name: 'China', iso2: 'CN', dialCode: '86' },
  { name: 'Egypt', iso2: 'EG', dialCode: '20' },
  { name: 'France', iso2: 'FR', dialCode: '33' },
  { name: 'Germany', iso2: 'DE', dialCode: '49' },
  { name: 'Hong Kong', iso2: 'HK', dialCode: '852' },
  { name: 'Indonesia', iso2: 'ID', dialCode: '62' },
  { name: 'Ireland', iso2: 'IE', dialCode: '353' },
  { name: 'Italy', iso2: 'IT', dialCode: '39' },
  { name: 'Japan', iso2: 'JP', dialCode: '81' },
  { name: 'Kenya', iso2: 'KE', dialCode: '254' },
  { name: 'Kuwait', iso2: 'KW', dialCode: '965' },
  { name: 'Malaysia', iso2: 'MY', dialCode: '60' },
  { name: 'Maldives', iso2: 'MV', dialCode: '960' },
  { name: 'Mexico', iso2: 'MX', dialCode: '52' },
  { name: 'Nepal', iso2: 'NP', dialCode: '977' },
  { name: 'Netherlands', iso2: 'NL', dialCode: '31' },
  { name: 'New Zealand', iso2: 'NZ', dialCode: '64' },
  { name: 'Nigeria', iso2: 'NG', dialCode: '234' },
  { name: 'Oman', iso2: 'OM', dialCode: '968' },
  { name: 'Pakistan', iso2: 'PK', dialCode: '92' },
  { name: 'Philippines', iso2: 'PH', dialCode: '63' },
  { name: 'Qatar', iso2: 'QA', dialCode: '974' },
  { name: 'Saudi Arabia', iso2: 'SA', dialCode: '966' },
  { name: 'Singapore', iso2: 'SG', dialCode: '65' },
  { name: 'South Africa', iso2: 'ZA', dialCode: '27' },
  { name: 'South Korea', iso2: 'KR', dialCode: '82' },
  { name: 'Spain', iso2: 'ES', dialCode: '34' },
  { name: 'Sri Lanka', iso2: 'LK', dialCode: '94' },
  { name: 'Sweden', iso2: 'SE', dialCode: '46' },
  { name: 'Switzerland', iso2: 'CH', dialCode: '41' },
  { name: 'Thailand', iso2: 'TH', dialCode: '66' },
  { name: 'United Arab Emirates', iso2: 'AE', dialCode: '971' },
  { name: 'United Kingdom', iso2: 'GB', dialCode: '44' },
  { name: 'United States', iso2: 'US', dialCode: '1' },
  { name: 'Vietnam', iso2: 'VN', dialCode: '84' },
];

export const COUNTRIES: Country[] = RAW_COUNTRIES.map((c) => ({ ...c, flag: flagEmoji(c.iso2) }));

export function getCountryByIso2(iso2: string): Country | undefined {
  return COUNTRIES.find((c) => c.iso2 === iso2);
}
