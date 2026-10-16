import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

// Exercise the actual effect without installing a second React/DOM test runtime.
const source = readFileSync(new URL('./SpaceSelector.tsx', import.meta.url), 'utf8')
const file = ts.createSourceFile('SpaceSelector.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let effect: ts.Node | undefined
function visit(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect' && node.arguments[0]?.getText(file).includes('const syncPersistedSpace')) effect = node.arguments[0]
  ts.forEachChild(node, visit)
}
visit(file)
const script = ts.transpileModule(`const setup = ${effect!.getText(file)}; setup()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText

function setup() {
  let spaceId = 8
  const window = Object.assign(new EventTarget(), { dispatchEvent: vi.fn(EventTarget.prototype.dispatchEvent) })
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const selectedSpaceRef = { current: 99 }
  const setSelectedSpaceId = vi.fn()
  const setSelectedSpaceName = vi.fn()
  const navigate = vi.fn()
  const onSpaceChanged = vi.fn()
  const localStorage = { getItem: vi.fn(() => '第一空间'), removeItem: vi.fn() }
  const dispose = runInNewContext(script, {
    window, document, getSpaceId: () => spaceId, selectedSpaceRef, setSelectedSpaceId, setSelectedSpaceName, navigate, onSpaceChanged, localStorage,
    SPACE_ID_STORAGE_KEY: 'spaceId', SPACE_NAME_STORAGE_KEY: 'spaceName', CHAT_ID_STORAGE_KEY: 'chatId',
    CustomEvent: class extends Event { detail: unknown; constructor(type: string, options: { detail: unknown }) { super(type); this.detail = options.detail } },
  }) as () => void
  return { window, document, setSelectedSpaceId, setSelectedSpaceName, navigate, onSpaceChanged, dispose, setSpace: (value: number) => { spaceId = value } }
}

describe('Chat space selector synchronization', () => {
  it('updates ID, name and data context when another application selects its first space', () => {
    const sync = setup()
    sync.window.dispatchEvent(Object.assign(new Event('storage'), { key: 'spaceId' }))
    sync.window.dispatchEvent(Object.assign(new Event('storage'), { key: 'spaceName' }))
    expect(sync.setSelectedSpaceId).toHaveBeenCalledWith(8)
    expect(sync.setSelectedSpaceName).toHaveBeenCalledWith('第一空间')
    expect(sync.onSpaceChanged).toHaveBeenCalledWith({ spaceId: 8, spaceName: '第一空间' })
    expect(sync.navigate).toHaveBeenCalledOnce()
    expect(sync.window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'space-change', detail: { spaceId: 8, spaceName: '第一空间' } }))
    sync.dispose()
  })
  it('recovers on focus and leaves same-space conversations untouched', () => {
    const sync = setup()
    sync.setSpace(99)
    sync.window.dispatchEvent(new Event('focus'))
    expect(sync.navigate).not.toHaveBeenCalled()
    sync.setSpace(8)
    sync.document.dispatchEvent(new Event('visibilitychange'))
    expect(sync.navigate).toHaveBeenCalledOnce()
    sync.dispose()
  })
  it('ignores unrelated storage updates and removes listeners', () => {
    const sync = setup()
    sync.window.dispatchEvent(Object.assign(new Event('storage'), { key: 'token' }))
    expect(sync.navigate).not.toHaveBeenCalled()
    sync.dispose()
    sync.window.dispatchEvent(new Event('focus'))
    expect(sync.navigate).not.toHaveBeenCalled()
  })
})
