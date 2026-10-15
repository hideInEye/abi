import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import type { AbiClientDetailItem, AbiClientListItem } from '../../../../service/api/abi-client'
import type { ApiKeyItem } from './types'

function parseFile(path: string) {
  return ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

const page = parseFile('./index.tsx')
const table = parseFile('./components/ApiKeyTable.tsx')
const mapperNames = new Set(['parseWhitelist', 'isRestrictedIp', 'isDisabled', 'mapClientRowToView', 'mapClientDetailToView'])
const mapperSource = page.statements
  .filter((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && mapperNames.has(node.name?.text ?? ''))
  .map(node => node.getText(page))
  .join('\n')
const mappers = runInNewContext(ts.transpileModule(`${mapperSource}\n({ mapClientRowToView, mapClientDetailToView })`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText) as {
  mapClientRowToView: (item: AbiClientListItem, spaceId: number) => ApiKeyItem
  mapClientDetailToView: (item: AbiClientDetailItem, fallback: ApiKeyItem) => ApiKeyItem
}

function getCardTitle(record: ApiKeyItem): string {
  let expression: ts.Expression | undefined
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(attribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(table) === 'className' &&
      attribute.initializer && ts.isStringLiteral(attribute.initializer) && attribute.initializer.text === 'abi-data-card-name',
    )) {
      expression = node.children.find(ts.isJsxExpression)?.expression
    }
    ts.forEachChild(node, visit)
  }
  visit(table)
  expect(expression).toBeDefined()
  return runInNewContext(expression!.getText(table), { record })
}

const source = { accessKey: 'ak-example', clientId: 'cli-example', id: 1, spaceId: 138 }

function getInitializer(file: ts.SourceFile, name: string): ts.Expression {
  let initializer: ts.Expression | undefined
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === name) initializer = node.initializer
    ts.forEachChild(node, visit)
  }
  visit(file)
  expect(initializer).toBeDefined()
  return initializer!
}

function evaluate(expression: string, context: Record<string, unknown> = {}) {
  return runInNewContext(ts.transpileModule(`const result = ${expression}; result`, {
    fileName: 'columns.tsx',
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, context)
}

describe('APIKey card name', () => {
  it('maps the API name to the card title without replacing the client ID', () => {
    const record = mappers.mapClientRowToView({ ...source, name: '接口测试_API1' }, 138)
    expect(record.name).toBe('接口测试_API1')
    expect(getCardTitle(record)).toBe('接口测试_API1')
    expect(record.clientId).toBe(source.clientId)
    expect(record.id).toBe(source.id)
    expect(record.accessKey).toBe(source.accessKey)
  })

  it.each([undefined, null, ''])('shows a placeholder instead of the ID when name is %s', name => {
    const record = mappers.mapClientRowToView({ ...source, name }, 138)
    expect(record.name).toBe('')
    expect(getCardTitle(record)).toBe('-')
    expect(record.clientId).toBe(source.clientId)
  })

  it('preserves the name when converting detail records, preferring the detail response', () => {
    const fallback = mappers.mapClientRowToView({ ...source, name: '列表名称' }, 138)
    expect(mappers.mapClientDetailToView(source, fallback).name).toBe('列表名称')
    expect(mappers.mapClientDetailToView({ ...source, name: '详情名称' }, fallback).name).toBe('详情名称')
  })

  it('keeps the Client ID column in list mode', () => {
    expect(table.text).toMatch(/dataIndex: 'clientId'/)
    expect(table.text).toMatch(/title: 'Client ID'/)
  })
})

describe('APIKey list name', () => {
  it('shows the name as the first column and keeps Client ID separate', () => {
    const columns = evaluate(getInitializer(table, 'columns').getText(table))
    expect(columns[0]).toMatchObject({ key: 'name', dataIndex: 'name', title: '名称' })
    expect(columns[0].render('接口名称_API1')).toBe('接口名称_API1')
    expect(columns[0].render(undefined)).toBe('-')
    expect(columns[0].render('')).toBe('-')
    expect(columns).toContainEqual(expect.objectContaining({ key: 'clientId', dataIndex: 'clientId', title: 'Client ID' }))
  })

  it('enables the name column by default and allows the existing column setting to hide it', () => {
    const state = getInitializer(page, '[columnOptions, setColumnOptions]') as ts.CallExpression
    const columnOptions = evaluate(state.arguments[0].getText(page)) as Array<{ key: string; label: string; visible: boolean }>
    expect(columnOptions[0]).toEqual({ key: 'name', label: '名称', visible: true })

    const columns = evaluate(getInitializer(table, 'columns').getText(table))
    const getVisibleColumns = () => evaluate(getInitializer(table, 'filteredColumns').getText(table), {
      columns,
      columnOptions,
      useMemo: (callback: () => unknown) => callback(),
    }) as Array<{ key: string }>
    expect(getVisibleColumns()[0].key).toBe('name')
    columnOptions[0].visible = false
    expect(getVisibleColumns().some(column => column.key === 'name')).toBe(false)
    expect(getVisibleColumns().some(column => column.key === 'clientId')).toBe(true)
  })
})
