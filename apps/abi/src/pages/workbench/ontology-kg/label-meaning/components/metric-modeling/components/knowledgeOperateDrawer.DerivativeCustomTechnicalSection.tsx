import { Alert, Empty, Spin } from 'antd'
import type { FormInstance } from 'antd'
import React, { useMemo, useRef } from 'react'

import { TableSemantics } from '@/components/tableSemantics'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'
import {
  buildRuleFieldTree,
  createRuleFieldOptions
} from '@/pages/workbench/ontology-kg/label-meaning/components/rule-expression'

import type { KnowledgeFormValues, KnowledgeTechField } from '../types/metricModeling.types'
import { getKnowledgeTechFieldId } from '../utils/atomicMetricSource'
import { getCustomAtomicFieldTechnicalName } from '../utils/customAtomic'

import type { AtomicSemanticSelection } from './knowledgeOperateDrawer.AtomicTechnicalStep'
import { KnowledgeOperateFunctionExpressionField } from './knowledgeOperateDrawer.FunctionExpressionField'
import type { KnowledgeOperateFunctionExpressionFieldHandle } from './knowledgeOperateDrawer.FunctionExpressionField'

interface Props {
  readonly allFields: KnowledgeTechField[]
  readonly editing?: boolean
  readonly fieldError?: boolean
  readonly fieldLoading?: boolean
  readonly form: FormInstance<KnowledgeFormValues>
  readonly onRetryFields?: () => void
  readonly onSchemaChange: (selection: AtomicSemanticSelection) => Promise<void>
  readonly validateSqlExpression: (_: unknown, value?: string) => Promise<void>
}

export const KnowledgeOperateDerivativeCustomTechnicalSection: React.FC<Props> = ({
  allFields,
  editing,
  fieldError,
  fieldLoading,
  form,
  onRetryFields,
  onSchemaChange,
  validateSqlExpression
}) => {
  const expressionRef = useRef<KnowledgeOperateFunctionExpressionFieldHandle>(null)
  const fieldTree = useMemo(() => buildRuleFieldTree(createRuleFieldOptions(allFields)), [allFields])

  const insertSourceField = (fieldId: unknown) => {
    const field = allFields.find(item => getKnowledgeTechFieldId(item) === String(fieldId || ''))
    const fieldName = getCustomAtomicFieldTechnicalName(field)
    if (fieldName) expressionRef.current?.insertText(fieldName)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-8">
        <TableSemantics
          form={form}
          getSchemaId={onSchemaChange}
          getSchemaOptions={(_: TableSemanticParams[]) => {}}
          groupFieldName="semanticsGroupId"
          isEdit={editing}
          label="数据语义"
          type="shema"
        />
        <AForm.Item label="来源字段">
          <ATreeSelect
            showSearch
            disabled={editing}
            treeDefaultExpandAll
            fieldNames={{ label: 'title', value: 'value' }}
            loading={fieldLoading}
            placeholder="点击字段插入到下方表达式"
            treeData={fieldTree}
            treeNodeFilterProp="title"
            value={undefined}
            notFoundContent={
              fieldLoading ? (
                <Spin size="small" />
              ) : (
                <Empty
                  description="当前数据语义暂无可选字段"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )
            }
            onSelect={insertSourceField}
          />
        </AForm.Item>
      </div>

      {fieldError ? (
        <Alert
          className="mb-4"
          message="数据语义字段加载失败"
          type="error"
          action={
            <AButton
              size="small"
              onClick={onRetryFields}
            >
              重试
            </AButton>
          }
        />
      ) : null}

      <KnowledgeOperateFunctionExpressionField
        ref={expressionRef}
        dictionaryKind="composite"
        fieldName="expr"
        form={form}
        validateExpression={validateSqlExpression}
      />
    </>
  )
}
