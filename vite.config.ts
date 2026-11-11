import vinext from 'vinext';
import { defineConfig, loadEnv } from 'vite';
import hosting from './.openai/hosting.json' with { type: 'json' };
import { readExecutionProfile } from './scripts/execution-profile.mjs';
import { configureToolEnvironment } from './scripts/tool-environment.mjs';
import { sites } from './scripts/vite/sites-vite-plugin.ts';

const managed = readExecutionProfile() === 'managed-linux';
export default defineConfig(async ({ command }) => {
  configureToolEnvironment(process.cwd());
  const { cloudflare } = await import('@cloudflare/vite-plugin');
  return {
    server: {
      ...(managed ? { host: '0.0.0.0', allowedHosts: ['terminal.local'] } : {}),
      ...(process.env.CODEX_SANDBOX === 'seatbelt'
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      vinext(),
      sites({
        mockAuth:
          !managed ||
          (command === 'serve' &&
            loadEnv('development', process.cwd(), 'LINKLAB_').LINKLAB_DEV_AUTH === '1'),
      }),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        inspectorPort: false,
        config: {
          main: './worker/index.ts',
          compatibility_flags: ['nodejs_compat'],
          d1_databases: hosting.d1
            ? [
                {
                  binding: hosting.d1,
                  database_name: 'linklab',
                  database_id: '00000000-0000-4000-8000-000000000000',
                },
              ]
            : [],
        },
      }),
    ],
  };
});
