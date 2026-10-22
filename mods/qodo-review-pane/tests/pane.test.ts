import { expect, test } from 'claude-code/testing'

const RUN = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

const USAGE = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

const PANE = { plugin: 'qodo-review-pane', component: 'Pane', requestId: 'qodo-review-pane', viewport: { columns: 120, rows: 40 }, props: { title: 'Qodo review', isFocused: true, bodyColumns: 70, placement: 'inline', scroll: { offset: 0, bodyRows: 30 }, view: {} } } as const

test('manual pane opens and displays idle state on both surfaces', async ($, on) => {
  on('session.start', () => ({ cwd: '/work' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('store.get', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.command.run({ command: 'qodo-pane', args: '', ...RUN })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: 'Idle: no review submitted.' })).toBeDefined()
    expect(await ui.find({ key: 'review' })).toBeDefined()
    await ui.unmount()
  }
})

const FINDING = {
  id: 'f-act', title: 'Reviews from another checkout enter the pane', action_level: 'action_required',
  attribution_status: 'pending', description: 'Adoption never checks the directory the command ran in.',
  diffReference: { file_path: 'hooks/register.js', start_line: 208 },
  fixSuggestion: { fix_description: 'Validate the command directory against the pane checkout.' },
}
// An empty snapshot means the reopen check has nothing to compare, so the result stays current.
const STORED = {
  operation: 'op-stored', base: 'a'.repeat(40), snapshot: '', intent: 'Stored intent', qodo: 'qodo', phase: 'completed',
  result: { findings: [FINDING], finding_state: { complete: true, still_open: [] }, meta: { coverage: { complete: true } } },
}

test('a populated pane really draws the finding, its action and its collapsed sections', async ($, on) => {
  on('session.start', () => ({ cwd: '/work' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('store.get', () => ({ value: STORED }))
  on('store.set', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  // The reopen snapshot check runs for real; a steady tree keeps the result out of Stale.
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'hash', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })
  await $.command.run({ command: 'qodo-pane', args: '', ...RUN })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    // What a person reads, in the order they read it.
    expect(await ui.find({ text: 'Select a finding, inspect it, then draft a fix request. You send the request yourself.' })).toBeDefined()
    expect(await ui.find({ key: 'navigator' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Reviews from another checkout enter the pane' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Action required · newly reported · Qodo status pending' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'hooks/register.js:208' })).toBeDefined()
    expect(await ui.find({ type: 'Markdown', text: 'Adoption never checks the directory the command ran in.' })).toBeDefined()
    expect(await ui.find({ key: 'fix', text: 'Ask Claude to fix this finding' })).toBeDefined()
    expect(await ui.find({ text: /Validate the command directory/ })).toBeUndefined()
    await ui.press({ key: 'suggestion-toggle' })
    expect(await ui.find({ text: /Validate the command directory/ })).toBeDefined()
    await ui.press({ key: 'suggestion-toggle' })
    await ui.unmount()
  }
  // Setup stays folded away until asked for, then stays open across redraws.
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ key: 'intent' })).toBeUndefined()
  expect(await ui.find({ key: 'operation' })).toBeUndefined()
  await ui.press({ key: 'setup-toggle' })
  expect(await ui.find({ key: 'intent' })).toBeDefined()
  await ui.press({ key: 'diagnostics-toggle' })
  expect(await ui.find({ text: /^Operation op-stored/ })).toBeDefined()
  await ui.unmount()
})

test('a stale pane really draws the re-review lead and no fix or collect action', async ($, on) => {
  on('session.start', () => ({ cwd: '/work' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('store.get', () => ({ value: { ...STORED, snapshot: 'the tree as it was' } }))
  on('store.set', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  // A tree that no longer matches the stored snapshot: the reopen check marks the result stale.
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'moved on', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })
  await $.command.run({ command: 'qodo-pane', args: '', ...RUN })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ text: 'Code changed since this review. Review again to get current findings.' })).toBeDefined()
  expect(await ui.find({ key: 'review', text: 'Review changes' })).toBeDefined()
  expect(await ui.find({ key: 'previous-toggle', text: /Show previous review \(1 finding\)/ })).toBeDefined()
  // Nothing stale is drawn as current, and no action pretends to work.
  expect(await ui.find({ key: 'navigator' })).toBeUndefined()
  expect(await ui.find({ key: 'fix' })).toBeUndefined()
  expect(await ui.find({ key: 'collect' })).toBeUndefined()
  expect(await ui.find({ text: /Reviews from another checkout/ })).toBeUndefined()
  // The evidence is retained behind the toggle.
  await ui.press({ key: 'previous-toggle' })
  expect(await ui.find({ text: 'Reviews from another checkout enter the pane' })).toBeDefined()
  expect(await ui.find({ key: 'fix' })).toBeUndefined()
  expect(await ui.find({ text: /Fix requests are unavailable for a previous review/ })).toBeDefined()
  await ui.unmount()
})

test('storage read failure still registers /qodo-pane and draws the error', async ($, on) => {
  const names: string[] = []
  on('session.start', () => ({ cwd: '/work' }))
  on('command.register', (_$, e) => { names.push(e.name); return { value: { command: e.name } } })
  on('store.get', () => ({ deny: 'store offline' }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })
  expect(names).toContain('qodo-pane')
  await $.command.run({ command: 'qodo-pane', args: '', ...RUN })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /could not read saved review state/ })).toBeDefined()
  expect(await ui.find({ key: 'review' })).toBeDefined()
  await ui.unmount()
})

test('the prepared context reaches the native input and the submitted context file', async ($, on) => {
  const writes: Record<string, string> = {}
  on('session.start', () => ({ cwd: '/work' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('env.get', (_$, e) => ({ value: e.name === 'TMPDIR' ? '/private/tmp' : '/home/user' }))
  on('fs.read', () => ({ value: '' }))
  on('fs.stat', () => ({ value: { kind: 'file' } }))
  on('fs.write', (_$, e) => { writes[e.path] = e.text; return { value: undefined } })
  on('session.messages', () => ({ value: [{ role: 'user', text: 'Rework the pane. Do not commit. Add focused tests.\n- one\n- two', toolUses: [] }] }))
  on('model.complete', () => ({ value: { isAnswered: true, text: 'STATED: Add a Qodo review pane with clear finding navigation.\nINFERRED: Prepares editable review context from session goals and repository changes.\nAMBIGUITY: NONE', usage: USAGE } }))
  on('process.run', (_$, e) => ({
    value: {
      exitCode: 0, stderr: '', isStdoutTruncated: false, isStderrTruncated: false,
      stdout: e.argv[0] === 'mktemp' ? '/private/tmp/qodo-pane.123\n'
        : e.argv[1] === 'merge-base' ? 'a'.repeat(40) + '\n'
        : e.argv[1] === 'review' ? '{"operation_id":"op-native"}'
        : 'steady',
    },
  }))
  await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })
  await $.command.run({ command: 'qodo-pane', args: '', ...RUN })

  const expected = 'Add a Qodo review pane with clear finding navigation.\n\nPrepares editable review context from session goals and repository changes.'
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  // The field itself must hold the prepared text, not merely sit under a summary that shows it.
  expect((await ui.find({ key: 'intent-1' }))?.text).toBe(expected)
  await ui.press({ key: 'review' })
  // And the submitted context file must carry that same text.
  expect(JSON.parse(writes['/private/tmp/qodo-pane.123/context.json'] ?? '{}').summary).toBe(expected)
  await ui.unmount()
})

test('a context prepared after the pane is already mounted still reaches the input', async ($, on) => {
  let release = () => {}
  const held = new Promise<void>(resolve => { release = resolve })
  on('session.start', () => ({ cwd: '/work' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('fs.read', () => ({ value: '' }))
  on('fs.stat', () => ({ value: { kind: 'file' } }))
  on('session.messages', () => ({ value: [{ role: 'user', text: 'Rework the pane. Do not commit. Add focused tests.\n- one\n- two', toolUses: [] }] }))
  on('model.complete', async () => {
    await held
    return { value: { isAnswered: true, text: 'STATED: Add a Qodo review pane with clear finding navigation.\nINFERRED: Prepares editable review context from session goals and repository changes.\nAMBIGUITY: NONE', usage: USAGE } }
  })
  on('process.run', (_$, e) => ({
    value: { exitCode: 0, stderr: '', isStdoutTruncated: false, isStderrTruncated: false, stdout: e.argv[1] === 'merge-base' ? 'a'.repeat(40) + '\n' : 'steady' },
  }))
  await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })
  await $.command.run({ command: 'qodo-pane', args: '', ...RUN })

  // The pane is drawn while preparation is still in flight: the field is empty here.
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ key: 'intent' }))?.text ?? '').toBe('')
  expect(await ui.find({ text: /^Preparing review context… Change intent fills itself/ })).toBeDefined()

  // Preparation lands afterwards; the already-mounted field must pick the value up.
  release()
  for (let i = 0; i < 100 && (await ui.find({ key: 'context-progress' })); i++) await Promise.resolve()
  expect(await ui.find({ key: 'context' })).toBeDefined()
  // The prepared text is in the field itself, at its new address, not only in the summary above it.
  expect((await ui.find({ key: 'intent' }))).toBeUndefined()
  expect((await ui.find({ key: 'intent-1' }))?.text).toBe('Add a Qodo review pane with clear finding navigation.\n\nPrepares editable review context from session goals and repository changes.')
  await ui.unmount()
})
