import { ApiOutlined } from '@ant-design/icons'
import { Alert } from 'antd'
import type { FormInstance } from 'antd'
import React, { useEffect, useMemo } from 'react'

import { TableSemantics } from '@/components/tableSemantics'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'
import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'

import type { KnowledgeFormValues, KnowledgeTechField } from '../types/metricModeling.types'
import { getKnowledgeTechFieldId } from '../utils/atomicMetricSource'
import { getCustomAtomicFieldOptionLabel, getCustomAtomicSemanticTypeLabel } from '../utils/customAtomic'

import styles from './knowledgeOperateDrawer.AtomicTechnicalStep.module.scss'
import { KnowledgeOperateFunctionExpressionField } from './knowledgeOperateDrawer.FunctionExpressionField'

export interface AtomicSemanticSelection {
  semanticGroupId: number | string | null
  semanticSchemaId: number | string
  semanticsGroupId: number | string | null
  viewId: number | string
}

interface Props {
  readonly allFields: KnowledgeTechField[]
  readonly fieldError?: boolean
  readonly fieldLoading?: boolean
  readonly form: FormInstance<KnowledgeFormValues>
  readonly onRetryFields?: () => void
  readonly onSchemaChange: (selection: AtomicSemanticSelection) => Promise<void>
  readonly validateSqlExpression: (_: unknown, value?: string) => Promise<void>
  readonly validateTechName: (_: unknown, value?: string) => Promise<void>
}

export const KnowledgeOperateAtomicTechnicalStep: React.FC<Props> = ({
  allFields,
  fieldError,
  fieldLoading,
  form,
  onRetryFields,
  onSchemaChange,
  validateSqlExpression,
  validateTechName
}) => {
  const sourceFieldId = AForm.useWatch('atomicSourceFieldId', form)
  const selectedField = useMemo(
    () => allFields.find(item => getKnowledgeTechFieldId(item) === String(sourceFieldId || '')),
    [allFields, sourceFieldId]
  )
  const sourceOptions = useMemo(
    () =>
      allFields.map(item => ({
        label: getCustomAtomicFieldOptionLabel(item),
        value: getKnowledgeTechFieldId(item)
      })),
    [allFields]
  )

  useEffect(() => {
    form.setFieldValue('semanticType', selectedField?.semanticType)
  }, [form, selectedField])

  return (
    <div className="mb-4 border border-gray-200 rounded bg-white p-4">
      <OntologyFormSectionTitle icon={<ApiOutlined />}>技术定义</OntologyFormSectionTitle>
      <AForm.Item
        required
        label="指标编码"
        name="techName"
        rules={[{ validator: validateTechName }]}
        validateDebounce={600}
        validateTrigger="onChange"
      >
        <AInput placeholder="请输入指标编码" />
      </AForm.Item>

      <div className="grid grid-cols-2 gap-x-8">
        <TableSemantics
          form={form}
          getSchemaId={onSchemaChange}
          getSchemaOptions={(_: TableSemanticParams[]) => {}}
          groupFieldName="semanticsGroupId"
          type="shema"
        />
        <AForm.Item
          required
          label="来源字段"
          name="atomicSourceFieldId"
          rules={[{ message: '请选择来源字段', required: true }]}
        >
          <ASelect
            showSearch
            loading={fieldLoading}
            optionFilterProp="label"
            options={sourceOptions}
            placeholder="请选择来源字段"
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
        dictionaryKind="atomic"
        fieldName="atomicAggregationExpression"
        form={form}
        selectedField={selectedField}
        validateExpression={validateSqlExpression}
      />

      <div className={styles.metaStrip}>
        <div>
          <div className={styles.metaLabel}>字段类型</div>
          <div className={styles.metaValue}>{selectedField?.dataType || selectedField?.fieldType || '-'}</div>
        </div>
        <div>
          <div className={styles.metaLabel}>语义类型</div>
          <div className={styles.metaValue}>{getCustomAtomicSemanticTypeLabel(selectedField?.semanticType)}</div>
        </div>
        <div>
          <div className={styles.metaLabel}>默认中文名称</div>
          <div className={styles.metaValue}>
            {selectedField?.bizName || selectedField?.tfieldAlias || selectedField?.fieldName || '-'}
          </div>
        </div>
      </div>
    </div>
  )
}
