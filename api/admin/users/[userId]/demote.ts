import {
  ensureAdminContext,
  getPathParam,
  logAdminRoleChange,
  persistUserRole,
  readCurrentRole,
} from '../../../_shared/admin-auth.js';
import {
  parseRequestBody,
  setCommonHeaders,
  type VercelRequest,
  type VercelResponse,
} from '../../../_shared/http.js';

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

  const body = parseRequestBody(req.body);
  const reason = String(body.reason || '').trim();
  const nextRole = 'user';

  const previousRole = await readCurrentRole(adminCtx.context.supabase, targetUserId);
  const assignment = await persistUserRole(
    adminCtx.context.supabase,
    targetUserId,
    nextRole,
    adminCtx.context.user.id,
  );

  if (!assignment.success) {
    res.status(500).json({ success: false, error: assignment.error || 'Failed to demote user' });
    return;
  }

  await logAdminRoleChange(adminCtx.context.supabase, {
    adminUserId: adminCtx.context.user.id,
    targetUserId,
    previousRole,
    nextRole,
    reason: reason || undefined,
    action: 'user_demoted',
  });

  res.status(200).json({
    success: true,
    message: 'User demoted to user',
    data: {
      previousRole,
      role: nextRole,
    },
  });
}

