import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

// 执行 ChatInput 中实际的技能加载片段，避免为局部回归引入 DOM 或渲染整个输入框。
// 调用清单：chat-input/index.tsx -> fetchFavoriteList。
const source = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8')
const skillBlock = source.slice(source.indexOf('    // 懒加载技能列表'), source.indexOf('    // 懒加载 MCP 分组'))
const script = ts.transpileModule(`(() => { ${skillBlock}; return startSkillLoad; })()`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText

function setup(spaceId: number | undefined = 164, assistantSkills: unknown = null) {
  const refs: Array<{ current: unknown }> = []
  const effects: Array<{ deps: unknown[]; cleanup?: () => void }> = []
  let refIndex = 0
  let effectIndex = 0
  const pendingEffects: Array<() => void> = []
  const context = {
    spaceId,
    assistantSkills,
    getSpaceId: vi.fn(() => 160),
    fetchFavoriteList: vi.fn().mockResolvedValue({ code: 200, rows: [] }),
    setSkillList: vi.fn(),
    setSelectedSkills: vi.fn(),
    setSkillLoading: vi.fn(),
    useCallback: (fn: () => Promise<void>) => fn,
    useRef: (initial: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
    useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
      const index = effectIndex++
      const previous = effects[index]
      if (previous && deps.length === previous.deps.length && deps.every((dep, i) => dep === previous.deps[i])) return
      pendingEffects.push(() => {
        previous?.cleanup?.()
        effects[index] = { deps, cleanup: effect() || undefined }
      })
    },
  }
  function render(nextSpaceId = context.spaceId) {
    context.spaceId = nextSpaceId
    refIndex = 0
    effectIndex = 0
    const start = runInNewContext(script, context) as () => Promise<void>
    pendingEffects.splice(0).forEach((effect) => effect())
    return start
  }
  return { context, render, start: render(), unmount: () => effects.forEach((effect) => effect.cleanup?.()) }
}

function deferred() {
  let resolve!: (value: unknown) => void
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('chat skill loading by current space', () => {
  it('waits for success, includes the explicit space and preserves skill/version mapping', async () => {
    const { context, start } = setup()
    const pending = deferred()
    context.fetchFavoriteList.mockReturnValueOnce(pending.promise)
    const loading = start()
    expect(context.fetchFavoriteList).toHaveBeenCalledWith({ favorType: 'skill', spaceId: 164 })
    expect(context.setSkillList).not.toHaveBeenCalled()
    const skill = { favorId: '9', skillName: 'casequery', latestVersionId: '11', skillType: 'sql' }
    pending.resolve({ code: 200, rows: [skill] })
    await loading
    expect(context.setSkillList).toHaveBeenCalledWith([{ ...skill, id: '9', bizName: 'casequery' }])
    await start()
    expect(context.fetchFavoriteList).toHaveBeenCalledTimes(1)
  })

  it('uses the existing runtime space fallback when the prop is absent', async () => {
    const harness = setup()
    harness.context.spaceId = undefined
    await harness.render()()
    expect(harness.context.fetchFavoriteList).toHaveBeenCalledWith({ favorType: 'skill', spaceId: 160 })
  })

  it.each([0, NaN])('does not load unscoped skills when spaceId=%s', async (spaceId) => {
    const { context, start } = setup(spaceId)
    await start()
    expect(context.fetchFavoriteList).not.toHaveBeenCalled()
  })

  it.each(['business', 'network'])('does not consume %s failure and allows retry', async (failure) => {
    const { context, start } = setup()
    if (failure === 'business') context.fetchFavoriteList.mockResolvedValueOnce({ code: 500, rows: [{ id: 'bad' }] })
    else context.fetchFavoriteList.mockRejectedValueOnce(new Error('offline'))
    await start()
    expect(context.setSkillList).not.toHaveBeenCalled()
    await start()
    expect(context.fetchFavoriteList).toHaveBeenCalledTimes(2)
    expect(context.setSkillList).toHaveBeenCalledWith([])
  })

  it('clears old selection, reloads with the new space and ignores the old response', async () => {
    const { context, start, render } = setup()
    const old = deferred()
    const current = deferred()
    context.fetchFavoriteList.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const oldLoading = start()
    render(202)
    expect(context.fetchFavoriteList).toHaveBeenLastCalledWith({ favorType: 'skill', spaceId: 202 })
    expect(context.setSkillList).toHaveBeenLastCalledWith([])
    expect(context.setSelectedSkills.mock.lastCall?.[0].size).toBe(0)
    context.setSkillList.mockClear()
    context.setSkillLoading.mockClear()
    old.resolve({ code: 200, rows: [{ id: 'old' }] })
    await oldLoading
    expect(context.setSkillList).not.toHaveBeenCalled()
    expect(context.setSkillLoading).not.toHaveBeenCalled()
    current.resolve({ code: 200, rows: [{ id: 'new', bizName: '当前空间' }] })
    await vi.waitFor(() => expect(context.setSkillList).toHaveBeenCalledWith([{ id: 'new', bizName: '当前空间' }]))
  })

  it('keeps loading lazy across space changes before opening the panel', async () => {
    const { context, render } = setup()
    const start = render(202)
    expect(context.fetchFavoriteList).not.toHaveBeenCalled()
    await start()
    expect(context.fetchFavoriteList).toHaveBeenCalledWith({ favorType: 'skill', spaceId: 202 })
  })

  it('does not reload or clear selection on a same-space rerender', async () => {
    const { context, start, render } = setup()
    await start()
    context.setSkillList.mockClear()
    await render(164)()
    expect(context.fetchFavoriteList).toHaveBeenCalledTimes(1)
    expect(context.setSkillList).not.toHaveBeenCalled()
    expect(context.setSelectedSkills).not.toHaveBeenCalled()
  })

  it('does not repeatedly reset state when the space cache is invalid', () => {
    const { context, render } = setup(NaN)
    context.setSkillList.mockClear()
    render(NaN)
    expect(context.setSkillList).not.toHaveBeenCalled()
  })

  it('does not request global skills when an assistant supplies candidates, including an empty list', async () => {
    const { context, start, render } = setup(164, [])
    await start()
    await render(202)()
    expect(context.fetchFavoriteList).not.toHaveBeenCalled()
  })

  it('ignores results after unmounting', async () => {
    const { context, start, unmount } = setup()
    const pending = deferred()
    context.fetchFavoriteList.mockReturnValueOnce(pending.promise)
    const loading = start()
    unmount()
    pending.resolve({ code: 200, rows: [{ id: 'old' }] })
    await loading
    expect(context.setSkillList).not.toHaveBeenCalled()
  })
})
