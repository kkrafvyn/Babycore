import {
  parseRequestBody,
  setCommonHeaders,
  type ApiAdapterRequest,
  type ApiAdapterResponse,
} from './http.js';
import { createSupabaseAdminClient, getAuthenticatedUser } from './supabase.js';
import { resolveEffectiveRoleForUser, resolveFallbackRoleFromUser } from '../../src/api/utils/effective-role.js';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RouterLike = {
  handle: (request: any, response: any, next: (error?: unknown) => void) => void;
};

type RunExpressRouterOptions = {
  request: ApiAdapterRequest;
  response: ApiAdapterResponse;
  router: RouterLike;
  mountPath: string;
  methods: RequestMethod[];
  requireAuth?: boolean;
};

const normalizeMountPath = (input: string): string => {
  const normalized = input.trim();
  if (!normalized) return '';
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
};

const resolveRequestUrl = (request: ApiAdapterRequest) => {
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

const getRequestMethod = (request: ApiAdapterRequest): string =>
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

    try {
      createSupabaseAdminClient();
      reqAny.userRole = await resolveEffectiveRoleForUser(user);
    } catch {
      reqAny.userRole = reqAny.userRole || resolveFallbackRoleFromUser(user);
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

