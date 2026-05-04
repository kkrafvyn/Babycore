import { ensureAdminContext, getQueryNumber, getQueryString } from '../_shared/admin-auth.js';
import { runExpressRouter } from '../_shared/router-proxy.js';
import { setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http.js';
import adminRoutes from '../../src/api/routes/admin.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type AuthUser = {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  phone?: string;
  user_metadata?: Record<string, any>;
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method === 'POST') {
    await runExpressRouter({
      request: req,
      response: res,
      router: adminRoutes as any,
      mountPath: '/api/admin',
      methods: ['POST'],
      requireAuth: false,
    });
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

  const limit = getQueryNumber(req, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = getQueryNumber(req, 'offset', 0, 0);
  const searchQuery = getQueryString(req, 'search').toLowerCase();

  const page = Math.floor(offset / limit) + 1;

  const authAdmin = (adminCtx.context.supabase.auth as any).admin;
  const { data: authData, error: authError } = await authAdmin.listUsers({
    page,
    perPage: limit,
  });

  if (authError) {
    res.status(500).json({ success: false, error: authError.message || 'Failed to fetch users' });
    return;
  }

  const authUsers = ((authData?.users || []) as AuthUser[]).filter(Boolean);
  const userIds = authUsers.map((user) => user.id);

  const { data: rolesData } = userIds.length
    ? await adminCtx.context.supabase
        .from('user_roles')
        .select('user_id, role, assigned_at, assigned_by')
        .in('user_id', userIds)
    : { data: [] as any[] };

  const { data: babiesData } = userIds.length
    ? await adminCtx.context.supabase
        .from('babies')
        .select('user_id')
        .in('user_id', userIds)
    : { data: [] as any[] };

  const roleMap = new Map(
    (rolesData || []).map((row: any) => [String(row.user_id), row]),
  );
  const babyCountMap = (babiesData || []).reduce<Map<string, number>>((acc, row: any) => {
    const key = String(row.user_id || '');
    if (!key) return acc;
    acc.set(key, (acc.get(key) || 0) + 1);
    return acc;
  }, new Map());

  let users = authUsers.map((user) => {
    const roleRecord = roleMap.get(user.id);
    const metadata = user.user_metadata || {};
    const displayName =
      String(metadata.name || metadata.full_name || metadata.display_name || '').trim() ||
      String(user.email || '').split('@')[0] ||
      'User';

    return {
      id: user.id,
      email: user.email || '',
      phone: user.phone || '',
      name: displayName,
      role: String(roleRecord?.role || 'user'),
      assignedAt: roleRecord?.assigned_at || null,
      assignedBy: roleRecord?.assigned_by || null,
      createdAt: user.created_at || null,
      lastSignInAt: user.last_sign_in_at || null,
      profileType: String(metadata.onboarding_profile_type || 'baby'),
      babiesCount: babyCountMap.get(user.id) || 0,
    };
  });

  if (searchQuery) {
    users = users.filter((user) => {
      const haystack = `${user.email} ${user.name} ${user.role} ${user.profileType}`.toLowerCase();
      return haystack.includes(searchQuery);
    });
  }

  const totalCount =
    Number(authData?.total || 0) ||
    Math.max(offset + users.length, Number(authData?.users?.length || users.length));

  res.status(200).json({
    success: true,
    data: {
      users,
      limit,
      offset,
      total: totalCount,
      page,
      hasMore: offset + users.length < totalCount,
    },
  });
}

