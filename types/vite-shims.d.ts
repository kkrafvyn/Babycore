declare module 'vite' {
  export type PluginOption = unknown;

  export interface UserConfig {
    plugins?: PluginOption[];
    resolve?: {
      alias?: Record<string, string>;
    };
    server?: {
      port?: number;
      host?: string | boolean;
    };
    build?: {
      target?: string;
      minify?: boolean | 'esbuild' | 'terser';
    };
  }

  export function defineConfig(config: UserConfig): UserConfig;
}

declare module '@vitejs/plugin-react' {
  import type { PluginOption } from 'vite';

  export default function react(): PluginOption;
}
