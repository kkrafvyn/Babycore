import familyRoutes from '../../src/api/routes/family.js';
import { runExpressRouter } from '../_shared/router-proxy.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

const SUPPORTED_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressRouter({
    request: req,
    response: res,
    router: familyRoutes as any,
    mountPath: '/api/family',
    methods: [...SUPPORTED_METHODS],
    requireAuth: false,
  });
}
