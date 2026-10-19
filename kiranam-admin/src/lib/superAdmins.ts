// Owner admins: the only ones who can remove other admins, and who can never
// be removed themselves (by each other or anyone else).
const SUPER_ADMIN_EMAILS = [
  'bavainternational@gmail.com',
  'midhlajmidhu004@gmail.com',
  'mail@healthcarefoundation.in',
];

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
