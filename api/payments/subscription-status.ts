import { getSubscriptionStatus } from '../../src/api/routes/payments.js';
import { runExpressHandler } from '../_shared/express-proxy.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressHandler({
    request: req,
    response: res,
    methods: ['GET'],
    handler: getSubscriptionStatus as any,
  });
}
