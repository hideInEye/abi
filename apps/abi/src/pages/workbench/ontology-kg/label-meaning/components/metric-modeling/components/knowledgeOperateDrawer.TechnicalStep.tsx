import { BranchesOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import React from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'

import {
  CUSTOM_AGGREGATION_EXPRESSION_LABEL,
  EXTENDED_TEMPLATE_OPTIONS
} from '../constants/metricModeling.constants'
import { useOntologyAtomicAggregationDictionary } from '../hooks/useOntologyFunctionDictionary'
import type { KnowledgeFormValues, KnowledgeIndicatorItem, KnowledgeTechField } from '../types/metricModeling.types'
import {
  getAtomicAggregationMethods,
  getAtomicComplexAggregationExpression,
  getAtomicSemanticSchemaName,
  getAtomicSourceFieldTechnicalName,
  getAtomicTechnicalSource
} from '../utils/atomicMetricSource'

import {
  type AtomicSemanticSelection,
  KnowledgeOperateAtomicTechnicalStep
} from './knowledgeOperateDrawer.AtomicTechnicalStep'
import { KnowledgeOperateDerivedLogicBuilder } from './knowledgeOperateDrawer.DerivedLogicBuilder'
import { KnowledgeOperateExtendedTemplateParams } from './knowledgeOperateDrawer.ExtendedTemplateParams'
import { KnowledgeIndicatorSearchSelect } from './knowledgeOperateDrawer.IndicatorSearchSelect'
import styles from './knowledgeOperateDrawer.TechnicalStep.module.scss'

interface AtomicMetricOption {
  item?: KnowledgeIndicatorItem
  label: string
  value: string
}

interface Props {
  readonly allFields: KnowledgeTechField[]
  readonly atomicMetricOptions: AtomicMetricOption[]
  readonly editing?: boolean
  readonly fieldError?: boolean
  readonly fieldLoading?: boolean
  readonly form: FormInstance<KnowledgeFormValues>
  readonly indicatorClass: string
  readonly indicatorOptionsLoading?: boolean
  readonly onAtomicSchemaChange: (selection: AtomicSemanticSelection) => Promise<void>
  readonly onIndicatorLoadMore: () => void
  readonly onIndicatorSearch: (searchText: string) => void
  readonly onRetryFields?: () => void
  readonly referenceMetricOptions: AtomicMetricOption[]
  readonly templateTypeVal: string
  readonly validateAccumulationDate: (_: unknown, value?: string) => Promise<void>
  readonly validatePercentile: (_: unknown, value?: number | string) => Promise<void>
  readonly validatePositiveInt: (value: unknown, messageText: string) => Promise<void>
  readonly validateRollingWindow: (_: unknown, value?: number | string) => Promise<void>
  readonly validateSqlExpression: (_: unknown, value?: string) => Promise<void>
  readonly validateTechName: (_: unknown, value?: string) => Promise<void>
  readonly validateTechnicalRemark: (_: unknown, value?: string) => Promise<void>
  readonly validateThresholdMax: (_: unknown, value?: string) => Promise<void>
  readonly validateThresholdValue: (_: unknown, value?: string) => Promise<void>
}

export const KnowledgeOperateTechnicalStep: React.FC<Props> = ({
  allFields,
  atomicMetricOptions,
  editing,
  fieldError,
  fieldLoading,
  form,
  indicatorClass,
  indicatorOptionsLoading,
  onAtomicSchemaChange,
  onIndicatorLoadMore,
  onIndicatorSearch,
  onRetryFields,
  referenceMetricOptions,
  templateTypeVal,
  validateAccumulationDate,
  validatePercentile,
  validatePositiveInt,
  validateRollingWindow,
  validateSqlExpression,
  validateTechName,
  validateTechnicalRemark,
  validateThresholdMax,
  validateThresholdValue
}) => {
  const selectedAtomicId = AForm.useWatch('techId', form)
  const selectedAtomic = atomicMetricOptions.find(item => String(item.value) === String(selectedAtomicId || ''))?.item
  const sourceFieldName = getAtomicTechnicalSource(getAtomicSourceFieldTechnicalName(selectedAtomic)).fieldName
  const aggregationMethods = getAtomicAggregationMethods(selectedAtomic)
  const customAggregationExpression = getAtomicComplexAggregationExpression(selectedAtomic)
  const { loading: aggregationOptionsLoading, options: aggregationOptions } =
    useOntologyAtomicAggregationDictionary()
  const aggregationLabelMap = useMemo(
    () => Object.fromEntries(aggregationOptions.map(item => [item.value, item.shortLabel])),
    [aggregationOptions]
  )

  if (indicatorClass === 'atomic') {
    return (
      <KnowledgeOperateAtomicTechnicalStep
        allFields={allFields}
        editing={editing}
        fieldError={fieldError}
        fieldLoading={fieldLoading}
        form={form}
        validateSqlExpression={validateSqlExpression}
        validateTechName={validateTechName}
        onRetryFields={onRetryFields}
        onSchemaChange={onAtomicSchemaChange}
      />
    )
  }

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
              <AInput
                disabled={editing}
                placeholder="请输入指标编码"
              />
            </AForm.Item>
            <AForm.Item
              label="原子指标"
              name="techId"
              rules={[{ message: '请选择原子指标', required: true }]}
            >
              <KnowledgeIndicatorSearchSelect
                disabled={editing}
                loading={indicatorOptionsLoading}
                options={atomicMetricOptions}
                placeholder="请选择原子指标"
                onLoadMore={onIndicatorLoadMore}
                onSearch={onIndicatorSearch}
              />
            </AForm.Item>
          </div>
          {selectedAtomic ? (
            <div className={styles.sourceSummary}>
              <div>
                <div className="mb-2 text-sm text-[#7d899d]">来源字段</div>
                <div className="text-[#26354d] font-semibold">{sourceFieldName || '-'}</div>
              </div>
              <div>
                <div className="mb-2 text-sm text-[#7d899d]">聚合方式</div>
                <div className={styles.aggregationRail}>
                  {customAggregationExpression ? (
                    <span className={styles.aggregationChip}>{CUSTOM_AGGREGATION_EXPRESSION_LABEL}</span>
                  ) : (
                    aggregationMethods.map(method => (
                      <span
                        className={styles.aggregationChip}
                        key={method}
                      >
                        <span>{aggregationLabelMap[method] || method}</span>
                        <span className={styles.aggregationCode}>{method}</span>
                      </span>
                    ))
                  )}
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
            <AInput
              disabled={editing}
              placeholder="请输入指标编码"
            />
          </AForm.Item>

          <AForm.Item
            required
            label="指标模版"
            name="templateType"
            rules={[{ message: '请选择指标模版', required: true }]}
          >
            <ASelect
              disabled={editing}
              options={EXTENDED_TEMPLATE_OPTIONS}
              placeholder="请选择指标模版"
            />
          </AForm.Item>

          <KnowledgeOperateExtendedTemplateParams
            allFields={allFields}
            atomicMetricOptions={atomicMetricOptions}
            editing={editing}
            fieldError={fieldError}
            fieldLoading={fieldLoading}
            form={form}
            indicatorOptionsLoading={indicatorOptionsLoading}
            referenceMetricOptions={referenceMetricOptions}
            templateTypeVal={templateTypeVal}
            validateAccumulationDate={validateAccumulationDate}
            validatePercentile={validatePercentile}
            validatePositiveInt={validatePositiveInt}
            validateRollingWindow={validateRollingWindow}
            validateSqlExpression={validateSqlExpression}
            validateThresholdMax={validateThresholdMax}
            validateThresholdValue={validateThresholdValue}
            onIndicatorLoadMore={onIndicatorLoadMore}
            onIndicatorSearch={onIndicatorSearch}
            onRetryFields={onRetryFields}
            onSchemaChange={onAtomicSchemaChange}
          />
        </>
      ) : (
        <KnowledgeOperateDerivedLogicBuilder
          aggregationOptions={aggregationOptions}
          aggregationOptionsLoading={aggregationOptionsLoading}
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
