import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

function createSelectionHandlers() {
  const source = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('index.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let click = ''
  let open = ''
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleSpaceClick') click = node.initializer!.getText(ast)
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'onOpenChange' && node.initializer && ts.isJsxExpression(node.initializer)) open = node.initializer.expression!.getText(ast)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const deps = {
    currentSpace: 160,
    message: { error: vi.fn() },
    setSpaceDropdownOpen: vi.fn(),
    setSpaceSearch: vi.fn(),
    switchToSpace: vi.fn().mockResolvedValue(true),
  }
  const script = ts.transpileModule(`({ click: ${click}, open: ${open} })`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const handlers = runInNewContext(script, deps) as { click: (id: number, name: string) => Promise<void>; open: (value: boolean) => void }
  return { ...deps, ...handlers, source }
}

describe('GlobalContent current space selection', () => {
  it('reads ID/name from the store, without separate local selection or cache synchronization', () => {
    const { source } = createSelectionHandlers()
    expect(source).toContain('useAppSelector(getCurrentSpaceInfo)')
    expect(source).toContain('currentSpaceInfo?.spaceId')
    expect(source).toContain('currentSpaceInfo?.spaceName')
    expect(source).not.toMatch(/readPersistedSpace|setCurrentSpaceName|changeSpaceId|addEventListener\('click'/)
  })

  it('opens/closes the picker without switching space or fetching details', () => {
    const handlers = createSelectionHandlers()
    handlers.open(true)
    handlers.open(false)
    expect(handlers.setSpaceDropdownOpen.mock.calls).toEqual([[true], [false]])
    expect(handlers.setSpaceSearch).toHaveBeenCalledWith('')
    expect(handlers.switchToSpace).not.toHaveBeenCalled()
  })

  it('clicking the selected item only closes the picker', async () => {
    const handlers = createSelectionHandlers()
    await handlers.click(160, '第一空间')
    expect(handlers.switchToSpace).not.toHaveBeenCalled()
    expect(handlers.setSpaceDropdownOpen).toHaveBeenCalledWith(false)
  })

  it.each([true, false])('commits the selected ID/name through the shared workflow and closes on success=%s', async (success) => {
    const handlers = createSelectionHandlers()
    let resolve!: (value: boolean) => void
    handlers.switchToSpace.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const pending = handlers.click(200, '第二空间')
    expect(handlers.setSpaceDropdownOpen).not.toHaveBeenCalled()
    expect(handlers.switchToSpace).toHaveBeenCalledWith(200, undefined, { spaceName: '第二空间' })
    resolve(success)
    await pending
    expect(handlers.setSpaceDropdownOpen).toHaveBeenCalledTimes(success ? 1 : 0)
  })
})
