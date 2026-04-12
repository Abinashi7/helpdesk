import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Parse a .env file into a key/value map (no external deps required). */
function parseEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error(`Could not read env file: ${filePath}`);
  }
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

export default async function globalSetup() {
  const root = resolve(__dirname, '..');
  const testEnv = parseEnvFile(resolve(root, '.env.test'));
  const backendDir = resolve(root, 'backend');

  console.log('\n[e2e] Running Prisma migrations on test database...');
  execSync('npx prisma migrate deploy', {
    cwd: backendDir,
    env: { ...process.env, ...testEnv },
    stdio: 'inherit',
  });
  console.log('[e2e] Migrations complete.\n');
}
