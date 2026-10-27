import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { defineTool, ToolRuntime } from '@deepseek-ai/dsh-tools'
import { HarnessError } from '@deepseek-ai/dsh-llm'
import { createScope } from '@deepseek-ai/dsh-scope'
import { registerEcosystem } from '../lib/extension.js'
import { GitHubSources } from '../lib/sources.js'

const REPOSITORY = 'octocat/source-fixture'
const COMMIT = 'a'.repeat(40)
const RATE_HEADERS = {
  'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '0', 'x-ratelimit-used': '60',
  'x-ratelimit-reset': '1793118000', 'x-ratelimit-resource': 'core', 'retry-after': '120',
}
const RATE = { limit: 60, remaining: 0, used: 60, reset_epoch_seconds: 1793118000, resource: 'core' }
const DIAGNOSTICS = '\nSource diagnostics: '
const modelText = result => result.content.filter(block => block.type === 'text').map(block => block.text).join('\n')
const diagnostics = result => JSON.parse(modelText(result).split(DIAGNOSTICS)[1])

async function runtime(t, fetchImpl, config = {}) {
  const requests = []
  // Only the transport is replaced. Registration, validation, native guards,
  // failure normalization and tools/result all run through the real rc.2 runtime.
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(new URL(url).origin, 'https://api.github.com')
    requests.push({ url, init })
    return fetchImpl(url, init)
  })
  const ctx = new Context()
  const prompt = ctx.plugin(SystemPrompt, { includeHarnessIdentity: false })
  await prompt
  const tools = ctx.plugin(ToolRuntime, { mode: 'native' })
  await tools
  const agent = { id: 'source-error-test' }
  let scope
  const owner = ctx.inject(['tools'], injected => { scope = createScope(injected, agent) })
  await owner
  agent.ctx = scope.ctx
  const cancellation = new AbortController()
  const lifecycle = new AbortController()
  registerEcosystem(ctx, {}, config, lifecycle.signal)
  t.after(async () => { await scope.dispose(); await owner.dispose(); await tools.dispose(); await prompt.dispose() })
  let callId = 0
  const call = (args = {}, overrides = {}) => ctx.tools.execute({
    name: 'legion_source', arguments: { action: 'inspect', repository: REPOSITORY, ...args },
    agent, signal: cancellation.signal, callId: `source-error-${++callId}`, ...overrides,
  })
  return { ctx, agent, call, cancellation, lifecycle, requests }
}

test('native legion_source HTTP403 retains safe reset facts in the failed model-facing result', async t => {
  const f = await runtime(t, () => new Response('<html>Bearer BODY_SECRET private reasoning</html>', {
    status: 403, headers: { ...RATE_HEADERS, location: 'https://user:HEADER_SECRET@private.invalid/' },
  }))
  let observed
  f.ctx.on('tools/result', (_exec, result) => { observed = result })
  const result = await f.call()
  assert.equal(result.isError, true)
  assert.equal(Object.hasOwn(result, 'value'), false, 'A source failure must not become a successful JSON value')
  assert.match(modelText(result), /"reset_epoch_seconds":1793118000/)
  assert.deepEqual(result.error.info, { name: 'GitHubSourceError', code: 'HTTP_ERROR' })
  assert.deepEqual(diagnostics(result), {
    name: 'GitHubSourceError', code: 'HTTP_ERROR', trust: 'untrusted_source',
    message: 'GitHub HTTP 403; check rate limits and retry only after the indicated reset',
    status: 403, rate_limit: RATE, retry_after_seconds: 120, retryable: true,
  })
  assert.equal(observed, result, 'The durable result observer must see the same failed outcome')
  assert.doesNotMatch(JSON.stringify(result), /BODY_SECRET|HEADER_SECRET|private reasoning|private\.invalid|<html>/)
  assert.ok(modelText(result).length < 2000, 'Diagnostics stay small enough for the normal inline tool result')
  assert.equal(f.requests.length, 1, 'No automatic rate-limit retry or fallback request')
  assert.equal(f.requests[0].init.credentials, 'omit')
  assert.equal(f.requests[0].init.redirect, 'manual')
  assert.equal(Object.hasOwn(f.requests[0].init.headers, 'Authorization'), false)
})

for (const [status, retryable] of [[403, false], [404, false], [422, false], [429, true], [503, true]]) {
  test(`native source read HTTP${status} preserves failure without inventing a missing reset`, async t => {
    const f = await runtime(t, () => new Response('RESPONSE_SECRET', { status }))
    const result = await f.call({ action: 'read', commit: COMMIT, path: 'src/main.js' })
    assert.equal(result.isError, true)
    assert.equal(Object.hasOwn(result, 'value'), false)
    assert.equal(result.error.info.code, 'HTTP_ERROR')
    const facts = diagnostics(result)
    assert.equal(facts.status, status)
    assert.equal(facts.retryable, retryable)
    assert.equal(facts.retry_after_seconds, null)
    assert.deepEqual(facts.rate_limit, {
      limit: null, remaining: null, used: null, reset_epoch_seconds: null, resource: null,
    })
    assert.doesNotMatch(JSON.stringify(result), /RESPONSE_SECRET/)
    assert.equal(f.requests.length, 1)
  })
}

test('native error text rejects hostile header values and preserves valid rate and retry facts', async t => {
  const f = await runtime(t, () => new Response('BODY_SECRET', {
    status: 429, headers: {
      'x-ratelimit-limit': '9007199254740992', 'x-ratelimit-remaining': '-1',
      'x-ratelimit-used': 'Bearer HEADER_SECRET', 'x-ratelimit-reset': '1793118000',
      'x-ratelimit-resource': 'https://user:URL_SECRET@private.invalid/',
      'retry-after': '60', 'set-cookie': 'session=COOKIE_SECRET',
    },
  }))
  const result = await f.call()
  const facts = diagnostics(result)
  assert.equal(result.isError, true)
  assert.deepEqual(facts.rate_limit, {
    limit: null, remaining: null, used: null, reset_epoch_seconds: 1793118000, resource: null,
  })
  assert.equal(facts.retry_after_seconds, 60)
  assert.equal(facts.retryable, true)
  assert.doesNotMatch(JSON.stringify(result), /SECRET|private\.invalid/)
  assert.equal(f.requests.length, 1)
})

test('native transport failure exposes only local diagnostics and does not imply an HTTP status', async t => {
  const f = await runtime(t, () => { throw new Error('https://user:NETWORK_SECRET@private.invalid/ raw reasoning') })
  const result = await f.call()
  assert.equal(result.isError, true)
  assert.deepEqual(result.error.info, { name: 'GitHubSourceError', code: 'NETWORK_ERROR' })
  const facts = diagnostics(result)
  assert.equal(facts.retryable, true)
  assert.equal(Object.hasOwn(facts, 'status'), false)
  assert.equal(Object.hasOwn(facts, 'rate_limit'), false)
  assert.doesNotMatch(JSON.stringify(result), /NETWORK_SECRET|private\.invalid|raw reasoning/)
  assert.equal(f.requests.length, 1)
})

test('native timeout retains its class and retryability without retrying the request', async t => {
  const f = await runtime(t, () => new Promise(() => {}), { requestTimeoutMs: 10 })
  const result = await f.call()
  assert.equal(result.isError, true)
  assert.deepEqual(result.error.info, { name: 'TimeoutError', code: 'TIMED_OUT' })
  assert.equal(diagnostics(result).retryable, true)
  assert.equal(f.requests.length, 1)
  assert.equal(f.requests[0].init.signal.aborted, true)
})

test('native pre-dispatch cancellation is not rewritten as a source error and never fetches', async t => {
  const f = await runtime(t, () => assert.fail('Cancelled work must not reach transport'))
  f.cancellation.abort(new Error('CANCEL_SECRET'))
  const result = await f.call()
  assert.equal(result.isError, true)
  assert.equal(result.error.info.code, 'ABORTED_BEFORE_DISPATCH')
  assert.doesNotMatch(JSON.stringify(result), /CANCEL_SECRET|Source diagnostics/)
  assert.equal(f.requests.length, 0)
})

for (const kind of ['cancellation', 'lifecycle']) {
  test(`source ${kind} abort during transport keeps cancellation and never leaks the reason or retries`, async t => {
    const f = await runtime(t, () => {
      f[kind].abort(new Error('ABORT_SECRET'))
      return new Promise(() => {})
    })
    const result = await f.call()
    assert.equal(result.isError, true)
    assert.match(result.error.message, /cancelled/)
    assert.doesNotMatch(JSON.stringify(result), /ABORT_SECRET|Source diagnostics/)
    assert.equal(f.requests.length, 1)
    assert.equal(f.requests[0].init.signal.aborted, true)
  })
}

test('native guard denial is authoritative and never reaches source transport', async t => {
  const f = await runtime(t, () => assert.fail('A native guard must not be bypassed'))
  f.ctx.tools.guard(() => 'native-policy-denied')
  const result = await f.call()
  assert.equal(result.isError, true)
  assert.equal(modelText(result), 'Error: native-policy-denied')
  assert.equal(f.requests.length, 0)
})

test('native agent visibility restrictions are not converted to GitHub failures', async t => {
  const f = await runtime(t, () => assert.fail('A hidden tool must not execute'))
  f.agent.ctx.tools.restrict({ deny: ['legion_source'] })
  const result = await f.call()
  assert.equal(result.isError, true)
  assert.equal(result.error.info.code, 'UNKNOWN_TOOL')
  assert.doesNotMatch(modelText(result), /Source diagnostics/)
  assert.equal(f.requests.length, 0)
})

test('a missing agent and invalid native tool arguments fail before source access', async t => {
  const f = await runtime(t, () => assert.fail('Invalid execution must not execute'))
  const agentless = await f.call({}, { agent: undefined })
  assert.equal(agentless.isError, true)
  assert.match(agentless.error.message, /会话/)
  const invalid = await f.call({ action: 'unsupported' })
  assert.equal(invalid.isError, true)
  assert.doesNotMatch(modelText(invalid), /Source diagnostics/)
  assert.equal(f.requests.length, 0)
})

test('only real source failures are translated; an unrelated exception is left to the native channel', async t => {
  const f = await runtime(t, () => assert.fail('No request is expected'))
  t.mock.method(GitHubSources.prototype, 'inspect', async () => { throw new Error('ordinary local error') })
  const result = await f.call()
  assert.equal(result.isError, true)
  assert.equal(modelText(result), 'Error: ordinary local error')
  assert.equal(result.error.info, undefined)
  assert.equal(f.requests.length, 0)
})

test('native post-execute blocking can replace source diagnostics without a finalizer restoring them', async t => {
  const f = await runtime(t, () => new Response(null, { status: 403, headers: RATE_HEADERS }))
  f.ctx.on('tools/post-execute', async () => ({
    kind: 'block', feedback: [{ type: 'text', text: 'source output withheld by native policy' }],
  }))
  const result = await f.call()
  assert.equal(result.isError, true)
  assert.equal(modelText(result), 'source output withheld by native policy')
  assert.doesNotMatch(JSON.stringify(result), /HTTP_ERROR|reset_epoch_seconds|Source diagnostics/)
  assert.equal(f.requests.length, 1)
})

const BUNDLE_DIRECTORY = fileURLToPath(new URL('../.qa/bundle-source-error-fixture', import.meta.url))
const TREE = 'b'.repeat(40)
const BLOB = 'c'.repeat(40)
const PREFIX = `/repos/${REPOSITORY}`

function bundleArguments(overrides = {}) {
  return {
    directory: BUNDLE_DIRECTORY,
    spec: {
      package_name: 'dsh-plugin-bundle-error-fixture', version: '1.0.0', description: 'Bundle error fixture',
      plugins: [{ id: 'sample', title: 'Sample', description: 'An adapted fixture', entry: 'index.js' }],
      files: [{ path: 'index.js', content: 'export function apply() {}\n' }],
    },
    source_refs: [{ repository: REPOSITORY, ref: COMMIT }],
    ...overrides,
  }
}

const callBundle = (f, args = {}) => f.call({}, {
  name: 'legion_bundle', arguments: bundleArguments(args),
})

// A bounded public snapshot without optional previews. The extra source read
// reaches the blob endpoint only in the rate-limit test; no code is executed.
function bundleSourceResponse(rawUrl) {
  const { pathname } = new URL(rawUrl)
  if (pathname === PREFIX) {
    return Response.json({ private: false, full_name: REPOSITORY, default_branch: 'main' })
  }
  if (pathname === `${PREFIX}/commits/${COMMIT}`) {
    return Response.json({ sha: COMMIT, commit: { tree: { sha: TREE } } })
  }
  if (pathname === `${PREFIX}/git/trees/${TREE}`) {
    return Response.json({
      sha: TREE, truncated: false,
      tree: [{ path: 'module.js', type: 'blob', mode: '100644', sha: BLOB, size: 24 }],
    })
  }
  if (pathname === `${PREFIX}/license`) return new Response(null, { status: 404 })
  assert.fail(`Unexpected in-memory source route: ${pathname}`)
}

function nativeWriteFixture(f, execute = () => ({ written: true })) {
  const writes = []
  f.ctx.tools.register(defineTool({
    name: 'write', description: 'In-memory native write fixture',
    parameters: {
      file_path: { type: 'string', required: true },
      content: { type: 'string', required: true },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      writes.push(args)
      return execute(args, exec, writes.length)
    },
  }))
  return writes
}

function observeBundleThrow(t, f) {
  const definition = f.ctx.tools.get('legion_bundle', f.agent)
  const execute = definition.execute
  const observed = {}
  // Observe the body boundary without bypassing native dispatch or guards.
  t.mock.method(definition, 'execute', async function (args, exec) {
    try { return await execute.call(this, args, exec) } catch (error) {
      observed.error = error
      throw error
    }
  })
  return observed
}

for (const entry of [
  { stage: 'inspect', status: 403, pathname: PREFIX, requests: 1, args: {} },
  {
    stage: 'extra read', status: 429, pathname: `${PREFIX}/git/blobs/${BLOB}`, requests: 8,
    args: { source_refs: [{ repository: REPOSITORY, ref: COMMIT, paths: ['module.js'] }] },
  },
  {
    stage: 'later source', status: 403, pathname: '/repos/octocat/later-fixture', requests: 5,
    args: { source_refs: [
      { repository: REPOSITORY, ref: COMMIT }, { repository: 'octocat/later-fixture', ref: COMMIT },
    ] },
  },
]) {
  test(`native legion_bundle ${entry.stage} HTTP${entry.status} retains safe diagnostics before any write`, async t => {
    const f = await runtime(t, url => new URL(url).pathname === entry.pathname
      ? new Response('<html>Bearer BUNDLE_BODY_SECRET</html>', {
        status: entry.status, headers: { ...RATE_HEADERS, 'set-cookie': 'session=BUNDLE_HEADER_SECRET' },
      })
      : bundleSourceResponse(url))
    const writes = nativeWriteFixture(f)
    let observed
    f.ctx.on('tools/result', (exec, result) => { if (exec.name === 'legion_bundle') observed = result })
    const result = await callBundle(f, entry.args)
    assert.equal(result.isError, true)
    assert.equal(Object.hasOwn(result, 'value'), false)
    assert.equal(observed, result)
    assert.equal(writes.length, 0, 'A source failure must stop this bundle before native writes')
    assert.equal(f.requests.length, entry.requests, 'No retry or later source request after failure')
    assert.match(modelText(result), /"reset_epoch_seconds":1793118000/)
    assert.deepEqual(result.error.info, { name: 'GitHubSourceError', code: 'HTTP_ERROR' })
    const facts = diagnostics(result)
    assert.equal(facts.status, entry.status)
    assert.deepEqual(facts.rate_limit, RATE)
    assert.equal(facts.retry_after_seconds, 120)
    assert.equal(facts.retryable, true)
    assert.doesNotMatch(JSON.stringify(result), /BUNDLE_BODY_SECRET|BUNDLE_HEADER_SECRET|<html>/)
  })
}

for (const kind of ['cancellation', 'lifecycle']) {
  test(`native legion_bundle ${kind} abort preserves the original source cancellation object`, async t => {
    const f = await runtime(t, () => {
      f[kind].abort(new Error('BUNDLE_ABORT_SECRET'))
      return new Promise(() => {})
    })
    const writes = nativeWriteFixture(f)
    const observed = observeBundleThrow(t, f)
    const inspect = GitHubSources.prototype.inspect
    let originalError
    t.mock.method(GitHubSources.prototype, 'inspect', async function (...args) {
      try { return await inspect.apply(this, args) } catch (error) {
        originalError = error
        throw error
      }
    })
    const result = await callBundle(f)
    assert.equal(result.isError, true)
    assert.equal(Object.hasOwn(result, 'value'), false)
    assert.equal(originalError.code, 'ABORTED')
    assert.equal(originalError.name, 'AbortError')
    assert.equal(observed.error, originalError, 'The typed catch must rethrow cancellation unchanged')
    assert.doesNotMatch(JSON.stringify(result), /BUNDLE_ABORT_SECRET|Source diagnostics/)
    assert.equal(f.requests.length, 1)
    assert.equal(f.requests[0].init.signal.aborted, true)
    assert.equal(writes.length, 0)
  })
}

for (const typed of [false, true]) {
  test(`native legion_bundle preserves ${typed ? 'HarnessError' : 'lookalike Error'} identity without source relabeling`, async t => {
    const f = await runtime(t, () => assert.fail('No source request is expected'))
    const writes = nativeWriteFixture(f)
    const observed = observeBundleThrow(t, f)
    const originalError = typed
      ? new HarnessError('local native refusal', 'NATIVE_DENIED')
      : Object.assign(new Error('ordinary local failure'), { code: 'HTTP_ERROR', status: 403 })
    t.mock.method(GitHubSources.prototype, 'inspect', async () => { throw originalError })
    const result = await callBundle(f)
    assert.equal(observed.error, originalError, 'Unrelated exceptions must retain object identity')
    assert.equal(result.isError, true)
    assert.equal(result.error.message, originalError.message)
    assert.deepEqual(result.error.info, typed ? { name: 'HarnessError', code: 'NATIVE_DENIED' } : undefined)
    assert.doesNotMatch(modelText(result), /Source diagnostics/)
    assert.equal(f.requests.length, 0)
    assert.equal(writes.length, 0)
  })
}

for (const kind of ['guard', 'tool']) {
  test(`native legion_bundle native write ${kind} failure keeps the existing partial-write error`, async t => {
    const f = await runtime(t, bundleSourceResponse)
    const nativeError = new HarnessError('native write fixture refused', 'WRITE_DENIED')
    const writes = nativeWriteFixture(f, (_args, _exec, count) => {
      if (kind === 'tool' && count === 2) throw nativeError
      return { written: true }
    })
    let guardedWrites = 0
    if (kind === 'guard') f.ctx.tools.guard(exec => {
      if (exec.name === 'write' && ++guardedWrites === 2) return 'native write fixture refused'
    })
    const results = []
    f.ctx.on('tools/result', (exec, result) => { results.push({ name: exec.name, result }) })
    const observed = observeBundleThrow(t, f)
    const result = await callBundle(f)
    assert.equal(result.isError, true)
    assert.equal(Object.hasOwn(result, 'value'), false)
    assert.equal(observed.error.constructor, Error, 'Keep writeBundle’s existing error type')
    assert.equal(result.error.message, observed.error.message)
    assert.equal(result.error.info, undefined, 'Do not relabel native write failure as GitHubSourceError')
    assert.match(modelText(result), /Native write failed: native write fixture refused/)
    assert.match(modelText(result), /Already written \(not rolled back\):/)
    assert.ok(modelText(result).includes(writes[0].file_path), 'Retain the first completed write in the failure')
    assert.doesNotMatch(modelText(result), /Source diagnostics/)
    assert.equal(writes.length, kind === 'guard' ? 1 : 2)
    const childResults = results.filter(entry => entry.name === 'write').map(entry => entry.result)
    assert.equal(childResults.length, 2)
    assert.equal(childResults[0].isError, false)
    assert.equal(childResults[1].isError, true)
    if (kind === 'tool') assert.deepEqual(childResults[1].error.info, { name: 'HarnessError', code: 'WRITE_DENIED' })
    assert.ok(results.every(entry => ['write', 'legion_bundle'].includes(entry.name)), 'No installation dispatch')
    assert.equal(f.requests.length, 4)
  })
}

test('native legion_bundle keeps nonfatal partial provenance without inventing a quality gate', async t => {
  const f = await runtime(t, url => new URL(url).pathname === `${PREFIX}/license`
    ? new Response('LICENSE_RESPONSE_SECRET', { status: 503 })
    : bundleSourceResponse(url))
  const writes = nativeWriteFixture(f)
  const result = await callBundle(f)
  assert.equal(result.isError, false)
  assert.equal(result.value.state, 'written_not_installed')
  assert.equal(result.value.execution_verified, false)
  const provenance = writes.find(file => file.file_path.endsWith('/provenance.json'))
  assert.ok(provenance)
  const [source] = JSON.parse(provenance.content)
  assert.equal(source.status, 'partial')
  assert.equal(source.license_assessment, 'not_performed')
  assert.equal(source.license.status, 'unavailable')
  assert.equal(source.errors[0].status, 503)
  assert.doesNotMatch(provenance.content, /LICENSE_RESPONSE_SECRET/)
  assert.equal(f.requests.length, 4)
})
