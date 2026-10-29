import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createContext, runInContext } from 'node:vm'
import { webcrypto } from 'node:crypto'
import { executeWorkbenchCommand } from '../lib/workbench.js'

async function helpers() {
  let definition
  const realm = createContext({
    window: { __ModuleLoader__: { load(value) { definition = value } } },
    URL, AbortController, DOMException, console, crypto: webcrypto,
  })
  runInContext(await readFile(new URL('../client/index.js', import.meta.url), 'utf8'), realm)
  const plugin = definition.factory(() => assert.fail('Pure helpers do not import another browser plugin'))
  assert.ok(plugin.workbench, 'The served native bundle must contain the actual workbench')
  return plugin.workbench
}

const plain = value => JSON.parse(JSON.stringify(value))

test('workbench resolves configuration only from the actual runtime entry id', async () => {
  const { configEntry } = await helpers()
  const namespaces = [{ ns: 'some-legion-lookalike' }, { ns: 'actual-loader-entry' }]
  assert.deepEqual(plain(configEntry([
    { entryId: 'actual-loader-entry', moduleName: 'dsh-plugin-legion' },
  ], namespaces)), { entryId: 'actual-loader-entry', namespace: 'actual-loader-entry' })
  assert.equal(configEntry([{ rowId: 'actual-loader-entry', moduleName: 'dsh-plugin-legion' }], namespaces), null)
  assert.equal(configEntry([{ entryId: 'some-legion-lookalike', moduleName: 'evil-legion' }], namespaces), null)
  assert.equal(configEntry([
    { entryId: 'actual-loader-entry', moduleName: 'dsh-plugin-legion' },
    { entryId: 'some-legion-lookalike', moduleName: 'dsh-plugin-legion' },
  ], namespaces), null, 'An ambiguous duplicate must not silently edit the first one')
})

test('member presentation preserves unknown installation and separate observed readiness', async () => {
  const { memberFacts } = await helpers()
  assert.deepEqual(plain(memberFacts({ key: 'example', available: null,
    readiness: { declared: true, connected: false, verified: false },
    entry_points: { execution: { selectable: true } } })), {
    key: 'example', installed: null, connected: false, verified: false, available: null, selectable: true,
  })
  assert.equal(memberFacts({ key: 'tools-only', available: true,
    entry_points: { execution: { selectable: false } } }).selectable, false)
  assert.equal(memberFacts({ key: 'untyped', installed: 'yes', available: 'ready' }).installed, null)
})

test('untrusted result links never become script, file or credential links', async () => {
  const { publicLink } = await helpers()
  assert.equal(publicLink('https://github.com/example/tool'), 'https://github.com/example/tool')
  for (const value of ['javascript:alert(1)', 'data:text/html,bad', 'file:///secret', 'http://127.0.0.1/',
    'https://user:password@github.com/example/tool', 'https://github.com/?token=secret', '//evil.test',
    null, {}]) assert.equal(publicLink(value), null)
})

test('config edits use atomic native paths without clobbering unrelated limits or authority', async () => {
  const { configOperations } = await helpers()
  const ops = plain(configOperations({
    baseUrl: 'https://legion.example', tokenEnv: 'MY_LEGION_TOKEN', tokenFile: '',
    candidateHarnesses: ['a', 'b'],
  }))
  assert.deepEqual(ops, [
    { op: 'set', path: ['baseUrl'], value: 'https://legion.example' },
    { op: 'set', path: ['tokenEnv'], value: 'MY_LEGION_TOKEN' },
    { op: 'unset', path: ['tokenFile'] },
    { op: 'set', path: ['candidateHarnesses'], value: ['a', 'b'] },
  ])
  assert.ok(!ops.some(op => !op.path.length || op.path.includes('projectBindingFile')))
})

test('native change results retain failed or restart-required outcomes instead of reporting done', async () => {
  const { changeFacts } = await helpers()
  assert.deepEqual(plain(changeFacts({ changed: true, application: 'failed', stage: 'enable',
    error: { code: 'operation-error', diagnostic: 'cannot load' } })), {
    changed: true, application: 'failed', stage: 'enable', complete: false,
    reason: 'cannot load', warnings: [],
  })
  assert.equal(changeFacts({ changed: true, application: 'restart-required' }).complete, false)
  assert.equal(changeFacts({ changed: true, application: 'applied' }).complete, true)
})

function context(execute) {
  return {
    sessions: {
      list: {
        getSnapshot: () => ({ ids: ['a', 'b'], byId: { a: { id: 'a' }, b: { id: 'b' } }, phase: 'ready' }),
        subscribe: () => () => {},
      },
      async using(id, options, fn) {
        assert.equal(options.source, 'controllerOperation')
        return fn({ sessionId: id, ready: Promise.resolve() })
      },
    },
    remote: { commands: { execute } },
  }
}

const reply = (action, value) => ({ ok: true,
  value: { result: { kind: 'success', text: JSON.stringify({ ok: true, action, value }) } } })

const nativeReply = value => ({ ok: true, value })
const turn = () => new Promise(resolve => setImmediate(resolve))
function deferred() {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
const managerReads = {
  async inspect(spec) { return nativeReply({ status: 'accepted', name: spec }) },
  async listBundles() { return nativeReply([]) },
  async listPlugins() { return nativeReply([]) },
}

test('late command results cannot leak from a previous selected session', async () => {
  const { createController } = await helpers()
  let resolve
  const controller = createController(context(async (id, line) => {
    assert.equal(id, 'a')
    assert.match(line, /^\/legion-panel /)
    return new Promise(done => { resolve = done })
  }))
  controller.selectSession('a')
  const pending = controller.loadMembers()
  await new Promise(done => setImmediate(done))
  controller.selectSession('b')
  resolve(reply('runtime', { runtime: { harnesses: [{ key: 'belongs-to-a' }] } }))
  await pending
  assert.equal(controller.getSnapshot().sessionId, 'b')
  assert.equal(controller.getSnapshot().members, null)
  controller.dispose()
})

test('UI submits use one original key and never accept client-provided session authority', async () => {
  const { createController } = await helpers()
  const calls = []
  const controller = createController(context(async (id, line) => {
    const body = JSON.parse(line.slice('/legion-panel '.length))
    calls.push({ id, ...body })
    if (calls.length === 1) throw new Error('response lost')
    return reply('submit', { task_ref: 'returned-task', reused: true })
  }))
  controller.selectSession('a')
  await controller.submit('Inspect this public project', 'Known source facts')
  assert.equal(controller.getSnapshot().operation.ref, undefined)
  await controller.submit('Inspect this public project', 'Known source facts')
  assert.equal(calls[0].args.key, calls[1].args.key)
  assert.deepEqual(Object.keys(calls[0].args).sort(), ['context', 'key', 'query'])
  assert.equal(controller.getSnapshot().operation.ref, 'returned-task')
  controller.dispose()
})

test('native installation is explicit, does not request activation, and cannot double-submit while pending', async () => {
  const { createController, changeFacts } = await helpers()
  let resolve
  const calls = []
  const controller = createController(context(() => assert.fail('install is a native manager operation')))
  controller.attach('manager', {
    async inspect(spec) { return { ok: true, value: { status: 'accepted', name: spec, bundle: true } } },
    async installBundle(spec, options) {
      calls.push({ spec, options })
      return new Promise(done => { resolve = done })
    },
    async listBundles() { return { ok: true, value: [] } },
    async listPlugins() { return { ok: true, value: [] } },
  })
  await controller.inspectPackage('example@1.0.0')
  const pending = controller.installPackage()
  await new Promise(done => setImmediate(done))
  await controller.installPackage()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].options.enabled, false)
  assert.equal(calls[0].options.saveExact, true)
  assert.equal(Object.hasOwn(calls[0].options, 'approvedBuilds'), false)
  resolve({ ok: true, value: { changed: true, application: 'restart-required', stage: 'install' } })
  await pending
  assert.equal(controller.getSnapshot().installResult.application, 'restart-required')
  assert.equal(changeFacts(controller.getSnapshot().installResult).complete, false)
  controller.dispose()
})

test('configuration writes keep the editor revision and use the real native form', async () => {
  const { createController } = await helpers()
  const mutations = []
  const form = {
    getSnapshot: () => ({ status: 'ready', value: {}, revision: 7, writable: true }),
    subscribe: () => () => {},
    async mutate(ops, revision) { mutations.push({ ops: plain(ops), revision }); return false },
  }
  const controller = createController(context(() => assert.fail('configuration is not a model command')))
  controller.attach('configuration', {
    inventory: { async list() { return { ok: true, value: {
      entries: [{ entryId: 'actual-id', moduleName: 'dsh-plugin-legion' }],
    } } } },
    forms: {
      describe: () => ({ async ensure() {}, getSnapshot: () => ({ view: { namespaces: [{ ns: 'actual-id' }] } }) }),
      get(id) { assert.equal(id, 'actual-id'); return form },
    },
  })
  await controller.loadConfig()
  await controller.saveConfig({ candidateHarnesses: ['codex'] }, 3, 'actual-id')
  assert.equal(mutations[0].revision, 3, 'Do not overwrite a newer editor revision with the current snapshot')
  assert.deepEqual(mutations[0].ops, [{ op: 'set', path: ['candidateHarnesses'], value: ['codex'] }])
  assert.match(controller.getSnapshot().errors.configSave, /拒绝|冲突|refus|conflict/i)
  controller.dispose()
})

test('editing or rechecking a repository clears stale source facts and fences late results', async () => {
  const { createController } = await helpers()
  let release
  const controller = createController(context(async (_id, line) => {
    const { args } = JSON.parse(line.slice('/legion-panel '.length))
    if (args.repository === 'owner/slow') return new Promise(done => { release = done })
    if (args.repository === 'owner/broken') throw new Error('Source unavailable')
    return reply('inspect', { repository: args.repository, commit: 'a'.repeat(40) })
  }))
  controller.selectSession('a')
  await controller.inspectSource('owner/first')
  assert.equal(controller.getSnapshot().source.repository, 'owner/first')
  await controller.inspectSource('owner/broken')
  assert.equal(controller.getSnapshot().source, null, 'A failed inspection must not retain another source')
  const pending = controller.inspectSource('owner/slow')
  await new Promise(done => setImmediate(done))
  controller.clearSource()
  release(reply('inspect', { repository: 'owner/slow', commit: 'b'.repeat(40) }))
  await pending
  assert.equal(controller.getSnapshot().source, null, 'An edited input must not acquire stale source facts')
  controller.dispose()
})

test('an unloaded configuration service cannot install a late form subscription', async () => {
  const { createController } = await helpers()
  let release
  let formReads = 0
  const controller = createController(context(() => assert.fail('Not a command')))
  const detach = controller.attach('configuration', {
    inventory: { list: () => new Promise(done => { release = done }) },
    forms: {
      describe: () => ({ async ensure() {}, getSnapshot: () => ({ view: { namespaces: [{ ns: 'entry' }] } }) }),
      get() { formReads++; return { getSnapshot: () => ({}), subscribe: () => () => {} } },
    },
  })
  const pending = controller.loadConfig()
  await new Promise(done => setImmediate(done))
  detach()
  release({ ok: true, value: { entries: [{ entryId: 'entry', moduleName: 'dsh-plugin-legion' }] } })
  await pending
  assert.equal(formReads, 0)
  assert.equal(controller.getSnapshot().config, null)
  assert.equal(controller.getSnapshot().available.configuration, false)
  controller.dispose()
})

test('switching sessions retains an unconfirmed submission key only for its original session', async () => {
  const { createController } = await helpers()
  const calls = []
  const controller = createController(context(async (id, line) => {
    const body = JSON.parse(line.slice('/legion-panel '.length))
    calls.push({ id, ...body })
    if (calls.length === 1) throw new Error('Reply disconnected after dispatch')
    return reply('submit', { task_ref: 'recovered-task', reused: true })
  }))
  controller.selectSession('a')
  await controller.submit('Adapt a capability', 'Pinned repository facts')
  const original = plain(controller.getSnapshot().operation)
  controller.selectSession('b')
  assert.equal(controller.getSnapshot().operation, null)
  controller.selectSession('a')
  assert.deepEqual(plain(controller.getSnapshot().operation), original)
  await controller.submit(original.query, original.context)
  assert.equal(calls[0].args.key, calls[1].args.key, 'A UI navigation must not duplicate a charged remote task')
  assert.equal(controller.getSnapshot().operation.ref, 'recovered-task')
  controller.dispose()
})

test('a late submission receipt is recoverable in the originating session, never another', async () => {
  const { createController } = await helpers()
  let release
  const controller = createController(context(() => new Promise(done => { release = done })))
  controller.selectSession('a')
  const pending = controller.submit('Inspect a public project', '')
  await new Promise(done => setImmediate(done))
  controller.selectSession('b')
  release(reply('submit', { task_ref: 'belongs-to-a' }))
  await pending
  assert.equal(controller.getSnapshot().submission, null)
  controller.selectSession('a')
  assert.equal(controller.getSnapshot().operation.ref, 'belongs-to-a')
  assert.equal(controller.getSnapshot().submission.task_ref, 'belongs-to-a')
  controller.dispose()
})

test('late install recovery cannot unlock a different installation with an unknown outcome', async t => {
  const { createController } = await helpers()
  const installs = []
  const recovery = deferred()
  const controller = createController(context(() => assert.fail('Not a command')))
  t.after(() => controller.dispose())
  controller.attach('manager', {
    ...managerReads,
    installBundle(spec, options) {
      const pending = deferred()
      installs.push({ spec, options, ...pending })
      return pending.promise
    },
    waitForInstall(requestId) {
      assert.equal(requestId, installs[0].options.requestId)
      return recovery.promise
    },
  })
  await controller.inspectPackage('package-a@1.0.0')
  const first = controller.installPackage()
  await turn()
  const recoveringFirst = controller.recoverInstall()
  await turn()
  const firstResult = { application: 'applied', stage: 'install', target: 'package-a' }
  installs[0].resolve(nativeReply(firstResult))
  await first
  await controller.inspectPackage('package-b@1.0.0')
  const second = controller.installPackage()
  await turn()
  const secondId = controller.getSnapshot().installId
  recovery.resolve(nativeReply(firstResult))
  await recoveringFirst
  const uncertainAfterOldReply = controller.getSnapshot().installUncertain
  installs[1].reject(new Error('B reply disconnected after Host acceptance'))
  await second
  const duplicate = controller.installPackage()
  await turn()
  installs[2]?.resolve(nativeReply({ application: 'applied', stage: 'install' }))
  await duplicate
  assert.equal(uncertainAfterOldReply, true, 'A receipt must not confirm B')
  assert.equal(controller.getSnapshot().installId, secondId)
  assert.deepEqual(installs.map(call => call.spec), ['package-a@1.0.0', 'package-b@1.0.0'])
  assert.equal(controller.getSnapshot().installResult, null, 'Do not display A as B’s result')
})

test('confirmed native cancellation ends install uncertainty without requiring a retained result', async t => {
  const { createController } = await helpers()
  const inspections = []
  const controller = createController(context(() => assert.fail('Not a command')))
  t.after(() => controller.dispose())
  controller.attach('manager', {
    ...managerReads,
    async inspect(spec) { inspections.push(spec); return nativeReply({ status: 'accepted' }) },
    async installBundle() { throw new Error('Reply disconnected after Host acceptance') },
    async cancelInstall(requestId) {
      assert.equal(requestId, controller.getSnapshot().installId)
      return nativeReply({ status: 'cancelled' })
    },
    async waitForInstall() { return nativeReply(null) },
  })
  await controller.inspectPackage('package-a@1.0.0')
  await controller.installPackage()
  await controller.cancelInstall()
  assert.equal(controller.getSnapshot().installUncertain, false)
  assert.equal(controller.getSnapshot().installCancellation.status, 'cancelled')
  assert.notEqual(controller.getSnapshot().installResult?.application, 'applied')
  await controller.inspectPackage('package-b@1.0.0')
  assert.deepEqual(inspections, ['package-a@1.0.0', 'package-b@1.0.0'])
})

test('nonfinal cancellation answers and missing recovery results leave installation unknown', async t => {
  const { createController } = await helpers()
  for (const status of ['not-running', 'too-late']) {
    await t.test(status, async t => {
      let installs = 0
      const controller = createController(context(() => assert.fail('Not a command')))
      t.after(() => controller.dispose())
      controller.attach('manager', {
        ...managerReads,
        async installBundle() { installs++; throw new Error('Reply disconnected') },
        async cancelInstall() { return nativeReply({ status }) },
        async waitForInstall() { return nativeReply(null) },
      })
      await controller.inspectPackage('package-a@1.0.0')
      await controller.installPackage()
      await controller.cancelInstall()
      await controller.recoverInstall()
      await controller.installPackage()
      assert.equal(controller.getSnapshot().installUncertain, true)
      assert.equal(controller.getSnapshot().installResult, null)
      assert.equal(installs, 1, 'Neither answer grants permission to blindly reinstall')
    })
  }
})

test('configuration drafts cannot cross entry identities even when revisions are equal', async t => {
  const { createController } = await helpers()
  let entryId = 'entry-a'
  const writes = []
  const forms = new Map(['entry-a', 'entry-b'].map(id => [id, {
    getSnapshot: () => ({ status: 'ready', value: {}, writable: true, revision: 7 }),
    subscribe: () => () => {},
    async mutate(ops, revision) { writes.push({ entryId: id, ops: plain(ops), revision }); return true },
  }]))
  const controller = createController(context(() => assert.fail('Not a command')))
  t.after(() => controller.dispose())
  controller.attach('configuration', {
    inventory: { async list() { return nativeReply({ entries: [{ entryId, moduleName: 'dsh-plugin-legion' }] }) } },
    forms: {
      describe: () => ({ async ensure() {}, getSnapshot: () => ({ view: { namespaces: [{ ns: entryId }] } }) }),
      get: id => forms.get(id),
    },
  })
  await controller.loadConfig()
  const originalEntry = controller.getSnapshot().configEntry
  const originalRevision = controller.getSnapshot().config.revision
  entryId = 'entry-b'
  await controller.loadConfig()
  await controller.saveConfig({ baseUrl: 'https://intended-for-a.example.invalid' }, originalRevision, originalEntry)
  assert.equal(writes.length, 0, 'Revision 7 in B is not the editing identity from A')
  assert.match(controller.getSnapshot().errors.configSave, /实例|entry/i)
  await controller.saveConfig({ candidateHarnesses: ['example'] }, 7, 'entry-b')
  assert.deepEqual(writes, [{ entryId: 'entry-b', revision: 7,
    ops: [{ op: 'set', path: ['candidateHarnesses'], value: ['example'] }] }])
  assert.equal(controller.getSnapshot().configSaved, true)
})

test('rejected submission keeps its recovery reference and permits only an explicit new task', async t => {
  const { createController } = await helpers()
  const calls = []
  const taskRef = 'a'.repeat(32)
  const client = {
    clean: value => value, redactText: value => value,
    async submit(args) {
      calls.push(args)
      if (calls.length === 1) throw new Error('403 permission_denied')
      return { task_ref: taskRef, submission: 'rejected', reused: true, reason: '403 permission_denied' }
    },
  }
  const controller = createController(context(async (id, line) => nativeReply({
    result: await executeWorkbenchCommand({}, client, {}, {
      agent: { id }, signal: new AbortController().signal, attachments: [],
      rawInput: line.slice('/legion-panel '.length),
    }),
  })))
  t.after(() => controller.dispose())
  controller.selectSession('a')
  await controller.submit('Public integration task', '')
  const originalKey = controller.getSnapshot().operation.key
  controller.newTask()
  assert.equal(controller.getSnapshot().operation.key, originalKey, 'An untyped error remains unconfirmed')
  await controller.submit('Public integration task', '')
  assert.equal(calls[1].key, originalKey)
  assert.equal(controller.getSnapshot().operation.ref, taskRef)
  assert.equal(controller.getSnapshot().submission.submission, 'rejected')
  assert.match(controller.getSnapshot().errors.submit, /403.*permission_denied/)
  await controller.submit('Changed task without explicit reset', '')
  assert.equal(calls.length, 2)
  controller.newTask()
  assert.equal(controller.getSnapshot().operation, null)
  assert.equal(controller.getSnapshot().submission, null)
  await controller.submit('An explicitly new task', '')
  assert.notEqual(calls[2].key, originalKey)
})

test('a late cancellation receipt belongs only to its original installation', async t => {
  const { createController } = await helpers()
  const installs = [], cancellation = deferred()
  const controller = createController(context(() => assert.fail('Not a command')))
  t.after(() => controller.dispose())
  controller.attach('manager', {
    ...managerReads,
    installBundle(spec, options) {
      const pending = deferred()
      installs.push({ spec, options, ...pending })
      return pending.promise
    },
    cancelInstall(requestId) {
      assert.equal(requestId, installs[0].options.requestId)
      return cancellation.promise
    },
  })
  await controller.inspectPackage('package-a@1.0.0')
  const first = controller.installPackage()
  await turn()
  const cancellingFirst = controller.cancelInstall()
  installs[0].resolve(nativeReply({ application: 'cancelled', stage: 'install' }))
  await first
  await controller.inspectPackage('package-b@1.0.0')
  const second = controller.installPackage()
  await turn()
  cancellation.resolve(nativeReply({ status: 'cancelled' }))
  await cancellingFirst
  const staleCancellation = controller.getSnapshot().installCancellation
  installs[1].reject(new Error('B reply disconnected'))
  await second
  assert.equal(staleCancellation ?? null, null, 'A must not supply B’s cancellation status')
  assert.equal(controller.getSnapshot().installUncertain, true)
})

test('confirmed cancellation retires pending original waits before a new install starts', async t => {
  const { createController } = await helpers()
  const installs = [], recovery = deferred()
  const controller = createController(context(() => assert.fail('Not a command')))
  t.after(() => controller.dispose())
  controller.attach('manager', {
    ...managerReads,
    installBundle(spec, options) {
      const pending = deferred()
      installs.push({ spec, options, ...pending })
      return pending.promise
    },
    waitForInstall: () => recovery.promise,
    async cancelInstall() { return nativeReply({ status: 'cancelled' }) },
  })
  await controller.inspectPackage('package-a@1.0.0')
  const first = controller.installPackage()
  await turn()
  const recovering = controller.recoverInstall()
  await controller.cancelInstall()
  assert.equal(controller.getSnapshot().busy.install, false, 'A confirmed stop also ends the old local wait')
  await controller.inspectPackage('package-b@1.0.0')
  const second = controller.installPackage()
  await turn()
  installs[0].resolve(nativeReply({ application: 'cancelled', stage: 'install' }))
  recovery.resolve(nativeReply({ application: 'cancelled', stage: 'install' }))
  await Promise.all([first, recovering])
  assert.equal(controller.getSnapshot().installId, installs[1].options.requestId)
  assert.equal(controller.getSnapshot().installUncertain, true)
  assert.equal(controller.getSnapshot().installCancellation ?? null, null)
  installs[1].resolve(nativeReply({ application: 'applied', stage: 'install' }))
  await second
})

test('a late configuration save cannot publish an old form under a new entry', async t => {
  const { createController } = await helpers()
  let entryId = 'entry-a'
  const write = deferred()
  const forms = new Map(['entry-a', 'entry-b'].map(id => [id, {
    getSnapshot: () => ({ status: 'ready', value: { baseUrl: `https://${id}.example.invalid` }, writable: true, revision: 7 }),
    subscribe: () => () => {},
    mutate: () => write.promise,
  }]))
  const controller = createController(context(() => assert.fail('Not a command')))
  t.after(() => controller.dispose())
  controller.attach('configuration', {
    inventory: { async list() { return nativeReply({ entries: [{ entryId, moduleName: 'dsh-plugin-legion' }] }) } },
    forms: {
      describe: () => ({ async ensure() {}, getSnapshot: () => ({ view: { namespaces: [{ ns: entryId }] } }) }),
      get: id => forms.get(id),
    },
  })
  await controller.loadConfig()
  const saving = controller.saveConfig({ baseUrl: 'https://edit.example.invalid' }, 7, 'entry-a')
  await turn()
  entryId = 'entry-b'
  await controller.loadConfig()
  write.resolve(true)
  const accepted = await saving
  assert.equal(controller.getSnapshot().config.value.baseUrl, 'https://entry-b.example.invalid')
  assert.equal(controller.getSnapshot().configSaved, false)
  assert.notEqual(accepted, true, 'A superseded save must not tell an editor to clear its current draft')
})

test('a late rejected submission is retained in its own session and never published in another', async t => {
  const { createController } = await helpers()
  const pending = deferred()
  const controller = createController(context(() => pending.promise))
  t.after(() => controller.dispose())
  controller.selectSession('a')
  const saving = controller.submit('Public task', '')
  await turn()
  controller.selectSession('b')
  pending.resolve(nativeReply({ result: { kind: 'error', text: JSON.stringify({
    ok: false, action: 'submit', error: '403 permission_denied',
    diagnostics: { task_ref: 'b'.repeat(32), submission: 'rejected' },
  }) } }))
  await saving
  assert.equal(controller.getSnapshot().operation, null)
  assert.equal(controller.getSnapshot().submission, null)
  assert.equal(controller.getSnapshot().errors.submit, null)
  controller.selectSession('a')
  assert.equal(controller.getSnapshot().operation.ref, 'b'.repeat(32))
  assert.equal(controller.getSnapshot().submission.submission, 'rejected')
})

// Identity-only reproduction of the native RPC shapes; no profile or credentials.
function mappedConfiguration() {
  const identity = { entryId: 'include:legion', namespace: 'legion' }
  const reads = [], writes = []
  const form = {
    getSnapshot: () => ({ status: 'ready', value: {}, revision: 7, writable: true }),
    subscribe: () => () => {},
    async mutate(ops, revision) {
      writes.push({ ...identity, ops: plain(ops), revision })
      return true
    },
  }
  const owner = {
    inventory: { async list() {
      return nativeReply({ entries: [{ entryId: identity.entryId, moduleName: 'dsh-plugin-legion' }] })
    } },
    manager: { async listBundles() {
      return nativeReply([{ name: 'dsh-plugin-legion', rows: [{
        entryId: identity.entryId, rowId: identity.namespace, moduleName: 'dsh-plugin-legion',
      }] }])
    } },
    forms: {
      describe: () => ({ async ensure() {}, getSnapshot: () => ({ view: { namespaces: [{ ns: identity.namespace }] } }) }),
      get(namespace) { reads.push(namespace); return form },
    },
  }
  return { identity, owner, form, reads, writes }
}

test('native configuration uses the bundle row namespace but retains the loader identity when saving', async t => {
  const { createController } = await helpers()
  const fixture = mappedConfiguration()
  const controller = createController(context(() => assert.fail('Not a command')))
  t.after(() => controller.dispose())
  controller.attach('configuration', fixture.owner)
  assert.equal(await controller.loadConfig(), true, 'The real include:legion → legion mapping must resolve')
  assert.deepEqual(fixture.reads, ['legion'], 'ConfigForms takes rowId, not the loader entryId')
  assert.equal(controller.getSnapshot().configEntry, 'include:legion')
  assert.equal(controller.getSnapshot().configNamespace, 'legion')
  assert.equal(await controller.saveConfig({ candidateHarnesses: ['example'] }, 7, 'include:legion', 'legion'), true)
  assert.deepEqual(fixture.writes, [{
    entryId: 'include:legion', namespace: 'legion', revision: 7,
    ops: [{ op: 'set', path: ['candidateHarnesses'], value: ['example'] }],
  }])
})

test('native identity mapping is explicit and rejects ambiguous or wrong-module matches', async () => {
  const { configEntry } = await helpers()
  const entry = { entryId: 'a-tree:opaque-loader-id', moduleName: 'dsh-plugin-legion' }
  const row = { ...entry, rowId: 'user-chosen-configuration' }
  const namespaces = [{ ns: row.rowId }]
  const bundle = { name: 'dsh-plugin-legion', rows: [row] }
  assert.deepEqual(plain(configEntry([entry], namespaces, [bundle])), {
    entryId: entry.entryId, namespace: row.rowId,
  }, 'Neither a hardcoded name nor splitting the loader identity can find this namespace')
  for (const [entries, sections, bundles] of [
    [[entry, { ...entry, entryId: 'another-live-instance' }], namespaces, [bundle]],
    [[{ ...entry, moduleName: 'another-module' }], namespaces, [bundle]],
    [[entry], namespaces, [{ ...bundle, name: 'another-bundle' }]],
    [[entry], namespaces, [{ ...bundle, rows: [{ ...row, moduleName: 'another-module' }] }]],
    [[entry], namespaces, [{ ...bundle, rows: [{ ...row, entryId: 'another-loader' }] }]],
    [[entry], namespaces, [{ ...bundle, rows: [row, { ...row, rowId: 'another-namespace' }] }]],
    [[entry], [...namespaces, ...namespaces], [bundle]],
    [[entry], namespaces, []],
  ]) assert.equal(configEntry(entries, sections, bundles), null)
  assert.equal(configEntry([entry, { ...entry, entryId: 'hidden-duplicate' }], [{ ns: entry.entryId }]), null,
    'A direct namespace match cannot hide a second live instance')
})

test('mapped drafts bind both loader identity and namespace even when the revision and form are reused', async t => {
  const { createController } = await helpers()
  const fixture = mappedConfiguration()
  const controller = createController(context(() => assert.fail('Not a command')))
  t.after(() => controller.dispose())
  controller.attach('configuration', fixture.owner)
  await controller.loadConfig()
  const original = { ...fixture.identity }
  fixture.identity.entryId = 'another-tree:legion'
  await controller.loadConfig()
  await controller.saveConfig({ baseUrl: 'https://old.example.invalid' }, 7, original.entryId, original.namespace)
  assert.equal(fixture.writes.length, 0, 'The same namespace and revision do not identify the same loader instance')
  const next = { ...fixture.identity }
  fixture.identity.namespace = 'renamed-configuration'
  await controller.loadConfig()
  await controller.saveConfig({ baseUrl: 'https://old.example.invalid' }, 7, next.entryId, next.namespace)
  assert.equal(fixture.writes.length, 0, 'The same loader and revision do not identify the same configuration namespace')
  assert.equal(await controller.saveConfig({ baseUrl: 'https://current.example.invalid' }, 7,
    fixture.identity.entryId, fixture.identity.namespace), true)
  assert.equal(fixture.writes.length, 1)
})

test('a late mapped save cannot clear a draft after its loader identity changes under the same namespace', async t => {
  const { createController } = await helpers()
  const fixture = mappedConfiguration(), pending = deferred()
  let mutations = 0
  fixture.form.mutate = () => { mutations++; return pending.promise }
  const controller = createController(context(() => assert.fail('Not a command')))
  t.after(() => controller.dispose())
  controller.attach('configuration', fixture.owner)
  await controller.loadConfig()
  const saving = controller.saveConfig({}, 7, fixture.identity.entryId, fixture.identity.namespace)
  await turn()
  const started = mutations
  fixture.identity.entryId = 'replacement-tree:legion'
  await controller.loadConfig()
  pending.resolve(true)
  const accepted = await saving
  assert.equal(started, 1, 'The first mapped instance must actually start a native save')
  assert.equal(accepted, false)
  assert.equal(controller.getSnapshot().configSaved, false)
  assert.equal(controller.getSnapshot().configEntry, 'replacement-tree:legion')
})

test('unloading configuration during bundle mapping cannot subscribe a stale form or block member reads', async t => {
  const { createController } = await helpers()
  const fixture = mappedConfiguration(), pending = deferred()
  let bundleReads = 0
  fixture.owner.manager.listBundles = () => { bundleReads++; return pending.promise }
  const controller = createController(context(async () => reply('runtime', { runtime: { harnesses: [] } })))
  t.after(() => controller.dispose())
  const detach = controller.attach('configuration', fixture.owner)
  const loading = controller.loadConfig()
  await turn()
  detach()
  pending.resolve(nativeReply([{ name: 'dsh-plugin-legion', rows: [{
    entryId: 'include:legion', rowId: 'legion', moduleName: 'dsh-plugin-legion',
  }] }]))
  await loading
  assert.equal(bundleReads, 1, 'Configuration must read the native bundle identity map')
  assert.deepEqual(fixture.reads, [])
  assert.equal(controller.getSnapshot().config, null)
  assert.equal(controller.getSnapshot().available.configuration, false)
  controller.selectSession('a')
  await controller.loadMembers()
  assert.deepEqual(plain(controller.getSnapshot().members), { runtime: { harnesses: [] } })
})

test('duplicate session titles gain distinguishable short ids without changing unique titles', async () => {
  const { sessionLabel } = await helpers()
  assert.equal(typeof sessionLabel, 'function')
  const ids = ['shared-prefix-first-12345678', 'shared-prefix-second-12345678', 'shared-prefix-third-87654321', 'unique', 'untitled']
  const sessions = { ids, byId: Object.fromEntries(ids.map(id => [id, {
    displayTitle: id === 'unique' ? 'A named conversation' : id === 'untitled' ? '' : 'dsh-workspace',
  }])) }
  const labels = ids.slice(0, 3).map(id => sessionLabel(sessions, id))
  assert.equal(new Set(labels).size, 3, 'Short ids must still distinguish common prefixes and colliding suffixes')
  for (const label of labels) assert.match(label, /^dsh-workspace · /)
  assert.equal(sessionLabel(sessions, 'unique'), 'A named conversation')
  assert.equal(sessionLabel(sessions, 'untitled'), 'untitled')
})

test('a mapped save rechecks native loader ownership instead of trusting a cached namespace and revision', async t => {
  const { createController } = await helpers()
  const fixture = mappedConfiguration()
  const controller = createController(context(() => assert.fail('Not a command')))
  t.after(() => controller.dispose())
  controller.attach('configuration', fixture.owner)
  await controller.loadConfig()
  const editing = { ...fixture.identity }
  // The native form and its revision are unchanged, but the namespace now belongs
  // to another loader instance. The user has not pressed Reload configuration.
  fixture.identity.entryId = 'replacement-tree:legion'
  const accepted = await controller.saveConfig({ baseUrl: 'https://old.example.invalid' }, 7,
    editing.entryId, editing.namespace)
  assert.equal(fixture.writes.length, 0, 'A cached loader id is not current write authority')
  assert.equal(accepted, false)
  assert.match(controller.getSnapshot().errors.configSave, /实例|entry/i)
})

test('a failed ambiguous identity reread cannot authorize a save through the previous form', async t => {
  const { createController } = await helpers()
  const fixture = mappedConfiguration()
  const controller = createController(context(() => assert.fail('Not a command')))
  t.after(() => controller.dispose())
  controller.attach('configuration', fixture.owner)
  await controller.loadConfig()
  fixture.owner.inventory.list = async () => nativeReply({ entries: [
    { entryId: fixture.identity.entryId, moduleName: 'dsh-plugin-legion' },
    { entryId: 'another-instance', moduleName: 'dsh-plugin-legion' },
  ] })
  await controller.loadConfig()
  assert.match(controller.getSnapshot().errors.config, /唯一|unique/i)
  await controller.saveConfig({ candidateHarnesses: [] }, 7, fixture.identity.entryId, fixture.identity.namespace)
  assert.equal(fixture.writes.length, 0)
  assert.equal(controller.getSnapshot().configSaved, false)
})

test('starting another search removes earlier results even when the new source fails', async t => {
  const { createController } = await helpers()
  const controller = createController(context(async (id, line) => {
    const { action } = JSON.parse(line.slice('/legion-panel '.length))
    if (action === 'tools') return reply('tools', { tools: [{ name: 'old-tool' }] })
    throw new Error('GitHub temporarily unavailable')
  }))
  t.after(() => controller.dispose())
  controller.selectSession('a')
  controller.attach('skills', { list: async () => nativeReply({ skills: [{ name: 'old-skill' }] }) })
  assert.equal(await controller.search('local', ''), true)
  assert.equal(controller.getSnapshot().search.skills.length, 1)
  const searching = controller.search('github', 'new-query')
  assert.equal(controller.getSnapshot().search, null, 'Old local results must disappear before the new request settles')
  await searching
  assert.equal(controller.getSnapshot().search, null)
  assert.match(controller.getSnapshot().errors.search, /GitHub temporarily unavailable/)
})

test('changing search source invalidates a late result without changing the working session', async t => {
  const { createController } = await helpers(), pending = deferred()
  const controller = createController(context(() => pending.promise))
  t.after(() => controller.dispose())
  controller.selectSession('a')
  const searching = controller.search('github', 'old-query')
  await turn()
  controller.clearSearch()
  pending.resolve(reply('github', { repositories: [{ repository: 'old/result' }] }))
  assert.equal(await searching, false)
  assert.equal(controller.getSnapshot().sessionId, 'a')
  assert.equal(controller.getSnapshot().search, null)
  assert.equal(controller.getSnapshot().busy.search, false)
})

test('missing native market endpoint is a specific unavailable fact, not a successful empty search', async t => {
  const { createController } = await helpers()
  const controller = createController(context(() => assert.fail('Market discovery must not call the core')))
  t.after(() => controller.dispose())
  controller.selectSession('a')
  controller.attach('market', {
    listIndexes: async () => {
      throw new Error('client api: pluginMarket/listIndexes failed: transport failure for /api/pluginMarket/listIndexes: HTTP 404')
    },
  })
  await controller.search('market', 'legion')
  const found = controller.getSnapshot().search
  assert.equal(found?.kind, 'market')
  assert.equal(found?.unavailable, true)
  assert.equal(found?.reason, 'native_endpoint_unavailable')
  assert.equal(found?.unconfigured, undefined, 'A missing service does not prove an empty index configuration')
  assert.match(found?.diagnostic, /HTTP 404/)
  assert.equal(controller.getSnapshot().errors.search, null)
})

test('absent market service is actionable but other native failures are not mislabeled as absence', async t => {
  const { createController } = await helpers()
  const controller = createController(context(() => assert.fail('No core request')))
  t.after(() => controller.dispose())
  controller.selectSession('a')
  await controller.search('market', 'legion')
  assert.equal(controller.getSnapshot().search?.reason, 'native_service_unavailable')
  for (const message of [
    'transport failure for /api/pluginMarket/listIndexes: HTTP 401',
    'transport failure for /api/pluginMarket/listIndexes: HTTP 503',
    'transport failure for /api/someOtherService/list: HTTP 404',
    'Connection timed out',
  ]) {
    controller.attach('market', { listIndexes: async () => { throw new Error(message) } })
    assert.equal(await controller.search('market', 'legion'), false)
    assert.equal(controller.getSnapshot().search, null)
    assert.equal(controller.getSnapshot().errors.search, message)
  }
  controller.attach('market', { listIndexes: async () => nativeReply([]) })
  assert.equal(await controller.search('market', 'legion'), true)
  assert.equal(controller.getSnapshot().search.unconfigured, true)
  assert.equal(controller.getSnapshot().search.unavailable, undefined)
})

const STATUS_REF = 'a'.repeat(32)
const ARTIFACT_ID = 'b'.repeat(32)
const artifactRow = extra => ({
  artifact_id: ARTIFACT_ID, name: 'fixture.txt', sha256: 'c'.repeat(64),
  bytes: 12, download_eligible: true, ...extra,
})

test('artifact presentation never converts missing or partial observations into a confirmed zero', async () => {
  const { artifactFacts } = await helpers()
  assert.equal(typeof artifactFacts, 'function')
  for (const value of [
    {}, { artifacts: null }, { artifacts: [], more_events: true },
    { artifacts: [], more_events: false, truncated: true },
    { artifacts: [], more_events: false, projection: { truncated_fields: ['$.artifacts'] } },
  ]) assert.equal(artifactFacts(value).complete, false)
  const empty = artifactFacts({ artifacts: [], more_events: false })
  assert.equal(empty.complete, true)
  assert.equal(empty.observed_count, 0)
  const unrelated = artifactFacts({
    artifacts: [artifactRow()], more_events: false, truncated: true,
    sections: { artifacts: { available: true, complete: true, observed_count: 1, shown_count: 1 } },
    projection: { truncated_fields: ['$.runtime.tasks[0].result.final'] },
  })
  assert.equal(unrelated.complete, true, 'Abbreviated runtime prose must not hide an intact artifact inventory')
  assert.equal(unrelated.items.length, 1)
})

test('status paging carries only read cursors and clears stale task facts on a failed read', async t => {
  const { createController } = await helpers()
  const calls = []
  const controller = createController(context(async (id, line) => {
    const body = JSON.parse(line.slice('/legion-panel '.length))
    calls.push({ id, ...body })
    if (calls.length === 2) throw new Error('status unavailable')
    return reply('status', { task_ref: STATUS_REF, artifacts: [] })
  }))
  t.after(() => controller.dispose())
  controller.selectSession('a')
  await controller.taskStatus(STATUS_REF, { after_event_id: 21, after_message_id: 4, artifact_offset: 30,
    sessionId: 'foreign', token: 'not-authority' })
  assert.deepEqual(calls[0], { id: 'a', action: 'status',
    args: { task_ref: STATUS_REF, after_event_id: 21, after_message_id: 4, artifact_offset: 30 } })
  await controller.taskStatus('d'.repeat(32))
  assert.equal(controller.getSnapshot().taskStatus, null)
  assert.match(controller.getSnapshot().errors.taskStatus, /status unavailable/)
})

test('downloads reuse the native human command with an observed id, never a returned URL or new authority', async t => {
  const { createController } = await helpers()
  const calls = []
  const pending = deferred()
  const controller = createController(context(async (id, line, attachments) => {
    calls.push({ id, line, attachments })
    if (line.startsWith('/legion-panel ')) return reply('status', {
      task_ref: STATUS_REF, artifacts: [artifactRow({ url: 'https://untrusted.invalid/private' })],
    })
    return pending.promise
  }))
  t.after(() => controller.dispose())
  controller.selectSession('a')
  await controller.taskStatus(STATUS_REF)
  for (const [ref, id] of [
    ['f'.repeat(32), ARTIFACT_ID], [STATUS_REF, 'https://untrusted.invalid/private'],
    [STATUS_REF, '../file'], [STATUS_REF, 'e'.repeat(32)],
  ]) await controller.downloadArtifact(ref, id)
  assert.equal(calls.length, 1, 'Unknown, foreign or path-shaped identities do not become commands')
  const wait = controller.downloadArtifact(STATUS_REF, ARTIFACT_ID)
  await turn()
  assert.deepEqual(plain(calls[1]), {
    id: 'a', line: `/legion download ${STATUS_REF} ${ARTIFACT_ID}`, attachments: [],
  })
  controller.selectSession('b')
  pending.resolve(nativeReply({ result: { kind: 'success', text: 'Fixture download receipt for session a' } }))
  await wait
  assert.equal(controller.getSnapshot().download, null, 'A late download receipt must not enter another session')
})

// In-process React element projection, not Playwright/a browser/native-install acceptance.
async function statusPanel(t, status, { taskCount = 1, reducedMotion = false, membersError,
  locale = 'zh', readTask = true } = {}) {
  let definition, Page, cursor = 0
  const label = (zh, en) => locale === 'zh' ? zh : en
  const slots = [], cleanups = [], calls = [], effects = [], focusCalls = [], scrollCalls = []
  const refTargets = new Map()
  const React = {
    Fragment: Symbol('fragment'),
    createElement(type, props, ...children) {
      const all = { ...props, children: children.flat(Infinity).filter(value => value != null && value !== false) }
      return typeof type === 'function' ? type(all) : { type, props: all }
    },
    useSyncExternalStore(_subscribe, snapshot) { return snapshot() },
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
    },
    useRef(initial) { return React.useState(() => ({ current: initial }))[0] },
    useEffect(effect, deps) {
      const index = cursor++
      const previous = slots[index]
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) {
        effects.push(() => {
          previous?.cleanup?.()
          slots[index] = { deps, cleanup: effect() }
        })
      }
    },
  }
  const realm = createContext({ window: {
    __ModuleLoader__: { load(value) { definition = value } },
    matchMedia(query) {
      assert.equal(query, '(prefers-reduced-motion: reduce)')
      return { matches: reducedMotion }
    },
  },
    URL, AbortController, DOMException, console, crypto: webcrypto })
  runInContext(await readFile(new URL('../client/index.js', import.meta.url), 'utf8'), realm)
  const plugin = definition.factory(name => {
    assert.equal(name, 'react')
    return React
  })
  const ctx = {
    ...context(async (id, line, attachments) => {
      calls.push({ id, line, attachments })
      if (line.startsWith('/legion download ')) {
        return nativeReply({ result: { kind: 'success', text: '下载回执：SHA-256 已核对；不是体验验收。' } })
      }
      const { action, args } = JSON.parse(line.slice('/legion-panel '.length))
      if (action === 'runtime' && membersError) throw new Error(membersError)
      return reply(action, action === 'status' ? typeof status === 'function' ? await status(id, args) : status
        : action === 'tasks' ? { tasks: Array.from({ length: taskCount }, (_, index) => ({
          task_ref: index ? index.toString(16).padStart(32, '0') : STATUS_REF, key: `synthetic-task-${index}`,
        })) }
          : { runtime: { harnesses: [] } })
    }),
    locale: { resolveText(value) { return value[locale] } },
    layout: { selectPanel() {} },
    on() {},
    effect(work) { cleanups.push(work()) },
    inject(dependencies, callback) { if (dependencies[0] === 'slots') callback(ctx) },
    slots: {
      inject(_slot, callback) { callback() },
      register(options, component) { if (options.key === 'legion') Page = component },
    },
  }
  ctx.sessions.refresh = async () => {}
  plugin.apply(ctx)
  t.after(() => {
    for (const slot of slots) slot?.cleanup?.()
    for (const cleanup of cleanups) cleanup?.()
  })
  const render = () => {
    cursor = 0
    const tree = Page()
    // Model React's commit order: refs are attached before passive effects run.
    for (const ref of refTargets.keys()) ref.current = null
    for (const node of nodes(tree)) {
      const ref = node.props.ref
      if (!ref || typeof ref !== 'object') continue
      if (!refTargets.has(ref)) refTargets.set(ref, {
        focus(options) { focusCalls.push({ id: node.props.id, options: plain(options) }) },
        scrollIntoView(options) { scrollCalls.push({ id: node.props.id, options: plain(options) }) },
      })
      ref.current = refTargets.get(ref)
    }
    for (const effect of effects.splice(0)) effect()
    return tree
  }
  const nodes = node => !node || typeof node !== 'object' ? []
    : [node, ...node.props.children.flatMap(nodes)]
  const text = node => node == null || node === false ? '' : typeof node !== 'object'
    ? String(node) : node.props.children.map(text).join('')
  const find = (type, label) => nodes(render()).find(node => node.type === type
    && (node.props['aria-label'] === label || text(node) === label))
  find('select', label('当前工作会话', 'Working session')).props.onChange({ target: { value: 'a' } })
  await turn()
  if (readTask) {
    find('button', label('接入任务', 'Integration tasks')).props.onClick()
    await turn()
    find('button', label('读取实时进度', 'Read live progress')).props.onClick()
    await turn()
  }
  return { render, nodes, text, find, calls, focusCalls, scrollCalls }
}

test('task panel renders missing exports as incomplete, not zero, even for legacy projected receipts', async t => {
  const panel = await statusPanel(t, {
    task_ref: STATUS_REF, team_id: 'fixture-team', connection: 'connected',
    runtime: { tasks: [{ task_id: 'author', status: 'done' }] },
    truncated: true, projection: { truncated_fields: ['$.artifacts'] },
  })
  const content = panel.text(panel.render())
  assert.match(content, /成果清单.*未完整|成果清单.*未取得/)
  assert.doesNotMatch(content, /正式成果：0|导出记录：0/)
})

test('task panel separates export reasons and hash versions and provides the real native download button', async t => {
  const panel = await statusPanel(t, {
    task_ref: STATUS_REF, team_id: 'fixture-team', connection: 'connected',
    runtime: { tasks: [{ task_id: 'author', status: 'done', result: { final: 'Author report, not acceptance' } }] },
    artifacts: [artifactRow(), artifactRow({ artifact_id: 'd'.repeat(32), sha256: 'e'.repeat(64),
      download_eligible: false, download_reason: 'Artifact has conflicting SHA-256 hashes' })],
    export_observations: [{ source_path: '$.events[2].data', event_id: 9,
      name: 'fixture.tgz', reason: 'artifact_archive_unsupported', downloadable: false, file_preserved: true }],
    next_event_id: 12, more_events: true, truncated: true,
    sections: {
      artifacts: { available: true, complete: false, observed_count: 2, shown_count: 2, offset: 0, next_offset: null },
      events: { available: true, after_event_id: 0, has_more: true, next_after_event_id: 9 },
    },
  })
  const tree = panel.render(), content = panel.text(tree)
  assert.match(content, /哈希|SHA-256/)
  assert.match(content, /历史|history/)
  assert.match(content, /artifact_archive_unsupported/)
  assert.match(content, /Artifact has conflicting SHA-256 hashes/)
  assert.match(content, /服务事件游标：12/)
  assert.match(content, /截断|省略/)
  const buttons = panel.nodes(tree).filter(node => node.type === 'button' && panel.text(node) === '下载文件')
  assert.equal(buttons.length, 1, 'Only eligible observed rows have an active download action')
  buttons[0].props.onClick()
  await turn()
  assert.equal(panel.calls.at(-1).line, `/legion download ${STATUS_REF} ${ARTIFACT_ID}`)
  assert.match(panel.text(panel.render()), /下载回执/)
  panel.find('button', '读取后续事件').props.onClick()
  await turn()
  const next = JSON.parse(panel.calls.at(-1).line.slice('/legion-panel '.length))
  assert.equal(next.args.after_event_id, 9, 'Do not jump to the upstream cursor and skip undisplayed events')
})

for (const reducedMotion of [false, true]) {
  test(`task progress focus follows an explicit read from a long list (reduced motion: ${reducedMotion})`, async t => {
    const pending = deferred()
    const panel = await statusPanel(t, () => pending.promise, { taskCount: 8, reducedMotion })
    const loading = panel.render()
    const firstTask = panel.nodes(loading).find(node => node.type === 'article' && panel.text(node).includes('synthetic-task-0'))
    assert.match(panel.text(firstTask), /正在读取/, 'The clicked task itself must show loading above the fold')
    assert.equal(panel.focusCalls.length, 0, 'Do not focus an empty result while the request is still pending')
    pending.resolve({ task_ref: STATUS_REF, runtime: { tasks: [] }, artifacts: [], more_events: false })
    await turn()
    const tree = panel.render()
    const region = panel.nodes(tree).find(node => node.props.id === 'legion-task-status')
    assert.equal(region?.props.tabIndex, -1)
    assert.equal(region.props['aria-busy'], false)
    assert.deepEqual(panel.focusCalls, [{ id: 'legion-task-status', options: { preventScroll: true } }])
    assert.deepEqual(panel.scrollCalls, [{
      id: 'legion-task-status', options: { block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' },
    }])
    panel.render()
    assert.equal(panel.focusCalls.length, 1, 'A rerender must not steal focus again')
    const statusCall = panel.calls.find(call => call.line.includes('"action":"status"'))
    assert.deepEqual(JSON.parse(statusCall.line.slice('/legion-panel '.length)).args, { task_ref: STATUS_REF },
      'The focus request stays in the UI; it is not a Host argument or grant')
  })
}

test('task progress focus reveals the failed read instead of leaving an error below the long list', async t => {
  const pending = deferred()
  const panel = await statusPanel(t, () => pending.promise, { taskCount: 8, reducedMotion: true })
  pending.reject(new Error('synthetic status read failed'))
  await turn()
  const tree = panel.render()
  const region = panel.nodes(tree).find(node => node.props.id === 'legion-task-status')
  assert.ok(region, 'Failure needs the same focusable status destination as success')
  assert.ok(panel.nodes(region).some(node => node.props.role === 'alert' && panel.text(node).includes('synthetic status read failed')))
  assert.equal(region.props['aria-busy'], false)
  assert.equal(panel.focusCalls.length, 1)
  assert.equal(panel.scrollCalls.length, 1)
})

test('task progress focus does not repeat on artifact paging, event paging or refresh', async t => {
  const panel = await statusPanel(t, {
    task_ref: STATUS_REF, artifacts: [artifactRow()], more_events: true,
    sections: {
      artifacts: { offset: 0, next_offset: 30 },
      events: { after_event_id: 0, has_more: true, next_after_event_id: 9 },
    },
  }, { taskCount: 8 })
  panel.render()
  assert.equal(panel.focusCalls.length, 1, 'The explicit task selection should focus once')
  for (const label of ['读取下一页成果记录', '读取后续事件', '刷新原任务', '刷新任务列表']) {
    panel.find('button', label).props.onClick()
    await turn()
    panel.render()
    assert.equal(panel.focusCalls.length, 1, `${label} must not take keyboard focus`)
    assert.equal(panel.scrollCalls.length, 1, `${label} must not move the viewport`)
  }
})

test('task progress focus drops a pending selection when the session changes, including switching back', async t => {
  const pending = deferred()
  const panel = await statusPanel(t, () => pending.promise, { taskCount: 8 })
  panel.find('select', '当前工作会话').props.onChange({ target: { value: 'b' } })
  await turn()
  pending.resolve({ task_ref: STATUS_REF, runtime: { tasks: [
    { task_id: 'author', status: 'done', final: 'OLD_SESSION_RESULT_MUST_NOT_REAPPEAR' },
  ] } })
  await turn()
  assert.doesNotMatch(panel.text(panel.render()), /OLD_SESSION_RESULT_MUST_NOT_REAPPEAR/)
  assert.equal(panel.focusCalls.length, 0)
  panel.find('select', '当前工作会话').props.onChange({ target: { value: 'a' } })
  await turn()
  assert.doesNotMatch(panel.text(panel.render()), /OLD_SESSION_RESULT_MUST_NOT_REAPPEAR/)
  assert.equal(panel.focusCalls.length, 0)
  assert.equal(panel.scrollCalls.length, 0)
})

test('task progress focus is not restored after leaving the task tab during a read', async t => {
  const pending = deferred()
  const panel = await statusPanel(t, () => pending.promise, { taskCount: 8 })
  panel.find('button', '找能力').props.onClick()
  pending.resolve({ task_ref: STATUS_REF, artifacts: [], more_events: false })
  await turn()
  panel.render()
  assert.equal(panel.focusCalls.length, 0)
  panel.find('button', '接入任务').props.onClick()
  await turn()
  panel.render()
  assert.equal(panel.focusCalls.length, 0, 'Reopening the tab must not replay an old selection')
  assert.equal(panel.scrollCalls.length, 0)
})

test('member read failure explains the connection and still-available native entry points without masking details or retrying', async t => {
  const panel = await statusPanel(t, { task_ref: STATUS_REF, artifacts: [] }, { membersError: 'fetch failed' })
  panel.find('button', '我的军团').props.onClick()
  const tree = panel.render(), content = panel.text(tree)
  assert.match(content, /暂时无法读取军团成员.*连接与配置.*地址.*服务/)
  assert.match(content, /找能力.*DSH.*能力包.*仍可用/)
  assert.ok(panel.nodes(tree).some(node => node.props.role === 'alert' && panel.text(node) === 'fetch failed'),
    'Keep the existing error details; do not replace a transport error with an identity diagnosis')
  assert.doesNotMatch(content, /身份错误|认证失败|unauthorized/i)
  assert.equal(panel.find('button', '找能力').props.disabled, undefined)
  assert.equal(panel.find('button', '连接与配置').props.disabled, undefined)
  await turn()
  panel.render()
  assert.equal(panel.calls.filter(call => call.line.includes('"action":"runtime"')).length, 1,
    'The explanation must not retry member discovery or mutate the connection')
})

test('export section explicitly marks clipped reasons incomplete even when all observation rows and artifacts are shown', async t => {
  const reason = 'synthetic_export_reason_prefix…[truncated]'
  const panel = await statusPanel(t, {
    task_ref: STATUS_REF, artifacts: [artifactRow()], more_events: false, truncated: true,
    export_observations: [{ name: 'fixture.tgz', reason, source_path: '$.events[1].data' }],
    sections: {
      artifacts: { available: true, complete: true, observed_count: 1, shown_count: 1 },
      exports: { available: true, complete: false, observed_count: 1, shown_count: 1 },
    },
    projection: { truncated_fields: ['$.export_observations[0].reason'] },
  })
  const tree = panel.render()
  const observations = panel.nodes(tree).find(node => node.type === 'section' && node.props.children.some(child =>
    child?.type === 'h3' && panel.text(child) === '导出观察与拒绝原因'))
  assert.ok(observations)
  const children = observations.props.children
  const start = children.findIndex(node => node?.type === 'h3' && panel.text(node) === '导出观察与拒绝原因')
  const end = children.findIndex(node => node?.type === 'h3' && panel.text(node) === '事件与续读')
  const exportSection = children.slice(start + 1, end)
  assert.ok(exportSection.some(node => node?.type === 'p'
    && panel.text(node) === '以上仅为本页已取得的导出观察，尚不是完整原因清单。'),
  'The export section itself must disclose incomplete reason content, not just the generic truncation banner')
  assert.ok(exportSection.some(node => panel.text(node).includes(reason)), 'Keep the observed reason text as received')
  assert.match(panel.text(tree), /本次已观察到的正式导出记录：1/)
  assert.doesNotMatch(panel.text(tree), /成果清单未完整取得/,
    'Clipped export reasons must not change the independently complete artifact inventory')
})

for (const example of [
  {
    locale: 'zh', tab: '添加能力', heading: '安装现成 DSH 包', button: '安装 / 更新',
    explanation: '新包不会自动选择启用；更新保留已有开关，已启用包可能继续运行。若不希望更新后的代码运行，请先在下方停用对应能力包，再安装更新。',
  },
  {
    locale: 'en', tab: 'Add capabilities', heading: 'Install an existing DSH bundle', button: 'Install / update',
    explanation: 'New bundles are not automatically selected for activation. Updates preserve existing enablement, so enabled bundles may keep running. To prevent updated code from running, disable the bundle below before installing the update.',
  },
]) {
  test(`install copy distinguishes new bundles from updates without promising forced disablement (${example.locale})`, async t => {
    const panel = await statusPanel(t, undefined, { locale: example.locale, readTask: false })
    panel.find('button', example.tab).props.onClick()
    const section = panel.nodes(panel.render()).find(node => node.type === 'section' && node.props.children.some(child =>
      child?.type === 'h3' && panel.text(child) === example.heading))
    assert.ok(section, 'Inspect the actual native installation card, not unrelated page text')
    assert.ok(panel.nodes(section).some(node => node.type === 'button' && panel.text(node) === example.button),
      'The install button must not promise to disable an already-enabled bundle')
    assert.ok(section.props.children.some(node => node?.type === 'p' && panel.text(node) === example.explanation),
      'Explain new-bundle selection, retained update switches and how to disable before updating')
    assert.doesNotMatch(panel.text(section), /安装，暂不启用|Install disabled/)
    assert.equal(panel.calls.some(call => call.line.includes('"action":"status"')), false,
      'This copy regression does not replay task progress or focus')
  })
}
