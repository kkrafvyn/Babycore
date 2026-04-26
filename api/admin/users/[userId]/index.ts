import { ensureAdminContext, getPathParam } from '../../../_shared/admin-auth.js';
import { setCommonHeaders, type VercelRequest, type VercelResponse } from '../../../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'DELETE') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const adminCtx = await ensureAdminContext(req);
  if (!adminCtx.ok) {
    res.status(adminCtx.status).json({ success: false, error: adminCtx.error });
    return;
  }

  const targetUserId = getPathParam(req, 'userId');
  if (!targetUserId) {
    res.status(400).json({ success: false, error: 'Missing userId path parameter' });
    return;
  }

  if (targetUserId === adminCtx.context.user.id) {
    res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    return;
  }

  await adminCtx.context.supabase.from('admin_actions_log').insert({
    admin_id: adminCtx.context.user.id,
    action: 'user_deleted',
    target_user_id: targetUserId,
    details: {},
    created_at: new Date().toISOString(),
  });

  const authAdmin = (adminCtx.context.supabase.auth as any).admin;
  const { error } = await authAdmin.deleteUser(targetUserId);
  if (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete user' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
}

