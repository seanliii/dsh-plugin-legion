import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LegionClient } from '../lib/client.js'
import { executeLegionCommand, formatLegionResult } from '../lib/commands.js'
import { fixture } from './fixture.js'

// All credentials and URLs below are synthetic, not copied from a live service.
async function setup(t) {
  const server = await fixture(t)
  const stateDirectory = await mkdtemp(join(tmpdir(), 'legion-redaction-'))
  t.after(() => rm(stateDirectory, { recursive: true, force: true }))
  const config = { baseUrl: server.baseUrl, stateDirectory, tokenEnv: 'TEST_TOKEN' }
  const client = new LegionClient(config, { TEST_TOKEN: 'fixture-token' })
  t.after(() => client.dispose())
  const execution = { sessionId: 'synthetic-redaction-session', signal: new AbortController().signal }
  const start = await client.submit({ key: 'original', query: 'Synthetic privacy boundary test' }, execution)
  return { server, client, config, execution, start, stateDirectory,
    status: () => client.status({ task_ref: start.task_ref }, execution) }
}

test('authoritative task identifiers cannot bypass credential redaction', async t => {
  const f = await setup(t)
  f.server.teams.get(f.start.team_id).tasks = {
    'author-fixture-token': { status: 'error', result: { error: 'synthetic execution failure' } },
  }
  const result = await f.status()
  assert.ok(!JSON.stringify(result).includes('fixture-token'))
  assert.ok(!formatLegionResult('status', result).includes('fixture-token'))
  assert.equal(result.runtime.tasks[0].task_id, 'author-[redacted]')
})

test('object keys and omission or depth diagnostics cannot echo credentials', async t => {
  const f = await setup(t)
  const projection = { omitted_fields: [], truncated_fields: [] }
  const input = { 'detail-fixture-token': { authorization: 'fixture-token' }, ordinary: 'kept' }
  const clean = f.client.clean(input, projection)
  f.client.clean({ nested: true }, projection, '$.fixture-token', 13)
  assert.ok(!JSON.stringify({ clean, projection }).includes('fixture-token'))
  assert.equal(clean.ordinary, 'kept')
  assert.ok(projection.omitted_fields.length > 0, 'sensitive keys are omitted, not silently merged')
  assert.ok(projection.truncated_fields.length > 0)
})

test('ordinary URL fields and prose redact sensitive query parameters, including encoded names', async t => {
  const f = await setup(t)
  const projection = { omitted_fields: [], truncated_fields: [] }
  const input = {
    url: 'https://service.invalid/view?share=synthetic-capability&view=compact',
    text: 'See /view?%73hare=synthetic-encoded-capability#section and https://service.invalid/?access_token=synthetic-access',
    nested: ['https://service.invalid/#share=synthetic-fragment', 'https://service.invalid/?q=public-search'],
  }
  const clean = f.client.clean(input, projection)
  for (const value of ['synthetic-capability', 'synthetic-encoded-capability', 'synthetic-access', 'synthetic-fragment']) {
    assert.ok(!JSON.stringify(clean).includes(value))
  }
  assert.match(clean.url, /view=compact/)
  assert.equal(clean.nested[1], input.nested[1], 'ordinary public research URLs remain usable')
})

test('status sanitizes capability URLs before both structured and human results', async t => {
  const f = await setup(t)
  f.server.teams.get(f.start.team_id).events.push({
    event_id: 2, event: 'final', data: {
      session: { url: 'https://service.invalid/view?share=synthetic-capability' },
      error: 'Visit https://service.invalid/view?share=synthetic-error-capability for details',
    },
  })
  const result = await f.status()
  assert.ok(!JSON.stringify(result).includes('synthetic-capability'))
  assert.ok(!formatLegionResult('status', result).includes('synthetic-error-capability'))
})

test('malformed operator binding JSON never echoes a content fragment', async t => {
  const f = await setup(t)
  const projectBindingFile = join(f.stateDirectory, 'binding.json')
  await writeFile(projectBindingFile, 'synthetic-private-fragment-this-is-not-json', { mode: 0o600 })
  const client = new LegionClient({ ...f.config, projectBindingFile }, { TEST_TOKEN: 'fixture-token' })
  t.after(() => client.dispose())
  await assert.rejects(client.projectBinding(), /^Error: Project binding file is not valid JSON$/)
  const result = await executeLegionCommand(client, {
    rawInput: 'start binding-check Synthetic test', agent: { id: f.execution.sessionId }, signal: f.execution.signal,
  })
  assert.equal(result.kind, 'error')
  assert.doesNotMatch(result.text, /synthetic-private|Unexpected token/)
  assert.equal(f.server.requests.filter(x => x.path.endsWith('/dispatch')).length, 1)
})

test('malformed service JSON reports its source, not its body', async t => {
  const f = await setup(t)
  t.mock.method(globalThis, 'fetch', async () => new Response('synthetic-response-secret-not-json', {
    headers: { 'Content-Type': 'application/json' },
  }))
  await assert.rejects(f.status(), /^Error: Legion response is not valid JSON$/)
})

test('corrupt persisted JSON errors expose no source snippets', async t => {
  const f = await setup(t)
  await writeFile(join(f.stateDirectory, f.start.task_ref, 'ref.json'), 'synthetic-private-state-not-json')
  await assert.rejects(f.status(), /^Error: Saved Legion data is not valid JSON$/)
  await assert.rejects(f.client.list(f.execution), /^Error: Saved Legion data is not valid JSON$/)
})
