import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

function getInitializationArguments(relativePath: string) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
  const ast = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const calls: string[][] = []
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'initializeSessionSpace') {
      calls.push(node.arguments.map(argument => argument.getText(ast)))
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return calls
}

describe('ABI space initialization entrypoints', () => {
  it.each(['./app.tsx', '../pages/login/index.tsx'])('%s restores the current logged-in space before continuing', file => {
    expect(getInitializationArguments(file)).toEqual([['{ restoreCachedSpace: true }']])
  })

  it('keeps fresh credential login on the default-first initialization path', () => {
    expect(getInitializationArguments('../hooks/common/login.ts')).toEqual([[]])
  })
})
