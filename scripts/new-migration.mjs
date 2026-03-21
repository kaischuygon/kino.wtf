import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = process.argv[2];

if (!arg || arg === '--help' || arg === '-h') {
  console.log('Usage: yarn db:migration:new -- <name>');
  console.log('Example: yarn db:migration:new -- add_user_preferences');
  process.exit(arg ? 0 : 1);
}

const slug = arg
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 80);

if (!slug) {
  console.error('Migration name must contain letters or numbers.');
  process.exit(1);
}

const now = new Date();
const utc = [
  now.getUTCFullYear().toString(),
  String(now.getUTCMonth() + 1).padStart(2, '0'),
  String(now.getUTCDate()).padStart(2, '0'),
  String(now.getUTCHours()).padStart(2, '0'),
  String(now.getUTCMinutes()).padStart(2, '0'),
].join('');

const migrationsDir = resolve(process.cwd(), 'supabase', 'migrations');
mkdirSync(migrationsDir, { recursive: true });

const fileName = `${utc}_${slug}.sql`;
const filePath = resolve(migrationsDir, fileName);

if (existsSync(filePath)) {
  console.error(`Migration already exists: ${fileName}`);
  process.exit(1);
}

const template = `-- Migration: ${fileName}\n-- Created at (UTC): ${now.toISOString()}\n\n-- Write your SQL below.\n`;

writeFileSync(filePath, template, 'utf8');

console.log(`Created migration: supabase/migrations/${fileName}`);
