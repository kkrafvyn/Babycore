import emailReportsRoutes from '../../src/api/routes/email-reports.js';
import { runExpressRouter } from '../_shared/router-proxy.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressRouter({
    request: req,
    response: res,
    router: emailReportsRoutes as any,
    mountPath: '/api/email-reports',
    methods: [...SUPPORTED_METHODS],
    requireAuth: true,
  });
}

