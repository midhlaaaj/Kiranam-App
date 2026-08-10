// Use the `mobile` build (not the default entry) — the default package.json
// main resolves to an ES-module graph Metro can't bundle for React Native,
// while `libphonenumber-js/mobile` ships CJS-friendly output built for it.
import { isValidPhoneNumber } from 'libphonenumber-js/mobile';
import type { CountryCode } from 'libphonenumber-js/mobile';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERRAL_CODE_RE = /^[A-Z0-9]+$/;

export function validateRequired(value: string, fieldLabel: string): string | null {
  return value.trim() ? null : `${fieldLabel} is required.`;
}

export function validateEmail(email: string, opts?: { required?: boolean }): string | null {
  const trimmed = email.trim();
  if (!trimmed) return opts?.required ? 'Email is required.' : null;
  return EMAIL_RE.test(trimmed) ? null : 'Please enter a valid email address.';
}

export function validatePhoneNumber(nationalNumber: string, countryCode: CountryCode): string | null {
  const trimmed = nationalNumber.trim();
  if (!trimmed) return 'Please enter your phone number.';
  if (!isValidPhoneNumber(trimmed, countryCode)) return 'Please enter a valid phone number.';
  return null;
}

export function validateOtp(otp: string): string | null {
  return /^\d{6}$/.test(otp) ? null : 'Please enter the full 6-digit code.';
}

export function validateAmount(
  value: string | number,
  opts?: { min?: number; max?: number; label?: string }
): string | null {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (value === '' || value === null || value === undefined || Number.isNaN(n)) {
    return `Please enter ${opts?.label || 'an amount'}.`;
  }
  if (n <= 0) return 'Amount must be greater than zero.';
  if (opts?.min !== undefined && n < opts.min) return `Minimum amount is ${opts.min}.`;
  if (opts?.max !== undefined && n > opts.max) return `Amount cannot exceed ${opts.max}.`;
  return null;
}

export function validateReferralCode(code: string, opts?: { required?: boolean }): string | null {
  const trimmed = code.trim();
  if (!trimmed) return opts?.required ? 'Referral code is required.' : null;
  if (trimmed.length < 4 || trimmed.length > 20) return 'Referral code must be 4-20 characters.';
  if (!REFERRAL_CODE_RE.test(trimmed)) return 'Referral code can only contain letters and numbers.';
  return null;
}

export function validateMinLength(value: string, min: number, fieldLabel: string): string | null {
  return value.trim().length >= min ? null : `${fieldLabel} must be at least ${min} characters.`;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  return null;
}
