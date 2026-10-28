// Dependency-free DSH client bundle: register a lazy factory, just like the
// native client extensions. No Host SDK, configuration, credentials or requests.
window.__ModuleLoader__.load({
  id: 'dsh-plugin-legion',
  factory: () => {
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

    return {
      name: 'legion-command-notice',
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
      },
    }
  },
})
