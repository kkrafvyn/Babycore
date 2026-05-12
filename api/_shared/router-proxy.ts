import { parseRequestBody, setCommonHeaders, type VercelRequest, type VercelResponse } from './http.js';
import { createSupabaseAdminClient, getAuthenticatedUser } from './supabase.js';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RouterLike = {
  handle: (request: any, response: any, next: (error?: unknown) => void) => void;
};

type RunExpressRouterOptions = {
  request: VercelRequest;
  response: VercelResponse;
  router: RouterLike;
  mountPath: string;
  methods: RequestMethod[];
  requireAuth?: boolean;
};

const MAIN_ADMIN_EMAILS = new Set(['ponk3020@gmail.com']);

const normalizeAdminEmail = (value?: string): string => value?.trim().toLowerCase() || '';

const normalizeRole = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const getFallbackUserRole = (user: any): string =>
  normalizeRole(user?.app_metadata?.role) ||
  normalizeRole(user?.user_metadata?.role) ||
  (MAIN_ADMIN_EMAILS.has(normalizeAdminEmail(user?.email)) ? 'admin' : 'user');

const normalizeMountPath = (input: string): string => {
  const normalized = input.trim();
  if (!normalized) return '';
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
};

const resolveRequestUrl = (request: VercelRequest) => {
  const rawUrl = String(request.url || '/');
  try {
    return new URL(rawUrl, 'http://localhost');
  } catch {
    return new URL('/', 'http://localhost');
  }
};

const getRelativeRouterUrl = (requestUrl: URL, mountPath: string): string => {
  const pathname = requestUrl.pathname || '/';
  const normalizedMountPath = normalizeMountPath(mountPath);

  if (!normalizedMountPath || !pathname.startsWith(normalizedMountPath)) {
    return `${pathname}${requestUrl.search}`;
  }

  const trimmedPath = pathname.slice(normalizedMountPath.length) || '/';
  const relativePath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
  return `${relativePath}${requestUrl.search}`;
};

const getRequestMethod = (request: VercelRequest): string =>
  String(request.method || '').toUpperCase();

export const runExpressRouter = async ({
  request,
  response,
  router,
  mountPath,
  methods,
  requireAuth = true,
}: RunExpressRouterOptions): Promise<void> => {
  setCommonHeaders(response);

  if (request.method === 'OPTIONS') {
    response.status(200).json({ success: true });
    return;
  }

  const method = getRequestMethod(request);
  if (!methods.includes(method as RequestMethod)) {
    response.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const resolvedUrl = resolveRequestUrl(request);
  const reqAny = request as any;

  reqAny.method = method;
  reqAny.body = parseRequestBody(request.body);
  reqAny.query = reqAny.query || {};
  reqAny.params = reqAny.params || {};
  reqAny.path = resolvedUrl.pathname;
  reqAny.originalUrl = `${resolvedUrl.pathname}${resolvedUrl.search}`;
  reqAny.baseUrl = normalizeMountPath(mountPath);
  reqAny.url = getRelativeRouterUrl(resolvedUrl, mountPath);

  if (requireAuth) {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      response.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    reqAny.user = user;
    const fallbackUserRole = getFallbackUserRole(user);

    try {
      const supabase = createSupabaseAdminClient();
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      reqAny.userRole = roleData?.role || fallbackUserRole;
    } catch {
      reqAny.userRole = reqAny.userRole || fallbackUserRole;
    }
  }

  await new Promise<void>((resolve) => {
    const next = (error?: unknown) => {
      if (error) {
        const fallback = error instanceof Error ? error.message : 'Unhandled route error';
        response.status(500).json({ success: false, error: fallback });
      }
      resolve();
    };

    try {
      router.handle(reqAny, response as any, next);
    } catch (error) {
      next(error);
    }
  });
};

