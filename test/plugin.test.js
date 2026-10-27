import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { ToolRuntime, assertSupportedJsonSchema, validateJsonSchemaValue } from '@deepseek-ai/dsh-tools'
import { CommandRuntime } from '@deepseek-ai/dsh-commands'
import { LegionClient } from '../lib/client.js'

const methods = ['submit', 'list', 'status', 'message', 'resume', 'cancel', 'download']
const names = methods.map(method => `legion_${method}`).sort()
const taskRef = 'a'.repeat(32)
const artifactId = 'b'.repeat(32)
const isolatedConfig = {
  baseUrl: 'http://127.0.0.1:8000',
  tokenEnv: 'DSH_LEGION_PLUGIN_TEST_UNSET_TOKEN',
  stateDirectory: '/nonexistent/dsh-legion-plugin-test',
}

async function loadPlugin() {
  let plugin
  try {
    plugin = await import('../index.js')
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND' || !error.message.includes('/index.js')) throw error
  }
  assert.equal(typeof plugin?.apply, 'function', 'The plugin must export its native Cordis apply entry')
  return plugin
}

// Real installed DSH services, with no agent loop, model, HTTP server or disk store.
async function host(t, { commands = false } = {}) {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('Plugin tests must not access the network'))
  const ctx = new Context()
  const fibers = []
  t.after(async () => {
    for (const fiber of fibers.toReversed()) await fiber.dispose()
  })
  const install = async (plugin, config) => {
    const fiber = ctx.plugin(plugin, config)
    fibers.push(fiber)
    await fiber
    return fiber
  }
  await install(SystemPrompt, { includeHarnessIdentity: false })
  await install(ToolRuntime, { mode: 'native' })
  if (commands) await install(CommandRuntime)
  return { ctx, install }
}

function recordClient(t, overrides = {}) {
  const calls = []
  for (const method of methods) {
    t.mock.method(LegionClient.prototype, method, async function (...args) {
      calls.push({ method, args, client: this })
      if (overrides[method]) return overrides[method](...args)
      return method === 'list'
        ? { tasks: [], source: 'local_recovery_index_not_live_status' }
        : { task_ref: taskRef, operation: method, nested: { complete: false, facts: [0, null, '中文'] } }
    })
  }
  return calls
}

test('Config is real Schemastery, fills defaults, and leaves baseUrl available for the environment fallback', async () => {
  const { Config } = await loadPlugin()
  assert.equal(typeof Config['~standard']?.validate, 'function')
  const config = Config({})
  assert.equal(config.baseUrl, undefined)
  assert.equal(config.candidateHarnesses, undefined)
  assert.equal(config.tokenEnv, 'LEGION_PERSONAL_TOKEN')
  assert.equal(config.requestTimeoutMs, 30000)
  assert.equal(config.maxResponseBytes, 4 * 1024 * 1024)
  assert.equal(config.maxArtifactBytes, 50 * 1024 * 1024)
  assert.equal(config.maxEvents, 100)
  assert.ok(!Object.hasOwn(config, 'lifecycleSignal'))
  assert.deepEqual(Config['~standard'].validate({}).value, config)
})

test('Config accepts explicit candidate lists without defaulting, sorting or silently fixing invalid entries', async () => {
  const { Config } = await loadPlugin()
  assert.deepEqual(Config({ candidateHarnesses: [] }).candidateHarnesses, [])
  assert.deepEqual(Config({ candidateHarnesses: ['generic-reviewer', 'generic-member'] }).candidateHarnesses,
    ['generic-reviewer', 'generic-member'])
  for (const candidateHarnesses of [
    null, 'generic-member', {}, [null], [1], [''], [' '], [' generic-member'],
    ['generic member'], ['generic/member'], ['generic\nmember'], ['generic-member', 'generic-member'],
  ]) {
    assert.throws(() => Config({ candidateHarnesses }))
  }
})

test('Config rejects bad types, unsafe URLs, inline credentials and model-owned authority', async () => {
  const { Config } = await loadPlugin()
  for (const invalid of [
    { maxEvents: '100' }, { maxEvents: 0 }, { maxEvents: 501 }, { maxEvents: 1.5 },
    { requestTimeoutMs: 99 }, { requestTimeoutMs: 300001 }, { requestTimeoutMs: Infinity },
    { maxResponseBytes: 1023 }, { maxResponseBytes: 32 * 1024 * 1024 + 1 },
    { maxArtifactBytes: 0 }, { maxArtifactBytes: NaN }, { maxArtifactBytes: 1024 ** 3 + 1 },
    { tokenEnv: 'TOKEN=not-a-name' }, { stateDirectory: '' }, { stateDirectory: 42 },
    { projectBindingFile: 'relative/authority.json' },
    { baseUrl: 'file:///tmp/not-http' }, { baseUrl: 'http://remote.example' },
    { baseUrl: 'https://name:fixture-password@example.test' },
    { baseUrl: 'https://example.test?token=fixture-secret' },
    { baseUrl: 'https://example.test/#fragment' },
    { token: 'fixture-secret' }, { authorization: 'fixture-secret' },
    { lifecycleSignal: new AbortController().signal }, { env: {} }, { unknownOption: true },
  ]) {
    assert.throws(() => Config(invalid), undefined, `Invalid configuration keys: ${Object.keys(invalid)}`)
  }
  for (const baseUrl of ['http://localhost:8000', 'http://[::1]:8000', 'https://example.test/legion']) {
    assert.equal(Config({ baseUrl }).baseUrl, baseUrl)
  }
  assert.equal(Config({ projectBindingFile: '/fixture/authorized-project.json' }).projectBindingFile,
    '/fixture/authorized-project.json')
  try {
    Config({ token: 'fixture-secret' })
    assert.fail('Inline token must fail')
  } catch (error) {
    assert.ok(!error.message.includes('fixture-secret'))
  }
})

test('official Cordis validates plugin configuration before registering tools', async t => {
  const plugin = await loadPlugin()
  const { ctx, install } = await host(t)
  await assert.rejects(install(plugin, { ...isolatedConfig, maxEvents: '100' }))
  assert.deepEqual(ctx.tools.schemas(), [])
})

test('official defineTool definitions route all seven calls with exact current agent and signal', async t => {
  const plugin = await loadPlugin()
  const calls = recordClient(t)
  const { ctx, install } = await host(t)
  await install(plugin, isolatedConfig)
  assert.deepEqual(ctx.tools.schemas().map(tool => tool.name).sort(), names)
  const inputs = {
    submit: { key: 'new-turn', query: '保留原目标', context: '公开背景', previous_task_ref: taskRef },
    list: {},
    status: { task_ref: taskRef, after_event_id: 0 },
    message: { task_ref: taskRef, operation_key: 'note-1', recipient: 'author', text: '新反馈' },
    resume: { task_ref: taskRef, operation_key: 'resume-1' },
    cancel: { task_ref: taskRef, reason: '用户请求取消' },
    download: { task_ref: taskRef, artifact_id: artifactId },
  }
  for (const [index, method] of methods.entries()) {
    const signal = new AbortController().signal
    const agent = { id: `agent-${index}`, session: { id: 'must-not-use-session.id' }, ctx }
    const tool = ctx.tools.get(`legion_${method}`)
    assertSupportedJsonSchema(tool.parameters)
    assertSupportedJsonSchema(tool.output.schema)
    assert.equal(typeof tool.output.render, 'function')
    assert.equal(tool.presentCall, undefined, 'Do not invent a host-only custom Web card')
    const result = await ctx.tools.execute({
      callId: `fixture-${index}`, name: tool.name, arguments: inputs[method], agent, signal,
    })
    assert.equal(result.isError, false, JSON.stringify(result))
    assert.deepEqual(validateJsonSchemaValue(tool.output.schema, result.value), [])
    assert.deepEqual(JSON.parse(result.content[0].text), result.value, 'Render canonical JSON, not another summary')
    const call = calls.at(-1)
    assert.equal(call.method, method)
    const execution = call.args.at(-1)
    assert.equal(execution.sessionId, agent.id)
    assert.equal(execution.signal, signal)
    assert.equal(call.args.length, method === 'list' ? 1 : 2)
    if (method !== 'list') assert.deepEqual(call.args[0], inputs[method])
  }
  assert.equal(calls.length, 7)
})

test('tool schemas validate input and undeclared fields never reach the client', async t => {
  const plugin = await loadPlugin()
  const calls = recordClient(t)
  const { ctx, install } = await host(t)
  await install(plugin, isolatedConfig)
  const exec = { agent: { id: 'current-agent', ctx }, signal: new AbortController().signal }
  const submit = ctx.tools.get('legion_submit')
  await assert.rejects(submit.execute({ key: 'missing-query' }, exec))
  await assert.rejects(submit.execute({ key: 'k', query: 10 }, exec))
  await assert.rejects(ctx.tools.get('legion_status').execute({ task_ref: taskRef, after_event_id: 1.5 }, exec))
  assert.equal(calls.length, 0)
  await submit.execute({
    key: 'safe', query: 'The task',
    sessionId: 'another-owner', signal: 'forged', token: 'synthetic-only',
    baseUrl: 'https://another.example', projectBindingFile: '/unauthorized.json',
    project_context: { workspace_root: '/unauthorized' },
    candidateHarnesses: ['injected-member'], candidate_harnesses: ['injected-member'],
    candidates: ['injected-member'],
    plan: { team_policy: { candidate_harnesses: ['injected-member'] } },
    team_policy: { candidate_harnesses: ['injected-member'] },
  }, exec)
  assert.deepEqual(calls[0].args[0], { key: 'safe', query: 'The task' })
  for (const tool of ctx.tools.schemas()) {
    for (const key of ['sessionId', 'signal', 'token', 'baseUrl', 'projectBindingFile', 'project_context',
      'candidateHarnesses', 'candidate_harnesses', 'candidates', 'plan', 'team_policy']) {
      assert.ok(!Object.hasOwn(tool.parameters.properties, key), `${tool.name} must not offer ${key}`)
    }
  }
})

test('native tools and continue use configured candidates, rejecting same-key changes after plugin reload', async t => {
  const plugin = await loadPlugin()
  const stateDirectory = await mkdtemp(join(tmpdir(), 'legion-candidate-plugin-test-'))
  t.after(() => rm(stateDirectory, { recursive: true, force: true }))
  const { ctx, install } = await host(t, { commands: true })
  // Only credential acquisition and HTTP are doubled. Use the real client,
  // serializer and durable reservation, without a model or a live service.
  t.mock.method(LegionClient.prototype, 'token', () => 'fixture-token')
  const bodies = []
  globalThis.fetch.mock.mockImplementation(async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/legion/dispatch')
    const body = JSON.parse(options.body)
    bodies.push(body)
    return new Response(`event: meta\ndata: ${JSON.stringify({ sid: body.session_id, team_id: body.team_id })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } })
  })
  const agent = { id: 'candidate-fixture-agent', ctx }
  const signal = new AbortController().signal
  const args = {
    key: 'configured-task', query: 'Synthetic task',
    candidateHarnesses: ['injected-member'], candidate_harnesses: ['injected-member'],
    candidates: ['injected-member'],
    plan: { team_policy: { candidate_harnesses: ['injected-member'] } },
  }
  for (const [i, candidateHarnesses] of [
    ['generic-member'], ['generic-member'], ['generic-reviewer'],
  ].entries()) {
    const fiber = await install(plugin, { ...isolatedConfig, stateDirectory, candidateHarnesses })
    const result = await ctx.tools.execute({
      name: 'legion_submit', arguments: args, callId: `candidate-call-${i}`, agent, signal,
    })
    if (i === 2) {
      assert.equal(result.isError, true)
      assert.match(result.content[0].text, /different input/i)
    } else {
      assert.equal(result.isError, false, JSON.stringify(result))
      assert.equal(result.value.submission, 'accepted')
      if (i === 1) assert.equal(result.value.reused, true)
      if (i === 0) {
        await new Promise(resolve => setImmediate(resolve))
        const next = await ctx.commands.find(agent, 'legion').handler({
          agent, signal, rawInput: `continue ${result.value.task_ref} follow-up New user feedback`,
          attachments: [], commandId: 'candidate-follow-up',
        })
        assert.equal(next.kind, 'success', JSON.stringify(next))
      }
    }
    await fiber.dispose()
  }
  assert.equal(bodies.length, 2)
  for (const body of bodies) {
    assert.deepEqual(body.plan, { team_policy: { candidate_harnesses: ['generic-member'] } })
    assert.equal(body.mode, 'auto')
    assert.equal(body.allow_direct_model, false)
  }
  assert.equal(bodies[0].session_id, bodies[1].session_id)
  assert.notEqual(bodies[0].team_id, bodies[1].team_id)
  assert.equal(bodies[1].question, 'New user feedback')
})

test('missing identity or cancellation is an error; there is no shared or latest-session fallback', async t => {
  const plugin = await loadPlugin()
  const calls = recordClient(t)
  const { ctx, install } = await host(t)
  await install(plugin, isolatedConfig)
  const tool = ctx.tools.get('legion_list')
  await assert.rejects(tool.execute({}, { signal: new AbortController().signal }), /DSH|会话/)
  await assert.rejects(tool.execute({}, { agent: { id: 'current-agent' } }), /signal|取消|AbortSignal/)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(tool.execute({}, { agent: { id: 'current-agent' }, signal: controller.signal }),
    { name: 'AbortError' })
  assert.equal(calls.length, 0)
})

test('official runtime rejects non-JSON output and retains safe client failures as errors', async t => {
  const plugin = await loadPlugin()
  recordClient(t, {
    list: () => ({ notJson: undefined }),
    status: () => { throw new Error('Legion HTTP 401: configure the personal token environment variable') },
  })
  const { ctx, install } = await host(t)
  await install(plugin, isolatedConfig)
  const execution = { agent: { id: 'fixture-agent', ctx }, signal: new AbortController().signal }
  const invalid = await ctx.tools.execute({ ...execution, callId: 'invalid-json', name: 'legion_list', arguments: {} })
  assert.equal(invalid.isError, true)
  assert.ok(!Object.hasOwn(invalid, 'value'))
  const failed = await ctx.tools.execute({
    ...execution, callId: 'client-error', name: 'legion_status', arguments: { task_ref: taskRef },
  })
  assert.equal(failed.isError, true)
  assert.match(failed.content[0].text, /401/)
  assert.ok(!Object.hasOwn(failed, 'value'))
})

test('missing token does not block installation; execution fails before network or state writes', async t => {
  const plugin = await loadPlugin()
  const { ctx, install } = await host(t)
  assert.equal(process.env[isolatedConfig.tokenEnv], undefined, 'This synthetic variable must remain unset')
  await install(plugin, isolatedConfig)
  const result = await ctx.tools.execute({
    name: 'legion_submit', arguments: { key: 'token-setup', query: 'A synthetic task' },
    callId: 'missing-token', agent: { id: 'fixture-agent', ctx }, signal: new AbortController().signal,
  })
  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /DSH_LEGION_PLUGIN_TEST_UNSET_TOKEN/)
  assert.match(result.content[0].text, /environment|环境/)
  assert.equal(globalThis.fetch.mock.callCount(), 0)
})

test('optional commands arrive, unload and return without disposing the client or leaking registrations', async t => {
  const plugin = await loadPlugin()
  const calls = recordClient(t)
  const dispose = t.mock.method(LegionClient.prototype, 'dispose', function () {})
  const { ctx, install } = await host(t)
  const fiber = await install(plugin, isolatedConfig)
  assert.deepEqual(ctx.tools.schemas().map(tool => tool.name).sort(), names)
  assert.equal(ctx.get('commands'), undefined)
  const firstCommands = await install(CommandRuntime)
  await new Promise(resolve => setImmediate(resolve))
  const agent = { id: 'command-agent', ctx }
  assert.deepEqual(ctx.commands.list(agent).map(command => command.name), ['legion'])
  const signal = new AbortController().signal
  const result = await ctx.commands.find(agent, 'legion').handler({
    agent, rawInput: ' list', attachments: [], signal, commandId: 'fixture-command',
  })
  assert.equal(result.kind, 'success')
  assert.equal(calls[0].method, 'list')
  assert.deepEqual(calls[0].args[0], { sessionId: agent.id, signal })
  await firstCommands.dispose()
  assert.equal(dispose.mock.callCount(), 0, 'Losing only the optional command service must not dispose tool work')
  assert.equal(ctx.tools.schemas().length, 7)
  await install(CommandRuntime)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(ctx.commands.list(agent).length, 1)
  await fiber.dispose()
  assert.equal(ctx.commands.list(agent).length, 0)
  assert.equal(ctx.tools.schemas().length, 0)
  assert.equal(dispose.mock.callCount(), 1)
})

test('unload aborts this plugin wait and disposes once, without cancelling remote tasks or caller signal', async t => {
  const plugin = await loadPlugin()
  const started = Promise.withResolvers()
  let client
  t.mock.method(LegionClient.prototype, 'submit', function () {
    client = this
    started.resolve()
    return new Promise((resolve, reject) => {
      this.lifecycleSignal.addEventListener('abort', () => reject(this.lifecycleSignal.reason), { once: true })
    })
  })
  const realDispose = LegionClient.prototype.dispose
  const disposed = t.mock.method(LegionClient.prototype, 'dispose', function () { return realDispose.call(this) })
  const cancelled = t.mock.method(LegionClient.prototype, 'cancel', async () => assert.fail('No remote cancel on unload'))
  const { ctx, install } = await host(t, { commands: true })
  const fiber = await install(plugin, isolatedConfig)
  const controller = new AbortController()
  const waiting = ctx.tools.execute({
    callId: 'waiting', name: 'legion_submit', arguments: { key: 'waiting', query: 'Synthetic waiting call' },
    agent: { id: 'fixture-agent', ctx }, signal: controller.signal,
  })
  await started.promise
  assert.equal(client.lifecycleSignal.aborted, false)
  await fiber.dispose()
  const result = await waiting
  assert.equal(result.isError, true)
  assert.equal(client.lifecycleSignal.aborted, true)
  assert.equal(controller.signal.aborted, false)
  assert.equal(disposed.mock.callCount(), 1)
  assert.equal(cancelled.mock.callCount(), 0)
  await fiber.dispose()
  assert.equal(disposed.mock.callCount(), 1)
  assert.equal(ctx.tools.schemas().length, 0)
  assert.equal(ctx.commands.list({ id: 'fixture-agent', ctx }).length, 0)
})

test('the same native host can unload and reinstall the plugin with a fresh client and no duplicate tools or commands', async t => {
  const plugin = await loadPlugin()
  const calls = recordClient(t)
  const realDispose = LegionClient.prototype.dispose
  const disposed = t.mock.method(LegionClient.prototype, 'dispose', function () { return realDispose.call(this) })
  const { ctx, install } = await host(t, { commands: true })
  const agent = { id: 'reinstall-agent', ctx }
  const clients = []
  for (let round = 0; round < 2; round++) {
    const fiber = await install(plugin, isolatedConfig)
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(ctx.tools.schemas().map(tool => tool.name).sort(), names)
    assert.deepEqual(ctx.commands.list(agent).map(command => command.name), ['legion'])
    const result = await ctx.tools.execute({
      name: 'legion_list', arguments: {}, callId: `reinstall-${round}`,
      agent, signal: new AbortController().signal,
    })
    assert.equal(result.isError, false)
    const client = calls.at(-1).client
    clients.push(client)
    assert.equal(client.lifecycleSignal.aborted, false)
    assert.equal(client.controller.signal.aborted, false)
    await fiber.dispose()
    assert.equal(client.lifecycleSignal.aborted, true)
    assert.equal(client.controller.signal.aborted, true)
    assert.equal(ctx.tools.schemas().length, 0)
    assert.equal(ctx.commands.list(agent).length, 0)
    assert.equal(disposed.mock.callCount(), round + 1)
  }
  assert.notEqual(clients[0], clients[1])
  assert.deepEqual(calls.map(call => call.method), ['list', 'list'])
  assert.equal(globalThis.fetch.mock.callCount(), 0)
})

test('real client sanitization keeps a synthetic HTTP token echo out of native tools and commands', async t => {
  const plugin = await loadPlugin()
  const syntheticToken = 'fixture-only-legion-secret'
  const syntheticBearer = 'fixture-only-other-bearer'
  const memoryClient = new LegionClient(isolatedConfig, { [isolatedConfig.tokenEnv]: syntheticToken })
  t.after(() => memoryClient.dispose())
  t.mock.method(memoryClient.store, 'get', async (sessionId, id) => {
    assert.equal(sessionId, 'error-agent')
    assert.equal(id, taskRef)
    return { id, team_id: 'synthetic-team' }
  })
  const realCancel = LegionClient.prototype.cancel
  t.mock.method(LegionClient.prototype, 'cancel', function (args, execution) {
    return realCancel.call(memoryClient, args, execution)
  })
  const { ctx, install } = await host(t, { commands: true })
  // An in-memory Response only: no HTTP fixture, real credentials or state writes.
  globalThis.fetch.mock.mockImplementation(async () => Response.json({
    reason: `Refused ${syntheticToken}; Authorization: Bearer ${syntheticBearer}`,
  }, { status: 403 }))
  await install(plugin, isolatedConfig)
  await new Promise(resolve => setImmediate(resolve))
  const agent = { id: 'error-agent', ctx }
  const signal = new AbortController().signal
  const toolResult = await ctx.tools.execute({
    name: 'legion_cancel', arguments: { task_ref: taskRef }, callId: 'safe-http-error', agent, signal,
  })
  assert.equal(toolResult.isError, true)
  const commandResult = await ctx.commands.find(agent, 'legion').handler({
    agent, signal, rawInput: `cancel ${taskRef}`, attachments: [], commandId: 'safe-command-error',
  })
  assert.equal(commandResult.kind, 'error')
  for (const text of [JSON.stringify(toolResult), JSON.stringify(commandResult)]) {
    assert.match(text, /403/)
    assert.match(text, /\[redacted\]/)
    assert.ok(!text.includes(syntheticToken))
    assert.ok(!text.includes(syntheticBearer))
  }
  assert.equal(globalThis.fetch.mock.callCount(), 2)
})

test('malformed operator binding is a safe error in the native tool and command paths', async t => {
  const plugin = await loadPlugin()
  const stateDirectory = await mkdtemp(join(tmpdir(), 'legion-native-binding-'))
  t.after(() => rm(stateDirectory, { recursive: true, force: true }))
  const projectBindingFile = join(stateDirectory, 'malformed.json')
  await writeFile(projectBindingFile, 'synthetic-private-fragment-not-valid-json', { mode: 0o600 })
  const realSubmit = LegionClient.prototype.submit
  const client = new LegionClient({ ...isolatedConfig, stateDirectory, projectBindingFile },
    { [isolatedConfig.tokenEnv]: 'synthetic-configured-token' })
  t.after(() => client.dispose())
  t.mock.method(LegionClient.prototype, 'submit', function (args, execution) {
    return realSubmit.call(client, args, execution)
  })
  const { ctx, install } = await host(t, { commands: true })
  await install(plugin, isolatedConfig)
  await new Promise(resolve => setImmediate(resolve))
  const agent = { id: 'safe-binding-agent', ctx }
  const signal = new AbortController().signal
  const tool = await ctx.tools.execute({
    name: 'legion_submit', arguments: { key: 'binding-test', query: 'Synthetic test' },
    callId: 'binding-tool', agent, signal,
  })
  const command = await ctx.commands.find(agent, 'legion').handler({
    agent, signal, rawInput: 'start binding-test Synthetic test', attachments: [],
    commandId: 'binding-command',
  })
  assert.equal(tool.isError, true)
  assert.equal(command.kind, 'error')
  for (const result of [tool, command]) {
    assert.match(JSON.stringify(result), /Project binding file is not valid JSON/)
    assert.doesNotMatch(JSON.stringify(result), /synthetic-private|Unexpected token/)
  }
  assert.equal(globalThis.fetch.mock.callCount(), 0)
})
