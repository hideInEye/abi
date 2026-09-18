import { ApiOutlined } from '@ant-design/icons'
import { Alert } from 'antd'
import type { FormInstance } from 'antd'
import React, { useEffect, useMemo } from 'react'

import { TableSemantics } from '@/components/tableSemantics'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'
import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'

import { AGG_METHOD_LABEL_MAP, AGG_METHOD_OPTIONS } from '../constants/metricModeling.constants'
import type { AggregationCode, KnowledgeFormValues, KnowledgeTechField } from '../types/metricModeling.types'
import { toLegacyProjectionFunc } from '../utils/aggregation'
import { getKnowledgeTechFieldId } from '../utils/atomicMetricSource'
import { getCustomAtomicFieldOptionLabel } from '../utils/customAtomic'

import type { AtomicSemanticSelection } from './knowledgeOperateDrawer.AtomicTechnicalStep'
import styles from './knowledgeOperateDrawer.SimpleAtomicTechnicalSection.module.scss'

interface Props {
  readonly allFields: KnowledgeTechField[]
  readonly fieldError?: boolean
  readonly fieldLoading?: boolean
  readonly form: FormInstance<KnowledgeFormValues>
  readonly onRetryFields?: () => void
  readonly onSchemaChange: (selection: AtomicSemanticSelection) => Promise<void>
}

export const KnowledgeOperateSimpleAtomicTechnicalSection: React.FC<Props> = ({
  allFields,
  fieldError,
  fieldLoading,
  form,
  onRetryFields,
  onSchemaChange
}) => {
  const aggregationMethods = (AForm.useWatch('atomicAggregationMethods', form) || []) as AggregationCode[]
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
  const aggregationSummary = aggregationMethods
    .map(method => `${AGG_METHOD_LABEL_MAP[method]}（${method}）`)
    .join('、')

  useEffect(() => {
    form.setFieldValue('semanticType', selectedField?.semanticType)
  }, [form, selectedField])

  return (
    <div className="mb-4 border border-gray-200 rounded bg-white p-4">
      <OntologyFormSectionTitle icon={<ApiOutlined />}>技术定义</OntologyFormSectionTitle>
      <div className={styles.semanticField}>
        <div className="mb-2 text-sm text-[#3e5068] font-medium">
          <span className="mr-1 text-red-500">*</span>所属数据语义
        </div>
        <TableSemantics
          form={form}
          getSchemaId={onSchemaChange}
          getSchemaOptions={(_: TableSemanticParams[]) => {}}
          groupFieldName="semanticsGroupId"
          type="shema"
        />
        <div className={styles.semanticHint}>先选择数据语义，再从该数据语义已纳入的字段中选择一个来源字段。</div>
      </div>

      <div className="grid grid-cols-2 gap-x-8">
        <AForm.Item
          required
          extra="一次选择一个语义字段作为原子指标来源。"
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
        <AForm.Item
          required
          extra={
            <div>
              <div>当前已保存聚合方式：{aggregationSummary || '-'}</div>
              <div className="mt-1">一键映射生成的原子指标可在此查看并维护已保存的聚合方式。</div>
            </div>
          }
          label="聚合方式"
          name="atomicAggregationMethods"
          rules={[{ message: '请至少选择一种聚合方式', min: 1, required: true, type: 'array' }]}
        >
          <ASelect
            maxTagCount="responsive"
            mode="multiple"
            options={AGG_METHOD_OPTIONS}
            placeholder="请选择聚合方式"
            popupMatchSelectWidth={260}
            onChange={(methods: AggregationCode[]) => {
              form.setFieldValue('projectionFunc', toLegacyProjectionFunc(methods[0]))
            }}
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
    </div>
  )
}
