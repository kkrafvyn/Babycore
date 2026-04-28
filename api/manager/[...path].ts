import managerRoutes from '../../src/api/routes/manager.js';
import { runExpressRouter } from '../_shared/router-proxy.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressRouter({
    request: req,
    response: res,
    router: managerRoutes as any,
    mountPath: '/api/manager',
    methods: [...SUPPORTED_METHODS],
    requireAuth: true,
  });
}

