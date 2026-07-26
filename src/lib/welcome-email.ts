/**
 * Request a welcome email after sign-in.
 * Idempotent: the backend skips if welcome_email_sent_at is already stored.
 */
export async function requestWelcomeEmail(): Promise<void> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!('Authorization' in authHeaders)) {
      return;
    }

    const response = await fetch('/api/auth/welcome-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    if (!response.ok && response.status !== 401 && response.status !== 200) {
      console.warn('Welcome email request failed:', response.status, await response.text());
    }
  } catch (error) {
    console.warn('Welcome email request failed:', error);
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { supabase } = await import('./supabase');
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();

  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}
