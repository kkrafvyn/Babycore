import { ensureAdminContext, getQueryNumber } from '../_shared/admin-auth.js';
import { setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const adminCtx = await ensureAdminContext(req);
  if (!adminCtx.ok) {
    res.status(adminCtx.status).json({ success: false, error: adminCtx.error });
    return;
  }

  const limit = getQueryNumber(req, 'limit', 30, 1, 200);
  const offset = getQueryNumber(req, 'offset', 0, 0);

  const { data, error, count } = await adminCtx.context.supabase
    .from('role_assignment_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch audit logs' });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      logs: data || [],
      total: Number(count || 0),
      limit,
      offset,
    },
  });
}

