import { sendMilestoneAnnouncement } from '../../src/api/routes/email-reports.js';
import { runExpressHandler } from '../_shared/express-proxy.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressHandler({
    request: req,
    response: res,
    methods: ['POST'],
    handler: sendMilestoneAnnouncement as any,
  });
}
