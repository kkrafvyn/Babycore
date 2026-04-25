interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_FLUTTERWAVE_PUBLIC_KEY?: string;
  readonly VITE_FLUTTERWAVE_SECRET_KEY?: string;
  readonly VITE_PAYSTACK_PUBLIC_KEY?: string;
  readonly VITE_PAYSTACK_SECRET_KEY?: string;
  readonly VITE_RESEND_API_KEY?: string;
  readonly VITE_SENDGRID_API_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
