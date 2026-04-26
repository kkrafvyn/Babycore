import { handlePaystackWebhook } from '../../../src/api/routes/payments';
import { runExpressHandler } from '../../_shared/express-proxy';
import { type VercelRequest, type VercelResponse } from '../../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressHandler({
    request: req,
    response: res,
    methods: ['POST'],
    requireAuth: false,
    handler: handlePaystackWebhook as any,
  });
}
