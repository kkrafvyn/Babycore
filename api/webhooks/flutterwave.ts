import { handleFlutterwaveWebhook } from '../../src/api/routes/payments.js';
import { runExpressHandler } from '../_shared/express-proxy.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

/**
 * Compatibility endpoint for providers configured to call /api/webhooks/flutterwave.
 * Canonical endpoint remains /api/payments/webhook/flutterwave.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressHandler({
    request: req,
    response: res,
    methods: ['POST'],
    requireAuth: false,
    handler: handleFlutterwaveWebhook as any,
  });
}
