import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

// Execute the actual page callbacks with isolated dependencies; no backend or page mount is needed.
function createHandlers() {
  const source = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8')
  const file = ts.createSourceFile('index.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const functions: string[] = []
  const collect = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && ['deleteSpaceHandler', 'updateSpace'].includes(node.name?.text ?? '')) {
      functions.push(node.getText(file))
    }
    ts.forEachChild(node, collect)
  }
  collect(file)
  const deps = {
    clearPersistedSpace: vi.fn(),
    clearTabs: vi.fn(),
    deleteSpace: vi.fn().mockResolvedValue({ error: null }),
    dispatch: vi.fn(),
    invalidateHomeResources: vi.fn(),
    invalidateHomeSpaces: vi.fn(),
    loadOverview: vi.fn(),
    loadSpaces: vi.fn(),
    message: { error: vi.fn() }
  }
  const script = ts.transpileModule(functions.join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText
  const handlers = runInNewContext(`${script}; ({ deleteSpaceHandler, updateSpace });`, deps) as {
    deleteSpaceHandler: (space: { spaceId: number }) => Promise<void>
    updateSpace: () => void
  }
  return { ...deps, ...handlers }
}

describe('home space mutation refresh (index.tsx: deleteSpace/updateSpace)', () => {
  it('waits for deletion success before invalidating and refreshing both independent resources', async () => {
    const handlers = createHandlers()
    let resolve!: (result: { error: null }) => void
    handlers.deleteSpace.mockReturnValueOnce(
      new Promise(done => {
        resolve = done
      })
    )
    const pending = handlers.deleteSpaceHandler({ spaceId: 7 })
    expect(handlers.deleteSpace).toHaveBeenCalledWith([7])
    expect(handlers.invalidateHomeResources).not.toHaveBeenCalled()
    expect(handlers.loadOverview).not.toHaveBeenCalled()
    expect(handlers.loadSpaces).not.toHaveBeenCalled()
    resolve({ error: null })
    await pending
    expect(handlers.invalidateHomeResources).toHaveBeenCalledOnce()
    expect(handlers.loadOverview).toHaveBeenCalledWith(true)
    expect(handlers.loadSpaces).toHaveBeenCalledWith(true)
    expect(handlers.invalidateHomeResources.mock.invocationCallOrder[0]).toBeLessThan(
      handlers.loadOverview.mock.invocationCallOrder[0]
    )
  })

  it('does not clear state or refresh resources after a failed deletion', async () => {
    const handlers = createHandlers()
    handlers.deleteSpace.mockResolvedValueOnce({ error: new Error('failed') })
    await handlers.deleteSpaceHandler({ spaceId: 7 })
    expect(handlers.message.error).toHaveBeenCalledOnce()
    expect(handlers.clearPersistedSpace).not.toHaveBeenCalled()
    expect(handlers.dispatch).not.toHaveBeenCalled()
    expect(handlers.invalidateHomeResources).not.toHaveBeenCalled()
    expect(handlers.loadOverview).not.toHaveBeenCalled()
    expect(handlers.loadSpaces).not.toHaveBeenCalled()
  })

  it('does not refresh on a rejected deletion', async () => {
    const handlers = createHandlers()
    handlers.deleteSpace.mockRejectedValueOnce(new Error('network'))
    await expect(handlers.deleteSpaceHandler({ spaceId: 7 })).rejects.toThrow('network')
    expect(handlers.clearPersistedSpace).not.toHaveBeenCalled()
    expect(handlers.loadOverview).not.toHaveBeenCalled()
    expect(handlers.loadSpaces).not.toHaveBeenCalled()
  })

  it('refreshes overview and spaces together after the space editor success callback', () => {
    const handlers = createHandlers()
    handlers.updateSpace()
    expect(handlers.invalidateHomeResources).toHaveBeenCalledOnce()
    expect(handlers.loadOverview).toHaveBeenCalledWith(true)
    expect(handlers.loadSpaces).toHaveBeenCalledWith(true)
  })
})
