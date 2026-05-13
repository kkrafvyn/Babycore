export type ApiAdapterRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  url?: string;
};

export type ApiAdapterResponse = {
  status: (code: number) => ApiAdapterResponse;
  json: (body: Record<string, unknown>) => void;
  setHeader: (name: string, value: string) => void;
};

export const setCommonHeaders = (res: ApiAdapterResponse): void => {
  res.setHeader('Cache-Control', 'no-store');
};

export const parseRequestBody = (requestBody: unknown): Record<string, unknown> => {
  if (!requestBody) {
    return {};
  }

  if (typeof requestBody === 'string') {
    try {
      return JSON.parse(requestBody) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (typeof requestBody === 'object') {
    return requestBody as Record<string, unknown>;
  }

  return {};
};

export const getBearerToken = (
  header: string | string[] | undefined,
): string | undefined => {
  const rawValue = Array.isArray(header) ? header[0] : header;
  if (!rawValue || !rawValue.startsWith('Bearer ')) {
    return undefined;
  }
  return rawValue.slice(7).trim();
};
