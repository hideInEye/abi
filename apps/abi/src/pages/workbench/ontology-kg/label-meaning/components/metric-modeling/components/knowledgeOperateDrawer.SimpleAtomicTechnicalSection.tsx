import { Alert } from 'antd'
import type { FormInstance } from 'antd'
import React, { useEffect, useMemo } from 'react'

import { TableSemantics } from '@/components/tableSemantics'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'

import { useOntologyAtomicAggregationDictionary } from '../hooks/useOntologyFunctionDictionary'
import type { AggregationCode, KnowledgeFormValues, KnowledgeTechField } from '../types/metricModeling.types'
import { toLegacyProjectionFunc } from '../utils/aggregation'
import { getKnowledgeTechFieldId } from '../utils/atomicMetricSource'
import { getCustomAtomicFieldOptionLabel } from '../utils/customAtomic'

import type { AtomicSemanticSelection } from './knowledgeOperateDrawer.AtomicTechnicalStep'

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
  const sourceFieldId = AForm.useWatch('atomicSourceFieldId', form)
  const aggregationMethods = AForm.useWatch('atomicAggregationMethods', form)
  const { loading: aggregationOptionsLoading, options: aggregationOptions } =
    useOntologyAtomicAggregationDictionary()
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
  useEffect(() => {
    const defaultMethod = aggregationOptions[0]?.value
    if (defaultMethod && aggregationMethods === undefined) {
      form.setFieldValue('atomicAggregationMethods', [defaultMethod])
      form.setFieldValue('projectionFunc', toLegacyProjectionFunc(defaultMethod))
    }
  }, [aggregationMethods, aggregationOptions, form])

  return (
    <div className="mb-4 border border-gray-200 rounded bg-white p-4">
      <div className="mb-4">
        <TableSemantics
          form={form}
          getSchemaId={onSchemaChange}
          getSchemaOptions={(_: TableSemanticParams[]) => {}}
          groupFieldName="semanticsGroupId"
          isEdit
          label="数据语义"
          type="shema"
        />
      </div>

      <div className="grid grid-cols-2 gap-x-8">
        <AForm.Item
          required
          label="来源字段"
          name="atomicSourceFieldId"
          rules={[{ message: '请选择来源字段', required: true }]}
        >
          <ASelect
            showSearch
            disabled
            loading={fieldLoading}
            optionFilterProp="label"
            options={sourceOptions}
            placeholder="请选择来源字段"
          />
        </AForm.Item>
        <AForm.Item
          required
          label="聚合方式"
          name="atomicAggregationMethods"
          rules={[{ message: '请至少选择一种聚合方式', min: 1, required: true, type: 'array' }]}
        >
          <ASelect
            loading={aggregationOptionsLoading}
            maxTagCount="responsive"
            mode="multiple"
            options={aggregationOptions}
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
