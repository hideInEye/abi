import React from 'react'

import { TableSemantics } from '@/components/tableSemantics'

import { AGG_METHOD_OPTIONS, EXTENDED_TEMPLATE_OPTIONS } from '../constants'

import { KnowledgeOperateDerivedLogicBuilder } from './knowledgeOperateDrawer.DerivedLogicBuilder'
import { KnowledgeOperateExtendedTemplateParams } from './knowledgeOperateDrawer.ExtendedTemplateParams'

interface AtomicMetricOption {
  label: string
  value: string
}

interface Props {
  readonly allFields: any[]
  readonly atomicMetricOptions: AtomicMetricOption[]
  readonly form: any
  readonly getSchemaId: ({
    semanticGroupId,
    semanticSchemaId,
    viewId
  }: {
    semanticGroupId: number | null
    semanticSchemaId: number
    viewId: number
  }) => void
  readonly indicatorType: string
  readonly setSchemaOptions: (schemaOptions: any[]) => void
  readonly templateTypeVal: string
  readonly validateAccumulationDate: (_: any, value?: string) => Promise<void>
  readonly validateCustomExpression: (_: any, value?: string) => Promise<void>
  readonly validatePercentile: (_: any, value?: number | string) => Promise<void>
  readonly validatePositiveInt: (value: any, messageText: string) => Promise<void>
  readonly validateRollingWindow: (_: any, value?: number | string) => Promise<void>
  readonly validateSqlExpression: (_: any, value?: string) => Promise<void>
  readonly validateTechName: (_: any, value?: string) => Promise<void>
  readonly validateTechnicalRemark: (_: any, value?: string) => Promise<void>
  readonly validateThresholdMax: (_: any, value?: string) => Promise<void>
  readonly validateThresholdValue: (_: any, value?: string) => Promise<void>
}

export const KnowledgeOperateTechnicalStep: React.FC<Props> = ({
  allFields,
  atomicMetricOptions,
  form,
  getSchemaId,
  indicatorType,
  setSchemaOptions,
  templateTypeVal,
  validateAccumulationDate,
  validateCustomExpression,
  validatePercentile,
  validatePositiveInt,
  validateRollingWindow,
  validateSqlExpression,
  validateTechName,
  validateTechnicalRemark,
  validateThresholdMax,
  validateThresholdValue
}) => {
  return (
    <>
      <div className="mb-4 text-lg font-semibold">二、技术配置</div>

      <div className="grid grid-cols-2 gap-x-4">
        <AForm.Item
          required
          label="指标编码"
          name="techName"
          rules={[{ validator: validateTechName }]}
        >
          <AInput placeholder="请输入指标编码" />
        </AForm.Item>
        <AForm.Item
          label="汇总依据 / 聚合方式"
          name="aggMethod"
          rules={[{ message: '请选择聚合方式', required: true }]}
        >
          <ASelect
            options={AGG_METHOD_OPTIONS}
            placeholder="请选择聚合方式"
          />
        </AForm.Item>
      </div>

      <TableSemantics
        form={form}
        getSchemaId={getSchemaId}
        getSchemaOptions={setSchemaOptions as any}
        type="shema"
      />

      {indicatorType === 'derived' ? (
        <>
          <AForm.Item
            label="原子指标"
            name="atomicMetricId"
            rules={[{ message: '请选择原子指标', required: true }]}
          >
            <ASelect
              options={atomicMetricOptions}
              placeholder="请选择原子指标"
            />
          </AForm.Item>

          <KnowledgeOperateDerivedLogicBuilder
            allFields={allFields}
            atomicMetricOptions={atomicMetricOptions}
            form={form}
          />
        </>
      ) : null}

      {indicatorType === 'extended' ? (
        <>
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
            templateTypeVal={templateTypeVal}
            validateAccumulationDate={validateAccumulationDate}
            validateCustomExpression={validateCustomExpression}
            validatePercentile={validatePercentile}
            validatePositiveInt={validatePositiveInt}
            validateRollingWindow={validateRollingWindow}
            validateSqlExpression={validateSqlExpression}
            validateThresholdMax={validateThresholdMax}
            validateThresholdValue={validateThresholdValue}
          />
        </>
      ) : null}

      <AForm.Item
        label="技术口径"
        name="technicalRemark"
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
