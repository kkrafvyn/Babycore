import { sendTransactionalEmail } from '../_shared/email';
import { parseRequestBody, setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http';
import { getAuthenticatedUser } from '../_shared/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const body = parseRequestBody(req.body);
  const recipientEmail = String(body.recipient_email || '').trim();
  const babyName = String(body.baby_name || 'Baby').trim();
  const reportUrl = String(body.report_url || '').trim();
  const reportType = String(body.report_type || 'health_summary').trim();

  if (!recipientEmail || !reportUrl) {
    res.status(400).json({ success: false, error: 'Missing recipient_email or report_url' });
    return;
  }

  const subject = `${babyName} ${reportType.replace(/_/g, ' ')} report`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="margin-bottom: 12px;">${babyName}'s report is ready</h2>
      <p>Report type: <strong>${reportType.replace(/_/g, ' ')}</strong></p>
      <p style="margin: 24px 0;">
        <a href="${reportUrl}" style="display:inline-block;padding:12px 18px;background:#1f6feb;color:#fff;text-decoration:none;border-radius:8px;">
          Open Report
        </a>
      </p>
      <p style="color:#555;">If the button does not work, open this link:</p>
      <p style="word-break: break-all; color:#1f6feb;">${reportUrl}</p>
    </div>
  `.trim();

  try {
    const result = await sendTransactionalEmail({
      to: recipientEmail,
      subject,
      html,
    });

    res.status(200).json({
      success: true,
      message: 'Report email processed',
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to send report email',
    });
  }
}
