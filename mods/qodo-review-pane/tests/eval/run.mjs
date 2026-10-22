// Real-model evaluation of the review-context prompt. Stubbed tests prove routing; this one asks
// the actual gateway model the actual question and saves what came back, so the summaries can be
// judged rather than assumed. Run by hand: `node tests/eval/run.mjs`. Not part of the test gates.
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
const source = await readFile(new URL('../../hooks/register.js', import.meta.url), 'utf8');
// The prompt under test is read from the module, never copied, so the evaluation cannot drift.
const SYSTEM = new Function('return ' + /^const CONTEXT_SYSTEM = (.*);$/m.exec(source)[1])();

const CASES = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
const results = [];
for (const item of CASES) {
  const prompt = '<material>\n' + [
    item.turns.length
      ? 'Recent turns from this session, oldest first. They may be partial: the last one is often a small refinement, not the whole task.\n' + item.turns.join('\n---\n')
      : 'No goal was stated in this session.',
    item.pr ? "The branch's pull request:\n" + item.pr : '',
    item.commits ? 'Commit subjects:\n' + item.commits : '',
    'Scoped diff against abc123def456 (a bounded excerpt of a real working tree, not the whole change):\n' + item.diff,
  ].filter(Boolean).join('\n\n') + '\n</material>';
  let text = '', error = '';
  try {
    const { stdout } = await run('claude', ['-p', prompt, '--model', 'haiku', '--system-prompt', SYSTEM], { maxBuffer: 1 << 22 });
    text = stdout.trim();
  } catch (failure) { error = String(failure.message).slice(0, 400); }
  const line = name => (new RegExp('^' + name + ':\\s*(.*)$', 'mi').exec(text)?.[1] || '').trim();
  results.push({ name: item.name, expectation: item.expectation, prompt, output: text, error, stated: line('STATED'), inferred: line('INFERRED'), ambiguity: line('AMBIGUITY') });
  console.log('— ' + item.name + (error ? '  ERROR ' + error : ''));
  console.log('  STATED:    ' + line('STATED'));
  console.log('  INFERRED:  ' + line('INFERRED'));
  console.log('  AMBIGUITY: ' + line('AMBIGUITY'));
}
await writeFile(new URL('./results.json', import.meta.url), JSON.stringify({ ranAt: new Date().toISOString(), model: 'haiku', system: SYSTEM, results }, null, 2) + '\n');
console.log('\nSaved ' + results.length + ' cases to tests/eval/results.json');
