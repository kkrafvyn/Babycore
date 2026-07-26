const CHUNK_RELOAD_SESSION_KEY = 'cradlyn:chunk-reload';
const MAX_CHUNK_RELOAD_ATTEMPTS = 2;

export const isStaleChunkLoadError = (value: unknown): boolean => {
  const message = value instanceof Error ? value.message : String(value ?? '');

  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('disallowed MIME type') ||
    message.includes('Loading module from') ||
    message.includes('was blocked because of a disallowed MIME type') ||
    /Missing export ".+" in lazy-loaded module/.test(message) ||
    /can't access property ".+" of undefined/.test(message) ||
    /Cannot read properties of undefined/.test(message)
  );
};

export const reloadAfterStaleChunk = (): void => {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return;
  }

  const attempts = Number(sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY) || '0');
  if (attempts >= MAX_CHUNK_RELOAD_ATTEMPTS) {
    return;
  }

  sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, String(attempts + 1));

  const url = new URL(window.location.href);
  url.searchParams.set('_cb', Date.now().toString());
  window.location.replace(url.toString());
};

export const registerStaleChunkRecovery = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadAfterStaleChunk();
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isStaleChunkLoadError(event.reason)) {
      event.preventDefault();
      reloadAfterStaleChunk();
    }
  });
};

export const watchForNewDeployments = (): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const currentBuild = document.querySelector('meta[name="cradlyn-build"]')?.getAttribute('content');
  if (!currentBuild) {
    return;
  }

  const checkForUpdate = async () => {
    try {
      const response = await fetch('/index.html', { cache: 'no-store' });
      if (!response.ok) {
        return;
      }

      const html = await response.text();
      const match = html.match(/name="cradlyn-build"\s+content="(\d+)"/);
      if (match && match[1] !== currentBuild) {
        reloadAfterStaleChunk();
      }
    } catch {
      // Ignore transient network errors.
    }
  };

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkForUpdate();
    }
  });

  window.setInterval(() => {
    void checkForUpdate();
  }, 5 * 60 * 1000);
};
