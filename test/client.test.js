import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fixture } from './fixture.js'

async function setup(t, options = {}) {
  const module = await import('../lib/client.js').catch(() => ({}))
  assert.equal(typeof module.LegionClient, 'function', 'LegionClient must exist')
  const server = await fixture(t, options)
  const stateDirectory = await mkdtemp(join(tmpdir(), 'legion-client-test-'))
  t.after(() => rm(stateDirectory, { recursive: true, force: true }))
  const config = { baseUrl: server.baseUrl, stateDirectory, tokenEnv: 'FIXTURE_TOKEN', requestTimeoutMs: 2000 }
  const env = { FIXTURE_TOKEN: 'fixture-token' }
  const client = new module.LegionClient(config, env)
  return { client, server, config, env, LegionClient: module.LegionClient, stateDirectory }
}
const execution = () => ({ sessionId: 'dsh-session-A', signal: new AbortController().signal })

test('submission persists identity, sends through whole-Legion dispatch, and never repeats a task key', async t => {
  const { client, server } = await setup(t)
  const args = { key: 'draft', query: 'Write the original task', context: 'Audience: developers' }
  const first = await client.submit(args, execution())
  assert.equal(first.submission, 'accepted')
  assert.match(first.task_ref, /^[a-f0-9]{32}$/)
  const second = await client.submit(args, execution())
  assert.equal(second.task_ref, first.task_ref)
  assert.equal(second.reused, true)
  const posts = server.requests.filter(x => x.path === '/api/legion/dispatch')
  assert.equal(posts.length, 1)
  assert.equal(posts[0].body.mode, 'auto')
  assert.equal(posts[0].body.allow_direct_model, false)
  assert.ok(posts[0].body.question.includes('Write the original task'))
  assert.ok(posts[0].body.question.includes('Audience: developers'))
  assert.ok(!('uid' in posts[0].body))
  assert.ok(!('project_context' in posts[0].body))
  assert.ok(!('plan' in posts[0].body))
})

test('user-configured candidates are snapshotted and sent exactly, without changing auto mode', async t => {
  const { server, config, env, LegionClient } = await setup(t)
  const candidateHarnesses = ['generic-member', 'generic-reviewer']
  const client = new LegionClient({ ...config, candidateHarnesses }, env)
  candidateHarnesses.reverse()
  const result = await client.submit({ key: 'selected', query: 'Original task', context: 'Original context' }, execution())
  assert.equal(result.submission, 'accepted')
  const body = server.requests[0].body
  assert.deepEqual(body.plan, { team_policy: { candidate_harnesses: ['generic-member', 'generic-reviewer'] } })
  assert.equal(body.mode, 'auto')
  assert.equal(body.allow_direct_model, false)
  assert.ok(body.question.includes('Original task'))
  assert.ok(body.question.includes('Original context'))
  assert.ok(!Object.hasOwn(body, 'candidateHarnesses'))
})

test('client rejects invalid candidate lists, empty items and duplicates before any request', async t => {
  const { server, config, env, LegionClient } = await setup(t)
  for (const candidateHarnesses of [
    null, 'generic-member', 1, {}, [null], [1], [{}], [''], [' '],
    ['generic member'], [' generic-member'], ['generic/member'], ['generic\nmember'],
    ['generic\u0000member'], ['generic-member', 'generic-member'], new Array(1),
  ]) {
    assert.throws(() => new LegionClient({ ...config, candidateHarnesses }, env), /candidateHarnesses/)
  }
  assert.equal(server.requests.length, 0)
})

test('omitted or empty candidates preserve legacy reservation fingerprints and send no plan', async t => {
  const { client, server, config, env, LegionClient } = await setup(t)
  const args = { key: 'legacy', query: 'Original task' }
  // The pre-option client used SHA-256(JSON.stringify(null)) for an absent project binding.
  const { ref } = await client.store.reserve({
    sessionId: execution().sessionId, ...args,
    bindingDigest: createHash('sha256').update('null').digest('hex'),
  })
  const before = await readFile(join(client.store.path(ref.id), 'ref.json'), 'utf8')
  for (const candidateHarnesses of [undefined, []]) {
    const restored = new LegionClient({ ...config, candidateHarnesses }, env)
    const result = await restored.submit(args, execution())
    assert.equal(result.task_ref, ref.id)
    assert.equal(result.reused, true)
  }
  assert.equal(server.requests.length, 0)
  assert.equal(await readFile(join(client.store.path(ref.id), 'ref.json'), 'utf8'), before)
  const empty = new LegionClient({ ...config, candidateHarnesses: [] }, env)
  await empty.submit({ key: 'empty-candidates', query: 'Another task' }, execution())
  assert.ok(!Object.hasOwn(server.requests[0].body, 'plan'))
})

test('same configured candidates recover a lost acknowledgement without redispatch', async t => {
  const { server, config, env, LegionClient } = await setup(t, { dropDispatch: true })
  const selected = { ...config, candidateHarnesses: ['generic-member'] }
  const args = { key: 'selected-lost-ack', query: 'Original task' }
  const first = await new LegionClient(selected, env).submit(args, execution())
  const restored = await new LegionClient({ ...selected, candidateHarnesses: ['generic-member'] }, env)
    .submit(args, execution())
  assert.equal(first.submission, 'unconfirmed')
  assert.equal(restored.reused, true)
  assert.equal(restored.task_ref, first.task_ref)
  assert.equal(server.requests.length, 1)
  assert.deepEqual(server.requests[0].body.plan, { team_policy: { candidate_harnesses: ['generic-member'] } })
})

test('same task key rejects adding, removing, replacing or reordering configured candidates', async t => {
  const { server, config, env, LegionClient } = await setup(t)
  const changes = [
    [undefined, ['generic-member']], [[], ['generic-member']],
    [['generic-member'], undefined], [['generic-member'], []],
    [['generic-member'], ['generic-reviewer']],
    [['generic-member'], ['generic-member', 'generic-reviewer']],
    [['generic-member', 'generic-reviewer'], ['generic-reviewer', 'generic-member']],
  ]
  for (const [i, [before, after]] of changes.entries()) {
    await t.test(`candidate change ${i + 1}`, async () => {
      const original = new LegionClient({ ...config, candidateHarnesses: before }, env)
      const args = { key: `candidate-change-${i}`, query: 'Same task', context: 'Same context' }
      const first = await original.submit(args, execution())
      const path = join(original.store.path(first.task_ref), 'ref.json')
      const saved = await readFile(path, 'utf8')
      const count = server.requests.length
      const changed = new LegionClient({ ...config, candidateHarnesses: after }, env)
      await assert.rejects(changed.submit(args, execution()), /different input/i)
      assert.equal(server.requests.length, count, 'Reject before any network request')
      assert.equal(await readFile(path, 'utf8'), saved, 'Do not rewrite the old reference')
    })
  }
})

test('a new key may apply configured candidates to a follow-up without changing the original task', async t => {
  const { client, server, config, env, LegionClient } = await setup(t)
  const first = await client.submit({ key: 'original-unselected', query: 'Original task' }, execution())
  const path = join(client.store.path(first.task_ref), 'ref.json')
  const before = await readFile(path, 'utf8')
  const selected = new LegionClient({ ...config, candidateHarnesses: ['generic-member'] }, env)
  const next = await selected.submit({
    key: 'explicit-follow-up', query: 'New user feedback', previous_task_ref: first.task_ref,
  }, execution())
  assert.equal(next.session_id, first.session_id)
  assert.notEqual(next.team_id, first.team_id)
  assert.deepEqual(server.requests[1].body.plan, { team_policy: { candidate_harnesses: ['generic-member'] } })
  assert.ok(!Object.hasOwn(server.requests[0].body, 'plan'))
  assert.equal(await readFile(path, 'utf8'), before)
})

test('configured candidates do not replace the project binding in the body or input fingerprint', async t => {
  const { server, config, env, LegionClient, stateDirectory } = await setup(t)
  const projectBindingFile = join(stateDirectory, 'project.json')
  await writeFile(projectBindingFile, JSON.stringify({ workspace_root: '/fixture/first-project' }))
  const client = new LegionClient({ ...config, projectBindingFile, candidateHarnesses: ['generic-member'] }, env)
  const args = { key: 'project-and-candidates', query: 'Task' }
  await client.submit(args, execution())
  assert.deepEqual(server.requests[0].body.project_context, { workspace_root: '/fixture/first-project' })
  assert.deepEqual(server.requests[0].body.plan, { team_policy: { candidate_harnesses: ['generic-member'] } })
  await writeFile(projectBindingFile, JSON.stringify({ workspace_root: '/fixture/second-project' }))
  await assert.rejects(client.submit(args, execution()), /different input/i)
  assert.equal(server.requests.length, 1)
})

test('submit arguments cannot inject a plan or override user-configured candidates', async t => {
  const { server, config, env, LegionClient } = await setup(t)
  for (const [i, candidateHarnesses] of [undefined, ['generic-member']].entries()) {
    const client = new LegionClient({ ...config, candidateHarnesses }, env)
    const args = {
      key: `untrusted-selection-${i}`, query: 'Task',
      candidateHarnesses: ['injected-member'], candidate_harnesses: ['injected-member'],
      candidates: ['injected-member'],
      plan: { team_policy: { candidate_harnesses: ['injected-member'] } },
      team_policy: { candidate_harnesses: ['injected-member'] }, mode: 'orchestrate',
    }
    await client.submit(args, execution())
    const body = server.requests.at(-1).body
    assert.equal(body.mode, 'auto')
    if (candidateHarnesses) {
      assert.deepEqual(body.plan, { team_policy: { candidate_harnesses: ['generic-member'] } })
    } else assert.ok(!Object.hasOwn(body, 'plan'))
    assert.ok(!Object.hasOwn(body, 'candidateHarnesses'))
    assert.ok(!Object.hasOwn(body, 'candidate_harnesses'))
    assert.ok(!Object.hasOwn(body, 'candidates'))
    assert.ok(!Object.hasOwn(body, 'team_policy'))
    const reused = await client.submit({ key: args.key, query: args.query }, execution())
    assert.equal(reused.reused, true, 'Unknown arguments must not alter the reservation either')
  }
  assert.equal(server.requests.length, 2)
})

test('lost submit response remains uncertain and reconnects without another model call', async t => {
  const { client, server } = await setup(t, { dropDispatch: true })
  const args = { key: 'lost-response', query: 'A task whose ack was lost' }
  const first = await client.submit(args, execution())
  assert.equal(first.submission, 'unconfirmed')
  const second = await client.submit(args, execution())
  assert.equal(second.reused, true)
  const status = await client.status({ task_ref: first.task_ref }, execution())
  assert.equal(status.connection, 'connected')
  assert.equal(status.runtime.tasks[0].status, 'running')
  assert.equal(server.requests.filter(x => x.path === '/api/legion/dispatch').length, 1)
})

test('status distinguishes done from artifacts and retains ordered replay ids', async t => {
  const { client, server } = await setup(t)
  const start = await client.submit({ key: 'plain', query: 'Reply in text' }, execution())
  server.finish(start.team_id)
  const state = await client.status({ task_ref: start.task_ref, after_event_id: 0 }, execution())
  assert.equal(state.runtime.tasks[0].status, 'done')
  assert.equal(state.artifacts.length, 0)
  assert.equal(state.experience_verification, 'not_performed_by_plugin')
  assert.deepEqual(state.events.map(x => x.event_id), [1, 2])
  assert.equal(state.next_event_id, 2)
  const replay = await client.status({ task_ref: start.task_ref, after_event_id: 1 }, execution())
  assert.deepEqual(replay.events.map(x => x.event_id), [2])
})

test('saved task references survive a new client instance and refuse another DSH session', async t => {
  const { client, config, env, LegionClient } = await setup(t)
  const start = await client.submit({ key: 'restore', query: 'Persist me' }, execution())
  const restored = new LegionClient(config, env)
  assert.equal((await restored.list(execution())).tasks[0].task_ref, start.task_ref)
  await assert.rejects(restored.status({ task_ref: start.task_ref }, { ...execution(), sessionId: 'other' }), /session/i)
})

test('message and resume are separate, with duplicate operation keys suppressed', async t => {
  const { client, server } = await setup(t)
  const start = await client.submit({ key: 'feedback', query: 'Original work' }, execution())
  const args = { task_ref: start.task_ref, operation_key: 'feedback-1', recipient: 'author', text: 'Please recheck the actual error.' }
  await client.message(args, execution())
  await client.message(args, execution())
  assert.equal(server.messageCount, 1)
  assert.equal(server.resumeCount, 0)
  const resume = await client.resume({ task_ref: start.task_ref, operation_key: 'resume-1' }, execution())
  assert.equal(resume.server_response.status, 'unchanged')
  await client.resume({ task_ref: start.task_ref, operation_key: 'resume-1' }, execution())
  assert.equal(server.resumeCount, 1)
})

test('cancellation acknowledgement is not presented as proof that execution stopped', async t => {
  const { client } = await setup(t)
  const start = await client.submit({ key: 'cancel', query: 'Work' }, execution())
  const result = await client.cancel({ task_ref: start.task_ref, reason: 'User requested stop' }, execution())
  assert.equal(result.cancellation, 'requested')
  assert.equal(result.stopped_confirmed, false)
  const state = await client.status({ task_ref: start.task_ref }, execution())
  assert.equal(state.runtime.tasks[0].status, 'running')
})

test('artifact download is limited to a server-listed URL and checks exact SHA-256 bytes', async t => {
  const { client, server } = await setup(t)
  const start = await client.submit({ key: 'file', query: 'Make a file' }, execution())
  server.finish(start.team_id, [{ name: 'result.txt', url: '/outputs/result.txt', sha256: server.sha256, bytes: server.bytes.length, team_id: start.team_id }])
  const state = await client.status({ task_ref: start.task_ref }, execution())
  const result = await client.download({ task_ref: start.task_ref, artifact_id: state.artifacts[0].artifact_id }, execution())
  assert.equal(result.integrity, 'sha256_verified')
  assert.equal(result.experience_verification, 'not_performed_by_plugin')
  assert.deepEqual(await readFile(result.local_path), server.bytes)
})

test('hash mismatch never exposes downloaded bytes as a valid result', async t => {
  const { client, server } = await setup(t, { badArtifact: true })
  const start = await client.submit({ key: 'badfile', query: 'File' }, execution())
  server.finish(start.team_id, [{ name: 'result.txt', url: '/outputs/result.txt', sha256: server.sha256, bytes: server.bytes.length }])
  const state = await client.status({ task_ref: start.task_ref }, execution())
  await assert.rejects(client.download({ task_ref: start.task_ref, artifact_id: state.artifacts[0].artifact_id }, execution()), /hash|sha256|integrity/i)
})

test('HTTP auth errors remain errors and redact the configured secret', async t => {
  const { client, env } = await setup(t)
  env.FIXTURE_TOKEN = 'incorrect'
  const result = await client.submit({ key: 'auth', query: 'Task' }, execution()).catch(error => error)
  assert.ok(result instanceof Error)
  assert.match(result.message, /401/)
  assert.ok(!result.message.includes('incorrect'))
})

test('unsafe server schemes and remote plaintext credentials are rejected before network', async () => {
  const { LegionClient } = await import('../lib/client.js')
  for (const baseUrl of ['file:///tmp/service', 'http://remote.example', 'https://name:secret@example.com', 'https://example.com?token=secret']) {
    assert.throws(() => new LegionClient({ baseUrl }), /https|URL|credential|query|scheme/i)
  }
})

test('an already-aborted call never sends a task and redirects do not forward credentials', async t => {
  const { client, server } = await setup(t, { redirect: 'http://127.0.0.1:9/stolen' })
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(client.submit({ key: 'abort', query: 'Task' }, { sessionId: 'A', signal: controller.signal }), { name: 'AbortError' })
  assert.equal(server.requests.length, 0)
  const result = await client.submit({ key: 'redirect', query: 'Task' }, execution())
  assert.equal(result.submission, 'unconfirmed')
  assert.equal(server.requests.length, 1)
})

test('follow-up submits a new turn in the original conversation, not an empty fresh project', async t => {
  const { client, server } = await setup(t)
  const first = await client.submit({ key: 'first', query: 'Original work' }, execution())
  server.finish(first.team_id)
  const next = await client.submit({ key: 'revision', query: 'Revise the original work', previous_task_ref: first.task_ref }, execution())
  const requests = server.requests.filter(x => x.path === '/api/legion/dispatch')
  assert.equal(requests[0].body.session_id, requests[1].body.session_id)
  assert.notEqual(requests[0].body.team_id, requests[1].body.team_id)
  assert.ok(next.team_id.startsWith(`web_${requests[0].body.session_id}_`))
})

test('a page limit never advances the cursor past undisplayed events', async t => {
  const { client, server, config, env, LegionClient } = await setup(t)
  const start = await client.submit({ key: 'many-events', query: 'Work' }, execution())
  const events = server.teams.get(start.team_id).events
  for (let i = 2; i <= 5; i++) events.push({ event_id: i, event: 'step', data: { text: `event ${i}` } })
  const limited = new LegionClient({ ...config, maxEvents: 2 }, env)
  const first = await limited.status({ task_ref: start.task_ref }, execution())
  assert.deepEqual(first.events.map(x => x.event_id), [1, 2])
  assert.equal(first.next_event_id, 2)
  assert.equal(first.more_events, true)
  const next = await limited.status({ task_ref: start.task_ref, after_event_id: first.next_event_id }, execution())
  assert.deepEqual(next.events.map(x => x.event_id), [3, 4])
})

test('private credential fields and raw reasoning are not forwarded or stored', async t => {
  const { client, server } = await setup(t)
  const start = await client.submit({ key: 'private', query: 'Work' }, execution())
  server.teams.get(start.team_id).events.push({
    event_id: 2, event: 'error', data: {
      reason: 'Request rejected; fixture-token',
      stage: 'research',
      authorization: 'Bearer fixture-token',
      reasoning_content: 'PRIVATE_REASONING',
      share_token: 'PRIVATE_CAPABILITY',
    },
  })
  const result = await client.status({ task_ref: start.task_ref }, execution())
  const text = JSON.stringify(result)
  assert.ok(!text.includes('fixture-token'))
  assert.ok(!text.includes('PRIVATE_REASONING'))
  assert.ok(!text.includes('PRIVATE_CAPABILITY'))
  assert.equal(result.events[1].data.stage, 'research')
  assert.ok(result.projection.omitted_fields.length >= 3)
})

test('an artifact without a hash or with a cross-origin URL cannot be downloaded', async t => {
  const { client, server } = await setup(t)
  const start = await client.submit({ key: 'unsafe-artifact', query: 'Work' }, execution())
  server.finish(start.team_id, [
    { name: 'nohash.txt', url: '/outputs/result.txt' },
    { name: 'elsewhere.txt', url: 'https://elsewhere.example/file', sha256: server.sha256 },
  ])
  const state = await client.status({ task_ref: start.task_ref }, execution())
  assert.equal(state.artifacts.length, 2, 'An unsafe export is reported, not silently hidden')
  assert.ok(state.artifacts.every(x => !x.download_eligible))
  for (const artifact of state.artifacts) {
    await assert.rejects(client.download({ task_ref: start.task_ref, artifact_id: artifact.artifact_id }, execution()), /hash|origin|download|URL/i)
  }
})

test('disposing the plugin closes its own wait, not the remote delegated task', async t => {
  const { client, server } = await setup(t)
  const start = await client.submit({ key: 'dispose', query: 'Work' }, execution())
  client.dispose()
  await assert.rejects(client.status({ task_ref: start.task_ref }, execution()), /disposed|abort/i)
  assert.equal(server.requests.filter(x => x.path === '/api/legion/cancel').length, 0)
})

test('response limits report a failure rather than silently discarding evidence', async t => {
  const { client, server, config, env, LegionClient } = await setup(t)
  const start = await client.submit({ key: 'huge', query: 'Work' }, execution())
  server.teams.get(start.team_id).tasks.author.result = { final: 'a'.repeat(10000) }
  const limited = new LegionClient({ ...config, maxResponseBytes: 1024 }, env)
  await assert.rejects(limited.status({ task_ref: start.task_ref }, execution()), /byte limit|byte-limit|-byte limit/i)
})

test('missing credentials do not burn a key or perform any network request', async t => {
  const { client, server, env } = await setup(t)
  delete env.FIXTURE_TOKEN
  const args = { key: 'setup-first', query: 'Work' }
  await assert.rejects(client.submit(args, execution()), /host environment/i)
  assert.equal((await client.list(execution())).tasks.length, 0)
  assert.equal(server.requests.length, 0)
  env.FIXTURE_TOKEN = 'fixture-token'
  assert.equal((await client.submit(args, execution())).submission, 'accepted')
})

// Match team_state.send_message's real envelope, not a stub of client.status.
const commanderMessage = (id, overrides = {}) => ({
  id, from: 'author', to: 'commander', text: 'Please call marked_extract_tokens with {"markdown":"# Hi"}.',
  artifact_refs: [], ts: 1793110000 + id, read_at: null, ...overrides,
})

test('commander mailbox: status restores requests and original read facts without marking or consuming them', async t => {
  const { client, server, config, env, LegionClient } = await setup(t)
  const start = await client.submit({ key: 'mailbox', query: 'Use local capabilities when requested' }, execution())
  const team = server.teams.get(start.team_id)
  const withoutReadFact = commanderMessage(9)
  delete withoutReadFact.read_at
  team.mailboxes = {
    commander: [commanderMessage(2), commanderMessage(5, { read_at: 1793110010.5 }), withoutReadFact],
    author: [commanderMessage(6, { to: 'author', text: 'OTHER_RECIPIENT_PRIVATE_BODY' })],
  }
  const before = structuredClone(team.mailboxes)
  const restarted = new LegionClient(config, env)
  for (const reader of [client, restarted]) {
    const result = await reader.status({ task_ref: start.task_ref, after_event_id: 100 }, execution())
    assert.deepEqual(result.mailbox?.messages?.map(({ id, from, to, text, ts, read_at }) =>
      ({ id, from, to, text, ts, ...(read_at === undefined ? {} : { read_at }) })), [
      { id: 2, from: 'author', to: 'commander', text: before.commander[0].text, ts: 1793110002, read_at: null },
      { id: 5, from: 'author', to: 'commander', text: before.commander[1].text, ts: 1793110005, read_at: 1793110010.5 },
      { id: 9, from: 'author', to: 'commander', text: before.commander[2].text, ts: 1793110009 },
    ], 'Legitimate commander requests must not disappear from status')
    assert.equal(result.mailbox.state, 'available')
    assert.equal(result.mailbox.source, 'team.mailboxes.commander')
    assert.equal(result.mailbox.trust, 'untrusted_source')
    assert.equal(result.mailbox.read_receipts_modified, false)
    assert.equal(result.mailbox.model_consumption, 'not_observed')
    assert.equal(Object.hasOwn(result.mailbox.messages[2], 'read_at'), false)
    assert.equal(result.runtime.tasks[0].task_id, 'author')
    assert.equal(result.events.length, 0, 'Mailbox IDs are independent of the replay cursor')
    assert.equal(JSON.stringify(result).includes('OTHER_RECIPIENT_PRIVATE_BODY'), false)
  }
  assert.deepEqual(team.mailboxes, before)
  assert.deepEqual(server.requests.slice(1).map(({ method, path }) => `${method} ${path}`), [
    'GET /api/legion/team', 'GET /api/legion/events',
    'GET /api/legion/team', 'GET /api/legion/events',
  ], 'Observation must not call mark-read, message, resume, or dispatch endpoints')
})

test('commander mailbox: envelope and reference projection preserves text redaction and truncation facts', async t => {
  const { client, server } = await setup(t)
  const start = await client.submit({ key: 'mailbox-redaction', query: 'Work' }, execution())
  server.teams.get(start.team_id).mailboxes = { commander: [commanderMessage(1, {
    text: `Bearer fixture-token https://public.example/file?token=PRIVATE_URL_TOKEN ${'x'.repeat(17000)}`,
    authorization: 'PRIVATE_AUTHORIZATION',
    reasoning_content: 'PRIVATE_REASONING',
    attachments: [{ data: 'PRIVATE_BINARY' }],
    artifact_refs: [{
      artifact_id: 'a'.repeat(64), sha256: 'b'.repeat(64), name: 'result.txt', mime: 'text/plain', bytes: 42,
      path: '/private/service/artifact.txt', data: 'PRIVATE_REFERENCE_BINARY', token: 'PRIVATE_REFERENCE_TOKEN',
    }],
  })] }
  const result = await client.status({ task_ref: start.task_ref }, execution())
  assert.ok(result.mailbox?.messages, 'Status must expose the sanitized mailbox')
  const message = result.mailbox.messages[0]
  assert.match(message.text, /Bearer \[redacted\]/)
  assert.match(message.text, /\?token=\[redacted\]/)
  assert.match(message.text, /\[truncated; original \d+ characters\]/)
  assert.equal(message.text_source, 'inline')
  assert.equal(message.text_truncated, true)
  assert.equal(result.mailbox.truncated, true)
  assert.deepEqual(message.artifact_refs, [{
    artifact_id: 'a'.repeat(64), sha256: 'b'.repeat(64), name: 'result.txt', mime: 'text/plain', bytes: 42,
  }])
  assert.ok(result.projection.truncated_fields.includes('$.mailbox.messages[0].text'))
  for (const path of ['authorization', 'reasoning_content', 'attachments', 'artifact_refs[0].path', 'artifact_refs[0].data', 'artifact_refs[0].token']) {
    assert.ok(result.projection.omitted_fields.includes(`$.mailbox.messages[0].${path}`), path)
  }
  for (const secret of ['fixture-token', 'PRIVATE_URL_TOKEN', 'PRIVATE_AUTHORIZATION', 'PRIVATE_REASONING',
    'PRIVATE_BINARY', '/private/service/artifact.txt', 'PRIVATE_REFERENCE_BINARY', 'PRIVATE_REFERENCE_TOKEN']) {
    assert.equal(JSON.stringify(result).includes(secret), false)
  }
})

test('commander mailbox: referenced long text remains an explicit preview and private references are not fetched', async t => {
  const { client, server, config, env, LegionClient } = await setup(t)
  const start = await client.submit({ key: 'mailbox-preview', query: 'Work' }, execution())
  server.teams.get(start.team_id).mailboxes = { commander: [commanderMessage(7, {
    text: 'The service only returned the beginning of a longer capability request.',
    artifact_refs: [
      { name: 'a.txt', path: '/private/a.txt' },
      { name: 'b.txt', path: '/private/b.txt' },
      { name: 'mail-7.txt', sha256: 'c'.repeat(64), bytes: 9000, path: '/private/body.txt' },
    ],
  })] }
  const limited = new LegionClient({ ...config, maxEvents: 2 }, env)
  const result = await limited.status({ task_ref: start.task_ref }, execution())
  assert.ok(result.mailbox?.messages)
  const message = result.mailbox.messages[0]
  assert.equal(message.text_source, 'inline_preview')
  assert.equal(message.text_truncated, true)
  assert.equal(message.artifact_refs.length, 2)
  assert.equal(message.artifact_refs_truncated, true)
  assert.equal(result.mailbox.truncated, true)
  assert.equal(result.mailbox.more_messages, false, 'A truncated body is not another mailbox page')
  assert.ok(result.projection.truncated_fields.includes('$.mailbox.messages[0].text'))
  assert.ok(result.projection.truncated_fields.includes('$.mailbox.messages[0].artifact_refs'))
  assert.deepEqual(server.requests.slice(1).map(x => x.path), ['/api/legion/team', '/api/legion/events'])
  assert.equal(JSON.stringify(result).includes('/private/'), false)
})

test('commander mailbox: bounded pages use an independent explicit cursor and never implicitly consume earlier requests', async t => {
  const { client, server, config, env, LegionClient } = await setup(t)
  const start = await client.submit({ key: 'mailbox-pages', query: 'Work' }, execution())
  server.teams.get(start.team_id).mailboxes = { commander: [commanderMessage(8), commanderMessage(2), commanderMessage(5)] }
  const limited = new LegionClient({ ...config, maxEvents: 2 }, env)
  const first = await limited.status({ task_ref: start.task_ref, after_event_id: 100 }, execution())
  assert.deepEqual(first.mailbox?.messages?.map(x => x.id), [2, 5])
  assert.equal(first.mailbox.after_message_id, 0)
  assert.equal(first.mailbox.next_message_id, 5)
  assert.equal(first.mailbox.total_messages, 3)
  assert.equal(first.mailbox.more_messages, true)
  assert.equal(first.mailbox.truncated, true)
  assert.ok(first.projection.truncated_fields.includes('$.mailbox.messages'))
  const next = await limited.status({ task_ref: start.task_ref, after_message_id: 5 }, execution())
  assert.deepEqual(next.mailbox.messages.map(x => x.id), [8])
  assert.equal(next.mailbox.next_message_id, 8)
  assert.equal(next.mailbox.more_messages, false)
  assert.equal(next.mailbox.truncated, false)
  assert.deepEqual(next.events.map(x => x.event_id), [1], 'The message cursor must not filter events')
  const again = await limited.status({ task_ref: start.task_ref }, execution())
  assert.deepEqual(again.mailbox.messages.map(x => x.id), [2, 5], 'Display is not an acknowledgement')
  const end = await limited.status({ task_ref: start.task_ref, after_message_id: 20 }, execution())
  assert.deepEqual(end.mailbox.messages, [])
  assert.equal(end.mailbox.next_message_id, 20)
  assert.equal(end.mailbox.more_messages, false)
})

test('commander mailbox: metadata truncation is reflected in the mailbox truncation flag', async t => {
  const { client, server } = await setup(t)
  const start = await client.submit({ key: 'mailbox-metadata', query: 'Work' }, execution())
  server.teams.get(start.team_id).mailboxes = { commander: [commanderMessage(1, {
    from: 'a'.repeat(17000), artifact_refs: [{ name: 'b'.repeat(17000) }],
  })] }
  const result = await client.status({ task_ref: start.task_ref }, execution())
  assert.equal(result.mailbox.truncated, true, 'Metadata clipping must not claim an untruncated mailbox')
  assert.equal(result.mailbox.messages[0].text_truncated, false)
  assert.ok(result.projection.truncated_fields.includes('$.mailbox.messages[0].from'))
  assert.ok(result.projection.truncated_fields.includes('$.mailbox.messages[0].artifact_refs[0].name'))
})

test('commander mailbox: missing or malformed containers are distinct from an observed empty mailbox', async t => {
  const { client, server } = await setup(t)
  const start = await client.submit({ key: 'mailbox-shapes', query: 'Work' }, execution())
  const team = server.teams.get(start.team_id)
  for (const [name, mailboxes, state] of [
    ['missing mailboxes', undefined, 'not_returned'],
    ['missing commander', {}, 'not_returned'],
    ['null mailboxes', null, 'invalid'],
    ['array mailboxes', [], 'invalid'],
    ['string mailboxes', 'PRIVATE_MALFORMED_BODY', 'invalid'],
    ['null commander', { commander: null }, 'invalid'],
    ['object commander', { commander: {} }, 'invalid'],
  ]) {
    await t.test(name, async () => {
      team.mailboxes = mailboxes
      const result = await client.status({ task_ref: start.task_ref }, execution())
      assert.equal(result.mailbox?.state, state)
      assert.equal(result.mailbox.messages, null)
      assert.equal(result.mailbox.total_messages, null)
      assert.equal(result.mailbox.more_messages, null)
      assert.equal(result.mailbox.next_message_id, null)
      assert.ok(result.mailbox.diagnostic.code)
      assert.equal(result.runtime.tasks[0].status, 'running')
      assert.equal(JSON.stringify(result).includes('PRIVATE_MALFORMED_BODY'), false)
    })
  }
  team.mailboxes = { commander: [] }
  const empty = await client.status({ task_ref: start.task_ref }, execution())
  assert.equal(empty.mailbox.state, 'available')
  assert.deepEqual(empty.mailbox.messages, [])
  assert.equal(empty.mailbox.total_messages, 0)
  assert.equal(empty.mailbox.more_messages, false)
  assert.equal(empty.mailbox.next_message_id, 0)
  assert.equal(empty.mailbox.truncated, false)
})

test('commander mailbox: malformed or ambiguous envelopes are reported rather than treated as no requests', async t => {
  const { client, server } = await setup(t)
  const start = await client.submit({ key: 'mailbox-envelopes', query: 'Work' }, execution())
  const cases = [
    ['null envelope', [null]],
    ['invalid id', [commanderMessage('1')]],
    ['missing sender', [commanderMessage(1, { from: undefined })]],
    ['wrong recipient', [commanderMessage(1, { to: 'other-task' })]],
    ['binary body', [commanderMessage(1, { text: { type: 'Buffer', data: [80, 82, 73, 86, 65, 84, 69] } })]],
    ['invalid timestamp', [commanderMessage(1, { ts: 'PRIVATE_TIMESTAMP' })]],
    ['invalid read fact', [commanderMessage(1, { read_at: false })]],
    ['invalid references', [commanderMessage(1, { artifact_refs: {} })]],
    ['invalid reference entry', [commanderMessage(1, { artifact_refs: [null] })]],
    ['invalid reference metadata', [commanderMessage(1, { artifact_refs: [{ name: { private: 'PRIVATE_METADATA' } }] })]],
    ['duplicate message id', [commanderMessage(1), commanderMessage(1, { from: 'reviewer' })]],
  ]
  for (const [name, messages] of cases) {
    await t.test(name, async () => {
      server.teams.get(start.team_id).mailboxes = { commander: messages }
      const result = await client.status({ task_ref: start.task_ref }, execution())
      assert.equal(result.mailbox?.state, 'invalid')
      assert.equal(result.mailbox.messages, null)
      assert.equal(result.mailbox.total_messages, messages.length)
      assert.equal(result.mailbox.more_messages, null)
      assert.equal(result.mailbox.next_message_id, null)
      assert.equal(result.mailbox.diagnostic.code, 'INVALID_MAILBOX')
      assert.match(result.mailbox.diagnostic.path, /^\$\.mailbox\.messages\[/)
      assert.equal(JSON.stringify(result).includes('PRIVATE_TIMESTAMP'), false)
      assert.equal(JSON.stringify(result).includes('PRIVATE_METADATA'), false)
      assert.equal(result.runtime.tasks[0].status, 'running')
    })
  }
})

test('commander mailbox: invalid message cursors fail before requesting remote state', async t => {
  const { client, server } = await setup(t)
  const start = await client.submit({ key: 'mailbox-cursor', query: 'Work' }, execution())
  for (const after_message_id of [-1, 0.5, '1', Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(client.status({ task_ref: start.task_ref, after_message_id }, execution()), /after_message_id/)
  }
  assert.equal(server.requests.length, 1)
})

test('commander mailbox: session and team identity, cancellation, and response byte limits still guard the snapshot', async t => {
  const { client, server, config, env, LegionClient } = await setup(t)
  const start = await client.submit({ key: 'mailbox-boundaries', query: 'Work' }, execution())
  const team = server.teams.get(start.team_id)
  team.mailboxes = { commander: [commanderMessage(1)] }
  await assert.rejects(client.status({ task_ref: start.task_ref }, { ...execution(), sessionId: 'different-dsh-session' }), /session|unknown|not found/i)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(client.status({ task_ref: start.task_ref }, { ...execution(), signal: controller.signal }), { name: 'AbortError' })
  assert.equal(server.requests.length, 1)
  for (const field of ['team_id', 'conversation_id']) {
    const original = team[field]
    team[field] = 'PRIVATE_FOREIGN_IDENTITY'
    await assert.rejects(client.status({ task_ref: start.task_ref }, execution()), /different .* identity/)
    team[field] = original
  }
  assert.deepEqual(server.requests.slice(1).map(x => x.path), ['/api/legion/team', '/api/legion/team'])
  team.mailboxes.commander[0].text = 'x'.repeat(10000)
  const limited = new LegionClient({ ...config, maxResponseBytes: 1024 }, env)
  await assert.rejects(limited.status({ task_ref: start.task_ref }, execution()), /byte limit/i)
})
