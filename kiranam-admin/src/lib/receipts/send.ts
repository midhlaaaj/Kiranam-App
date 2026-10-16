import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import { paymentReceiptEmail } from '@/lib/email/templates';
import { getRecipients } from '@/lib/kiranam-notify/recipients';
import { getKiranamWhatsApp, KIRANAM_TEMPLATES, templateText, uploadWhatsAppMedia } from '@/lib/kiranam-notify/whatsapp';
import { buildReceiptPdf, formatReceiptAmount, formatReceiptDate } from './pdf';

export interface ReceiptResult {
  status: 'sent' | 'already_sent' | 'not_found';
  whatsapp?: 'sent' | 'skipped' | 'failed';
  email?: 'sent' | 'skipped' | 'failed';
}

/** Sends the receipt for one successful contribution — WhatsApp (PDF in
 * the template header) to the contributor's phone, plus email with the PDF
 * attached when their address is verified. Works the same for app
 * payments, autopay charges and admin-entered offline payments.
 *
 * Idempotent: the contribution is claimed by setting receipt_sent_at
 * first, so a duplicate trigger call or retry never sends twice. */
export async function sendPaymentReceipt(contributionId: string): Promise<ReceiptResult> {
  const supabase = createAdminClient();

  const { data: payment, error } = await supabase
    .from('contributions')
    .update({ receipt_sent_at: new Date().toISOString() })
    .eq('id', contributionId)
    .eq('status', 'success')
    .is('receipt_sent_at', null)
    .select('id, contributor_id, amount, label, created_at, is_offline, razorpay_payment_id, transaction_ref')
    .maybeSingle();
  if (error) throw new Error(`Could not claim receipt for ${contributionId}: ${error.message}`);
  if (!payment) {
    const { count } = await supabase.from('contributions').select('id', { count: 'exact', head: true }).eq('id', contributionId);
    return { status: count ? 'already_sent' : 'not_found' };
  }

  const [recipient] = await getRecipients([payment.contributor_id]);
  if (!recipient) return { status: 'not_found' };

  const amount = Number(payment.amount) || 0;
  const label = payment.label || 'Monthly Contribution';
  const date = new Date(payment.created_at);
  const transactionId: string = payment.razorpay_payment_id || payment.transaction_ref || payment.id;
  const pdf = await buildReceiptPdf({
    name: recipient.name === 'there' ? '' : recipient.name,
    email: recipient.verifiedEmail,
    phone: recipient.phone,
    label,
    amount,
    transactionId,
    date,
  });
  const fileName = `Kiranam-Receipt-${date.toISOString().slice(0, 10)}-${payment.id.slice(0, 8)}.pdf`;
  const result: ReceiptResult = { status: 'sent' };

  // WhatsApp — skipped until kiranam_payment_receipt is approved.
  const wa = recipient.phone ? await getKiranamWhatsApp() : null;
  const template = wa ? await wa.template(KIRANAM_TEMPLATES.paymentReceipt) : null;
  if (!wa || !template || !recipient.phone) {
    result.whatsapp = 'skipped';
  } else {
    try {
      const mediaId = await uploadWhatsAppMedia(wa, { bytes: pdf, mimeType: 'application/pdf', fileName });
      await wa.send(recipient.phone, template, {
        headerMediaId: mediaId,
        headerDocumentFilename: fileName,
        // Extra values beyond the template's variable count are dropped,
        // so this fits both the 4- and 5-variable versions of the body.
        body: [
          templateText(recipient.name, 'there', 60),
          amount.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
          templateText(label, 'Monthly Contribution', 100),
          date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
          transactionId,
        ],
      });
      result.whatsapp = 'sent';
    } catch (err) {
      console.error('[sendPaymentReceipt] WhatsApp failed', contributionId, err);
      result.whatsapp = 'failed';
    }
  }

  if (!recipient.verifiedEmail) {
    result.email = 'skipped';
  } else {
    const { error: emailError } = await sendEmail({
      to: recipient.verifiedEmail,
      subject: `Your Kiranam receipt — ${formatReceiptAmount(amount)}`,
      html: paymentReceiptEmail({
        name: recipient.name,
        amount: formatReceiptAmount(amount),
        label,
        date: formatReceiptDate(date),
        transactionId,
      }),
      attachments: [{ filename: fileName, content: Buffer.from(pdf).toString('base64') }],
    });
    result.email = emailError ? 'failed' : 'sent';
  }

  // Nothing got through — release the claim so a later retry can send it.
  if (result.whatsapp !== 'sent' && result.email !== 'sent' && (result.whatsapp === 'failed' || result.email === 'failed')) {
    await supabase.from('contributions').update({ receipt_sent_at: null }).eq('id', payment.id);
    return { ...result, status: 'sent' };
  }

  // App/autopay payments already get a "Payment Successful" notification
  // from their own flow; admin-entered ones didn't get any until now.
  if (payment.is_offline) {
    const dateLabel = formatReceiptDate(date);
    await supabase.rpc('notify', {
      p_profile_id: payment.contributor_id,
      p_title: 'Payment received',
      p_body: `Your ${formatReceiptAmount(amount)} contribution for "${label}" was recorded. Thank you!`,
      p_category: 'contribution',
      p_deep_link: `/receipt?id=${encodeURIComponent(transactionId)}&amount=${amount}&date=${encodeURIComponent(dateLabel)}&label=${encodeURIComponent(label)}`,
    });
  }

  return result;
}
