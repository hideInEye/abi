import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const src = fileURLToPath(new URL('../../', import.meta.url))
const pages = [
  ['DIMENSION', 'pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/components/DimensionTable.tsx', 'dimId'],
  ['INDICATOR', 'pages/workbench/ontology-kg/label-meaning/components/metric-modeling/components/KnowledgeTable.tsx', 'indId'],
  ['LABLE', 'pages/workbench/ontology-kg/label-meaning/module/TagTable.tsx', 'tagId'],
  ['ENTITY', 'pages/workbench/ontology-kg/entity/components/EntityTable.tsx', 'id'],
  ['COPILOT', 'pages/workbench/assistant-manage/assistant-config/index.tsx', 'id'],
  ['LLM', 'pages/component/system/model/modules/model-card-list.tsx', 'modelId'],
  ['MCP', 'pages/component/system/plugin/components/PluginTable.tsx', 'mapping_id'],
  ['TOOL', 'pages/component/system/tools/index.tsx', 'toolId'],
  ['SKILL', 'pages/component/system/skills/index.tsx', 'id'],
] as const

function readSource(path: string) {
  return ts.createSourceFile(path, readFileSync(`${src}${path}`, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

function findNodes<T extends ts.Node>(source: ts.Node, predicate: (node: ts.Node) => node is T): T[] {
  const matches: T[] = []
  const visit = (node: ts.Node) => {
    if (predicate(node)) matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return matches
}

describe('元数据分析列表入口映射', () => {
  it.each(pages)('%s 表格和卡片使用同一主键与类型', (nodeType, path, idKey) => {
    const source = readSource(path)
    const contexts = findNodes(source, ts.isObjectLiteralExpression).filter(node => node.properties.some(prop => ts.isPropertyAssignment(prop) && prop.name.getText(source) === 'nodeType'))
    expect(contexts.length).toBeGreaterThan(0)
    const record = { id: 'id-9', dimId: '90071992547409931', indId: 'ind-7', tagId: 'tag-8', modelId: 'model-6', pluginId: 'mcp-5', mapping_id: '90071992547409935', toolId: 'tool-4', termId: 'wrong-term', bizName: '业务名', name: '名称', zhName: '维度名', tagName: '标签名', entityName: '实体名', toolName: '工具名', modelName: '模型名', pluginName: '插件名' }
    for (const context of contexts) {
      // 执行源码里的上下文对象，使用互不相同的 ID 防止误用通用 id 或 termId。
      const value = new Function('record', 'item', 'agent', 'spaceId', `return (${context.getText(source)})`)(record, record, record, 164)
      expect(value.nodeType).toBe(nodeType)
      expect(value.nodeId).toBe(record[idKey])
      expect(value.nodeName).toBeTruthy()
    }
    const entryCalls = findNodes(source, ts.isCallExpression).filter(node => ['handleAnalysis', 'openAnalysis', 'onAnalysis'].includes(node.expression.getText(source)))
    // 共享 handler 的页面有一次上下文构造和两个入口，直传页面有两个入口。
    expect(entryCalls.length).toBeGreaterThanOrEqual(2)
    const drawerSource = nodeType === 'LLM' ? readSource('pages/component/system/model/index.tsx') : source
    expect(drawerSource.text).toContain("from '@/components/metadata-analysis'")
    expect(drawerSource.text).toContain('useMetadataAnalysis()')
    expect(drawerSource.text).toContain('context={analysisContext}')
    expect(drawerSource.text).toContain('onClose={closeAnalysis}')
    if (['DIMENSION', 'INDICATOR', 'LABLE', 'ENTITY'].includes(nodeType)) {
      const actions = findNodes(source, ts.isJsxSelfClosingElement).filter(node => node.tagName.getText(source) === 'OntologyMetadataActions')
      expect(actions).toHaveLength(2)
      expect(actions.filter(action => action.getText(source).includes('viewMode="card"'))).toHaveLength(1)
      expect(source.text).toContain('flex w-full items-center')
      for (const action of actions) {
        expect(action.getText(source)).toContain('onAnalysis={() => handleAnalysis(record)}')
        expect(action.getText(source)).toContain('onDelete={() => onDelete(record')
      }
      expect(source.text).not.toContain('<Popconfirm')
      expect(source.text).not.toContain('<ApartmentOutlined')
    }
  })

  it('助手列表的 id 来自 appId，MCP 的 pluginId 来自接口 id', () => {
    const assistant = readSource('pages/workbench/assistant-manage/assistant-config/index.tsx')
    const mapper = findNodes(assistant, ts.isFunctionDeclaration).find(node => node.name?.text === 'mapAppToCard')!
    const code = ts.transpileModule(mapper.getText(assistant), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
    const mapped = new Function(`${code}; return mapAppToCard({ appId: '90071992547409931', appName: '助手' })`)()
    expect(mapped.id).toBe('90071992547409931')
    const mcp = readSource('pages/component/system/plugin/index.tsx')
    const id = findNodes(mcp, ts.isPropertyAssignment).find(node => node.name.getText(mcp) === 'pluginId')!
    expect(id.initializer.getText(mcp)).toBe('item.id')
  })

  it.each([
    'pages/workbench/data-preparation/data-source/index.tsx',
    'pages/workbench/data-preparation/data-collection/index.tsx',
    'pages/workbench/data-preparation/data-table-meaning/components/semantics-table-list.tsx',
  ])('保留数据准备原入口，使用公共按需导出：%s', path => {
    const source = readSource(path)
    expect(source.text).toContain('context={analysisContext}')
    expect(source.text).not.toContain('metadata-analysis/MetadataAnalysisDrawer')
    expect(source.text).toContain('元数据分析')
  })
})
