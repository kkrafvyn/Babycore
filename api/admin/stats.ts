import { ensureAdminContext } from '../_shared/admin-auth.js';
import { setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http.js';

const ROLE_LIST = ['admin', 'manager', 'user', 'caregiver', 'viewer'] as const;

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

  const { data, error } = await adminCtx.context.supabase
    .from('user_roles')
    .select('role');

  if (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch stats' });
    return;
  }

  const stats: Record<string, number> = ROLE_LIST.reduce((acc, role) => {
    acc[role] = 0;
    return acc;
  }, {} as Record<string, number>);

  for (const row of data || []) {
    const role = String((row as any).role || 'user');
    stats[role] = (stats[role] || 0) + 1;
  }

  res.status(200).json({
    success: true,
    data: stats,
  });
}

