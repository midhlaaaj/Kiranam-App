// Meta Cloud API send errors arrive as raw text like
// "(#131026) Message undeliverable". Staff need to know what it means and
// whether retrying will help — group by plain-language reason.

export interface FailureReason {
  /** Stable key for grouping. */
  key: string;
  title: string;
  /** What it means / what to do. */
  advice: string;
  /** Whether "Retry failed" is likely to help for this reason. */
  retryable: boolean;
}

const BY_CODE: Record<string, Omit<FailureReason, 'key'>> = {
  '131026': {
    title: 'Not reachable on WhatsApp',
    advice: 'The number isn’t on WhatsApp, or their app is too old. Check the number or contact them another way.',
    retryable: false,
  },
  '131049': {
    title: 'Held back by Meta',
    advice: 'Meta limits how many marketing messages one person gets. Try again in a day or two.',
    retryable: true,
  },
  '131050': {
    title: 'Opted out of marketing',
    advice: 'This person stopped marketing messages from you in WhatsApp. Don’t resend.',
    retryable: false,
  },
  '131047': {
    title: 'Outside the 24-hour window',
    advice: 'Only templates can be sent after 24 hours of silence.',
    retryable: false,
  },
  '131056': {
    title: 'Sent too fast to this number',
    advice: 'Too many messages to the same person in a short time. Retry later.',
    retryable: true,
  },
  '130429': { title: 'Rate limited', advice: 'WhatsApp was busy. Retrying usually works.', retryable: true },
  '131000': { title: 'Temporary WhatsApp error', advice: 'Something went wrong at Meta. Retrying usually works.', retryable: true },
  '131016': { title: 'WhatsApp unavailable', advice: 'Meta’s service was briefly down. Retry later.', retryable: true },
  '131021': { title: 'Sent to your own number', advice: 'The recipient is the business number itself.', retryable: false },
  '132000': {
    title: 'Template details didn’t match',
    advice: 'The number of filled-in blanks didn’t match the template. Check the personalisation step.',
    retryable: false,
  },
  '132001': {
    title: 'Template not found',
    advice: 'The template was deleted or isn’t approved in this language.',
    retryable: false,
  },
  '132015': { title: 'Template paused', advice: 'Meta paused this template for low quality.', retryable: false },
  '132016': { title: 'Template disabled', advice: 'Meta disabled this template.', retryable: false },
};

export function failureReason(message: string | null | undefined): FailureReason {
  const raw = message ?? '';
  const code = raw.match(/#?(1[3]\d{4})/)?.[1];
  if (code && BY_CODE[code]) return { key: code, ...BY_CODE[code] };
  if (/no phone/i.test(raw)) {
    return { key: 'no-phone', title: 'No phone number', advice: 'Add a number to the contact first.', retryable: false };
  }
  if (/fetch|network|timeout|ECONN/i.test(raw)) {
    return { key: 'network', title: 'Connection problem', advice: 'The request didn’t reach WhatsApp. Retrying usually works.', retryable: true };
  }
  return { key: 'other', title: 'Other error', advice: 'See the technical details for each person below.', retryable: true };
}
