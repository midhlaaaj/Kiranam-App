const BRAND_RED = '#EC2028';
const TEXT = '#0C0C0D';
const MUTED = '#7A756E';

const wrapper = (bodyHtml: string) => `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: ${TEXT}; max-width: 480px; margin: 0 auto;">
    <div style="padding: 24px 0 16px;">
      <span style="font-size: 22px; font-weight: 800; color: ${TEXT}; letter-spacing: -0.5px;">Kiranam</span>
    </div>
    ${bodyHtml}
    <p style="color: ${MUTED}; font-size: 12px; margin-top: 32px;">
      Kiranam &middot; <a href="mailto:support@kiranam.org" style="color: ${MUTED};">support@kiranam.org</a>
    </p>
  </div>
`;

const button = (href: string, label: string) => `
  <a href="${href}" style="display: inline-block; background: ${BRAND_RED}; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 28px; margin: 16px 0;">
    ${label}
  </a>
`;

export function claimAccountEmail(params: { claimUrl: string; fullName: string }) {
  return wrapper(`
    <h1 style="font-size: 20px; margin-bottom: 8px;">Welcome to Kiranam, ${params.fullName}</h1>
    <p style="color: ${MUTED}; font-size: 14px; line-height: 22px;">
      A Kiranam team member has registered you as a contributor. To manage your contributions from the app, set a password for your account below.
    </p>
    ${button(params.claimUrl, 'Set Your Password')}
    <p style="color: ${MUTED}; font-size: 12px;">
      If you weren't expecting this, you can safely ignore this email.
    </p>
  `);
}

export function adminInviteEmail(params: { signupUrl: string; invitedEmail: string }) {
  return wrapper(`
    <h1 style="font-size: 20px; margin-bottom: 8px;">You've been invited to manage Kiranam</h1>
    <p style="color: ${MUTED}; font-size: 14px; line-height: 22px;">
      Someone on the Kiranam team has invited <strong>${params.invitedEmail}</strong> to help manage the Kiranam admin dashboard.
    </p>
    <p style="color: ${MUTED}; font-size: 14px; line-height: 22px;">
      Click below and sign up with this exact email address to set your password and get started.
    </p>
    ${button(params.signupUrl, 'Accept Invite')}
    <p style="color: ${MUTED}; font-size: 12px;">
      If you weren't expecting this, you can safely ignore this email.
    </p>
  `);
}
