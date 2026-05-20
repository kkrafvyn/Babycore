import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const PLACEHOLDER_MARKERS = ['your_', 'your-project', 'example', 'placeholder', 'replace_me', 'changeme'];

let serverEnvironmentLoaded = false;

const resolveEnvPath = (filename: string): string => path.resolve(process.cwd(), filename);

const loadEnvFile = (filename: string, override = false): void => {
  const filePath = resolveEnvPath(filename);
  if (!fs.existsSync(filePath)) {
    return;
  }

  dotenv.config({
    path: filePath,
    override,
  });
};

export const toStringValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const hasValue = (value: unknown): boolean => toStringValue(value).length > 0;

export const isTruthy = (value: unknown): boolean =>
  TRUE_VALUES.has(toStringValue(value).toLowerCase());

export const isPlaceholder = (value: unknown): boolean => {
  const normalized = toStringValue(value).toLowerCase();
  if (!normalized) return true;

  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
};

const getFirstConfiguredValue = (...values: unknown[]): string => {
  const normalizedValues = values.map(toStringValue).filter(Boolean);
  const realValue = normalizedValues.find((value) => !isPlaceholder(value));
  return realValue || normalizedValues[0] || '';
};

export const isLocalUrl = (value: unknown): boolean => {
  const raw = toStringValue(value);
  if (!raw) return false;

  try {
    const parsed = new URL(raw);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

export const getRuntimeEnvironment = (): string =>
  toStringValue(process.env.VERCEL_ENV) || toStringValue(process.env.NODE_ENV) || 'development';

export const isProductionRuntime = (): boolean => getRuntimeEnvironment() === 'production';

export const loadServerEnvironment = (): NodeJS.ProcessEnv => {
  if (serverEnvironmentLoaded) {
    return process.env;
  }

  loadEnvFile('.env');
  if (!isProductionRuntime()) {
    loadEnvFile('.env.local', true);
  }

  serverEnvironmentLoaded = true;
  return process.env;
};

export const getSupabaseServerUrl = (): string => {
  loadServerEnvironment();
  return getFirstConfiguredValue(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL);
};

export const getSupabaseServiceKey = (): string => {
  loadServerEnvironment();
  return getFirstConfiguredValue(
    process.env.SUPABASE_SERVICE_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
  );
};

export const getSupabasePublicKey = (): string => {
  loadServerEnvironment();
  return getFirstConfiguredValue(
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
};

loadServerEnvironment();
