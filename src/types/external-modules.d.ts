declare module 'uuid' {
  export function v4(): string;
}

declare module 'axios';
declare module 'cors';
declare module 'web-push';

declare module 'workbox-precaching' {
  export function precacheAndRoute(entries: readonly unknown[]): void;
}

interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: readonly unknown[];
}
