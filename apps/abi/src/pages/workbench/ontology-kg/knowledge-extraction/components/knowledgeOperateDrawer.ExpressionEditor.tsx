import { InfoCircleOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import React from 'react'

import Editor from '@/pages/workbench/data-preparation/data-collection-operate/modules/InsetCodemirror'
import QuoteFun from '@/pages/workbench/data-preparation/data-collection-operate/modules/QuoteFun'
import QuoteField from '@/pages/workbench/ontology-kg/technical-jargon/components/QuoteField'

import type { KnowledgeFormValues, KnowledgeTechField } from '../types'
import { extractUniqueIds } from '../utils/knowledgeOperateDrawer.utils'

interface Props {
  readonly allFields: KnowledgeTechField[]
  readonly form: FormInstance<KnowledgeFormValues>
  readonly strictCustom?: boolean
  readonly validateCustomExpression: (_: unknown, value?: string) => Promise<void>
  readonly validateSqlExpression: (_: unknown, value?: string) => Promise<void>
}

interface ExpressionEditorRef {
  insertText?: (value: string, replace?: boolean) => void
}

export const KnowledgeOperateExpressionEditor: React.FC<Props> = ({
  allFields,
  form,
  strictCustom,
  validateCustomExpression,
  validateSqlExpression
}) => {
  const [target, setTarget] = useState<KnowledgeTechField[]>([])
  const editorRef = useRef<ExpressionEditorRef | null>(null)
  const tfieldId = useMemo(() => `${Date.now()}`, [])

  const insertCode = (val: unknown) => {
    const field = val as KnowledgeTechField | null
    if (field && typeof field === 'object' && field.techId) {
      const token = `##${field.techId}##`
      const currentExpr = form.getFieldValue('expr') || ''
      const nextExpr = `${currentExpr}${token}`
      form.setFieldValue('expr', nextExpr)
      form.setFieldValue('relItemId', extractUniqueIds(nextExpr).join(','))
      return
    }
    if (editorRef.current?.insertText) {
      editorRef.current.insertText(String(val), false)
      return
    }
    const currentExpr = form.getFieldValue('expr') || ''
    const nextExpr = `${currentExpr}${String(val)}`
    form.setFieldValue('expr', nextExpr)
    form.setFieldValue('relItemId', extractUniqueIds(nextExpr).join(','))
  }

  const handleTemplateFill = (template: string) => {
    const currentExpr = form.getFieldValue('expr') || ''
    const nextExpr = `${currentExpr}${currentExpr ? '\n' : ''}${template}`
    form.setFieldValue('expr', nextExpr)
    form.setFieldValue('relItemId', extractUniqueIds(nextExpr).join(','))
  }

  return (
    <AForm.Item
      required
      label={
        <div className="flex items-center">
          <span>计算逻辑</span>
          <ATooltip
            title={
              <div style={{ maxWidth: 420 }}>
                <div>支持从右侧选择字段和函数拼接表达式。</div>
                <div style={{ marginTop: 8 }}>示例：SUM(pay_amount)</div>
                <div>WHERE order_status = &apos;paid&apos;</div>
              </div>
            }
          >
            <InfoCircleOutlined className="ml-2 cursor-pointer text-gray-500" />
          </ATooltip>
        </div>
      }
    >
      <div className="mb-3 flex gap-2">
        <AButton onClick={() => handleTemplateFill('SUM(##字段ID##)')}>填入原子指标模板</AButton>
        <AButton onClick={() => handleTemplateFill('(##字段ID## / ##字段ID##) * 100')}>填入派生指标模板</AButton>
        <AButton onClick={() => handleTemplateFill('(本期值 - 同期值) / 同期值')}>填入同比模板</AButton>
        <AButton
          onClick={() => {
            form.setFieldValue('expr', '')
            form.setFieldValue('relItemId', '')
          }}
        >
          清空
        </AButton>
      </div>
      <div className="flex gap-3">
        <AForm.Item
          className="m-0 w-0 flex-1"
          name="expr"
          rules={strictCustom ? [{ validator: validateCustomExpression }] : [{ validator: validateSqlExpression }]}
        >
          <Editor
            isExpr
            fieldOptions={[...allFields, ...target]}
            functions={[]}
            height="220px"
            mode="name"
            ref={editorRef}
            placeholderThemes={{
              d: { backgroudColor: 'rgba(51, 112, 255, 0.2)', borderColor: '#3370ff', textColor: 'rgb(43, 95, 217)' },
              dates: {
                backgroudColor: 'rgba(255, 153, 0, 0.2)',
                borderColor: '#ff9900',
                textColor: 'rgb(255, 102, 0)'
              },
              dimensions: {
                backgroudColor: 'rgba(51, 112, 255, 0.2)',
                borderColor: '#3370ff',
                textColor: 'rgb(43, 95, 217)'
              },
              measures: {
                backgroudColor: 'rgba(0, 214, 185, 0.2)',
                borderColor: '#00d6b9',
                textColor: 'rgb(4, 180, 156)'
              },
              q: { backgroudColor: 'rgba(0, 214, 185, 0.2)', borderColor: '#00d6b9', textColor: 'rgb(4, 180, 156)' }
            }}
          />
        </AForm.Item>
        <QuoteField
          notAddTarget
          allFields={allFields}
          height="220px"
          setTarget={setTarget}
          target={target}
          tfieldId={tfieldId}
          onSelect={insertCode}
        />
        <QuoteFun
          height="220px"
          onSelect={insertCode}
        />
      </div>
    </AForm.Item>
  )
}
