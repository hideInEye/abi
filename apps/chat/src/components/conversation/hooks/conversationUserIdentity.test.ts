import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getConversationUserName } from './conversationRequests'

const modes = [
  { mode: '交互', file: './useConversationController.ts', payload: 'context', request: 'streamConvAnswer' },
  { mode: '探索', file: '../exploration-mode/useExploreConversation.ts', payload: 'payload', request: 'streamExplorePlan' },
  { mode: '报告', file: '../report-mode/useReportConversation.ts', payload: 'requestData', request: 'submitReportTask' },
]

function readSource(path: string): ts.SourceFile {
  return ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
}

function findNode<T extends ts.Node>(source: ts.SourceFile, predicate: (node: ts.Node) => node is T): T {
  let found: T | undefined
  const visit = (node: ts.Node) => {
    if (!found && predicate(node)) found = node
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (!found) throw new Error(`未找到请求参数节点：${source.fileName}`)
  return found
}

afterEach(() => vi.unstubAllGlobals())

describe('three conversation modes request identity', () => {
  // 直接执行各调用点真实的字段初始化表达式，防止只验证 helper 而漏改模式入口。
  it.each(modes)('$mode / $request preserves numeric user_id and adds user_name', ({ file, payload }) => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ userName: 'account_a', userId: 42, nickName: '昵称' }),
    })
    const source = readSource(file)
    const declaration = findNode(source, (node): node is ts.VariableDeclaration =>
      ts.isVariableDeclaration(node) && node.name.getText(source) === payload
      && !!node.initializer && ts.isObjectLiteralExpression(node.initializer))
    const object = declaration.initializer as ts.ObjectLiteralExpression
    const fields = ['user_id', 'user_name'].map(name => {
      const field = object.properties.find((property): property is ts.PropertyAssignment =>
        ts.isPropertyAssignment(property) && property.name.getText(source) === name)
      expect(field, `${file} 缺少 ${name}`).toBeDefined()
      return field!.getText(source)
    })
    const result = runInNewContext(`({ ${fields.join(', ')} })`, {
      getConversationUserName,
      userId: 42,
      getCurrentUserId: () => 42,
    })
    expect(result).toEqual({ user_id: 42, user_name: 'account_a' })
  })

  it('refreshes interactive user_name without overwriting the existing user_id', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ userName: 'account_b' }) })
    const source = readSource('./useConversationController.ts')
    const assignment = findNode(source, (node): node is ts.BinaryExpression =>
      ts.isBinaryExpression(node) && node.left.getText(source) === 'params.context.user_name'
      && node.operatorToken.kind === ts.SyntaxKind.EqualsToken)
    const params = { context: { user_id: 42, user_name: 'account_a', conv_uid: 'conv-1' } }
    runInNewContext(assignment.getText(source), { params, getConversationUserName })
    expect(params).toEqual({ context: { user_id: 42, user_name: 'account_b', conv_uid: 'conv-1' } })
  })
})
