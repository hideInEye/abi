import { BarChartOutlined, ProfileOutlined, TagsOutlined, TeamOutlined } from '@ant-design/icons'
import React from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'

import { DATA_FREQUENCY_OPTIONS, INDICATOR_TYPE_OPTIONS, KNOWLEDGE_DATA_TYPE_OPTIONS, QUALITY_LEVEL_OPTIONS, STATUS_OPTIONS } from '../constants/metricModeling.constants'

interface Props {
  readonly indicatorNameDisabled?: boolean
  readonly validateAliasTags: (_: unknown, value?: string[]) => Promise<void>
  readonly validateBusinessRemark: (_: unknown, value?: string) => Promise<void>
  readonly validateIndicatorName: (_: unknown, value?: string) => Promise<void>
  readonly validateMeasurementUnit: (_: unknown, value?: string) => Promise<void>
}

export const KnowledgeOperateBusinessStep: React.FC<Props> = ({
  indicatorNameDisabled,
  validateAliasTags,
  validateBusinessRemark,
  validateIndicatorName,
  validateMeasurementUnit,
}) => {
  const { patternRules } = useFormRules()

  return (
    <>
      <OntologyFormSectionTitle icon={<ProfileOutlined />}>一、业务属性</OntologyFormSectionTitle>

      <div className="mb-4 border border-gray-200 rounded bg-white p-4">
        <OntologyFormSectionTitle icon={<ProfileOutlined />}>基础信息</OntologyFormSectionTitle>
        <div className="grid grid-cols-2 gap-x-4">
          <AForm.Item required label="指标名称" name="bizName" rules={[{ validator: validateIndicatorName }]} validateDebounce={600} validateTrigger="onChange">
            <AInput disabled={indicatorNameDisabled} placeholder="请输入指标名称" />
          </AForm.Item>
          <AForm.Item label="指标类型" name="indicatorClass" rules={[{ message: '请选择指标类型', required: true }]}>
            <ASelect options={INDICATOR_TYPE_OPTIONS} placeholder="请选择指标类型" />
          </AForm.Item>
          <AForm.Item label="指标状态" name="versionStatus" rules={[{ message: '请选择指标状态', required: true }]}>
            <ASelect options={STATUS_OPTIONS} placeholder="请选择指标状态" />
          </AForm.Item>
        </div>
      </div>

      <div className="mb-4 border border-gray-200 rounded bg-white p-4">
        <OntologyFormSectionTitle icon={<BarChartOutlined />}>统计属性</OntologyFormSectionTitle>
        <div className="grid grid-cols-2 gap-x-4">
          <AForm.Item label="数据频度" name="updateFrequency" rules={[{ message: '请选择数据频度', required: true }]}>
            <ASelect options={DATA_FREQUENCY_OPTIONS} placeholder="请选择数据频度" />
          </AForm.Item>
          <AForm.Item extra="文本输入数字，例如 1、7、30。" label="时间周期" name="calcPeriod">
            <AInput maxLength={8} placeholder="请输入时间周期" />
          </AForm.Item>
          <AForm.Item label="计量单位" name="measurementUnit" rules={[{ validator: validateMeasurementUnit }]}>
            <AInput placeholder="请输入计量单位，如 CNY、%" />
          </AForm.Item>
          <AForm.Item label="数据类型" name="dataType" rules={[{ message: '请选择数据类型', required: true }]}>
            <ASelect options={KNOWLEDGE_DATA_TYPE_OPTIONS} placeholder="请选择数据类型" />
          </AForm.Item>
        </div>
      </div>

      <div className="mb-4 border border-gray-200 rounded bg-white p-4">
        <OntologyFormSectionTitle icon={<TeamOutlined />}>管理信息</OntologyFormSectionTitle>
        <div className="grid grid-cols-2 gap-x-4">
          <AForm.Item label="负责人" name="indicatorOwner">
            <AInput placeholder="请输入负责人" />
          </AForm.Item>
          <AForm.Item label="负责人邮箱" name="ownerEmail" rules={[patternRules.email]}>
            <AInput placeholder="请输入负责人邮箱" />
          </AForm.Item>
          <AForm.Item label="负责人电话" name="ownerPhone" rules={[patternRules.phone]}>
            <AInput placeholder="请输入负责人电话" />
          </AForm.Item>
          <AForm.Item label="是否公开" name="isPublic" valuePropName="checked">
            <ASwitch checkedChildren="公开" unCheckedChildren="私有" />
          </AForm.Item>
          <AForm.Item label="质量等级" name="qualityLevel" rules={[{ message: '请选择质量等级', required: true }]}>
            <ASelect options={QUALITY_LEVEL_OPTIONS} placeholder="请选择质量等级" />
          </AForm.Item>
        </div>
      </div>

      <div className="mb-4 border border-gray-200 rounded bg-white p-4">
        <OntologyFormSectionTitle icon={<TagsOutlined />}>语义信息</OntologyFormSectionTitle>
        <AForm.Item extra="用于 ChatBI 对业务术语的识别与召回" label="指标别名" name="indAlias" rules={[{ validator: validateAliasTags }]}>
          <ASelect mode="tags" open={false} placeholder="输入后按回车生成标签" tokenSeparators={[',']} />
        </AForm.Item>

        <AForm.Item required label="业务口径" name="businessDefinition" rules={[{ validator: validateBusinessRemark }]}>
          <AInput.TextArea placeholder="请输入业务口径" rows={4} />
        </AForm.Item>
      </div>
    </>
  )
}
