import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const ontologyRoot = fileURLToPath(new URL('.', import.meta.url))
const abiSourceRoot = path.resolve(ontologyRoot, '../../..')
const sharedApiCallSources = [path.join(abiSourceRoot, 'components/stateful/group/useGroupManagement.ts'), path.join(abiSourceRoot, 'components/tableSemantics.tsx')]

function collectSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(entryPath)
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) return []
    return [entryPath]
  })
}

function hasDirectApiCall(sourcePath: string): boolean {
  const sourceText = fs.readFileSync(sourcePath, 'utf8')
  const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, sourcePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const apiNames = new Set<string>()

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier) || !statement.moduleSpecifier.text.includes('/service/api')) continue
    if (statement.importClause?.isTypeOnly) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    bindings.elements.forEach((element) => {
      if (!element.isTypeOnly) apiNames.add(element.name.text)
    })
  }

  let found = false
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && apiNames.has(node.expression.text)) {
      found = true
      return
    }
    if (!found) ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return found
}

function getModuleTestPath(sourcePath: string) {
  const relativePath = path.relative(abiSourceRoot, sourcePath).split(path.sep).join('/')
  if (relativePath === 'components/tableSemantics.tsx' || relativePath === 'components/stateful/group/useGroupManagement.ts') {
    return path.join(ontologyRoot, 'shared-api-response-contract.test.ts')
  }
  if (relativePath.includes('/label-meaning/components/dimension-modeling/')) {
    return path.join(ontologyRoot, 'label-meaning/components/dimension-modeling/api-response-contract.test.ts')
  }
  if (relativePath.includes('/label-meaning/components/metric-modeling/')) {
    return path.join(ontologyRoot, 'label-meaning/components/metric-modeling/api-response-contract.test.ts')
  }
  const moduleName = relativePath.split('/')[3]
  return path.join(ontologyRoot, moduleName, 'api-response-contract.test.ts')
}

describe('ontology interface-call test-file coverage', () => {
  it('keeps a module test for every direct API caller', () => {
    const apiCallSources = [...collectSourceFiles(ontologyRoot), ...sharedApiCallSources].filter(hasDirectApiCall).sort()
    const missingTests = apiCallSources.filter((sourcePath) => !fs.existsSync(getModuleTestPath(sourcePath))).map((sourcePath) => path.relative(abiSourceRoot, sourcePath))
    const moduleTests = new Set(apiCallSources.map(getModuleTestPath))

    expect(missingTests).toEqual([])
    expect(apiCallSources).toHaveLength(28)
    expect(moduleTests).toHaveLength(9)
  })
})
