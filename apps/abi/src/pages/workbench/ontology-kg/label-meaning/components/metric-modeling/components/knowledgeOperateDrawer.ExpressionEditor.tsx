import { InfoCircleOutlined, SearchOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import React, { useMemo, useRef, useState } from 'react'

import Editor from '@/pages/workbench/data-preparation/data-collection-operate/modules/InsetCodemirror'
import QuoteFun from '@/pages/workbench/data-preparation/data-collection-operate/modules/QuoteFun'

import type { KnowledgeFormValues, KnowledgeIndicatorItem, KnowledgeTechField } from '../types/metricModeling.types'
import { extractUniqueIds } from '../utils/knowledgeOperateDrawer.utils'

interface ReferenceMetricOption {
  readonly item?: KnowledgeIndicatorItem
  readonly label: string
  readonly value: string
}

interface Props {
  readonly allFields: KnowledgeTechField[]
  readonly form: FormInstance<KnowledgeFormValues>
  readonly referenceMetricOptions: ReferenceMetricOption[]
  readonly strictCustom?: boolean
  readonly validateCustomExpression: (_: unknown, value?: string) => Promise<void>
  readonly validateSqlExpression: (_: unknown, value?: string) => Promise<void>
}

interface ExpressionEditorRef {
  insertText?: (value: string, replace?: boolean) => void
}

function getIndicatorClass(option: ReferenceMetricOption) {
  return String(option.item?.indicatorClass || '').trim()
}

function toReferenceField(option: ReferenceMetricOption): KnowledgeTechField {
  const label = String(option.label || option.value || '-')
  const value = String(option.value || '')

  return {
    bizName: label,
    fieldName: label,
    name: label,
    originName: label,
    techId: value,
    tfieldId: value,
    tfieldType: 'q',
  }
}

const ReferenceMetricField: React.FC<{
  readonly height: string
  readonly options: ReferenceMetricOption[]
  readonly onSelect: (val: KnowledgeTechField) => void
}> = ({ height, options, onSelect }) => {
  const [search, setSearch] = useState('')

  const treeData = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const createChildren = (indicatorClass: 'atomic' | 'derived') =>
      options
        .filter((option) => getIndicatorClass(option) === indicatorClass)
        .filter((option) => !keyword || String(option.label || '').toLowerCase().includes(keyword))
        .map((option) => {
          const field = toReferenceField(option)

          return {
            ...field,
            isLeaf: true,
            key: `${indicatorClass}-${option.value}`,
            title: option.label,
          }
        })

    return [
      {
        children: createChildren('atomic'),
        key: 'atomic',
        title: '原子指标',
      },
      {
        children: createChildren('derived'),
        key: 'derived',
        title: '派生指标',
      },
    ]
  }, [options, search])

  return (
    <div className="w-25% pr-10px">
      <header className="pb-8px">
        <span className="mr-1">点击引用字段</span>
        <ATooltip
          title={
            <div>
              <div>引用字段以 &quot;[&quot; 开始， &quot;]&quot; 结束</div>
              <div>请勿修改引用内容，否则将引用失败</div>
              <div>若输入与引用字段相同格式的内容，将被当作引用字段处理</div>
            </div>
          }
        >
          <InfoCircleOutlined />
        </ATooltip>
      </header>
      <div className="overflow-auto border rounded p-10px" style={{ height }}>
        <AInput
          className="mb-16px"
          placeholder="通过名称搜索"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ATree
          defaultExpandedKeys={['atomic', 'derived']}
          treeData={treeData}
          onSelect={(_, e) => {
            const node = e.selectedNodes[0] as (KnowledgeTechField & { isLeaf?: boolean }) | undefined
            if (!node || !node.isLeaf) {
              return
            }
            onSelect(node)
          }}
        />
      </div>
    </div>
  )
}

export const KnowledgeOperateExpressionEditor: React.FC<Props> = ({
  allFields,
  form,
  referenceMetricOptions,
  strictCustom,
  validateCustomExpression,
  validateSqlExpression
}) => {
  const editorRef = useRef<ExpressionEditorRef | null>(null)
  const referenceFields = useMemo(() => referenceMetricOptions.map(toReferenceField), [referenceMetricOptions])

  const insertCode = (val: unknown) => {
    const field = val as KnowledgeTechField | null
    if (field && typeof field === 'object' && field.techId) {
      const token = `##${field.techId}##`
      if (editorRef.current?.insertText) {
        editorRef.current.insertText(token, false)
        return
      }
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
        <AButton onClick={() => handleTemplateFill('(##字段ID## / ##字段ID##) * 100')}>填入复合指标模板</AButton>
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
            fieldOptions={[...allFields, ...referenceFields]}
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
        <ReferenceMetricField
          height="220px"
          options={referenceMetricOptions}
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
