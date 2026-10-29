// Native DSH browser module. React is supplied by the host, not bundled here.
// All operations use native services; no token, HTTP SDK or second agent loop.
window.__ModuleLoader__.load({
  id: 'dsh-plugin-legion',
  factory: require => {
    const limit = 240
    const labels = {
      success: {
        zh: '军团回执（非任务完成确认）：',
        en: 'Legion reply (not task completion): ',
      },
      error: { zh: '军团命令错误：', en: 'Legion command error: ' },
      emptySuccess: {
        zh: '命令已返回；可用 /legion list 查看本会话任务。',
        en: 'Command returned; use /legion list to check this session’s tasks.',
      },
      emptyError: {
        zh: '未返回错误详情；请查询原任务状态，勿盲目重发。',
        en: 'No error details returned; check the original task before retrying.',
      },
      truncated: { zh: '…（即时摘要）', en: '… (live summary)' },
    }

    function notice(locale, result) {
      const error = result.kind === 'error'
      const body = typeof result.text === 'string' ? result.text.replace(/\s+/gu, ' ').trim() : ''
      const text = locale.resolveText(labels[error ? 'error' : 'success'])
        + (body || locale.resolveText(labels[error ? 'emptyError' : 'emptySuccess']))
      const points = Array.from(text)
      if (points.length <= limit) return text
      const suffix = locale.resolveText(labels.truncated)
      return points.slice(0, limit - Array.from(suffix).length).join('') + suffix
    }

    const rows = value => Array.isArray(value) ? value : []
    const bool = value => typeof value === 'boolean' ? value : null
    const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key)
    const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)

    function artifactFacts(value) {
      const available = Array.isArray(value?.artifacts)
      const items = rows(value?.artifacts).filter(record)
      const page = value?.sections?.artifacts
      const paths = [...rows(value?.projection?.omitted_fields), ...rows(value?.projection?.truncated_fields)]
      const affected = paths.some(path => typeof path === 'string' && (path === '$'
        || path === '$.artifacts' || path.startsWith('$.artifacts.') || path.startsWith('$.artifacts[')))
      const complete = available && items.length === value.artifacts.length && !affected && value.more_events === false
        && (page ? page.available === true && page.complete === true && page.shown_count === items.length
          : value.truncated !== true && value.projection?.paths_truncated !== true)
      const observed = page?.observed_count
      return { available, items, complete,
        observed_count: available ? Number.isSafeInteger(observed) && observed >= items.length
          ? observed : page ? null : items.length : null }
    }

    function configEntry(entries, namespaces, bundles) {
      const matches = rows(entries).filter(entry => entry?.moduleName === 'dsh-plugin-legion')
      if (matches.length !== 1 || typeof matches[0].entryId !== 'string' || !matches[0].entryId) return null
      const { entryId, moduleName } = matches[0]
      // Settings uses the profile row id, while inventory uses the loader id.
      // Join native facts; never infer a namespace from the loader id's spelling.
      const mapped = rows(bundles).filter(bundle => bundle?.name === moduleName)
        .flatMap(bundle => rows(bundle.rows)).filter(row => row?.entryId === entryId)
      if (mapped.length > 1 || mapped.some(row => row.moduleName !== moduleName
        || typeof row.rowId !== 'string' || !row.rowId)) return null
      const namespace = mapped[0]?.rowId ?? entryId
      return rows(namespaces).filter(section => section?.ns === namespace).length === 1
        ? { entryId, namespace } : null
    }

    function sessionLabel(sessions, id) {
      const title = sessions.byId[id]?.displayTitle
      if (!title) return id
      const peers = sessions.ids.filter(other => other !== id && sessions.byId[other]?.displayTitle === title)
      if (!peers.length) return title
      let length = Math.min(8, id.length)
      while (length < id.length && peers.some(other => other.slice(-length) === id.slice(-length))) length++
      return `${title} · ${id.slice(-length)}`
    }

    function memberFacts(member) {
      return {
        key: member.key, installed: bool(member.installed),
        connected: bool(member.readiness?.connected), verified: bool(member.readiness?.verified),
        available: bool(member.available), selectable: member.entry_points?.execution?.selectable === true,
      }
    }

    function publicLink(value) {
      if (typeof value !== 'string') return null
      try {
        const url = new URL(value)
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null
        const host = url.hostname.toLowerCase()
        if (!host.includes('.') || host.endsWith('.localhost') || host.endsWith('.local')
          || /^[\d.]+$/.test(host) || host.includes(':')) return null
        return url.href
      } catch { return null }
    }

    function configOperations(draft) {
      const operations = []
      for (const key of ['baseUrl', 'tokenEnv', 'tokenFile', 'candidateHarnesses']) {
        if (!own(draft, key)) continue
        let value = draft[key]
        if (key === 'candidateHarnesses') {
          if (!Array.isArray(value) || value.some(key => typeof key !== 'string' || !key.trim())) {
            throw new Error('成员选择必须是有效的名称列表 / Invalid member selection')
          }
          value = [...new Set(value)]
        } else {
          if (typeof value !== 'string') throw new Error('配置必须为文字 / Invalid configuration')
          value = value.trim()
        }
        operations.push(value === '' ? { op: 'unset', path: [key] } : { op: 'set', path: [key], value })
      }
      return operations
    }

    function changeFacts(result) {
      return {
        changed: result?.changed === true, application: result?.application ?? 'unknown',
        stage: result?.stage ?? 'unknown', complete: result?.application === 'applied',
        reason: result?.error?.diagnostic || result?.error?.code || result?.restartReason || '',
        warnings: rows(result?.warnings),
      }
    }

    function errorText(error) {
      return String(error?.message || error?.diagnostic || error?.code || error || 'Unknown error')
        .replace(/\bBearer\s+\S+/giu, 'Bearer [redacted]')
        .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/giu, '$1[redacted]@')
        .replace(/([?&](?:token|key|api_key|access_token|secret|password)=)[^&\s]+/giu, '$1[redacted]')
        .slice(0, 2000)
    }

    function remoteValue(result) {
      if (result?.ok !== true) throw new Error(errorText(result?.error || '未收到原生服务回执 / No native service reply'))
      return result.value
    }

    // This controller owns UI state only. The host owns configuration, installs,
    // task identity, permissions and execution. Late results are session-fenced.
    function createController(ctx) {
      let disposed = false
      let epoch = 0
      let form
      let formOwner
      let stopForm
      const services = {}
      const listeners = new Set()
      const sequences = new Map()
      const operations = new Map()
      const submissions = new Map()
      const sessionKeys = new Set(['members', 'search', 'source', 'tasks', 'taskStatus', 'submit', 'download'])
      let state = {
        sessionId: '', sessions: ctx.sessions.list.getSnapshot(),
        available: {}, busy: {}, errors: {}, members: null, search: null, source: null,
        packages: null, plugins: null, config: null, configEntry: null, configNamespace: null, configSaved: false,
        inspection: null, installResult: null, installId: null, installUncertain: false, installCancellation: null,
        tasks: null, taskStatus: null, download: null, operation: null, submission: null,
      }
      const publish = patch => {
        if (disposed) return
        state = { ...state, ...patch }
        for (const listener of listeners) listener()
      }
      const setError = (key, error) => publish({ errors: { ...state.errors, [key]: errorText(error) } })
      const invalidate = keys => {
        const busy = { ...state.busy }, errors = { ...state.errors }
        for (const key of keys) {
          sequences.set(key, (sequences.get(key) || 0) + 1)
          busy[key] = false
          errors[key] = null
        }
        publish({ busy, errors })
      }
      async function run(key, work, scoped = false) {
        if (disposed || state.busy[key]) return false
        const currentEpoch = epoch
        const sessionId = state.sessionId
        const sequence = (sequences.get(key) || 0) + 1
        sequences.set(key, sequence)
        const current = () => !disposed && sequences.get(key) === sequence && (!scoped || epoch === currentEpoch)
        publish({ busy: { ...state.busy, [key]: true }, errors: { ...state.errors, [key]: null } })
        try {
          if (scoped && !sessionId) throw new Error('请先选择一个 DSH 会话 / Select a DSH session first')
          const patch = await work(sessionId)
          if (current() && patch) {
            publish(patch)
            return true
          }
        } catch (error) {
          if (current()) setError(key, error)
        } finally {
          if (current()) publish({ busy: { ...state.busy, [key]: false } })
        }
        return false
      }
      async function command(sessionId, action, args = {}) {
        return ctx.sessions.using(sessionId, { source: 'controllerOperation' }, async reference => {
          await reference.ready
          const response = remoteValue(await ctx.remote.commands.execute(
            sessionId, `/legion-panel ${JSON.stringify({ action, args })}`, [],
          ))
          let body
          try { body = JSON.parse(response?.result?.text) } catch {
            throw new Error(response?.result?.text || '命令未返回可用数据 / Command did not return usable data')
          }
          if (response?.result?.kind !== 'success' || body.ok !== true || body.action !== action) {
            const error = new Error(errorText(body.error || '无法确认命令结果 / Unconfirmed command result'))
            const rejected = body.diagnostics
            // Only a typed Host rejection with a recovery identity can settle
            // this submit. An error message alone never proves it was unsent.
            if (action === 'submit' && body.action === action && body.ok === false
              && response?.result?.kind === 'error' && rejected?.submission === 'rejected'
              && typeof rejected.task_ref === 'string' && /^[a-f0-9]{32}$/.test(rejected.task_ref)) {
              error.receipt = { task_ref: rejected.task_ref, submission: 'rejected', reason: error.message }
            }
            throw error
          }
          return body.value
        })
      }
      const service = key => {
        if (!services[key]) throw new Error(`DSH 未提供此原生服务 / Native service unavailable: ${key}`)
        return services[key]
      }
      async function readConfigIdentity(owner) {
        const current = () => !disposed && services.configuration === owner
        const mirror = owner.forms.describe()
        await mirror.ensure()
        if (!current()) return
        const entries = remoteValue(await owner.inventory.list()).entries
        if (!current()) return
        const bundles = owner.manager ? remoteValue(await owner.manager.listBundles()) : []
        if (!current()) return
        const snapshot = mirror.getSnapshot()
        if (!snapshot.view || snapshot.error) throw new Error(snapshot.error || 'DSH 配置暂不可读 / Settings unavailable')
        const identity = configEntry(entries, snapshot.view.namespaces, bundles)
        if (!identity) throw new Error('未找到唯一军团配置，请在 DSH 插件页检查重复实例 / No unique Legion entry')
        return identity
      }
      const stopSessions = ctx.sessions.list.subscribe(() => {
        const sessions = ctx.sessions.list.getSnapshot()
        publish({ sessions })
        if (state.sessionId && !sessions.ids.includes(state.sessionId)) controller.selectSession('')
      })
      const controller = {
        getSnapshot: () => state,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
        dispose() {
          disposed = true
          epoch++
          stopForm?.()
          stopSessions()
          listeners.clear()
          operations.clear()
          submissions.clear()
          for (const key of Object.keys(services)) delete services[key]
        },
        attach(key, value) {
          services[key] = value
          publish({ available: { ...state.available, [key]: true } })
          return () => {
            if (services[key] !== value) return
            delete services[key]
            if (key === 'configuration') {
              invalidate(['config', 'configSave'])
              stopForm?.()
              stopForm = null
              form = null
              formOwner = null
              publish({ config: null, configEntry: null, configNamespace: null, configSaved: false })
            }
            publish({ available: { ...state.available, [key]: false } })
          }
        },
        selectSession(sessionId) {
          if (sessionId && !state.sessions.ids.includes(sessionId)) throw new Error('Unknown DSH session')
          if (sessionId === state.sessionId) return
          epoch++
          const busy = { ...state.busy }, errors = { ...state.errors }
          for (const key of sessionKeys) {
            sequences.set(key, (sequences.get(key) || 0) + 1)
            busy[key] = false
            errors[key] = null
          }
          publish({ sessionId, busy, errors, members: null, search: null, source: null, tasks: null,
            taskStatus: null, download: null, operation: operations.get(sessionId) || null, submission: submissions.get(sessionId) || null })
        },
        async refreshSessions() {
          await run('sessions', async () => {
            await ctx.sessions.refresh()
            return { sessions: ctx.sessions.list.getSnapshot() }
          })
        },
        loadMembers() {
          return run('members', async id => ({ members: await command(id, 'runtime', { view: 'members' }) }), true)
        },
        loadPackages() {
          return run('packages', async () => {
            const manager = service('manager')
            const packages = remoteValue(await manager.listBundles())
            const plugins = remoteValue(await manager.listPlugins())
            return { packages, plugins }
          })
        },
        loadConfig() {
          return run('config', async () => {
            const owner = service('configuration')
            const identity = await readConfigIdentity(owner)
            if (!identity || disposed || services.configuration !== owner) return
            const { entryId, namespace } = identity
            stopForm?.()
            const target = owner.forms.get(namespace)
            if (form !== target || formOwner !== owner || state.configEntry !== entryId
              || state.configNamespace !== namespace) invalidate(['configSave'])
            form = target
            formOwner = owner
            stopForm = target.subscribe(() => {
              if (services.configuration === owner && form === target && state.configEntry === entryId
                && state.configNamespace === namespace) publish({ config: target.getSnapshot() })
            })
            return { configEntry: entryId, configNamespace: namespace, config: target.getSnapshot(), configSaved: false }
          })
        },
        saveConfig(draft, revision, entryId, namespace = entryId) {
          return run('configSave', async () => {
            publish({ configSaved: false })
            if (typeof entryId !== 'string' || entryId !== state.configEntry || namespace !== state.configNamespace) {
              throw new Error('配置实例已变化；请重新读取并放弃旧草稿后再改 / Configuration entry changed; reload and discard the old draft')
            }
            if (!form || formOwner !== services.configuration || state.config?.status !== 'ready' || !state.config.writable
              || !Number.isSafeInteger(revision)) throw new Error('当前配置不可编辑 / Configuration is not writable')
            const target = form, owner = formOwner
            const current = () => !disposed && form === target && services.configuration === owner
              && state.configEntry === entryId && state.configNamespace === namespace
            // Namespace revisions alone cannot distinguish replacement loader
            // instances. Recheck native ownership without rebasing the draft.
            const identity = await readConfigIdentity(owner)
            if (!identity || !current()) return
            if (identity.entryId !== entryId || identity.namespace !== namespace) {
              throw new Error('配置实例已变化；请重新读取并放弃旧草稿后再改 / Configuration entry changed; reload and discard the old draft')
            }
            const accepted = await target.mutate(configOperations(draft), revision)
            if (!current()) return
            if (!accepted) throw new Error('保存被拒绝或版本冲突；请重新读取后再改 / Save refused or revision conflict')
            return { config: target.getSnapshot(), configSaved: true, members: null }
          })
        },
        clearSearch() {
          invalidate(['search'])
          publish({ search: null })
        },
        search(kind, query, indexUrl) {
          controller.clearSearch()
          return run('search', async id => {
            if (kind === 'github') return { search: { kind, ...await command(id, 'github', { query, limit: 8 }) } }
            if (kind === 'local') {
              const outcomes = await Promise.allSettled([
                command(id, 'tools', { query, offset: 0, limit: 30 }),
                (async () => remoteValue(await service('skills').list({ sessionId: id })))(),
              ])
              return { search: { kind, query,
                tools: outcomes[0].status === 'fulfilled' ? outcomes[0].value : null,
                skills: outcomes[1].status === 'fulfilled' ? rows(outcomes[1].value.skills)
                  .filter(skill => `${skill.name} ${skill.description || ''}`.toLowerCase().includes(query.toLowerCase())) : null,
                errors: outcomes.map((outcome, index) => outcome.status === 'rejected'
                  ? `${index === 0 ? 'Tools' : 'Skills'}: ${errorText(outcome.reason)}` : null).filter(Boolean),
              } }
            }
            const market = services.market
            if (!market) return { search: { kind: 'market', unavailable: true, reason: 'native_service_unavailable' } }
            let indexes
            try {
              indexes = remoteValue(await market.listIndexes())
            } catch (error) {
              const diagnostic = errorText(error)
              // The pinned native RPC reports an absent endpoint as this exact
              // transport failure. Do not relabel auth, timeouts or index errors.
              if (!/transport failure for \/api\/pluginMarket\/listIndexes: HTTP 404$/u.test(diagnostic)) throw error
              return { search: { kind: 'market', unavailable: true, reason: 'native_endpoint_unavailable', diagnostic } }
            }
            if (!rows(indexes).length) return { search: { kind: 'market', indexes: [], entries: [], unconfigured: true } }
            const index = indexUrl ? indexes.find(index => index.url === indexUrl) : indexes[0]
            if (!index) throw new Error('只能搜索已配置的市场 / Select a configured market')
            if (index.error) throw new Error(errorText(index.error))
            const found = remoteValue(await market.search(index.url, {
              text: query, sort: { kind: 'relevance' }, offset: 0, limit: 20,
            }))
            return { search: { kind: 'market', ...found, indexes } }
          }, true)
        },
        clearSource() {
          invalidate(['source'])
          publish({ source: null })
        },
        inspectSource(repository, ref) {
          controller.clearSource()
          return run('source', async id => ({ source: await command(id, 'inspect', {
            repository, ...(ref?.trim() ? { ref: ref.trim() } : {}),
          }) }), true)
        },
        inspectPackage(spec, registry) {
          if (state.busy.install || state.installUncertain) return
          publish({ inspection: null, installResult: null })
          return run('inspect', async () => {
            const options = registry ? { registry } : {}
            const result = remoteValue(await service('manager').inspect(spec, options))
            return { inspection: { spec, registry, result } }
          })
        },
        installPackage() {
          if (state.busy.install || state.installUncertain) return Promise.resolve()
          return run('install', async () => {
            const inspection = state.inspection
            if (inspection?.result?.status !== 'accepted') throw new Error('请先检查安装来源 / Inspect the package first')
            const manager = service('manager')
            const requestId = crypto.randomUUID()
            invalidate(['installRecovery', 'installCancel'])
            publish({ installId: requestId, installUncertain: true, installResult: null, installCancellation: null })
            const result = remoteValue(await manager.installBundle(inspection.spec, {
              enabled: false, saveExact: true, requestId,
              ...(inspection.registry ? { registry: inspection.registry } : {}),
            }))
            if (disposed || state.installId !== requestId || services.manager !== manager) return
            return { installResult: result, installUncertain: false }
          }).then(accepted => { if (accepted) return controller.loadPackages() })
        },
        recoverInstall() {
          return run('installRecovery', async () => {
            const requestId = state.installId, manager = service('manager')
            if (!requestId) throw new Error('没有本次安装记录 / No install request')
            const result = remoteValue(await manager.waitForInstall(requestId))
            if (disposed || state.installId !== requestId || services.manager !== manager) return
            if (!result) throw new Error('主机未找到本次记录；请核对 DSH 插件页，勿盲目重装 / No retained install result')
            invalidate(['install'])
            return { installResult: result, installUncertain: false }
          }).then(accepted => { if (accepted) return controller.loadPackages() })
        },
        cancelInstall() {
          return run('installCancel', async () => {
            const requestId = state.installId, manager = service('manager')
            if (!requestId) throw new Error('没有本次安装记录 / No install request')
            const result = remoteValue(await manager.cancelInstall(requestId))
            if (disposed || state.installId !== requestId || services.manager !== manager) return
            if (result?.status === 'cancelled') {
              invalidate(['install', 'installRecovery'])
              return { installCancellation: result, installUncertain: false, installResult: null }
            }
            return { installCancellation: result }
          })
        },
        changePackage(kind, identity, enabled) {
          if (state.busy.install || state.installUncertain) return Promise.resolve()
          return run('packageChange', async () => {
            const manager = service('manager')
            const result = remoteValue(await (kind === 'bundle'
              ? manager.setBundleEnabled(identity, enabled)
              : manager.setPluginEnabled(identity, enabled)))
            return { installResult: result }
          }).then(() => controller.loadPackages())
        },
        loadTasks() {
          return run('tasks', async id => ({ tasks: await command(id, 'tasks') }), true)
        },
        taskStatus(task_ref, options = {}) {
          invalidate(['taskStatus', 'download'])
          publish({ taskStatus: null, download: null })
          const args = { task_ref }
          for (const key of ['after_event_id', 'after_message_id', 'artifact_offset']) {
            if (options[key] !== undefined) args[key] = options[key]
          }
          return run('taskStatus', async id => ({ taskStatus: await command(id, 'status', args) }), true)
        },
        downloadArtifact(task_ref, artifact_id) {
          return run('download', async id => {
            const item = rows(state.taskStatus?.artifacts).find(row => row?.artifact_id === artifact_id)
            if (typeof task_ref !== 'string' || !/^[a-f0-9]{32}$/.test(task_ref)
              || typeof artifact_id !== 'string' || !/^[a-f0-9]{32}$/.test(artifact_id)
              || state.taskStatus?.task_ref !== task_ref || item?.download_eligible !== true) {
              throw new Error('只能下载当前任务列出的可下载文件；请重新读取状态 / Use an eligible artifact id from the current task')
            }
            publish({ download: null })
            // The existing human command reauthorizes ownership and checks the
            // exported bytes/hash. UI values never become URLs, roots or grants.
            const response = await ctx.sessions.using(id, { source: 'controllerOperation' }, async reference => {
              await reference.ready
              return remoteValue(await ctx.remote.commands.execute(id,
                `/legion download ${task_ref} ${artifact_id}`, []))
            })
            const result = response?.result
            if (result?.kind !== 'success' || typeof result.text !== 'string' || !result.text.trim()) {
              throw new Error(errorText(result?.text || '下载结果未确认；请看原对话回执 / Download outcome unconfirmed'))
            }
            return { download: { task_ref, artifact_id, text: errorText(result.text), truncated: result.text.length > 2000 } }
          }, true)
        },
        submit(query, context) {
          return run('submit', async id => {
            if (!query.trim()) throw new Error('请写下想得到的能力 / Describe the capability you need')
            let operation = operations.get(id)
            if (operation && (operation.query !== query || operation.context !== context)) {
              throw new Error('上一单仍有记录；请先查看原任务，或明确开始另一单 / Check the original task before starting another')
            }
            operation ||= { key: crypto.randomUUID(), query, context }
            operations.set(id, operation)
            publish({ operation })
            let receipt, failure
            try {
              receipt = await command(id, 'submit', { key: operation.key, query, ...(context ? { context } : {}) })
            } catch (error) {
              receipt = error.receipt
              failure = error
            }
            if (receipt && !disposed && operations.get(id)?.key === operation.key) {
              operation = { ...operation, ref: receipt.task_ref }
              operations.set(id, operation)
              submissions.set(id, receipt)
              // Success and rejection share the same session/operation fence.
              if (state.sessionId === id) publish({ submission: receipt, operation })
            }
            if (failure) throw failure
          }, true)
        },
        newTask() {
          if (state.busy.submit || (state.operation && !state.operation.ref)) return
          invalidate(['submit'])
          operations.delete(state.sessionId)
          submissions.delete(state.sessionId)
          publish({ operation: null, submission: null })
        },
      }
      return controller
    }

    const styles = `
      .legion-panel{--lp-bg:var(--dsw-alias-bg-base,#fff);--lp-card:var(--dsw-alias-bg-layer-1,#f8f9fb);--lp-border:var(--dsw-alias-border-l1,#e4e7ec);--lp-fg:var(--dsw-alias-label-primary,#20242d);--lp-muted:var(--dsw-alias-label-secondary,#647083);--lp-accent:var(--dsw-alias-brand-primary,#4866dd);height:100%;min-height:0;overflow:auto;background:var(--lp-bg);color:var(--lp-fg);font-family:inherit;font-size:14px;line-height:1.6}
      .legion-panel *{box-sizing:border-box}.legion-wrap{max-width:1120px;margin:auto;padding:36px 40px 64px}
      .legion-panel h1{font-size:30px;line-height:1.3;font-weight:650;letter-spacing:-.7px;margin:8px 0 12px}.legion-panel h2{font-size:18px;line-height:1.4;font-weight:620;margin:0}.legion-panel h3{font-size:15px;line-height:1.4;margin:0;font-weight:600}.legion-panel p{margin:7px 0}
      .legion-eyebrow{font-size:11px;letter-spacing:1.8px;font-weight:650;color:var(--lp-muted)}.legion-muted,.legion-help{color:var(--lp-muted)}.legion-help{font-size:12px;line-height:1.6}.legion-lead{max-width:690px;font-size:14px;color:var(--lp-muted)}
      .legion-top,.legion-row,.legion-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.legion-top{justify-content:space-between;align-items:flex-start}.legion-row.between{justify-content:space-between}.legion-toolbar{margin:18px 0}
      .legion-session{display:grid;gap:5px;min-width:230px;max-width:380px}.legion-panel button,.legion-panel input,.legion-panel select,.legion-panel textarea{font:inherit;color:inherit}.legion-panel button{cursor:pointer;border:1px solid var(--lp-border);border-radius:9px;padding:8px 13px;background:var(--lp-bg);line-height:1.4;min-height:36px}.legion-panel button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#f0f2f8)}.legion-panel button:disabled{cursor:not-allowed;opacity:.48}.legion-panel button.primary{background:var(--dsw-alias-button-primary-fill,#4866dd);color:var(--dsw-alias-label-primary-inverted,#fff);border-color:transparent}.legion-panel button.primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,#3c59ce)}
      .legion-panel :focus-visible{outline:2px solid var(--lp-accent);outline-offset:3px}.legion-panel input:not([type=checkbox]),.legion-panel select,.legion-panel textarea{background:var(--lp-bg);border:1px solid var(--lp-border);border-radius:9px;padding:9px 11px;min-width:0;width:100%}.legion-panel input[type=checkbox]{width:17px;height:17px;accent-color:var(--lp-accent);flex:none}.legion-panel textarea{resize:vertical;min-height:110px}
      .legion-tabs{display:flex;gap:5px;overflow:auto;border-bottom:1px solid var(--lp-border);margin:27px 0 25px;padding-bottom:10px}.legion-tabs button{border:0;white-space:nowrap;background:none;color:var(--lp-muted)}.legion-tabs button[aria-selected=true]{background:var(--lp-card);color:var(--lp-fg);font-weight:600}
      .legion-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.legion-card{border:1px solid var(--lp-border);border-radius:14px;padding:19px;min-width:0;background:var(--lp-bg)}.legion-card.chosen{border-color:var(--lp-accent);background:var(--lp-card)}.legion-card .legion-title{display:flex;align-items:flex-start;gap:10px}.legion-title>div{min-width:0;flex:1}.legion-card p,.legion-panel code,.legion-panel a{overflow-wrap:anywhere}.legion-card p.description{color:var(--lp-muted);font-size:13px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      .legion-badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.legion-badge{font-size:11px;line-height:1.4;padding:4px 7px;background:var(--lp-card);border:1px solid var(--lp-border);border-radius:6px}.legion-badge.good{color:var(--lp-accent)}
      .legion-callout{border-left:3px solid var(--lp-accent);border-radius:4px;background:var(--lp-card);padding:13px 16px;margin:17px 0}.legion-error{border:1px solid var(--dsw-alias-border-l2,#b87566);background:var(--lp-card);border-radius:10px;padding:12px 15px;margin:12px 0;overflow-wrap:anywhere}.legion-empty{background:var(--lp-card);border:1px dashed var(--lp-border);border-radius:14px;padding:29px;color:var(--lp-muted);margin:16px 0}
      .legion-panel a{color:var(--lp-accent);text-decoration:underline;text-underline-offset:3px}.legion-panel code{font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px}.legion-panel details{border-top:1px solid var(--lp-border);padding-top:12px;margin-top:14px}.legion-panel summary{cursor:pointer;font-size:12px;color:var(--lp-muted)}.legion-panel pre{font-size:11px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;max-height:360px;overflow:auto;background:var(--lp-card);padding:12px;border-radius:8px}
      .legion-search{flex:1;min-width:160px}.legion-form{display:grid;gap:17px;max-width:720px}.legion-field{display:grid;gap:6px}.legion-form .legion-row>label{flex:1;min-width:180px}.legion-section{margin-top:28px}.legion-list{display:grid;gap:10px}.legion-result-count{font-size:12px;color:var(--lp-muted);margin:10px 0}.legion-task{padding:15px;border:1px solid var(--lp-border);border-radius:10px}.legion-task code{display:block}.legion-panel .legion-busy{font-size:12px;color:var(--lp-muted)}
      @media(max-width:760px){.legion-wrap{padding:22px 18px 45px}.legion-grid{grid-template-columns:1fr}.legion-panel h1{font-size:25px}.legion-session{max-width:100%;width:100%}.legion-top{gap:20px}.legion-card{padding:16px}.legion-toolbar{gap:9px}.legion-tabs{margin-top:22px}.legion-form .legion-row>label{min-width:100%}}
      @media(prefers-reduced-motion:reduce){.legion-panel *{scroll-behavior:auto}}
    `

    function registerPanel(ctx) {
      const React = require('react')
      const h = React.createElement
      const t = (zh, en) => ctx.locale.resolveText({ zh, en })
      const controller = createController(ctx)
      ctx.effect(() => () => controller.dispose(), 'legion workbench state')
      for (const [key, dependencies, resolve] of [
        ['manager', ['remote.pluginManager'], child => child.remote.pluginManager],
        ['market', ['remote.pluginMarket'], child => child.remote.pluginMarket],
        ['skills', ['remote.skills'], child => child.remote.skills],
        ['configuration', ['configForms', 'remote.pluginInventory', 'remote.pluginManager'],
          child => ({ forms: child.configForms, inventory: child.remote.pluginInventory, manager: child.remote.pluginManager })],
      ]) {
        ctx.inject(dependencies, child => {
          child.effect(() => controller.attach(key, resolve(child)), `legion ${key} service`)
        })
      }
      const titleOf = value => typeof value === 'string' ? value
        : value ? ctx.locale.resolveText(value) : ''
      const Button = ({ children, onClick, disabled, primary, ...props }) =>
        h('button', { type: 'button', onClick, disabled, className: primary ? 'primary' : '', ...props }, children)
      const ErrorBox = ({ value }) => value ? h('div', { className: 'legion-error', role: 'alert' }, value) : null
      const Details = ({ value, label }) => value ? h('details', null,
        h('summary', null, label || t('查看来源与原始回执', 'Source and original receipt')),
        h('pre', null, JSON.stringify(value, null, 2))) : null
      const Empty = ({ children }) => h('div', { className: 'legion-empty' }, children)
      const PublicLink = ({ value, children }) => {
        const safe = publicLink(value)
        return safe ? h('a', { href: safe, target: '_blank', rel: 'noopener noreferrer' }, children) : null
      }
      const Badge = ({ children, good }) => h('span', { className: `legion-badge${good ? ' good' : ''}` }, children)
      const Field = ({ title, hint, children }) => h('label', { className: 'legion-field' },
        h('span', null, title), children, hint && h('span', { className: 'legion-help' }, hint))
      function Outcome({ result }) {
        if (!result) return null
        const facts = changeFacts(result)
        return h('div', { className: 'legion-callout', role: 'status' },
          h('strong', null, ({
            applied: t('原生操作已应用', 'Native operation applied'),
            'restart-required': t('已保存，需要重启 DSH 才能生效', 'Saved; DSH restart required'),
            overridden: t('设置被其他配置覆盖', 'Overridden by another configuration'),
            failed: t('操作失败，请看具体原因', 'Operation failed; see the reason'),
            cancelled: t('安装已取消并恢复文件', 'Installation cancelled and files restored'),
          })[facts.application] || t('结果待确认', 'Outcome unconfirmed')),
          h('p', { className: 'legion-help' }, `${facts.stage} · ${result.target || result.bundle || ''}`,
            facts.reason && ` · ${facts.reason}`),
          h('p', { className: 'legion-help' }, t(
            '安装、启用和真正执行是三件事。下一步查看当前会话工具，再让 DSH 实际使用。',
            'Installation, activation and execution are separate. Refresh session tools, then use the capability in DSH.')),
          ...facts.warnings.map((value, index) => h('p', { key: index }, value)),
          result.pendingBuilds?.length ? h('p', null, t('待审批安装脚本：', 'Build scripts await approval: '),
            result.pendingBuilds.join(', '), t('。请在 DSH 原生插件页处理。', '. Use the native DSH Plugins page.')) : null,
          h(Details, { value: result }))
      }
      function TaskObservations({ value, sessionId, download, downloadBusy, downloadError, statusBusy }) {
        const artifacts = artifactFacts(value)
        const artifactPage = value.sections?.artifacts
        const eventPage = value.sections?.events
        const after = eventPage?.after_event_id ?? 0
        const eventNext = eventPage?.next_after_event_id
        const moreArtifacts = Number.isSafeInteger(artifactPage?.next_offset)
          && artifactPage.next_offset > (artifactPage.offset ?? 0)
        const moreEvents = eventPage?.has_more === true && Number.isSafeInteger(eventNext) && eventNext > after
        const unknown = t('未提供 / 未确认', 'Not provided / unconfirmed')
        const notes = rows(value.export_observations).filter(record)
        const runtimeTasks = rows(value.runtime?.tasks).filter(record)
        return h('section', { className: 'legion-section' },
          h('div', { className: 'legion-row between' },
            h('h2', null, t('原任务现场', 'Original task observations')),
            h(Button, { disabled: statusBusy, onClick: () => controller.taskStatus(value.task_ref) }, t('刷新原任务', 'Refresh original task'))),
          h('p', { className: 'legion-help' }, t('DSH 会话：', 'DSH session: '), h('code', null, sessionId)),
          h('p', null, t('任务引用：', 'Task reference: '), h('code', null, value.task_ref || unknown)),
          h('p', { className: 'legion-help' }, t('军团任务组：', 'Legion team: '), h('code', null, value.team_id || unknown),
            ' · ', t('连接状态：', 'Connection: '), value.connection || unknown),
          value.truncated ? h('div', { className: 'legion-callout', role: 'status' }, t(
            '当前为脱敏、限长摘要，部分原始字段已省略或截断。各区独立展示；没展示全不等于不存在。',
            'This is a redacted, bounded summary. Some fields are omitted or clipped. Sections are independent; missing does not mean absent.')) : null,
          h('h3', null, t('运行状态（不等于导出或体验验收）', 'Runtime (not export or experience acceptance)')),
          !runtimeTasks.length ? h('p', null, t('运行状态尚未完整取得。', 'Runtime observations are not fully available.')) : null,
          h('div', { className: 'legion-grid', style: { marginTop: 14 } }, ...runtimeTasks.map((task, index) =>
            h('article', { className: 'legion-card', key: task.task_id || index },
              h('h3', null, task.harness || task.assigned_harness || task.task_id || 'Task'),
              h('p', null, t('运行状态：', 'Runtime: '), task.status || unknown),
              h('p', { className: 'legion-help' }, typeof task.final === 'string' ? task.final
                : typeof task.result?.final === 'string' ? task.result.final : t('未提供作者结果文字。', 'No author result text provided.')),
              task.result?.error ? h('p', null, t('运行错误：', 'Runtime error: '), String(task.result.error)) : null))),
          typeof value.runtime?.cancelled === 'boolean' ? h('p', { className: 'legion-help' },
            t('服务取消标记（非进程核验）：', 'Service cancellation flag (not a process check): '), String(value.runtime.cancelled)) : null,
          h('div', { className: 'legion-callout' },
            h('strong', null, artifacts.complete
              ? t(`本次已观察到的正式导出记录：${artifacts.observed_count}`, `Observed export records: ${artifacts.observed_count}`)
              : t('成果清单未完整取得', 'Artifact inventory is incomplete')),
            !artifacts.complete && artifacts.items.length ? h('p', null,
              t(`当前页展示 ${artifacts.items.length} 条已观察记录。`, `Showing ${artifacts.items.length} observed records on this page.`)) : null,
            !artifacts.complete && !artifacts.items.length ? h('p', null,
              t('当前没有可展示的完整记录，不能据此认定没有成果。', 'No complete rows are available here; this does not establish that there are no artifacts.')) : null,
            h('p', { className: 'legion-help' }, t(
              '同名文件可能有不同 SHA-256 的历史记录，按原记录保留，不合并成“唯一新成品数”。文件与作者 done 都不等于体验已通过。',
              'Same-name files may have historical SHA-256 versions. Records are preserved, not merged into a count of new products. Files and author done are not experience acceptance.'))),
          ...artifacts.items.map((item, index) => h('article', { className: 'legion-task', key: item.artifact_id || index },
            h('div', { className: 'legion-row between' }, h('strong', null, item.name || unknown),
              item.download_eligible === true ? h(Button, { disabled: downloadBusy || statusBusy,
                onClick: () => controller.downloadArtifact(value.task_ref, item.artifact_id) }, t('下载文件', 'Download file')) : null),
            h('code', null, item.artifact_id || unknown),
            h('p', { className: 'legion-help' }, 'SHA-256: ', item.sha256 || unknown),
            h('p', { className: 'legion-help' }, item.download_eligible === true
              ? t('可请求下载；正式入口会再次校验归属、字节与哈希。', 'Download may be requested; the native entry rechecks ownership, bytes and hash.')
              : item.download_reason || t('下载资格未确认。', 'Download eligibility unconfirmed.')))),
          h('div', { className: 'legion-row' },
            artifactPage?.offset > 0 ? h(Button, { disabled: statusBusy,
              onClick: () => controller.taskStatus(value.task_ref, { after_event_id: after }) }, t('返回成果第一页', 'First artifact page')) : null,
            moreArtifacts ? h(Button, { disabled: statusBusy,
              onClick: () => controller.taskStatus(value.task_ref, { after_event_id: after, artifact_offset: artifactPage.next_offset }) },
            t('读取下一页成果记录', 'Next artifact page')) : null),
          h(ErrorBox, { value: downloadError }),
          download && download.task_ref === value.task_ref ? h('div', { className: 'legion-callout', role: 'status' },
            h('strong', null, t('下载命令回执（文件保存到 DSH 主机）', 'Download command receipt (file saved on the DSH host)')),
            h('pre', null, download.text),
            download.truncated ? h('p', null, t('此回执也已截断；完整回执见原对话。', 'This receipt is clipped too; see the original conversation.')) : null,
            h('p', { className: 'legion-help' }, t('下载不代表作品体验已验收。', 'Download is not experience acceptance.'))) : null,
          h('h3', null, t('导出观察与拒绝原因', 'Export observations and refusal reasons')),
          ...notes.map((note, index) => h('div', { className: 'legion-task', key: index },
            h('p', null, note.name || t('导出观察', 'Export observation'), ' · ', note.reason || note.status
              || (Number.isSafeInteger(note.exported_files) ? `exported_files=${note.exported_files}` : unknown)),
            h('p', { className: 'legion-help' }, note.scan_status || '',
              note.file_preserved === true ? t(' · 原文件保留（服务观察）', ' · Source file preserved (service observation)') : ''),
            h('code', null, note.source_path))),
          !notes.length ? h('p', { className: 'legion-help' }, value.sections?.exports?.complete === true
            ? t('本次回执未列出额外导出原因。', 'No additional export reasons were listed in this receipt.')
            : t('导出原因未完整取得，不能据此确认没有拒绝。', 'Export reasons are incomplete; absence of refusals is not established.')) : null,
          notes.length > 0 && value.sections?.exports?.complete !== true ? h('p', { className: 'legion-help' }, t(
            '以上仅为本页已取得的导出观察，尚不是完整原因清单。',
            'These are the export observations available on this page, not a complete list of reasons.')) : null,
          h('h3', null, t('事件与续读', 'Events and continuation')),
          h('p', null, t('服务事件游标：', 'Service event cursor: '),
            Number.isSafeInteger(value.next_event_id) ? value.next_event_id : unknown),
          h('p', { className: 'legion-help' }, t('服务还有更多事件：', 'More service events: '),
            typeof value.more_events === 'boolean' ? String(value.more_events) : unknown,
            ' · ', t('本页续读游标：', 'View continuation cursor: '), eventNext ?? unknown),
          moreEvents ? h(Button, { disabled: statusBusy,
            onClick: () => controller.taskStatus(value.task_ref, { after_event_id: eventNext }) }, t('读取后续事件', 'Read later events')) : null,
          h('p', { className: 'legion-help' }, t('更多进度可在原会话查看：', 'For more progress use the original conversation: '),
            h('code', null, `/legion status ${value.task_ref} ${after}`)),
          h(Details, { value, label: t('查看脱敏摘要、来源与分区截断事实', 'Redacted summary, sources and section truncation facts') }))
      }
      function Page() {
        const state = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot)
        const [tab, setTab] = React.useState('members')
        const [memberFilter, setMemberFilter] = React.useState('')
        const [candidateDraft, setCandidates] = React.useState([])
        const [candidateVersion, setCandidateVersion] = React.useState()
        const [candidateDirty, setCandidateDirty] = React.useState(false)
        const [query, setQuery] = React.useState('')
        const [sourceKind, setSourceKind] = React.useState('local')
        const [marketIndex, setMarketIndex] = React.useState('')
        const [spec, setSpec] = React.useState('')
        const [registry, setRegistry] = React.useState()
        const [repository, setRepository] = React.useState('')
        const [ref, setRef] = React.useState('')
        const [goal, setGoal] = React.useState('')
        const [configDraft, setConfigDraft] = React.useState({ baseUrl: '', tokenEnv: '', tokenFile: '' })
        const [configVersion, setConfigVersion] = React.useState()
        const [configDirty, setConfigDirty] = React.useState(false)
        const [packageFilter, setPackageFilter] = React.useState('')
        const [taskRead, setTaskRead] = React.useState(null)
        const taskStatusRegion = React.useRef(null)
        React.useEffect(() => {
          void controller.refreshSessions()
        }, [])
        React.useEffect(() => {
          if (!state.sessionId && state.sessions.ids.length === 1) {
            controller.selectSession(state.sessions.ids[0])
            void controller.loadMembers()
          }
        }, [state.sessions.ids.join('|'), state.sessionId])
        React.useEffect(() => { if (state.available.configuration) void controller.loadConfig() }, [state.available.configuration])
        React.useEffect(() => { if (state.available.manager) void controller.loadPackages() }, [state.available.manager])
        React.useEffect(() => {
          if (state.config?.status !== 'ready') return
          const value = state.config.value || {}
          if (!candidateDirty) {
            setCandidates(rows(value.candidateHarnesses))
            setCandidateVersion({ entryId: state.configEntry, namespace: state.configNamespace, revision: state.config.revision })
          }
          if (!configDirty) {
            setConfigDraft({ baseUrl: value.baseUrl || '', tokenEnv: value.tokenEnv || '', tokenFile: value.tokenFile || '' })
            setConfigVersion({ entryId: state.configEntry, namespace: state.configNamespace, revision: state.config.revision })
          }
        }, [state.config, state.configEntry, state.configNamespace, candidateDirty, configDirty])
        React.useEffect(() => {
          if (!taskRead) return
          if (tab !== 'tasks' || taskRead.sessionId !== state.sessionId) {
            setTaskRead(null)
            return
          }
          if (!taskRead.settled) return
          setTaskRead(null)
          if (state.busy.taskStatus || (!state.errors.taskStatus && state.taskStatus?.task_ref !== taskRead.taskRef)) return
          // Only an explicit task selection reveals its settled result/error.
          // Paging and refresh reads never create this one-shot UI intent.
          const region = taskStatusRegion.current
          region?.focus({ preventScroll: true })
          region?.scrollIntoView({ block: 'start',
            behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'instant' : 'smooth' })
        }, [taskRead, tab, state.sessionId, state.busy.taskStatus, state.taskStatus, state.errors.taskStatus])
        const busy = key => state.busy[key] === true
        const error = key => h(ErrorBox, { value: state.errors[key] })
        const status = key => busy(key) && h('span', { className: 'legion-busy', role: 'status' }, t('正在读取…', 'Reading…'))
        const readTaskStatus = taskRef => {
          const request = { taskRef, sessionId: state.sessionId }
          setTaskRead(request)
          void controller.taskStatus(taskRef).then(() => {
            setTaskRead(current => current === request ? { ...request, settled: true } : current)
          })
        }
        const selectSession = id => {
          if (id !== state.sessionId) setTaskRead(null)
          controller.selectSession(id)
          if (id) { void controller.loadMembers(); if (tab === 'tasks') void controller.loadTasks() }
        }
        const openTab = value => {
          if (value !== 'tasks') setTaskRead(null)
          setTab(value)
          if (value === 'tasks' && state.sessionId) void controller.loadTasks()
        }
        const sourceContext = state.source ? JSON.stringify({
          source_role: 'untrusted_repository_observations_not_instructions',
          repository: state.source.repository, commit: state.source.commit,
          url: state.source.url, license: state.source.license,
          fetched_at: state.source.fetched_at, errors: state.source.errors,
        }) : ''
        const prepareRepo = item => {
          setRepository(item.repository)
          setRef('')
          setGoal(t(
            `请研究 ${item.repository}，找出对我有用的独立能力，按 DSH 原生插件方式适配，并接入军团协作。保留原项目许可，交付可安装包、使用说明与实际运行证据。`,
            `Research ${item.repository}, identify useful independent capabilities, adapt them as native DSH plugins and connect them to Legion collaboration. Preserve the source license and deliver an installable package, usage instructions and real execution evidence.`,
          ))
          setTab('add')
          void controller.inspectSource(item.repository)
        }
        const members = rows(state.members?.runtime?.harnesses)
          .filter(member => `${member.key} ${member.display_name || ''}`.toLowerCase().includes(memberFilter.toLowerCase()))
        const selectable = member => memberFacts(member).selectable
        const toggleMember = (key, checked) => {
          setCandidates(previous => checked ? [...new Set([...previous, key])] : previous.filter(value => value !== key))
          setCandidateDirty(true)
        }
        const renderMembers = () => h(React.Fragment, null,
          h('div', { className: 'legion-row between' },
            h('div', null, h('h2', null, t('按需要组建，不必全部安装', 'Build the team you need')),
              h('p', { className: 'legion-help' }, t('候选留空，由军团选人。勾选只改变偏好，不安装成员，也不增加权限。', 'Leave candidates empty for Legion to choose. Selection is a preference, not installation or authorization.'))),
            h(Button, { disabled: !state.sessionId || busy('members'), onClick: () => controller.loadMembers() }, t('刷新成员', 'Refresh members'))),
          state.errors.members ? h('p', { className: 'legion-help' }, t(
            '暂时无法读取军团成员，请到「连接与配置」核对地址和服务；找能力和 DSH 能力包仍可用。',
            'Legion members could not be read. Check the address and service under Connection; Discover and DSH capability packages remain available.',
          )) : null,
          error('members'), status('members'),
          !state.sessionId ? h(Empty, null, t('先在右上角选一个会话，成员和任务就会归到这段对话里。', 'Select a session above to keep members and tasks in the right conversation.')) : null,
          state.members?.runtime?.warming || state.members?.runtime?.stale ? h('div', { className: 'legion-callout' },
            t('核心正在预热，或正在返回缓存。下面保留真实未知状态；需要时可刷新。', 'The core is warming or serving cached facts. Unknowns stay unknown; refresh when needed.')) : null,
          h('div', { className: 'legion-toolbar' },
            h('div', { className: 'legion-search' }, h('input', { value: memberFilter,
              onChange: event => setMemberFilter(event.target.value), placeholder: t('按成员名称筛选', 'Filter member names'), 'aria-label': t('筛选成员', 'Filter members') })),
            h(Button, { disabled: busy('configSave'), onClick: () => { setCandidates([]); setCandidateDirty(true) } }, t('交给军团选人', 'Let Legion choose')),
            h(Button, { primary: true, disabled: !candidateDirty || !state.config?.writable || busy('configSave'),
              onClick: async () => {
                const accepted = await controller.saveConfig({ candidateHarnesses: candidateDraft },
                  candidateVersion?.revision, candidateVersion?.entryId, candidateVersion?.namespace)
                if (accepted) setCandidateDirty(false)
              } }, t(`保存选择（${candidateDraft.length}）`, `Save selection (${candidateDraft.length})`)),
            candidateDirty ? h(Button, { disabled: busy('configSave'), onClick: () => setCandidateDirty(false) },
              t('放弃未保存选择', 'Discard unsaved selection')) : null),
          error('configSave'), error('config'),
          candidateDraft.length ? h('p', { className: 'legion-help' }, t('当前候选：', 'Candidates: '), candidateDraft.join(', ')) : null,
          state.members && !members.length ? h(Empty, null, t('本次没有匹配的成员；这不代表其他成员已安装或可用。', 'No matching members in this observation.')) : null,
          h('div', { className: 'legion-grid' }, ...members.map(member => {
            const facts = memberFacts(member)
            const selected = candidateDraft.includes(member.key)
            return h('article', { key: member.key, className: `legion-card${selected ? ' chosen' : ''}` },
              h('label', { className: 'legion-title' },
                h('input', { type: 'checkbox', checked: selected, disabled: !selectable(member) || !state.config?.writable || busy('configSave'),
                  'aria-label': `${t('选择成员', 'Select member')} ${member.display_name || member.key}`,
                  onChange: event => toggleMember(member.key, event.target.checked) }),
                h('div', null, h('h3', null, member.display_name || member.key), h('code', { className: 'legion-muted' }, member.key))),
              h('p', { className: 'description' }, member.profile?.intro || member.description || t('服务未提供介绍', 'No description from the service')),
              h('div', { className: 'legion-badges' },
                h(Badge, null, facts.installed === true ? t('已安装', 'Installed') : facts.installed === false ? t('未安装', 'Not installed') : t('安装状态未知', 'Installation unknown')),
                h(Badge, { good: facts.connected === true }, facts.connected === true ? t('连接已观察', 'Connection observed') : facts.connected === false ? t('尚未连接', 'Not connected') : t('连接未知', 'Connection unknown')),
                h(Badge, { good: facts.verified === true }, facts.verified === true ? t('服务记录过验证', 'Service reports verification') : t('未验证执行', 'Execution unverified')),
                !facts.selectable && h(Badge, null, t('工具来源，不是执行成员', 'Tool source, not an execution member'))),
              member.model?.display_name || member.model?.model ? h('p', { className: 'legion-help' },
                t('当前模型：', 'Current model: '), member.model.display_name || member.model.model) : null,
              h(Details, { value: { ...facts, readiness: member.readiness, entry_points: member.entry_points } }))
          })),
          h(Details, { value: state.members && { source: state.members.source, observed_at: state.members.observed_at,
            verification: state.members.verification, projection: state.members.projection } }))

        const renderSearch = () => {
          const found = state.search
          const tools = rows(found?.tools?.tools)
          return h(React.Fragment, null,
            h('h2', null, t('先找现成的，再决定要不要造', 'Discover before you build')),
            h('p', { className: 'legion-help' }, t('搜索不会安装或运行结果。开源项目可以交给军团研究，已有 DSH 包走原生安装。', 'Search does not install or execute results. Delegate repository adaptation to Legion; install DSH packages natively.')),
            h('form', { className: 'legion-toolbar', onSubmit: event => {
              event.preventDefault(); void controller.search(sourceKind, query, marketIndex || undefined)
            } },
              h('select', { value: sourceKind, style: { width: 'auto' }, 'aria-label': t('搜索来源', 'Search source'),
                onChange: event => { controller.clearSearch(); setSourceKind(event.target.value); setMarketIndex('') } },
                h('option', { value: 'local' }, t('本会话工具 / Skill', 'Session tools / Skills')),
                h('option', { value: 'github' }, 'GitHub'),
                h('option', { value: 'market' }, t('DSH 插件市场', 'DSH plugin market'))),
              h('div', { className: 'legion-search' }, h('input', { value: query, onChange: event => setQuery(event.target.value),
                'aria-label': t('搜索能力', 'Search capabilities'), placeholder: t('描述需要的能力，或输入项目名', 'A capability or a project name') })),
              h('button', { type: 'submit', className: 'primary', disabled: busy('search') || !state.sessionId
                || (sourceKind === 'github' && !query.trim()) }, busy('search') ? t('搜索中…', 'Searching…') : t('搜索', 'Search'))),
            sourceKind === 'market' && found?.indexes?.length ? h('label', { className: 'legion-field' },
              t('搜索哪个已配置市场', 'Configured market to search'),
              h('select', { value: marketIndex || found.url, onChange: event => setMarketIndex(event.target.value) },
                ...found.indexes.map(index => h('option', { value: index.url, key: index.url }, titleOf(index.title) || index.url)))) : null,
            error('search'), !state.sessionId ? h(Empty, null, t('选择会话后开始搜索。无需连接军团核心，也能搜索 GitHub 和本地能力。', 'Choose a session to search. GitHub and local discovery do not need a Legion core connection.')) : null,
            !found && state.sessionId && !busy('search') && !state.errors.search ? h(Empty, null, t('试着搜索你真正想完成的事，例如“读懂这个代码仓库”。也可以留空查看本会话已有能力。', 'Search for the job you want done, or leave the local query empty to see available capabilities.')) : null,
            ...(found?.errors || []).map((value, index) => h(ErrorBox, { key: index, value })),
            found?.kind === 'local' ? h(React.Fragment, null,
              h('p', { className: 'legion-result-count' }, t(`当前返回 ${tools.length} 个工具、${rows(found.skills).length} 个 Skill。工具可见不代表已经成功执行。`, `${tools.length} tools and ${rows(found.skills).length} skills returned. Visibility is not successful execution.`)),
              h('div', { className: 'legion-grid' },
                ...tools.map(tool => h('article', { className: 'legion-card', key: `tool:${tool.name}` },
                  h('div', { className: 'legion-row between' }, h('h3', null, tool.name), h(Badge, null, 'Tool')),
                  h('p', { className: 'description' }, tool.description || t('无描述', 'No description')),
                  h('p', { className: 'legion-help' }, t('当前会话可见 · 由 DSH 原生权限控制执行', 'Visible in this session · execution uses DSH permissions')))),
                ...rows(found.skills).map(skill => h('article', { className: 'legion-card', key: `skill:${skill.name}` },
                  h('div', { className: 'legion-row between' }, h('h3', null, skill.name), h(Badge, null, 'Skill')),
                  h('p', { className: 'description' }, skill.description),
                  h('p', { className: 'legion-help' }, t('指导模型怎么做，不等于新增执行工具', 'Guidance for the model, not an additional execution tool'))))),
              found.tools?.next_offset != null ? h('p', { className: 'legion-help' },
                t('结果还有后续；请缩小搜索范围，或用 legion_discover 分页查看。', 'More results exist. Refine your query or page through legion_discover.')) : null,
              h(Details, { value: found.tools && { ...found.tools, tools: undefined } })) : null,
            found?.kind === 'github' ? h(React.Fragment, null,
              h('p', { className: 'legion-result-count' }, t(`返回 ${rows(found.repositories).length} / ${found.total_count ?? '?'} 个公开仓库`, `${rows(found.repositories).length} / ${found.total_count ?? '?'} public repositories`),
                found.truncated && t(' · 仅展示首批，请缩小搜索范围', ' · First page only; refine your query')),
              !rows(found.repositories).length ? h(Empty, null, t('本次没有结果。换一个更具体的搜索词试试。', 'No results. Try a more specific search.')) : null,
              h('div', { className: 'legion-grid' }, ...rows(found.repositories).map(item => h('article', { className: 'legion-card', key: item.repository },
                h('h3', null, h(PublicLink, { value: item.url }, item.repository)),
                h('p', { className: 'description' }, item.description),
                h('div', { className: 'legion-badges' }, item.language && h(Badge, null, item.language),
                  h(Badge, null, item.license?.spdx_id || t('许可待检查', 'License to inspect')),
                  item.archived && h(Badge, null, t('已归档', 'Archived'))),
                h('div', { className: 'legion-toolbar' }, h(Button, { onClick: () => prepareRepo(item) }, t('检查并交给军团', 'Inspect & delegate')))))),
              h(Details, { value: { source: found.source, status: found.status, fetched_at: found.fetched_at,
                incomplete_results: found.incomplete_results, truncated: found.truncated } })) : null,
            found?.kind === 'market' ? h(React.Fragment, null,
              found.unavailable ? h(Empty, null,
                t('当前 DSH 没有提供市场服务，可能尚未启用或版本不匹配。请在 DSH 插件页检查市场组件；本会话工具、Skill 和 GitHub 搜索仍可使用。', 'This DSH host does not provide the market service. It may be disabled or incompatible. Check the market component in DSH Plugins; session tools, Skills and GitHub search remain available.'),
                h('p', null, h(Button, { onClick: () => ctx.layout.selectPanel('plugins') }, t('打开 DSH 插件页', 'Open DSH Plugins'))),
                h(Details, { value: { reason: found.reason, diagnostic: found.diagnostic } })) : null,
              found.unconfigured ? h(Empty, null,
                t('尚未配置插件市场。打开 DSH 插件页添加可信市场后再查；不会擅自替你加入来源。', 'No configured market. Add a trusted index in DSH Plugins first; sources are not added automatically.'),
                h('p', null, h(Button, { onClick: () => ctx.layout.selectPanel('plugins') }, t('打开 DSH 插件页', 'Open DSH Plugins')))) : null,
              !found.unconfigured && !found.unavailable ? h('p', { className: 'legion-result-count' },
                `${titleOf(found.title)} · ${rows(found.entries).length} / ${found.total ?? '?'}`) : null,
              h('div', { className: 'legion-grid' }, ...rows(found.entries).map(item => {
                const version = rows(item.versions).find(version => version.version === item.defaultVersion)
                return h('article', { className: 'legion-card', key: item.name },
                  h('h3', null, titleOf(item.title) || item.name), h('code', null, item.name),
                  h('p', { className: 'description' }, titleOf(item.description)),
                  h('div', { className: 'legion-badges' }, h(Badge, null, item.installation?.status || 'unknown'),
                    h(Badge, null, version?.version || t('无兼容默认版本', 'No compatible default version'))),
                  h('div', { className: 'legion-toolbar' },
                    h(Button, { disabled: !version?.install, onClick: () => {
                      setSpec(version.install.spec); setRegistry(version.install.registry); setTab('add')
                      void controller.inspectPackage(version.install.spec, version.install.registry)
                    } }, t('查看安装来源', 'Review install source')),
                    h(PublicLink, { value: item.repository?.url || item.homepage }, t('项目说明', 'Project'))))
              })),
              found.nextOffset != null ? h('p', { className: 'legion-help' }, t('还有更多结果。请缩小搜索范围，或打开 DSH 插件页继续浏览。', 'More results exist. Refine the query or continue in DSH Plugins.')) : null) : null)
        }

        const renderPackages = () => h('section', { className: 'legion-section' },
          h('div', { className: 'legion-row between' }, h('h2', null, t('已安装的 DSH 能力包', 'Installed DSH capability bundles')),
            h(Button, { disabled: busy('packages') || !state.available.manager, onClick: () => controller.loadPackages() }, t('刷新能力包', 'Refresh bundles'))),
          h('p', { className: 'legion-help' }, t('包开关和子插件开关分开。开启后重新搜索本会话工具，核对实际是否可见。', 'Bundle and individual plugin switches are separate. Refresh session tools after activation.')),
          error('packages'), error('packageChange'),
          h('div', { className: 'legion-toolbar' }, h('input', { value: packageFilter, onChange: event => setPackageFilter(event.target.value),
            'aria-label': t('筛选能力包', 'Filter bundles'), placeholder: t('按包名筛选', 'Filter package names') })),
          h('div', { className: 'legion-list' }, ...rows(state.packages)
            .filter(bundle => bundle.availability !== 'missing'
              && `${bundle.name} ${bundle.description || ''}`.toLowerCase().includes(packageFilter.toLowerCase()))
            .map(bundle => h('article', { className: 'legion-card', key: bundle.name },
              h('div', { className: 'legion-row between' }, h('h3', null, bundle.name),
                h(Button, { disabled: !!bundle.readOnlyReason || bundle.name === 'dsh-plugin-legion' || busy('packageChange')
                  || busy('install') || state.installUncertain,
                onClick: () => controller.changePackage('bundle', bundle.name, !bundle.enabled) },
                bundle.enabled ? t('停用能力包', 'Disable bundle') : t('启用能力包', 'Enable bundle'))),
              h('p', { className: 'legion-help' }, bundle.version || '', ' · ',
                bundle.installed ? t('已安装到此配置', 'Installed in profile') : t('DSH 随附', 'Provided by DSH'),
                ' · ', bundle.enabled ? t('已选择启用', 'Selected') : t('未启用', 'Not selected')),
              bundle.description && h('p', { className: 'description' }, bundle.description),
              bundle.error ? h(ErrorBox, { value: errorText(bundle.error) }) : null,
              rows(bundle.rows).length ? h('details', null, h('summary', null, t('查看子插件与加载状态', 'Individual plugins and loading state')),
                ...bundle.rows.map(row => {
                  const live = rows(state.plugins).find(plugin => row.entryId && plugin.entryId === row.entryId)
                  return h('div', { className: 'legion-row between', style: { marginTop: 10 }, key: row.rowId },
                    h('code', null, row.moduleName),
                    h('span', { className: 'legion-help' }, live?.fiberPhase || t('未加载', 'Not loaded')),
                    h(Button, { disabled: !live || !!live.readOnlyReason || bundle.name === 'dsh-plugin-legion'
                      || busy('packageChange') || busy('install') || state.installUncertain,
                    onClick: () => controller.changePackage('plugin', live.entryId, !live.enabled) },
                    live?.enabled ? t('停用子插件', 'Disable plugin') : t('启用子插件', 'Enable plugin')))
                })) : null))))

        const renderAdd = () => h(React.Fragment, null,
          h('h2', null, t('已经是插件，直接安装；还不是，交给军团', 'Install a plugin, or ask Legion to adapt a project')),
          h('div', { className: 'legion-grid', style: { marginTop: 18 } },
            h('section', { className: 'legion-card' }, h('h3', null, t('安装现成 DSH 包', 'Install an existing DSH bundle')),
              h('p', { className: 'legion-help' }, t('支持包名、Git 仓库和本地包。检查只说明格式或元数据，不等于代码可信。', 'Use a package name, Git source or local bundle. Inspection checks format or metadata, not code trust.')),
              h(Field, { title: t('安装来源', 'Install source') }, h('input', { value: spec,
                placeholder: 'dsh-plugin-example@1.0.0', onChange: event => { setSpec(event.target.value); setRegistry(undefined) } })),
              h('div', { className: 'legion-toolbar' },
                h(Button, { disabled: !spec.trim() || busy('inspect') || busy('install') || state.installUncertain || !state.available.manager,
                  onClick: () => controller.inspectPackage(spec.trim(), registry) }, busy('inspect') ? t('检查中…', 'Inspecting…') : t('检查来源', 'Inspect source')),
                h(Button, { primary: true, disabled: state.inspection?.result?.status !== 'accepted' || state.inspection?.spec !== spec.trim()
                  || busy('install') || state.installUncertain, onClick: () => controller.installPackage() },
                  busy('install') ? t('原生安装中…', 'Installing natively…') : t('安装 / 更新', 'Install / update'))),
              h('p', { className: 'legion-help' }, t(
                '新包不会自动选择启用；更新保留已有开关，已启用包可能继续运行。若不希望更新后的代码运行，请先在下方停用对应能力包，再安装更新。',
                'New bundles are not automatically selected for activation. Updates preserve existing enablement, so enabled bundles may keep running. To prevent updated code from running, disable the bundle below before installing the update.',
              )),
              !state.available.manager ? h(Empty, null, t('此 DSH 未开放原生插件管理。请检查当前预设。', 'Native plugin management is not available in this DSH preset.')) : null,
              error('inspect'), error('install'), error('installRecovery'),
              state.inspection && h('p', { className: 'legion-help' },
                state.inspection.result.status === 'accepted' ? t('来源检查通过；请确认你信任此包，再点击安装。', 'Source accepted. Confirm you trust it before installing.') : t('来源被拒绝：', 'Source refused: '),
                state.inspection.result.reason || ''),
              state.inspection && h(Details, { value: state.inspection }),
              state.installId && (busy('install') || state.installUncertain) ? h('div', { className: 'legion-callout' },
                t('保留本次安装编号，断线后先查它，不重复安装。', 'Keep this install ID; recover it after a disconnect instead of reinstalling.'),
                h('code', { style: { display: 'block' } }, state.installId),
                h('div', { className: 'legion-toolbar' },
                  h(Button, { disabled: busy('installRecovery'), onClick: () => controller.recoverInstall() }, t('读取本次安装结果', 'Recover install result')),
                  h(Button, { disabled: busy('installCancel'), onClick: () => controller.cancelInstall() }, t('请求取消安装', 'Request cancellation'))),
                state.installCancellation && h(Details, { value: state.installCancellation }), error('installCancel')) : null,
              state.installCancellation?.status === 'cancelled' ? h('p', { className: 'legion-help', role: 'status' },
                t('本次安装已取消，主机已确认文件恢复。', 'This installation was cancelled; the host confirmed its files were restored.')) : null),
            h('section', { className: 'legion-card' }, h('h3', null, t('把开源项目变成可用能力', 'Turn a public project into a useful capability')),
              h('p', { className: 'legion-help' }, t('不是把全部文件硬拆成工具。军团研究接口和许可，再按目标适配；下面的任务可以自己改。', 'Not every source file becomes a tool. Legion researches interfaces and licenses, then adapts what the goal needs. Edit the task below.')),
              h(Field, { title: t('GitHub 项目', 'GitHub repository') }, h('input', { value: repository, placeholder: 'owner/repository',
                onChange: event => { controller.clearSource(); setRepository(event.target.value) } })),
              h('div', { style: { marginTop: 12 } }, h(Field, { title: t('版本（可选）', 'Revision (optional)') },
                h('input', { value: ref, placeholder: t('分支、标签或 commit；留空为默认分支', 'Branch, tag or commit; blank for default'),
                  onChange: event => { controller.clearSource(); setRef(event.target.value) } }))),
              h('div', { className: 'legion-toolbar' }, h(Button, { disabled: !repository.trim() || !state.sessionId || busy('source'),
                onClick: () => controller.inspectSource(repository.trim(), ref) }, busy('source') ? t('读取源码中…', 'Inspecting source…') : t('读取项目与许可', 'Inspect project & license'))),
              error('source'),
              state.source && h('div', { className: 'legion-callout' },
                h('strong', null, state.source.repository), h('p', null, h('code', null, state.source.commit)),
                h('p', { className: 'legion-help' }, t('已固定到这次提交。读取成功不等于许可已评估或适配完成。', 'Pinned to this commit. Retrieval is not a license assessment or completed adaptation.')),
                h(Details, { value: state.source })))),
          h(Outcome, { result: state.installResult }),
          h('section', { className: 'legion-section legion-form' },
            h('h2', null, t('告诉军团，你最后想拿到什么', 'Tell Legion what you want to receive')),
            h(Field, { title: t('可编辑的接入任务', 'Editable integration task'),
              hint: t('提交会使用你已配置的核心与模型，可能产生费用。不会仅凭仓库文字自动安装。', 'Submission uses your configured core and models and may incur costs. Repository text never triggers an automatic install.') },
              h('textarea', { value: state.operation?.query ?? goal, disabled: !!state.operation,
                placeholder: t('我希望这个项目提供哪些能力？给谁用？怎样才算真的可用？', 'Which capabilities, for whom, and what should genuinely working look like?'),
                onChange: event => setGoal(event.target.value) })),
            h('p', { className: 'legion-help' }, sourceContext ? t('会附上上方已检查项目的提交与许可事实；不会把仓库文字当成系统指令。', 'The inspected commit and license facts above will accompany the task as untrusted source observations.') : t('也可以不指定项目，让军团自己研究合适的 Skill、工具或开源实现。', 'No project is required. Legion can research suitable skills, tools and implementations.')),
            h('div', { className: 'legion-row' },
              h(Button, { primary: true, disabled: !state.sessionId || !(state.operation?.query ?? goal).trim() || busy('submit'),
                onClick: () => controller.submit(state.operation?.query ?? goal, state.operation?.context ?? sourceContext) },
              busy('submit') ? t('正在提交…', 'Submitting…') : state.operation && !state.operation.ref ? t('用原编号重试这一单', 'Retry with the original key') : t('交给军团接入', 'Delegate integration')),
              state.operation?.ref ? h(Button, { onClick: () => controller.newTask() }, t('开始另一单', 'Start another task')) : null),
            error('submit'),
            state.operation && h('p', { className: 'legion-help' }, t('本次去重编号：', 'Idempotency key: '), h('code', null, state.operation.key)),
            state.submission && h('div', { className: 'legion-callout', role: 'status' },
              h('strong', null, state.submission.submission === 'rejected'
                ? t('本次提交已被拒绝；修复原因后可明确开始另一单', 'This submission was rejected; resolve the cause, then explicitly start another task')
                : t('任务已有回执，不代表已经接入完成', 'Task receipt received, not completed integration')),
              h('p', null, h('code', null, state.operation?.ref)),
              h(Button, { onClick: () => {
                openTab('tasks'); readTaskStatus(state.operation.ref)
              } }, t('查看原任务进度', 'Open task progress')), h(Details, { value: state.submission }))),
          renderPackages())

        const renderTasks = () => h(React.Fragment, null,
          h('div', { className: 'legion-row between' }, h('h2', null, t('每项接入都有原任务可追', 'Follow each integration back to its task')),
            h(Button, { disabled: !state.sessionId || busy('tasks'), onClick: () => controller.loadTasks() }, t('刷新任务列表', 'Refresh tasks'))),
          h('p', { className: 'legion-help' }, t('列表来自本会话的恢复索引。点击一项再查实时状态；done、文件导出和体验验收分别查看。', 'This list is the session recovery index. Open a task for live facts; done, exports and experience verification remain separate.')),
          error('tasks'), status('tasks'),
          state.tasks && !rows(state.tasks.tasks).length ? h(Empty, null, t('本会话尚无军团任务。', 'No Legion tasks in this session.')) : null,
          h('div', { className: 'legion-list' }, ...rows(state.tasks?.tasks).map(task => h('article', { className: 'legion-task', key: task.task_ref },
            h('div', { className: 'legion-row between' },
              h('div', null, h('strong', null, task.key), h('code', { className: 'legion-muted' }, task.task_ref)),
              h(Button, { disabled: busy('taskStatus'), 'aria-controls': 'legion-task-status',
                onClick: () => readTaskStatus(task.task_ref) }, t('读取实时进度', 'Read live progress'))),
            taskRead?.sessionId === state.sessionId && taskRead.taskRef === task.task_ref ? status('taskStatus') : null,
            h('p', { className: 'legion-help' }, task.created_at)))),
          h('section', { id: 'legion-task-status', ref: taskStatusRegion, tabIndex: -1,
            'aria-label': t('原任务状态', 'Original task status'), 'aria-busy': busy('taskStatus') },
            error('taskStatus'), status('taskStatus'),
            state.taskStatus && h(TaskObservations, { value: state.taskStatus, sessionId: state.sessionId,
              download: state.download, downloadBusy: busy('download'), downloadError: state.errors.download, statusBusy: busy('taskStatus') })))

        const renderConfig = () => h(React.Fragment, null,
          h('div', { className: 'legion-row between' }, h('h2', null, t('连接你自己的军团核心', 'Connect your own Legion core')),
            h(Button, { disabled: busy('config') || !state.available.configuration, onClick: () => controller.loadConfig() }, t('重新读取配置', 'Reload configuration'))),
          h('p', { className: 'legion-lead' }, t('这个公开插件是 DSH 的入口，不会偷偷下载私有核心，也不捆绑所有外部成员。没有核心也能找 Skill、搜索 GitHub、管理 DSH 能力包。', 'This public plugin is the DSH entry. It does not download the private core or bundle every external member. Skills, GitHub discovery and native bundle management work without a core.')),
          h('div', { className: 'legion-toolbar' },
            h(PublicLink, { value: 'https://github.com/seanliii/dsh-plugin-legion/blob/main/docs/CORE.md' }, t('核心范围与接入说明', 'Core scope and connection guide')),
            h(Button, { onClick: () => ctx.layout.selectPanel('plugins') }, t('DSH 原生插件设置', 'Native DSH Plugins'))),
          error('config'), error('configSave'), status('config'),
          !state.available.configuration ? h(Empty, null, t('此主机未提供可编辑的原生配置。请检查 DSH Settings 和插件管理是否已启用。', 'Native editable configuration is unavailable. Check DSH Settings and plugin management.')) : null,
          state.config?.status === 'ready' ? h('form', { className: 'legion-form', onSubmit: async event => {
            event.preventDefault()
            const accepted = await controller.saveConfig(configDraft, configVersion?.revision, configVersion?.entryId, configVersion?.namespace)
            if (accepted) setConfigDirty(false)
          } },
            ...[
              ['baseUrl', t('核心地址', 'Core URL'), 'http://127.0.0.1:8000',
                t('留空沿用环境配置。HTTP 只允许本机回环地址；其他地址须使用 HTTPS。', 'Blank inherits the environment. HTTP is loopback-only; other hosts require HTTPS.')],
              ['tokenEnv', t('令牌环境变量名', 'Token environment variable name'), 'LEGION_PERSONAL_TOKEN',
                t('只填变量名字，不填令牌。令牌由 DSH 主机读取。', 'Enter the variable name, never the token. The DSH host reads it.')],
              ['tokenFile', t('或：私有令牌文件路径', 'Or: private token file path'), t('可选，本机绝对路径', 'Optional absolute host path'),
                t('设置后优先用文件；要求本人所有、0600 权限。页面不会读取或展示文件内容。', 'When set, the file takes priority. It must be owned by you with mode 0600. The page never reads or displays its contents.')],
            ].map(([key, title, placeholder, hint]) => h(Field, { key, title, hint },
              h('input', { value: configDraft[key], placeholder, autoComplete: 'off', spellCheck: false,
                disabled: !state.config.writable || busy('configSave'), onChange: event => {
                  setConfigDraft(previous => ({ ...previous, [key]: event.target.value })); setConfigDirty(true)
                } }))),
            h('div', { className: 'legion-callout' }, t('保存会重载连接器，并停止本地正在等待的请求；远端任务不会被取消。更换令牌不会继承旧身份的任务引用。', 'Saving reloads the connector and ends local pending requests, not remote tasks. A new token does not inherit the previous identity’s task references.')),
            h('div', { className: 'legion-row' }, h('button', { type: 'submit', className: 'primary', disabled: !configDirty || !state.config.writable || busy('configSave') },
              busy('configSave') ? t('保存中…', 'Saving…') : t('保存连接配置', 'Save connection')),
            configDirty ? h(Button, { disabled: busy('configSave'), onClick: () => setConfigDirty(false) }, t('放弃未保存修改', 'Discard unsaved edits')) : null),
            state.configSaved ? h('p', { role: 'status', className: 'legion-help' }, t('原生配置已接受并读回；连接可用性请再刷新成员核对。', 'Native configuration accepted and read back. Refresh members to check connectivity.')) : null,
            h('p', { className: 'legion-help' }, t('配置版本：', 'Configuration revision: '), state.config.revision)) : null)

        return h('div', { className: 'legion-panel', 'data-legion-workbench': true },
          h('style', null, styles),
          h('div', { className: 'legion-wrap' },
            h('header', { className: 'legion-top' },
              h('div', null, h('div', { className: 'legion-eyebrow' }, 'LEGION / DSH'),
                h('h1', null, t('让能力成为一支团队', 'Turn capabilities into a team')),
                h('p', { className: 'legion-lead' }, t('选择合适的成员，找到缺少的能力。研究与实现交给军团，配置和进展在这里看清楚。', 'Choose members and discover what is missing. Delegate research and implementation to Legion; keep configuration and progress clear.'))),
              h('label', { className: 'legion-session' }, h('span', { className: 'legion-help' }, t('当前工作会话', 'Working session')),
                h('select', { value: state.sessionId, 'aria-label': t('当前工作会话', 'Working session'), onChange: event => selectSession(event.target.value) },
                  h('option', { value: '' }, t('请选择会话', 'Select a session')),
                  ...state.sessions.ids.map(id => h('option', { value: id, key: id }, sessionLabel(state.sessions, id)))),
                !state.sessions.ids.length ? h('span', { className: 'legion-help' }, t('请先在 DSH 新建一个对话，再刷新。', 'Create a DSH conversation first, then refresh.')) : null,
                h(Button, { disabled: busy('sessions'), onClick: () => controller.refreshSessions() }, t('刷新会话', 'Refresh sessions')))),
            error('sessions'),
            h('nav', { className: 'legion-tabs', role: 'tablist', 'aria-label': t('军团工作台', 'Legion workbench') },
              ...[
                ['members', t('我的军团', 'My Legion')], ['search', t('找能力', 'Discover')], ['add', t('添加能力', 'Add capabilities')],
                ['tasks', t('接入任务', 'Integration tasks')], ['config', t('连接与配置', 'Connection')],
              ].map(([id, label]) => h(Button, { role: 'tab', key: id, 'aria-selected': tab === id,
                'aria-controls': `legion-tab-${id}`, onClick: () => openTab(id) }, label))),
            h('div', { id: `legion-tab-${tab}`, role: 'tabpanel' },
              tab === 'members' ? renderMembers() : tab === 'search' ? renderSearch() : tab === 'add' ? renderAdd()
                : tab === 'tasks' ? renderTasks() : renderConfig())))
      }
      const Icon = () => h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M12 7v5M5 17l7-5 7 5', stroke: 'currentColor', strokeWidth: 1.6 }),
        ...[[12, 5], [4.5, 18], [19.5, 18]].map(([cx, cy]) => h('circle', {
          key: cx, cx, cy, r: 3, stroke: 'currentColor', strokeWidth: 1.6,
        })))
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'legion', inject: () => ({}) }, Page))
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: 'legion', order: 10, label: () => t('军团', 'Legion'),
      }, Icon))
    }

    return {
      name: 'legion-command-notice',
      workbench: { configEntry, sessionLabel, memberFacts, publicLink, configOperations, changeFacts, artifactFacts, createController },
      inject: ['commandUi', 'sessions', 'conversation', 'locale'],
      apply(ctx) {
        // This event is a local submission acknowledgment, not history replay.
        // Cordis owns the observer and removes it when this fiber is disposed.
        ctx.on('command/executed', (sessionId, name, result) => {
          if (name !== 'legion' || typeof sessionId !== 'string' || !sessionId) return
          if (result?.kind !== 'success' && result?.kind !== 'error') return
          try {
            const actx = ctx.sessions.scope(sessionId)
            const conversation = actx?.get('conversation')
            if (!conversation) return
            conversation.input.for(actx).notify(
              result.kind === 'error' ? 'error' : 'info',
              notice(ctx.locale, result),
            )
          } catch {
            // A released session/input must not redirect the receipt or alter
            // the command outcome. Never log its possibly sensitive payload.
          }
        })
        // Keep headless/partial clients working. UI services activate a child
        // only where DSH provides actual allocated panel slots.
        ctx.inject(['slots', 'layout', 'remote', 'remote.commands'], registerPanel)
      },
    }
  },
})
