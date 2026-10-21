import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const metricComponents = './components/metric-modeling/components/'
const treeEntries = [
  ['数据语义', '../../../../components/tableSemantics.tsx', 'ATreeSelect'],
  ['条件字段', './components/rule-expression/RuleExpressionBuilder.tsx', 'TreeSelect'],
  ['维度一键映射', './components/dimension-modeling/components/DimensionBatchMappingDrawer.tsx', 'ATreeSelect'],
  ['主体维度', `${metricComponents}knowledgeOperateDrawer.DerivedLogicBuilder.tsx`, 'ATreeSelect'],
  ['复合指标来源字段', `${metricComponents}knowledgeOperateDrawer.DerivativeCustomTechnicalSection.tsx`, 'ATreeSelect'],
  ['维度设置', `${metricComponents}knowledgeOperateDrawer.DimensionStep.tsx`, 'Tree'],
  ['引用指标', `${metricComponents}knowledgeOperateDrawer.ExpressionEditor.tsx`, 'ATree'],
] as const

describe('本体网络维度、指标、标签树选项的整行展开配置', () => {
  it.each(treeEntries)('%s 使用原生单击展开，不依赖仅箭头操作', (_, file, tag) => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const trees: ts.JsxSelfClosingElement[] = []
    const visit = (node: ts.Node) => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === tag) trees.push(node)
      ts.forEachChild(node, visit)
    }
    visit(ast)
    expect(trees).toHaveLength(1)
    const props = trees[0].attributes.properties.filter(ts.isJsxAttribute)
    const expandProp = tag.endsWith('Select') ? 'treeExpandAction' : 'expandAction'
    expect(props.find(prop => prop.name.getText(ast) === expandProp)?.initializer?.getText(ast)).toBe('"click"')
    // TreeSelect 的弹出树默认铺满行，普通 Tree 需 blockNode 扩大文字外的点击区域。
    if (!tag.endsWith('Select')) {
      expect(props.some(prop => prop.name.getText(ast) === 'blockNode' && !prop.initializer)).toBe(true)
    }
  })
})
