import { setCommonHeaders, type VercelRequest, type VercelResponse } from './_shared/http.js';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
  });
}
