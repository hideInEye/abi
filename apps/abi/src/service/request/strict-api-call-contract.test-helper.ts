import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { assertFlatRequestSuccess, isFlatRequestSuccess } from './flat-result'

export interface StrictApiCallExpectation {
  guard: RegExp
  name: string
  occurrences?: number
}

interface ImportedApi {
  importedName: string
  localName: string
}

function getImportedApis(sourceFile: ts.SourceFile): ImportedApi[] {
  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement)) return []
    if (!ts.isStringLiteral(statement.moduleSpecifier) || !statement.moduleSpecifier.text.includes('/service/api')) return []
    if (statement.importClause?.isTypeOnly) return []

    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) return []

    return bindings.elements
      .filter((element) => !element.isTypeOnly)
      .map((element) => ({
        importedName: element.propertyName?.text ?? element.name.text,
        localName: element.name.text,
      }))
  })
}

function findApiCalls(sourceFile: ts.SourceFile, apiNames: Set<string>): Map<string, ts.CallExpression[]> {
  const calls = new Map<string, ts.CallExpression[]>()

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && apiNames.has(node.expression.text)) {
      const existing = calls.get(node.expression.text) ?? []
      existing.push(node)
      calls.set(node.expression.text, existing)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return calls
}

function getEnclosingFunction(node: ts.Node): ts.SignatureDeclaration | undefined {
  let current: ts.Node | undefined = node.parent
  while (current) {
    if (ts.isFunctionLike(current)) return current
    current = current.parent
  }
  return undefined
}

function isAwaited(call: ts.CallExpression, boundary: ts.Node): boolean {
  let current: ts.Node | undefined = call.parent
  while (current && current !== boundary) {
    if (ts.isAwaitExpression(current)) return true
    current = current.parent
  }
  return false
}

function formatCallName(name: string, occurrence: number, total: number) {
  return total === 1 ? name : `${name} #${occurrence + 1}`
}

function findGuardAfterCall(call: ts.CallExpression, enclosingFunction: ts.SignatureDeclaration, sourceFile: ts.SourceFile, guard: RegExp) {
  const workflowStart = enclosingFunction.getStart(sourceFile)
  const callEndInWorkflow = call.getEnd() - workflowStart
  const textAfterCall = enclosingFunction.getText(sourceFile).slice(callEndInWorkflow)
  const matcher = new RegExp(guard.source, guard.flags.replace(/[gy]/g, ''))
  const match = matcher.exec(textAfterCall)
  return {
    match,
    textBeforeGuard: match ? textAfterCall.slice(0, match.index) : textAfterCall,
  }
}

const SUCCESS_CONTINUATION_PATTERN = /\b(?:message\.success|set[A-Z]\w*|on[A-Z]\w*|close[A-Z]\w*|refresh|fetchTableData|getTableData|load[A-Z]\w*|dataScopeHandle)\s*\(|\breturn\s+true\b/

export function describeStrictApiCallContract(metaUrl: string, sourceRelativePath: string, expectations: StrictApiCallExpectation[]) {
  const sourcePath = fileURLToPath(new URL(sourceRelativePath, metaUrl))
  const sourceText = fs.readFileSync(sourcePath, 'utf8')
  const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, sourcePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const importedApis = getImportedApis(sourceFile)
  const importedByLocalName = new Map(importedApis.map((item) => [item.localName, item]))
  const apiCalls = findApiCalls(sourceFile, new Set(importedByLocalName.keys()))

  describe(`${sourceRelativePath} interface response contract`, () => {
    it('has an explicit expectation for every directly invoked API', () => {
      const actual = [...apiCalls.entries()]
        .map(([localName, calls]) => ({
          name: importedByLocalName.get(localName)?.importedName ?? localName,
          occurrences: calls.length,
        }))
        .sort((left, right) => left.name.localeCompare(right.name))
      const expected = expectations.map((item) => ({ name: item.name, occurrences: item.occurrences ?? 1 })).sort((left, right) => left.name.localeCompare(right.name))

      expect(actual).toEqual(expected)
    })

    for (const expectation of expectations) {
      const importedApi = importedApis.find((item) => item.importedName === expectation.name)
      const calls = importedApi ? (apiCalls.get(importedApi.localName) ?? []) : []
      const expectedOccurrences = expectation.occurrences ?? 1

      for (let index = 0; index < expectedOccurrences; index += 1) {
        const testName = formatCallName(expectation.name, index, expectedOccurrences)

        it(`${testName} awaits its response before continuing`, () => {
          const call = calls[index]
          expect(call, `${testName} must be invoked`).toBeDefined()
          const enclosingFunction = call && getEnclosingFunction(call)
          expect(enclosingFunction, `${testName} must be inside an async workflow`).toBeDefined()
          expect(call && enclosingFunction ? isAwaited(call, enclosingFunction) : false).toBe(true)
        })

        it(`${testName} has a success/failure guard in the same workflow`, () => {
          const call = calls[index]
          expect(call, `${testName} must be invoked`).toBeDefined()
          const enclosingFunction = call && getEnclosingFunction(call)
          expect(enclosingFunction, `${testName} must be inside a guarded workflow`).toBeDefined()
          const guardCheck = call && enclosingFunction ? findGuardAfterCall(call, enclosingFunction, sourceFile, expectation.guard) : null
          expect(guardCheck?.match, `${testName} must be guarded after its awaited response`).not.toBeNull()
          expect(guardCheck?.textBeforeGuard ?? '', `${testName} must not continue a success workflow before checking the response`).not.toMatch(SUCCESS_CONTINUATION_PATTERN)
        })
      }
    }

    it('treats only an explicit flat-request success as success', () => {
      const successResult = { data: { id: 1 }, error: null, response: {} }

      expect(isFlatRequestSuccess(successResult)).toBe(true)
      expect(() => assertFlatRequestSuccess(successResult)).not.toThrow()
    })

    it('blocks the workflow for a fulfilled business or network failure', () => {
      const requestError = new Error('request failed')
      const failureResult = { data: null, error: requestError, response: {} }

      expect(isFlatRequestSuccess(failureResult)).toBe(false)
      expect(() => assertFlatRequestSuccess(failureResult)).toThrow(requestError)
    })
  })
}
