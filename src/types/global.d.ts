/// <reference types="vite/client" />

declare global {
  namespace Express {
    interface Request {
      user?: any;
      userRole?: string;
      file?: any;
    }
  }

  interface ImportMetaEnv {
    readonly [key: string]: string | undefined;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
    readonly VITE_VAPID_PUBLIC_KEY?: string;
    readonly VITE_VAPID_PRIVATE_KEY?: string;
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_API_BASE_URL_PROD?: string;
    readonly VITE_API_TIMEOUT?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface NotificationAction {
    action: string;
    title: string;
    icon?: string;
  }

  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST?: Array<{ url: string; revision?: string }>;
  }
}

declare module 'web-push';
declare module 'uuid';
declare module 'axios';
declare module 'cors';
declare module 'nodemailer';
declare module 'workbox-precaching';

declare module '@supabase/supabase-js' {
  interface SupabaseAuthClient {
    getUser: (...args: any[]) => Promise<any>;
    getSession: (...args: any[]) => Promise<any>;
    signInWithOAuth: (...args: any[]) => Promise<any>;
    signInWithPassword: (...args: any[]) => Promise<any>;
    signUp: (...args: any[]) => Promise<any>;
    signOut: (...args: any[]) => Promise<any>;
    admin: any;
  }
}

export {};
