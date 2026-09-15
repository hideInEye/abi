import { BranchesOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import React from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'

import { AGG_METHOD_OPTIONS, EXTENDED_TEMPLATE_OPTIONS } from '../constants/metricModeling.constants'
import type { KnowledgeFormValues, KnowledgeIndicatorItem, KnowledgeTechField } from '../types/metricModeling.types'
import { getAtomicProjection, getAtomicSemanticSchemaName, getAtomicTechnicalSource } from '../utils/atomicMetricSource'

import { KnowledgeOperateDerivedLogicBuilder } from './knowledgeOperateDrawer.DerivedLogicBuilder'
import { KnowledgeOperateExtendedTemplateParams } from './knowledgeOperateDrawer.ExtendedTemplateParams'
import { KnowledgeIndicatorSearchSelect } from './knowledgeOperateDrawer.IndicatorSearchSelect'

interface AtomicMetricOption {
  item?: KnowledgeIndicatorItem
  label: string
  value: string
}

interface Props {
  readonly allFields: KnowledgeTechField[]
  readonly atomicMetricOptions: AtomicMetricOption[]
  readonly fieldError?: boolean
  readonly fieldLoading?: boolean
  readonly form: FormInstance<KnowledgeFormValues>
  readonly indicatorClass: string
  readonly indicatorOptionsLoading?: boolean
  readonly onIndicatorLoadMore: () => void
  readonly onIndicatorSearch: (searchText: string) => void
  readonly onRetryFields?: () => void
  readonly referenceMetricOptions: AtomicMetricOption[]
  readonly templateTypeVal: string
  readonly validateAccumulationDate: (_: unknown, value?: string) => Promise<void>
  readonly validateCustomExpression: (_: unknown, value?: string) => Promise<void>
  readonly validatePercentile: (_: unknown, value?: number | string) => Promise<void>
  readonly validatePositiveInt: (value: unknown, messageText: string) => Promise<void>
  readonly validateRollingWindow: (_: unknown, value?: number | string) => Promise<void>
  readonly validateTechName: (_: unknown, value?: string) => Promise<void>
  readonly validateTechnicalRemark: (_: unknown, value?: string) => Promise<void>
  readonly validateThresholdMax: (_: unknown, value?: string) => Promise<void>
  readonly validateThresholdValue: (_: unknown, value?: string) => Promise<void>
}

export const KnowledgeOperateTechnicalStep: React.FC<Props> = ({
  allFields,
  atomicMetricOptions,
  fieldError,
  fieldLoading,
  form,
  indicatorClass,
  indicatorOptionsLoading,
  onIndicatorLoadMore,
  onIndicatorSearch,
  onRetryFields,
  referenceMetricOptions,
  templateTypeVal,
  validateAccumulationDate,
  validateCustomExpression,
  validatePercentile,
  validatePositiveInt,
  validateRollingWindow,
  validateTechName,
  validateTechnicalRemark,
  validateThresholdMax,
  validateThresholdValue
}) => {
  const selectedAtomicId = AForm.useWatch('techId', form)
  const selectedAtomic = atomicMetricOptions.find(item => String(item.value) === String(selectedAtomicId || ''))?.item
  const sourceFieldName = getAtomicTechnicalSource(selectedAtomic?.techName || selectedAtomic?.rawTechName).fieldName
  const projectionFunc = getAtomicProjection(selectedAtomic)
  const projectionLabel =
    AGG_METHOD_OPTIONS.find(item => item.value === projectionFunc)?.label || projectionFunc || '合计'

  return (
    <>
      {indicatorClass === 'derived' && (
        <div className="mb-4 border border-gray-200 rounded bg-white p-4">
          <OntologyFormSectionTitle icon={<BranchesOutlined />}>继承与来源</OntologyFormSectionTitle>
          <div className="grid grid-cols-2 gap-x-4">
            <AForm.Item
              required
              label="指标编码"
              name="indicatorCode"
              rules={[{ validator: validateTechName }]}
              validateDebounce={600}
              validateTrigger="onChange"
            >
              <AInput placeholder="请输入指标编码" />
            </AForm.Item>
            <AForm.Item
              label="原子指标"
              name="techId"
              rules={[{ message: '请选择原子指标', required: true }]}
            >
              <KnowledgeIndicatorSearchSelect
                loading={indicatorOptionsLoading}
                options={atomicMetricOptions}
                placeholder="请选择原子指标"
                onLoadMore={onIndicatorLoadMore}
                onSearch={onIndicatorSearch}
              />
            </AForm.Item>
            <AForm.Item
              hidden
              name="projectionFunc"
              rules={[{ message: '未获取到原子指标聚合方式', required: true }]}
            >
              <AInput />
            </AForm.Item>
          </div>
          {selectedAtomic ? (
            <div className="grid grid-cols-3 mt-4 gap-4 border border-[#e2e8f3] rounded bg-[#fafbfe] px-5 py-4">
              <div>
                <div className="mb-2 text-sm text-[#7d899d]">来源字段</div>
                <div className="text-[#26354d] font-semibold">{sourceFieldName || '-'}</div>
              </div>
              <div>
                <div className="mb-2 text-sm text-[#7d899d]">聚合方式</div>
                <div className="text-[#26354d] font-semibold">
                  {projectionLabel}（{String(projectionFunc || 'sum').toUpperCase()}）
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm text-[#7d899d]">所属语义数据</div>
                <div className="text-[#26354d] font-semibold">{getAtomicSemanticSchemaName(selectedAtomic)}</div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {indicatorClass === 'derivative' ? (
        <>
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

          <AForm.Item
            required
            label="衍生模板"
            name="templateType"
            rules={[{ message: '请选择衍生模板', required: true }]}
          >
            <ASelect
              options={EXTENDED_TEMPLATE_OPTIONS}
              placeholder="请选择衍生模板"
            />
          </AForm.Item>

          <KnowledgeOperateExtendedTemplateParams
            allFields={allFields}
            atomicMetricOptions={atomicMetricOptions}
            form={form}
            indicatorOptionsLoading={indicatorOptionsLoading}
            referenceMetricOptions={referenceMetricOptions}
            templateTypeVal={templateTypeVal}
            validateAccumulationDate={validateAccumulationDate}
            validateCustomExpression={validateCustomExpression}
            validatePercentile={validatePercentile}
            validatePositiveInt={validatePositiveInt}
            validateRollingWindow={validateRollingWindow}
            validateThresholdMax={validateThresholdMax}
            validateThresholdValue={validateThresholdValue}
            onIndicatorLoadMore={onIndicatorLoadMore}
            onIndicatorSearch={onIndicatorSearch}
          />
        </>
      ) : (
        <KnowledgeOperateDerivedLogicBuilder
          allFields={allFields}
          atomicMetricOptions={atomicMetricOptions}
          fieldError={fieldError}
          fieldLoading={fieldLoading}
          form={form}
          onRetryFields={onRetryFields}
        />
      )}

      <AForm.Item
        label="技术口径"
        name="technicalDefinition"
        rules={[{ validator: validateTechnicalRemark }]}
      >
        <AInput.TextArea
          placeholder="请输入技术口径"
          rows={3}
        />
      </AForm.Item>
    </>
  )
}
