import { sendTransactionalEmail } from './_shared/email';
import { parseRequestBody, setCommonHeaders, type VercelRequest, type VercelResponse } from './_shared/http';
import { getAuthenticatedUser } from './_shared/supabase';

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
  const to = String(body.to || '').trim();
  const subject = String(body.subject || '').trim();
  const html = String(body.html || '').trim();
  const from = typeof body.from === 'string' ? body.from : undefined;

  if (!to || !subject || !html) {
    res.status(400).json({ success: false, error: 'Missing to/subject/html' });
    return;
  }

  try {
    const result = await sendTransactionalEmail({
      to,
      subject,
      html,
      from,
    });

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to send email',
    });
  }
}
