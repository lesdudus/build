import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const program = JSON.parse(source.match(/<script[^>]*id="program-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
program.version = '2026-09-24 / Foundation template';
program.profile = 'Conservative foundation template. Individual history and assigned programs belong to the signed-in account. This template is not medical clearance.';
const starts = {
  'Leg press': 'Select a light load on your actual machine after easy warm-ups, leaving the prescribed reps in reserve. Machine loads are not interchangeable.',
  'Australian row / Aussies': 'Begin with two easy sets at a reproducible upright angle. No added load or harder angle while a shoulder restriction remains unresolved.',
  'Seated leg curl': 'Choose a light setting on your actual machine and adjust to the prescribed effort. Do not transfer numbers from another machine.',
  'Supported neutral-grip curl': 'Choose light dumbbells with upright back support and adjust to the effort target. Omit if a light trial is uncomfortable.',
  'Rope triceps pressdown': 'Start with a very light cable setting to assess comfort. Loads from different cable or triceps machines are not interchangeable.',
};
for (const day of program.days) for (const exercise of day.exercises) {
  if (starts[exercise.name]) exercise.start = starts[exercise.name];
}
program.rules = program.rules.filter(rule => rule.section !== 'review');
for (const rule of program.rules) {
  if (rule.title === 'What is deliberately on hold') rule.text = 'This conservative template excludes pull-ups, push-ups, overhead presses, pulldowns, hangs and negatives. Chest-press slots remain held. Easy rows are conditional on pain-free movement and recovery. Clinician advice takes precedence.';
  if (rule.title === 'Record what actually happened') rule.text = 'Record each set separately: date, exercise, set type, status, machine/settings, load basis, actual load, reps or seconds, RIR and symptoms. Keep targets separate from actual results. Missing values are not zero.';
}
const style = source.match(/<style>([\s\S]*?)<\/style>/)[1];
const mark = source.match(/class="brand-mark"[^>]*src="([^"]+)"/)[1];
const folder = new URL('../src/public-data/', import.meta.url);
mkdirSync(folder, { recursive: true });
writeFileSync(new URL('foundation.json', folder), JSON.stringify(program, null, 2) + '\n');
writeFileSync(new URL('theme.css', folder), style.slice(0, style.indexOf('*{box-sizing')));
writeFileSync(new URL('mark.json', folder), JSON.stringify(mark) + '\n');
console.log('Generated public template and brand assets; private source was not changed.');