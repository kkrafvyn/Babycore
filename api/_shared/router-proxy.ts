import {
  parseRequestBody,
  setCommonHeaders,
  type ApiAdapterRequest,
  type ApiAdapterResponse,
} from './http.js';
import { createSupabaseAdminClient, getAuthenticatedUser } from './supabase.js';
import { resolveEffectiveRoleForUser, resolveFallbackRoleFromUser } from '../../src/api/utils/effective-role.js';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const CAPACITOR_ORIGINS = new Set([
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'ionic://localhost',
]);

const parseAllowedOrigins = (): Set<string> => {
  const origins = new Set<string>(CAPACITOR_ORIGINS);

  for (const key of ['CLIENT_URL', 'CORS_ORIGIN', 'VITE_APP_URL']) {
    const value = process.env[key]?.trim();
    if (!value) {
      continue;
    }

    try {
      origins.add(new URL(value).origin);
    } catch {
      origins.add(value.replace(/\/$/, ''));
    }
  }

  return origins;
};

const resolveCorsOrigin = (request: ApiAdapterRequest, allowed: Set<string>): string | undefined => {
  const rawOrigin = request.headers?.origin ?? request.headers?.Origin;
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;

  if (!origin || typeof origin !== 'string') {
    return undefined;
  }

  if (allowed.has(origin)) {
    return origin;
  }

  if (origin === 'https://localhost' || origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
    return origin;
  }

  return undefined;
};

const applyCorsHeaders = (
  request: ApiAdapterRequest,
  response: ApiAdapterResponse,
  methods: RequestMethod[],
): void => {
  const origin = resolveCorsOrigin(request, parseAllowedOrigins());
  const allowOrigin = origin || '*';

  response.setHeader('Access-Control-Allow-Origin', allowOrigin);
  if (origin) {
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.setHeader('Access-Control-Max-Age', '86400');
};

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

const getQueryStringValue = (
  request: ApiAdapterRequest,
  requestUrl: URL,
  key: string,
): string | undefined => {
  const requestQueryValue = request.query?.[key];
  if (Array.isArray(requestQueryValue)) {
    return requestQueryValue.filter(Boolean).join('/');
  }

  if (typeof requestQueryValue === 'string' && requestQueryValue.trim()) {
    return requestQueryValue;
  }

  return requestUrl.searchParams.get(key) || undefined;
};

const getRewrittenCatchAllUrl = (
  request: ApiAdapterRequest,
  requestUrl: URL,
  mountPath: string,
): string | null => {
  const normalizedMountPath = normalizeMountPath(mountPath);
  if (requestUrl.pathname !== `${normalizedMountPath}/[...path]`) {
    return null;
  }

  const catchAllPath = getQueryStringValue(request, requestUrl, 'path');
  const relativePath = catchAllPath ? `/${catchAllPath.replace(/^\/+/, '')}` : '/';
  const searchParams = new URLSearchParams(requestUrl.search);
  searchParams.delete('path');
  const search = searchParams.toString();

  return `${relativePath}${search ? `?${search}` : ''}`;
};

const getRelativeRouterUrl = (
  request: ApiAdapterRequest,
  requestUrl: URL,
  mountPath: string,
): string => {
  const rewrittenCatchAllUrl = getRewrittenCatchAllUrl(request, requestUrl, mountPath);
  if (rewrittenCatchAllUrl) {
    return rewrittenCatchAllUrl;
  }

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
  applyCorsHeaders(request, response, methods);
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
  reqAny.url = getRelativeRouterUrl(request, resolvedUrl, mountPath);

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

