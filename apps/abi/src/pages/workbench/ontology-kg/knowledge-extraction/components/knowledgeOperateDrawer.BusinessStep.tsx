import React from 'react'

import {
  DATA_FREQUENCY_OPTIONS,
  INDICATOR_TYPE_OPTIONS,
  KNOWLEDGE_DATA_TYPE_OPTIONS,
  QUALITY_LEVEL_OPTIONS,
  STATUS_OPTIONS
} from '../constants'

interface Props {
  readonly validateAliasTags: (_: any, value?: string[]) => Promise<void>
  readonly validateBusinessRemark: (_: any, value?: string) => Promise<void>
  readonly validateIndicatorName: (_: any, value?: string) => Promise<void>
  readonly validateMeasurementUnit: (_: any, value?: string) => Promise<void>
}

export const KnowledgeOperateBusinessStep: React.FC<Props> = ({
  validateAliasTags,
  validateBusinessRemark,
  validateIndicatorName,
  validateMeasurementUnit
}) => {
  return (
    <>
      <div className="mb-4 text-lg font-semibold">一、业务配置</div>
      <div className="grid grid-cols-2 gap-x-4">
        <AForm.Item
          required
          label="指标名称"
          name="bizName"
          rules={[{ validator: validateIndicatorName }]}
        >
          <AInput placeholder="请输入指标名称" />
        </AForm.Item>
        <AForm.Item
          label="指标类型"
          name="indicatorType"
          rules={[{ message: '请选择指标类型', required: true }]}
        >
          <ASelect
            options={INDICATOR_TYPE_OPTIONS}
            placeholder="请选择指标类型"
          />
        </AForm.Item>
        <AForm.Item
          label="指标状态"
          name="status"
          rules={[{ message: '请选择指标状态', required: true }]}
        >
          <ASelect
            options={STATUS_OPTIONS}
            placeholder="请选择指标状态"
          />
        </AForm.Item>
        <AForm.Item
          label="数据频度 / 更新频率"
          name="dataFrequency"
          rules={[{ message: '请选择更新频率', required: true }]}
        >
          <ASelect
            options={DATA_FREQUENCY_OPTIONS}
            placeholder="请选择更新频率"
          />
        </AForm.Item>
        <AForm.Item
          label="计量单位"
          name="measurementUnit"
          rules={[{ validator: validateMeasurementUnit }]}
        >
          <AInput placeholder="请输入计量单位，如 CNY、%" />
        </AForm.Item>
        <AForm.Item
          label="数据类型"
          name="dataType"
          rules={[{ message: '请选择数据类型', required: true }]}
        >
          <ASelect
            options={KNOWLEDGE_DATA_TYPE_OPTIONS}
            placeholder="请选择数据类型"
          />
        </AForm.Item>
        <AForm.Item
          label="指标负责人"
          name="owner"
        >
          <AInput placeholder="请输入指标负责人" />
        </AForm.Item>
        <AForm.Item
          label="质量等级"
          name="qualityLevel"
          rules={[{ message: '请选择质量等级', required: true }]}
        >
          <ASelect
            options={QUALITY_LEVEL_OPTIONS}
            placeholder="请选择质量等级"
          />
        </AForm.Item>
      </div>

      <AForm.Item
        extra="输入文本按回车生成标签；最多10个，单个不超过20字符。"
        label="指标别名"
        name="indicatorAliasTags"
        rules={[{ validator: validateAliasTags }]}
      >
        <ASelect
          mode="tags"
          open={false}
          placeholder="输入后按回车生成标签"
          tokenSeparators={[',']}
        />
      </AForm.Item>

      <AForm.Item
        required
        label="业务口径"
        name="remark"
        rules={[{ validator: validateBusinessRemark }]}
      >
        <AInput.TextArea
          placeholder="请输入业务口径"
          rows={4}
        />
      </AForm.Item>
    </>
  )
}
