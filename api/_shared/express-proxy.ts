import { getAuthenticatedUser } from './supabase.js';
import {
  parseRequestBody,
  setCommonHeaders,
  type ApiAdapterRequest,
  type ApiAdapterResponse,
} from './http.js';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ExpressLikeHandler = (req: any, res: any) => Promise<void> | void;

type RunExpressHandlerOptions = {
  request: ApiAdapterRequest;
  response: ApiAdapterResponse;
  methods: RequestMethod[];
  requireAuth?: boolean;
  handler: ExpressLikeHandler;
};

export const runExpressHandler = async ({
  request,
  response,
  methods,
  requireAuth = true,
  handler,
}: RunExpressHandlerOptions): Promise<void> => {
  setCommonHeaders(response);

  if (request.method === 'OPTIONS') {
    response.status(200).json({ success: true });
    return;
  }

  if (!methods.includes((request.method || '') as RequestMethod)) {
    response.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const reqAny = request as any;
  reqAny.body = parseRequestBody(request.body);
  reqAny.query = reqAny.query || {};
  reqAny.params = reqAny.params || {};

  if (requireAuth) {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      response.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    reqAny.user = user;
  }

  await Promise.resolve(handler(reqAny, response as any));
};
