import { executionFrom } from './commands.js'
import { parseJson } from './json.js'
import { sourceErrorDiagnostics } from './sources.js'

const ARGUMENTS = Object.freeze({
  runtime: ['view'], tools: ['query', 'offset', 'limit'], github: ['query', 'limit'],
  inspect: ['repository', 'ref'], tasks: [],
  status: ['task_ref', 'after_event_id', 'after_message_id', 'artifact_offset'],
  submit: ['key', 'query', 'context'],
})
const LIMITS = Object.freeze({
  output_bytes: 64 * 1024, text_bytes: 4096, array_items: 100, object_fields: 100, depth: 8,
  tool_description_bytes: 1024, readme_bytes: 1200,
})
const OMIT = Symbol('omitted')
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const projection = () => ({ omitted_fields: [], truncated_fields: [] })

function fields(value, allowed, label) {
  if (!record(value) || Object.keys(value).some(key => !allowed.includes(key))) {
    // Field names and parser fragments can themselves contain credentials.
    throw new Error(`${label} 必须是仅包含约定字段的 JSON 对象；不接受未知字段或外部权限。`)
  }
}

function text(value, label, max, empty = false) {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.length > max || !value.isWellFormed()) {
    throw new Error(`${label} 必须是${empty ? '' : '非空'}文本，最多 ${max} 个字符。`)
  }
}

function integer(value, label, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} 必须是 ${min}–${max} 范围内的安全整数。`)
  }
}

function inputFrom(raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > 2 * 1024 * 1024) {
    throw new Error('工作台输入必须是最多 2 MiB 的 JSON 文本。')
  }
  const input = parseJson(raw, '工作台输入')
  fields(input, ['action', 'args'], '工作台输入')
  if (typeof input.action !== 'string' || !Object.hasOwn(ARGUMENTS, input.action)) {
    throw new Error('未知工作台动作；仅支持 runtime、tools、github、inspect、tasks、status、submit。')
  }
  return input
}

function argumentsFrom(input) {
  const args = Object.hasOwn(input, 'args') ? input.args : {}
  fields(args, ARGUMENTS[input.action], `${input.action} args`)
  switch (input.action) {
    case 'runtime':
      if (!['members', 'capabilities', 'catalog'].includes(args.view)) {
        throw new Error('runtime view 必须是 members、capabilities 或 catalog。')
      }
      break
    case 'tools':
      if (args.query !== undefined) text(args.query, 'query', 500, true)
      if (args.offset !== undefined) integer(args.offset, 'offset', 0, Number.MAX_SAFE_INTEGER)
      if (args.limit !== undefined) integer(args.limit, 'limit', 1, 30)
      break
    case 'github':
      text(args.query, 'query', 2048)
      if (args.limit !== undefined) integer(args.limit, 'limit', 1, 100)
      break
    case 'inspect':
      text(args.repository, 'repository', 256)
      if (args.ref !== undefined) text(args.ref, 'ref', 1024)
      // Repository/ref grammar and public-only source policy belong to GitHubSources.
      break
    case 'status':
      if (typeof args.task_ref !== 'string' || args.task_ref.length !== 32 || !/^[a-f0-9]{32}$/.test(args.task_ref)) {
        throw new Error('status 需要明确的 32 位任务引用 task_ref；不支持省略或 latest。')
      }
      for (const key of ['after_event_id', 'after_message_id', 'artifact_offset']) {
        if (args[key] !== undefined) integer(args[key], key, 0, Number.MAX_SAFE_INTEGER)
      }
      break
    case 'submit':
      text(args.key, 'key', 160)
      text(args.query, 'query', 100000)
      if (args.context !== undefined) text(args.context, 'context', 200000, true)
      break
  }
  return args
}

function prefix(value, maxBytes) {
  const bytes = Buffer.from(value)
  if (bytes.length <= maxBytes) return value
  let end = maxBytes
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--
  return bytes.subarray(0, end).toString('utf8')
}

function preview(client, value, maxBytes, facts, path) {
  // Redact the COMPLETE string first: clipping can otherwise expose part of a secret.
  const safe = client.redactText(value)
  const clipped = prefix(safe, maxBytes)
  if (clipped !== safe) facts.truncated_fields.push(path)
  return clipped
}

function pick(value, names, facts, path) {
  if (!record(value)) return value
  for (const key of Object.keys(value)) {
    if (!names.includes(key)) facts.omitted_fields.push(`${path}.${key}`)
  }
  return Object.fromEntries(names.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]))
}

function readEntry(repository, commit, path) {
  return {
    tool: 'legion_source', method: 'read',
    arguments: { action: 'read', repository, commit,
      ...(path === undefined ? {} : { path, offset: 0, limit: 12000 }) },
    ...(path === undefined ? { required: ['path'] } : {}),
  }
}

function fileSummary(client, file, facts, path, includeContent = false) {
  if (file == null) return file
  const summary = pick(file, [
    'trust', 'status', 'repository', 'commit', 'source_sha', 'path', 'url', 'fetched_at', 'source',
    'encoding', 'sha256', 'blob_sha', 'total_bytes', 'offset_unit', 'truncated',
    ...(includeContent ? ['content'] : []),
  ], facts, path)
  // These byte counts describe the source reader's page, NOT the redacted UI text.
  summary.source_preview = Object.fromEntries(
    ['offset', 'limit', 'end_offset', 'returned_bytes', 'next_offset', 'truncated']
      .filter(key => Object.hasOwn(file, key)).map(key => [key, file[key]]),
  )
  if (includeContent && typeof file.content === 'string') {
    const before = facts.truncated_fields.length
    summary.content = preview(client, file.content, LIMITS.readme_bytes, facts, `${path}.content`)
    summary.content_preview = true
    summary.truncated = file.truncated === true || facts.truncated_fields.length > before
  }
  // Start at zero: source.next_offset could skip text omitted from this UI preview.
  summary.next = readEntry(file.repository, file.commit, file.path)
  return summary
}

function inspectSummary(client, value, facts) {
  const result = pick(value, [
    'trust', 'status', 'repository', 'url', 'ref', 'commit', 'source_sha', 'fetched_at', 'source',
    'metadata', 'license', 'readme', 'readme_status', 'manifests', 'manifests_truncated',
    'tree', 'truncated', 'errors', 'continuation', 'projection',
  ], facts, '$')
  if (typeof value.truncated === 'boolean') result.source_truncated = value.truncated
  if (record(value.license)) {
    result.license = pick(value.license, [
      'trust', 'status', 'key', 'name', 'spdx_id', 'assessment', 'file', 'source',
      'candidate_paths', 'candidate_paths_truncated', 'error',
    ], facts, '$.license')
    if (Object.hasOwn(value.license, 'file')) {
      result.license.file = fileSummary(client, value.license.file, facts, '$.license.file')
    }
  }
  if (Object.hasOwn(value, 'readme')) result.readme = fileSummary(client, value.readme, facts, '$.readme', true)
  if (Array.isArray(value.manifests)) {
    result.manifests = value.manifests.map((file, index) => fileSummary(client, file, facts, `$.manifests[${index}]`))
  }
  if (record(value.tree)) {
    result.tree = pick(value.tree, [
      'trust', 'sha', 'truncated', 'api_truncated', 'index_scope', 'received_entries', 'source', 'continuation',
    ], facts, '$.tree')
  }
  result.continuation = readEntry(value.repository, value.commit)
  return result
}

function visibleTools(ctx, client, invocation, args, facts) {
  const schemas = ctx.tools.schemas(invocation.agent)
  invocation.signal.throwIfAborted()
  if (!Array.isArray(schemas) || schemas.some(schema => !record(schema)
    || typeof schema.name !== 'string' || !schema.name.trim()
    || (schema.description !== undefined && typeof schema.description !== 'string'))) {
    throw new Error('DSH 返回了无效的当前会话工具元数据。')
  }
  const words = (args.query ?? '').trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean)
  const selected = schemas.filter(schema => {
    const searchable = `${schema.name} ${schema.description ?? ''}`.toLocaleLowerCase()
    return words.every(word => searchable.includes(word))
  })
  const offset = args.offset ?? 0
  const limit = args.limit ?? 10
  const tools = []
  let bytes = 2
  for (const schema of selected.slice(offset, offset + limit)) {
    const index = tools.length
    // Names are callable identifiers; reject an unusable name rather than invent a clipped one.
    if (Buffer.byteLength(schema.name) > 1024) throw new Error('原生工具名称超过工作台元数据上限。')
    const row = pick(schema, ['name', 'description'], facts, `$.tools[${index}]`)
    row.description = preview(client, schema.description ?? '', LIMITS.tool_description_bytes,
      facts, `$.tools[${index}].description`)
    const safe = client.clean(row, facts, `$.tools[${index}]`)
    const size = Buffer.byteLength(JSON.stringify(safe)) + 1
    // Reserve room for total/cursor metadata. Pagination must advance by the
    // rows actually displayed, not by a requested page that the UI had to clip.
    if (bytes + size > 38 * 1024) { facts.truncated_fields.push('$.tools'); break }
    tools.push(safe)
    bytes += size
  }
  const nextOffset = offset + tools.length < selected.length ? offset + tools.length : null
  return {
    scope: 'current_dsh_agent', source: 'dsh.tools.schemas', metadata_only: true,
    execution_performed: false, grants_remote_access: false,
    tools, total: selected.length, offset, limit, next_offset: nextOffset,
    truncated: offset > 0 || nextOffset !== null,
  }
}

/** Bound the UI projection, never reinterpret task status or execute returned source text. */
function bounded(value, facts, path = '$', budget = { bytes: 40 * 1024 }, depth = 0) {
  const take = bytes => {
    if (budget.bytes < bytes) { facts.truncated_fields.push(path); return false }
    budget.bytes -= bytes
    return true
  }
  if (depth > LIMITS.depth) { facts.truncated_fields.push(path); return OMIT }
  if (typeof value === 'string') {
    const clipped = prefix(value, LIMITS.text_bytes)
    if (clipped !== value) facts.truncated_fields.push(path)
    return take(Buffer.byteLength(JSON.stringify(clipped))) ? clipped : OMIT
  }
  if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
    return take(Buffer.byteLength(JSON.stringify(value))) ? value : OMIT
  }
  if (typeof value !== 'object') { facts.omitted_fields.push(path); return OMIT }
  if (!take(2)) return OMIT
  if (Array.isArray(value)) {
    const result = []
    for (let index = 0; index < Math.min(value.length, LIMITS.array_items); index++) {
      if (!take(1)) break
      const item = bounded(value[index], facts, `${path}[${index}]`, budget, depth + 1)
      if (item === OMIT) break // A prefix, never a filtered/reindexed page pretending to be complete.
      result.push(item)
    }
    if (result.length < value.length) facts.truncated_fields.push(path)
    return result
  }
  const result = []
  const entries = Object.entries(value)
  for (const [key, item] of entries.slice(0, LIMITS.object_fields)) {
    if (!take(Buffer.byteLength(JSON.stringify(key)) + 2)) break
    const child = bounded(item, facts, `${path}.${key}`, budget, depth + 1)
    if (child !== OMIT) result.push([key, child])
  }
  if (result.length < entries.length) facts.truncated_fields.push(path)
  return Object.fromEntries(result)
}

function projectionSummary(client, facts) {
  const result = { ...projection(), limits: LIMITS }
  for (const key of ['omitted_fields', 'truncated_fields']) {
    const all = [...new Set(facts[key].filter(path => typeof path === 'string').map(path => client.redactText(path)))]
    result[key] = all.slice(0, 64).map(path => prefix(path, 160))
    result[`${key}_count`] = all.length
    if (all.length > 64 || all.some(path => Buffer.byteLength(path) > 160)) result.paths_truncated = true
  }
  // Path metadata also has a budget; malicious object keys cannot grow the receipt.
  while (Buffer.byteLength(JSON.stringify(result)) > 16 * 1024) {
    const key = result.omitted_fields.length > result.truncated_fields.length ? 'omitted_fields' : 'truncated_fields'
    result[key].pop()
    result.paths_truncated = true
  }
  return result
}

function inheritProjection(value, facts) {
  if (!record(value.projection)) return
  for (const key of ['omitted_fields', 'truncated_fields']) {
    if (Array.isArray(value.projection[key])) facts[key].push(...value.projection[key].filter(path => typeof path === 'string'))
  }
}

function affected(facts, root) {
  return [...facts.omitted_fields, ...facts.truncated_fields].some(path => path === '$' || path === root
    || path.startsWith(`${root}.`) || path.startsWith(`${root}[`)
    || root.startsWith(`${path}.`) || root.startsWith(`${path}[`))
}

// A page is a prefix of whole projected rows. A large row must not consume a
// different section, and a byte cap must not advance past undisplayed rows.
function statusPage(source, summaries, facts, path, bytes, { offset = 0, limit = 100, incomplete = false } = {}) {
  const available = Array.isArray(source)
  const items = []
  let size = 2
  let clipped = false
  for (let index = offset; available && index < Math.min(source.length, offset + limit); index++) {
    const rowFacts = projection()
    const row = bounded(summaries[index], rowFacts, `${path}[${index}]`, { bytes: 2048 })
    const rowBytes = row === OMIT ? bytes + 1 : Buffer.byteLength(JSON.stringify(row)) + 1
    if (size + rowBytes > bytes) break
    items.push(row)
    size += rowBytes
    for (const key of ['omitted_fields', 'truncated_fields']) facts[key].push(...rowFacts[key])
    clipped ||= rowFacts.omitted_fields.length > 0 || rowFacts.truncated_fields.length > 0
  }
  const next = available && offset + items.length < source.length ? offset + items.length : null
  if (available && (offset > 0 || next !== null)) facts.truncated_fields.push(path)
  return { items, info: {
    available, observed_count: available ? source.length : null, shown_count: available ? items.length : null,
    complete: available && offset === 0 && next === null && !incomplete && !clipped,
    offset, next_offset: next, budget_bytes: bytes,
  } }
}

function shortFacts(value, names, facts, path) {
  const result = pick(value, names, facts, path)
  if (!record(result)) return result
  for (const [key, item] of Object.entries(result)) {
    if (typeof item === 'string') {
      result[key] = prefix(item, 600) // Already redacted in full by statusValue.
      if (result[key] !== item) facts.truncated_fields.push(`${path}.${key}`)
    }
  }
  return result
}

function taskSummary(task, facts, path) {
  const result = shortFacts(task, [
    'task_id', 'harness', 'assigned_harness', 'status', 'progress', 'started_at', 'finished_at', 'final', 'result',
  ], facts, path)
  if (record(task?.result)) {
    result.result = shortFacts(task.result, ['status', 'error', 'reason', 'final'], facts, `${path}.result`)
  }
  return result
}

function eventSummary(event, facts, path) {
  const names = ['event_id', 'event', 't', 'task_id', 'harness', 'ts', 'timestamp', 'status', 'stage',
    'reason', 'error', 'name', 'scan_status', 'downloadable', 'file_preserved', 'text', 'message', 'final']
  const result = shortFacts(event, [...names, 'data'], facts, path)
  if (record(event?.data)) result.data = shortFacts(event.data, names, facts, `${path}.data`)
  else if (typeof event?.data === 'string') {
    result.data = prefix(event.data, 600)
    if (result.data !== event.data) facts.truncated_fields.push(`${path}.data`)
  }
  return result
}

function exportObservations(value, facts) {
  const observations = []
  const add = (note, path, origin) => {
    if (!record(note)) { facts.omitted_fields.push(path); return }
    observations.push({ ...shortFacts(note, [
      'name', 'reason', 'status', 'scan_status', 'downloadable', 'file_preserved',
      'exported_files', 'export_snapshot_id', 'message',
    ], facts, path), ...origin, source_path: path })
  }
  const visit = (node, path, origin, depth = 0) => {
    if (!record(node)) return
    if (depth > 8) { facts.truncated_fields.push(path); return }
    const typed = node.t === 'artifact_not_exported' || node.event === 'artifact_not_exported'
    if (typed) add(record(node.data) ? node.data : node, record(node.data) ? `${path}.data` : path, origin)
    if (Array.isArray(node.artifact_safety_observations)) {
      node.artifact_safety_observations.forEach((note, index) =>
        add(note, `${path}.artifact_safety_observations[${index}]`, origin))
    }
    if (record(node.artifact_export)) {
      const exported = node.artifact_export
      if (['exported_files', 'status', 'reason'].some(key => Object.hasOwn(exported, key))) {
        add(exported, `${path}.artifact_export`, origin)
      }
      if (Array.isArray(exported.observations)) exported.observations.forEach((note, index) =>
        add(note, `${path}.artifact_export.observations[${index}]`, origin))
    }
    for (const key of ['result', 'results', ...(typed ? [] : ['data'])]) {
      if (Array.isArray(node[key])) node[key].forEach((child, index) => visit(child, `${path}.${key}[${index}]`, origin, depth + 1))
      else visit(node[key], `${path}.${key}`, origin, depth + 1)
    }
  }
  if (Array.isArray(value.runtime?.tasks)) value.runtime.tasks.forEach((task, index) =>
    visit(task, `$.runtime.tasks[${index}]`, { task_id: task?.task_id }))
  if (Array.isArray(value.events)) value.events.forEach((event, index) =>
    visit(event, `$.events[${index}]`, { event_id: event?.event_id }))
  return observations
}

/** Independent 40 KiB section budgets, plus the unchanged bounded projection receipt.
 * This is a view of service observations, not a new completion/export decision.
 */
function statusValue(client, value, args, facts) {
  if (!record(value)) throw new Error('工作台依赖返回了无效结果；未能确认操作状态。')
  inheritProjection(value, facts)
  const { projection: previous, ...data } = value
  const unknownPaths = previous?.paths_truncated === true
    || (value.truncated === true && !facts.omitted_fields.length && !facts.truncated_fields.length)
  if (unknownPaths) facts.truncated_fields.push('$')
  const safe = client.clean(data, facts) // Redact BEFORE selecting, clipping or copying any text.
  const upstream = { omitted_fields: [...facts.omitted_fields], truncated_fields: [...facts.truncated_fields] }
  const incomplete = root => unknownPaths || affected(upstream, root)
  const after = args.after_event_id ?? 0
  const historyIncomplete = after > 0 || safe.more_events !== false
  const { runtime, events, artifacts, mailbox, ...header } = pick(safe, [
    'task_ref', 'team_id', 'connection', 'next_event_id', 'more_events', 'artifact_source', 'experience_verification',
    'runtime', 'events', 'artifacts', 'mailbox',
  ], facts, '$')
  const result = bounded(header, facts, '$', { bytes: 2 * 1024 })
  const sections = {}
  // Extract typed refusal/export observations before omitting bulky raw results.
  // Never infer a reason from final prose or deduplicate historical file hashes.
  const exportFacts = projection()
  const observations = exportObservations(safe, exportFacts)
  for (const key of ['omitted_fields', 'truncated_fields']) facts[key].push(...exportFacts[key])
  const notes = statusPage(observations, observations, facts, '$.export_observations', 7 * 1024, {
    incomplete: incomplete('$.runtime') || incomplete('$.events') || historyIncomplete
      || exportFacts.omitted_fields.length > 0 || exportFacts.truncated_fields.length > 0,
  })
  result.export_observations = notes.items
  sections.exports = { ...notes.info, available: Array.isArray(runtime?.tasks) || Array.isArray(events),
    source: 'returned_runtime_and_event_observations_only' }
  if (!sections.exports.available) {
    sections.exports.observed_count = null
    sections.exports.shown_count = null
    sections.exports.complete = false
  }

  const tasks = runtime?.tasks
  const taskRows = Array.isArray(tasks) ? tasks.map((task, index) => taskSummary(task, facts, `$.runtime.tasks[${index}]`)) : []
  const taskPage = statusPage(tasks, taskRows, facts, '$.runtime.tasks', 6 * 1024, { incomplete: incomplete('$.runtime') })
  sections.runtime = { ...taskPage.info, summary: true }
  if (record(runtime)) {
    const { tasks: ignored, ...flags } = pick(runtime, ['cancelled', 'cancel_requests', 'recoverable_tasks', 'tasks'], facts, '$.runtime')
    result.runtime = { ...bounded(flags, facts, '$.runtime', { bytes: 1024 }),
      ...(Array.isArray(tasks) ? { tasks: taskPage.items } : {}) }
  }
  const artifactRows = Array.isArray(artifacts) ? artifacts.map((item, index) => pick(item, [
    'artifact_id', 'name', 'sha256', 'bytes', 'download_eligible', 'download_reason',
    'kind', 'export_snapshot_id', 'service_verification',
  ], facts, `$.artifacts[${index}]`)) : []
  const artifactPage = statusPage(artifacts, artifactRows, facts, '$.artifacts', 12 * 1024, {
    offset: args.artifact_offset ?? 0, limit: 30,
    incomplete: incomplete('$.artifacts') || historyIncomplete,
  })
  sections.artifacts = artifactPage.info
  if (Array.isArray(artifacts)) result.artifacts = artifactPage.items

  const eventRows = Array.isArray(events) ? events.map((event, index) => eventSummary(event, facts, `$.events[${index}]`)) : []
  const eventPage = statusPage(events, eventRows, facts, '$.events', 8 * 1024, {
    incomplete: incomplete('$.events') || affected(facts, '$.events') || safe.more_events !== false,
  })
  if (Array.isArray(events)) result.events = eventPage.items
  const locallyPaged = eventPage.info.next_offset !== null
  const resume = locallyPaged ? eventPage.items.at(-1)?.event_id : safe.next_event_id
  sections.events = { ...eventPage.info, summary: true, after_event_id: after,
    has_more: locallyPaged || safe.more_events === true,
    next_after_event_id: Number.isSafeInteger(resume) && resume > after ? resume : null }
  // Keep mail cursors ahead of body text, with their own budget as well.
  if (record(mailbox)) {
    const { messages, ...mailHeader } = pick(mailbox, [
      'state', 'source', 'trust', 'recipient', 'total_messages', 'after_message_id', 'next_message_id', 'more_messages',
      'read_receipts_modified', 'model_consumption', 'truncated', 'diagnostic', 'messages',
      'status', 'has_more', 'delivery_evidence',
    ], facts, '$.mailbox')
    const mailRows = Array.isArray(messages) ? messages.map((message, index) => shortFacts(message, [
      'id', 'from', 'to', 'ts', 'read_at', 'text_source', 'text_truncated', 'artifact_refs_truncated', 'text', 'artifact_refs',
    ], facts, `$.mailbox.messages[${index}]`)) : []
    const mailPage = statusPage(messages, mailRows, facts, '$.mailbox.messages', 3 * 1024, {
      incomplete: incomplete('$.mailbox') || affected(facts, '$.mailbox')
        || mailbox.truncated === true || mailbox.more_messages === true || mailbox.has_more === true,
    })
    result.mailbox = { ...bounded(mailHeader, facts, '$.mailbox', { bytes: 1024 }),
      ...(Array.isArray(messages) ? { messages: mailPage.items } : {}) }
    const mailAfter = args.after_message_id ?? 0
    const mailPaged = mailPage.info.next_offset !== null
    const mailResume = mailPaged ? mailPage.items.at(-1)?.id : mailbox.next_message_id
    sections.mailbox = { ...mailPage.info, after_message_id: mailAfter,
      has_more: mailPaged || mailbox.more_messages === true || mailbox.has_more === true,
      next_after_message_id: Number.isSafeInteger(mailResume) && mailResume > mailAfter ? mailResume : null }
  } else sections.mailbox = { available: false, complete: false }
  result.sections = sections
  result.continuation = { tool: 'legion_status', arguments: {
    task_ref: args.task_ref, after_event_id: after, after_message_id: args.after_message_id ?? 0,
  } }
  result.projection = projectionSummary(client, facts)
  if (previous?.paths_truncated === true) result.projection.paths_truncated = true
  result.truncated = value.truncated === true || facts.omitted_fields.length > 0 || facts.truncated_fields.length > 0
  return result
}

function cleanValue(client, value, facts) {
  if (!record(value)) throw new Error('工作台依赖返回了无效结果；未能确认操作状态。')
  inheritProjection(value, facts)
  const { projection: previous, ...data } = value
  const result = bounded(client.clean(data, facts), facts)
  result.projection = projectionSummary(client, facts)
  result.truncated = result.truncated === true || facts.omitted_fields.length > 0 || facts.truncated_fields.length > 0
  return result
}

function commandResult(action, value, error, diagnostics) {
  const body = error === undefined ? { ok: true, action, value }
    : { ok: false, action, error, ...(diagnostics ? { diagnostics } : {}) }
  const serialized = JSON.stringify(body)
  if (Buffer.byteLength(serialized) <= LIMITS.output_bytes) {
    return { kind: body.ok ? 'success' : 'error', text: serialized }
  }
  // Never silently replace an oversized observation with an apparently complete success.
  return { kind: 'error', text: JSON.stringify({
    ok: false, action, error: '工作台结果超过 64 KiB；请缩小查询或使用原生工具读取完整事实。',
    diagnostics: { truncated: true, projection: { omitted_fields: [], truncated_fields: ['$'] } },
  }) }
}

function failure(client, action, message, diagnostics, facts) {
  const safe = bounded(client.clean({ error: message, ...(diagnostics ? { diagnostics } : {}) }, facts), facts)
  const projected = facts.omitted_fields.length > 0 || facts.truncated_fields.length > 0
  const details = projected
    ? { ...safe.diagnostics, truncated: true, projection: projectionSummary(client, facts) }
    : safe.diagnostics
  return commandResult(action, undefined, safe.error, details)
}

/**
 * Host human-command adapter. The host supplies identity/cancellation; JSON supplies
 * only action arguments. No ToolExecution tokens, native calls, installer or agent loop.
 */
export async function executeWorkbenchCommand(ctx, client, sources, invocation) {
  let action = null
  const facts = projection()
  try {
    const input = inputFrom(invocation?.rawInput)
    action = input.action
    const args = argumentsFrom(input)
    if (invocation.attachments !== undefined
      && (!Array.isArray(invocation.attachments) || invocation.attachments.length)) {
      throw new Error('工作台命令不接收附件；请使用明确的 JSON 参数。')
    }
    const execution = executionFrom(invocation)
    let raw
    switch (action) {
      case 'runtime': raw = await client.runtime(args, execution); break
      case 'tools': raw = visibleTools(ctx, client, invocation, args, facts); break
      case 'github': raw = await sources.search(args, execution); break
      case 'inspect': {
        const source = await sources.inspect(args, execution)
        if (!record(source)) throw new Error('源码检查未返回有效事实。')
        raw = inspectSummary(client, source, facts)
        break
      }
      case 'tasks': raw = await client.list(execution); break
      case 'status': {
        const { artifact_offset, ...cursors } = args
        raw = await client.status(cursors, execution)
        break
      }
      case 'submit': raw = await client.submit(args, execution); break
    }
    const value = action === 'status' ? statusValue(client, raw, args, facts) : cleanValue(client, raw, facts)
    if (action === 'submit' && raw.submission === 'rejected') {
      return failure(client, action, raw.reason || '军团已拒绝提交；请查询原任务，不要用新 key 盲目重发。', value, facts)
    }
    // In particular, an unconfirmed submit keeps its durable task_ref. Aborting
    // the local wait does not establish that the remote task was cancelled.
    return commandResult(action, value)
  } catch (error) {
    const diagnostics = sourceErrorDiagnostics(error)
    const message = diagnostics?.message ?? (invocation?.signal?.aborted
      ? '工作台操作已取消；取消本次等待不代表远端任务已停止。'
      : error instanceof Error ? error.message : typeof error === 'string' ? error : '工作台操作失败；请查询原任务状态。')
    return failure(client, action, message, diagnostics, facts)
  }
}
