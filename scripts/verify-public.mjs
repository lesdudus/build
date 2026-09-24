import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const publicProgram = JSON.parse(readFileSync(new URL('src/public-data/foundation.json', root), 'utf8'));
const privatePath = new URL('../index.html', root);
const canaries = [];
if (existsSync(privatePath)) {
  const source = readFileSync(privatePath, 'utf8');
  const original = JSON.parse(source.match(/<script[^>]*id="program-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
  canaries.push(original.profile, ...original.rules.filter(rule => rule.section === 'review').map(rule => rule.text));
  for (const [dayIndex, day] of original.days.entries()) for (const [index, exercise] of day.exercises.entries()) {
    if (exercise.start !== publicProgram.days[dayIndex].exercises[index].start) canaries.push(exercise.start);
  }
}
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
files.push('dist/index.html', 'dist/sw.js');
for (const file of new Set(files)) {
  assert.ok(!/(^|\/)(verification|test-results|node_modules)\//.test(file), `Non-public directory: ${file}`);
  assert.ok(!/(^|\/)\.env(?!\.example$)/.test(file), `Local environment file: ${file}`);
  const content = readFileSync(new URL(file, root), 'utf8');
  for (const canary of canaries) assert.ok(!content.includes(canary), `Private program content in ${file}`);
  assert.ok(!/sb_secret_[A-Za-z0-9_-]{16,}/.test(content), `Secret key in ${file}`);
  assert.ok(!/Age \d+; \d+ kg|Original\s+workbook\s+sheets:|records\s+reviewed\s+August/.test(content), `Personal profile in ${file}`);
}
const module = readFileSync(new URL('src/program.ts', root), 'utf8');
assert.ok(!module.includes('../../index.html'));
const output = readFileSync(new URL('dist/index.html', root), 'utf8');
assert.ok(output.includes('zlikecnjssxpqldnnyjq.supabase.co'), 'Build backend is missing');
assert.ok(output.includes('sb_publishable_'), 'Public client key is missing');
console.log(`Public-source and bundle checks passed (${new Set(files).size} files; ${canaries.length} local private-content checks).`);