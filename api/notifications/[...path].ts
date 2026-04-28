import notificationsRoutes from '../../src/api/routes/notifications.js';
import { runExpressRouter } from '../_shared/router-proxy.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressRouter({
    request: req,
    response: res,
    router: notificationsRoutes as any,
    mountPath: '/api/notifications',
    methods: [...SUPPORTED_METHODS],
    requireAuth: true,
  });
}

