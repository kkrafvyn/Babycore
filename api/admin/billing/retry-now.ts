import adminRoutes from '../../../src/api/routes/admin.js';
import { runExpressRouter } from '../../_shared/router-proxy.js';
import { type VercelRequest, type VercelResponse } from '../../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressRouter({
    request: req,
    response: res,
    router: adminRoutes as any,
    mountPath: '/api/admin',
    methods: ['POST'],
    requireAuth: false,
  });
}
