import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('./knowledgeOperateDrawer.ExtendedTemplateParams.tsx', import.meta.url), 'utf8')
const file = ts.createSourceFile('templates.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

function getPreviewEffect(templateTypeVal: string | undefined, storedType: string, expression: string) {
  let callback: ts.Node | undefined
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect' && node.getText(file).includes("setFieldValue('expr'")) callback = node.arguments[0]
    ts.forEachChild(node, visit)
  }
  visit(file)
  expect(callback).toBeDefined()
  const form = { getFieldValue: vi.fn().mockReturnValue(storedType), setFieldValue: vi.fn() }
  const script = ts.transpileModule(`const effect = ${callback!.getText(file)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  runInNewContext(`${script}; effect();`, { form, preview: { expression }, templateTypeVal })
  return form
}

describe('custom expression step persistence', () => {
  it('does not overwrite a saved custom expression while the template watcher is unregistered or remounting', () => {
    for (const templateType of [undefined, '', 'custom']) {
      const form = getPreviewEffect(templateType, 'custom', '请填写计算逻辑')
      expect(form.setFieldValue).not.toHaveBeenCalled()
    }
  })

  it('does not apply an outdated automatic preview after switching to custom', () => {
    expect(getPreviewEffect('ratio', 'custom', '( 分子 / 分母 )').setFieldValue).not.toHaveBeenCalled()
  })

  it('still updates the preview for the active non-custom template', () => {
    expect(getPreviewEffect('ratio', 'ratio', '( a / b )').setFieldValue).toHaveBeenCalledWith('expr', '( a / b )')
  })

  it('preserves the template subscription, clears selections on schema changes and excludes UI-only selections from payloads', () => {
    const drawer = readFileSync(new URL('./KnowledgeOperateDrawer.tsx', import.meta.url), 'utf8')
    expect(drawer).toContain("AForm.useWatch('templateType', { form, preserve: true })")
    expect(drawer).toContain("templateTypeWatch ?? form.getFieldValue('templateType')")
    expect(drawer).toContain('nextValues.customSourceFieldIds = []')
    expect(drawer).toContain('delete payload.customSourceFieldIds')
    expect(drawer).toContain('getCustomExpressionSourceFields(values.expr, allFields)')
  })

  it('lays out the operator heading above its wrapping button rail', () => {
    const css = readFileSync(new URL('./knowledgeOperateDrawer.AtomicTechnicalStep.module.scss', import.meta.url), 'utf8')
    expect(css).toMatch(/\.operatorSection\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/)
    expect(css).toMatch(/\.functionRail\s*\{[^}]*flex-wrap: wrap/)
  })
})
