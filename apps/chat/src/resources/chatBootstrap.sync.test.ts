import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

import type { ChatBootstrapIdentity } from './chatBootstrapKeys'

// Run the component's actual callbacks without requiring a separate browser test runtime.
const source = readFileSync(new URL('./chatBootstrap.tsx', import.meta.url), 'utf8')
const file = ts.createSourceFile('chatBootstrap.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const callbacks: Record<string, string> = {}
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)
    && node.initializer.expression.getText(file) === 'useCallback') {
    callbacks[node.name.getText(file)] = node.initializer.arguments[0].getText(file)
  }
  if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect') {
    const body = node.arguments[0].getText(file)
    if (body.includes('subscribeCurrentUser')) callbacks.syncUser = body
    if (body.includes('void loadConversations()')) callbacks.initialLoad = body
  }
  ts.forEachChild(node, visit)
}
visit(file)

function evaluate(name: string, context: Record<string, unknown>) {
  const script = ts.transpileModule(`(${callbacks[name]})()`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  return runInNewContext(script, context)
}

describe('Chat user context synchronization', () => {
  it('updates the user across logout/login while retaining the current space and removing its listener', () => {
    let identity = { userName: 'account-a', spaceId: 8 }
    let userName = ''
    let listener!: () => void
    const unsubscribe = vi.fn()
    const stop = evaluate('syncUser', {
      subscribeCurrentUser: (callback: () => void) => { listener = callback; return unsubscribe },
      readIdentity: () => ({ userName, spaceId: 8 }),
      setIdentity: (update: (current: ChatBootstrapIdentity) => ChatBootstrapIdentity) => { identity = update(identity) },
    }) as () => void
    listener()
    expect(identity).toEqual({ userName: '', spaceId: 8 })
    userName = 'account-b'
    listener()
    expect(identity).toEqual({ userName: 'account-b', spaceId: 8 })
    const previous = identity
    listener()
    expect(identity).toBe(previous)
    stop()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it.each(['loadConversations', 'loadGroups', 'loadModels', 'loadSemantic'])('does not request anonymous data from %s after logout', async name => {
    const load = vi.fn()
    const result = await evaluate(name, {
      identity: { userName: '', spaceId: 8 },
      conversationsResource: { load }, groupsResource: { load }, modelsResource: { load }, semanticResource: { load },
    })
    expect(load).not.toHaveBeenCalled()
    expect(result).toEqual(name === 'loadModels' ? { currentModel: null, embedModelId: '', options: [] } : [])
  })

  it('only starts automatic loads for an authenticated identity', () => {
    const load = vi.fn(() => Promise.resolve([]))
    const context = {
      identity: { userName: '', spaceId: 8 },
      loadConversations: load, loadGroups: load, loadModels: load, loadSemantic: load,
    }
    evaluate('initialLoad', context)
    expect(load).not.toHaveBeenCalled()
    context.identity.userName = 'account-b'
    evaluate('initialLoad', context)
    expect(load).toHaveBeenCalledTimes(4)
  })
})
