import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { resolveDatabasePath, resolveRepoRoot } from './client';

async function main() {
  const source = resolveDatabasePath();
  const target = path.join(resolveRepoRoot(), 'apps', 'desktop', 'demo', 'researchos-demo.db');

  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) fs.rmSync(target);

  const client = createClient({ url: `file:${source.replace(/\\/g, '/')}` });
  await client.execute({ sql: 'VACUUM INTO ?', args: [target] });
  client.close();

  console.log(`Demo database written to ${target} (${fs.statSync(target).size} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
