import { analyzeCry } from '../../src/api/routes/voice-transcription.js';
import { runExpressHandler } from '../_shared/express-proxy.js';
import { type VercelRequest, type VercelResponse } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await runExpressHandler({
    request: req,
    response: res,
    methods: ['POST'],
    handler: analyzeCry as any,
  });
}
