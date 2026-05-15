/**
 * Authentication Middleware
 * JWT token verification and user attachment to request
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase.js';
import { resolveEffectiveRoleForUser, resolveFallbackRoleFromUser } from '../utils/effective-role.js';

export interface AuthRequest extends Request {
  user?: any;
  userRole?: string;
}

const normalizeEmail = (value?: string): string => value?.trim().toLowerCase() || '';

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user to request
 */
export default async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Skip auth for public endpoints
    if (isPublicEndpoint(req.path)) {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    try {
      const authClient = supabase.auth as any;
      const { data: { user }, error } = await authClient.getUser(token);

      if (error || !user) {
        return res.status(401).json({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        });
      }

      // Attach user to request
      req.user = user;

      try {
        req.userRole = await resolveEffectiveRoleForUser(user);
      } catch (roleError) {
        console.warn('Falling back to default user role after role lookup failed:', roleError);
        req.userRole = resolveFallbackRoleFromUser(user);
      }

      next();
    } catch (tokenError) {
      return res.status(401).json({
        error: 'Token verification failed',
        code: 'TOKEN_VERIFY_FAILED',
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Check if request path is public
 * Public endpoints don't require authentication
 */
function isPublicEndpoint(path: string): boolean {
  const publicEndpoints = [
    '/health',
    '/health/config',
    '/api/health',
    '/api/health/config',
    '/payments/config',
    '/api/payments/config',
    '/payments/pricing',
    '/api/payments/pricing',
    '/payments/webhook/paystack',
    '/payments/webhook/flutterwave',
    '/webhooks/paystack',
    '/webhooks/flutterwave',
    '/api/webhooks/paystack',
    '/api/webhooks/flutterwave',
    '/api/payments/webhook/paystack',
    '/api/payments/webhook/flutterwave',
    '/care/public/emergency-card/',
    '/api/care/public/emergency-card/',
    '/cron/',
    '/api/cron/',
    '/reports/shared/',
    '/api/reports/shared/', // Shared reports with token
    '/api/auth/', // Auth endpoints (if using separate auth routes)
  ];

  return publicEndpoints.some(endpoint => {
    if (endpoint.endsWith('/')) {
      return path.startsWith(endpoint);
    }
    return path === endpoint;
  });
}

/**
 * Middleware to check user role
 * Usage: app.get('/admin', requireRole('admin'), handler)
 */
export function requireRole(requiredRole: string | string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    if (!roles.includes(req.userRole || 'user')) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        requiredRole: roles,
        yourRole: req.userRole,
      });
    }

    next();
  };
}

/**
 * Middleware to verify ownership of resource
 * Usage: app.get('/babies/:babyId', verifyOwnership('baby_id'), handler)
 */
export function verifyOwnership(paramName: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const resourceId = req.params[paramName];

      if (!resourceId) {
        return next(); // Skip if no ID in params
      }

      // Check if user owns this resource
      // This is a generic check - customize based on your schema
      const { data, error } = await supabase
        .from('babies')
        .select('user_id')
        .eq('id', resourceId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Check if user is owner or has access through modern family sharing / doctor assignment.
      const isOwner = data.user_id === req.user.id;
      const userEmail = normalizeEmail(req.user?.email);
      const { data: sharedAccess } = await supabase
        .from('family_sharing_invites')
        .select('*')
        .eq('baby_id', resourceId)
        .not('accepted_at', 'is', null)
        .or(
          [
            `accepted_by.eq.${req.user.id}`,
            userEmail ? `invited_email.ilike.${userEmail}` : null,
          ]
            .filter(Boolean)
            .join(','),
        )
        .maybeSingle();

      const { data: doctorAccess } = await supabase
        .from('doctor_baby_assignments')
        .select('id')
        .eq('baby_id', resourceId)
        .eq('doctor_id', req.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!isOwner && !sharedAccess && !doctorAccess) {
        return res.status(403).json({
          error: 'You do not have access to this resource',
        });
      }

      next();
    } catch (error) {
      console.error('Ownership verification error:', error);
      return res.status(500).json({ error: 'Verification failed' });
    }
  };
}

/**
 * Middleware for rate limiting
 * Usage: app.get('/api/expensive-operation', rateLimit(10, '1m'), handler)
 */
export function rateLimit(maxRequests: number, windowMs: string) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();
    const windowDuration = parseWindowMs(windowMs);

    let record = requests.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowDuration };
      requests.set(key, record);
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      const resetIn = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: resetIn,
      });
    }

    next();
  };
}

/**
 * Parse window duration strings like '1m', '5s', '1h'
 */
function parseWindowMs(window: string): number {
  const match = window.match(/^(\d+)([smh])$/);
  if (!match) return 60000; // Default 1 minute

  const [, value, unit] = match;
  const val = parseInt(value, 10);

  switch (unit) {
    case 's':
      return val * 1000;
    case 'm':
      return val * 60 * 1000;
    case 'h':
      return val * 60 * 60 * 1000;
    default:
      return 60000;
  }
}

/**
 * Error handling middleware for auth errors
 */
export function authErrorHandler(
  err: any,
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message,
    });
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message,
    });
  }

  next(err);
}

export const requireAuth = authMiddleware;
