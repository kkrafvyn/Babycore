import doctorRoutes from '../../src/api/routes/doctor.js';
import { runExpressRouter } from '../_shared/router-proxy.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressRouter({
    request: req,
    response: res,
    router: doctorRoutes as any,
    mountPath: '/api/doctor',
    methods: [...SUPPORTED_METHODS],
    requireAuth: true,
  });
}

