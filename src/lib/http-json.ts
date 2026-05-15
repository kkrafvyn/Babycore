export const readJsonResponse = async <T = any>(response: Response): Promise<T | null> => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('json')) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export const getResponseErrorMessage = (
  payload: Record<string, any> | null | undefined,
  fallback: string,
): string => payload?.error || payload?.message || fallback;
