import { BranchesOutlined, CodeOutlined } from '@ant-design/icons'
import React from 'react'
import type { FormInstance } from 'antd'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'

import { AGG_METHOD_OPTIONS, EXTENDED_TEMPLATE_OPTIONS } from '../constants/metricModeling.constants'
import type { KnowledgeFormValues, KnowledgeIndicatorItem, KnowledgeTechField } from '../types/metricModeling.types'

import { KnowledgeOperateDerivedLogicBuilder } from './knowledgeOperateDrawer.DerivedLogicBuilder'
import { KnowledgeOperateExtendedTemplateParams } from './knowledgeOperateDrawer.ExtendedTemplateParams'

interface AtomicMetricOption {
  item?: KnowledgeIndicatorItem
  label: string
  value: string
}

interface Props {
  allFields: KnowledgeTechField[]
  atomicMetricOptions: AtomicMetricOption[]
  form: FormInstance<KnowledgeFormValues>
  indicatorClass: string
  referenceMetricOptions: AtomicMetricOption[]
  templateTypeVal: string
  validateAccumulationDate: (_: unknown, value?: string) => Promise<void>
  validateCustomExpression: (_: unknown, value?: string) => Promise<void>
  validatePercentile: (_: unknown, value?: number | string) => Promise<void>
  validatePositiveInt: (value: unknown, messageText: string) => Promise<void>
  validateRollingWindow: (_: unknown, value?: number | string) => Promise<void>
  validateTechName: (_: unknown, value?: string) => Promise<void>
  validateTechnicalRemark: (_: unknown, value?: string) => Promise<void>
  validateThresholdMax: (_: unknown, value?: string) => Promise<void>
  validateThresholdValue: (_: unknown, value?: string) => Promise<void>
}

export const KnowledgeOperateTechnicalStep: React.FC<Props> = ({
  allFields,
  atomicMetricOptions,
  form,
  indicatorClass,
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
  validateThresholdValue,
}) => {
  return (
    <>
      <OntologyFormSectionTitle icon={<CodeOutlined />}>二、技术属性</OntologyFormSectionTitle>

      {indicatorClass === 'derived' && (
        <div className="mb-4 border border-gray-200 rounded bg-white p-4">
          <OntologyFormSectionTitle icon={<BranchesOutlined />}>继承与来源</OntologyFormSectionTitle>
          <div className="grid grid-cols-2 gap-x-4">
            <AForm.Item required label="指标编码" name="indicatorCode" rules={[{ validator: validateTechName }]} validateDebounce={600} validateTrigger="onChange">
              <AInput placeholder="请输入指标编码" />
            </AForm.Item>
            <AForm.Item label="原子指标" name="techId" rules={[{ message: '请选择原子指标', required: true }]}>
              <ASelect options={atomicMetricOptions} placeholder="请选择原子指标" />
            </AForm.Item>
            <AForm.Item label="汇总依据 / 聚合方式" name="projectionFunc" rules={[{ message: '请选择汇总依据 / 聚合方式', required: true }]}>
              <ASelect options={AGG_METHOD_OPTIONS} placeholder="请选择汇总依据 / 聚合方式" />
            </AForm.Item>
          </div>
        </div>
      )}

      {indicatorClass === 'derivative' ? (
        <>
            <AForm.Item required label="指标编码" name="techName" rules={[{ validator: validateTechName }]} validateDebounce={600} validateTrigger="onChange">
              <AInput placeholder="请输入指标编码" />
            </AForm.Item>

          <AForm.Item required label="衍生模板" name="templateType" rules={[{ message: '请选择衍生模板', required: true }]}>
            <ASelect options={EXTENDED_TEMPLATE_OPTIONS} placeholder="请选择衍生模板" />
          </AForm.Item>

          <KnowledgeOperateExtendedTemplateParams
            allFields={allFields}
            atomicMetricOptions={atomicMetricOptions}
            form={form}
            referenceMetricOptions={referenceMetricOptions}
            templateTypeVal={templateTypeVal}
            validateAccumulationDate={validateAccumulationDate}
            validateCustomExpression={validateCustomExpression}
            validatePercentile={validatePercentile}
            validatePositiveInt={validatePositiveInt}
            validateRollingWindow={validateRollingWindow}
            validateThresholdMax={validateThresholdMax}
            validateThresholdValue={validateThresholdValue}
          />
        </>
      ) : (
        <KnowledgeOperateDerivedLogicBuilder allFields={allFields} atomicMetricOptions={atomicMetricOptions} form={form} />
      )}

      <AForm.Item label="技术口径" name="technicalDefinition" rules={[{ validator: validateTechnicalRemark }]}>
        <AInput.TextArea placeholder="请输入技术口径" rows={3} />
      </AForm.Item>
    </>
  )
}
