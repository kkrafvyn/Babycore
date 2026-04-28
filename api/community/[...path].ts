import communityRoutes from '../../src/api/routes/community.js';
import { runExpressRouter } from '../_shared/router-proxy.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressRouter({
    request: req,
    response: res,
    router: communityRoutes as any,
    mountPath: '/api/community',
    methods: [...SUPPORTED_METHODS],
    requireAuth: true,
  });
}

