import cronRoutes from '../../src/api/routes/cron.js';
import { runExpressRouter } from '../_shared/router-proxy.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressRouter({
    request: req,
    response: res,
    router: cronRoutes as any,
    mountPath: '/api/cron',
    methods: ['GET'],
    requireAuth: false,
  });
}
