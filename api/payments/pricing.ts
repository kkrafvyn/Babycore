import { getSubscriptionPricing } from '../../src/api/routes/payments.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await getSubscriptionPricing(req as any, res as any);
}

