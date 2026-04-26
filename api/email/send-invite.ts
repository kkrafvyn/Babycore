import { sendTransactionalEmail } from '../_shared/email.js';
import { parseRequestBody, setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http.js';
import { getAuthenticatedUser } from '../_shared/supabase.js';

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
  const inviteLink = String(body.invite_link || '').trim();
  const role = String(body.role || 'caregiver').trim();
  const babyId = String(body.baby_id || '').trim();

  if (!recipientEmail || !inviteLink) {
    res.status(400).json({ success: false, error: 'Missing recipient_email or invite_link' });
    return;
  }

  const subject = `BabyCore invite: ${role}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="margin-bottom: 12px;">You have been invited to BabyCore</h2>
      <p>You were invited as <strong>${role}</strong>${babyId ? ` for baby ID <strong>${babyId}</strong>` : ''}.</p>
      <p>Click the button below to accept:</p>
      <p style="margin: 24px 0;">
        <a href="${inviteLink}" style="display:inline-block;padding:12px 18px;background:#1f6feb;color:#fff;text-decoration:none;border-radius:8px;">
          Accept Invite
        </a>
      </p>
      <p style="color:#555;">If the button does not work, open this link:</p>
      <p style="word-break: break-all; color:#1f6feb;">${inviteLink}</p>
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
      message: 'Invite email processed',
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to send invite email',
    });
  }
}
