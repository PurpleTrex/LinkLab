import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
await mkdir('.sites-runtime', { recursive: true });
const config = resolve('.sites-runtime/local-migrations.json');
await writeFile(
  config,
  JSON.stringify(
    {
      name: 'linklab-local',
      compatibility_date: '2026-05-15',
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'linklab-local',
          database_id: '00000000-0000-4000-8000-000000000000',
          migrations_dir: resolve('drizzle'),
        },
      ],
    },
    null,
    2,
  ),
);
const result = spawnSync(
  process.execPath,
  [
    '--import',
    './scripts/sites-env.mjs',
    './node_modules/wrangler/bin/wrangler.js',
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--config',
    config,
    '--persist-to',
    resolve('.wrangler/state'),
  ],
  { cwd: root, stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
