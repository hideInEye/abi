import { ClockCircleOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import dayjs from 'dayjs'
import React from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'

import { DATA_FREQUENCY_OPTIONS, WEEKDAY_OPTIONS } from '../constants/metricModeling.constants'
import type { KnowledgeFormValues, PrecomputeConfig, PrecomputeFrequency } from '../types/metricModeling.types'
import {
  createDefaultPrecomputeConfig,
  getPrecomputeSummary,
  normalizePrecomputeConfig
} from '../utils/precomputeConfig'

import { KnowledgeFormItemLabel } from './knowledgeOperateDrawer.FormItemLabel'

interface TimeStringPickerProps {
  readonly onChange?: (value?: string) => void
  readonly value?: string
}

export const TimeStringPicker: React.FC<TimeStringPickerProps> = ({ onChange, value }) => (
  <ATimePicker
    format="HH:mm"
    minuteStep={1}
    placeholder="请选择时间"
    value={value ? dayjs(`2000-01-01T${value}:00`) : null}
    onChange={time => onChange?.(time?.format('HH:mm'))}
  />
)

interface Props {
  readonly form: FormInstance<KnowledgeFormValues>
}

export const KnowledgePrecomputeConfig: React.FC<Props> = ({ form }) => {
  const configValue = AForm.useWatch('precomputeConfig', form) as PrecomputeConfig | undefined
  const config = normalizePrecomputeConfig(configValue)

  const handleFrequencyChange = (frequency: PrecomputeFrequency) => {
    form.setFieldValue('precomputeConfig', createDefaultPrecomputeConfig(frequency))
  }

  return (
    <div className="mb-4 border border-gray-200 rounded bg-white p-4">
      <OntologyFormSectionTitle icon={<ClockCircleOutlined />}>预计算配置</OntologyFormSectionTitle>
      <div className="grid grid-cols-2 gap-x-8">
        <AForm.Item
          label="计算频率"
          name={['precomputeConfig', 'frequency']}
          rules={[{ message: '请选择计算频率', required: true }]}
        >
          <ASelect
            options={DATA_FREQUENCY_OPTIONS}
            placeholder="请选择计算频率"
            onChange={handleFrequencyChange}
          />
        </AForm.Item>
        <div>
          <div className="mb-2 flex items-center gap-1 text-sm text-[#3e5068] font-medium">
            <KnowledgeFormItemLabel
              helpText="按当前空间时区执行。"
              title="执行时间"
            />
            <span className="text-red-500">*</span>
          </div>
          {config.frequency === 'hourly' ? (
            <div className="flex items-center gap-3">
              <span className="text-[#7d899d]">每小时第</span>
              <AForm.Item
                className="mb-0!"
                name={['precomputeConfig', 'minute']}
                rules={[{ max: 59, message: '请输入 0～59 的分钟数', min: 0, required: true, type: 'number' }]}
              >
                <AInputNumber
                  max={59}
                  min={0}
                  precision={0}
                  style={{ width: 120 }}
                />
              </AForm.Item>
              <span className="text-[#7d899d]">分钟执行</span>
            </div>
          ) : null}
          {config.frequency === 'daily' ? (
            <AForm.Item
              className="mb-0!"
              name={['precomputeConfig', 'time']}
              rules={[{ message: '请选择执行时间', required: true }]}
            >
              <TimeStringPicker />
            </AForm.Item>
          ) : null}
          {config.frequency === 'weekly' ? (
            <div className="flex gap-3">
              <AForm.Item
                className="flex-1 mb-0!"
                name={['precomputeConfig', 'weekday']}
                rules={[{ message: '请选择星期', required: true }]}
              >
                <ASelect
                  options={WEEKDAY_OPTIONS}
                  placeholder="请选择星期"
                />
              </AForm.Item>
              <AForm.Item
                className="flex-1 mb-0!"
                name={['precomputeConfig', 'time']}
                rules={[{ message: '请选择执行时间', required: true }]}
              >
                <TimeStringPicker />
              </AForm.Item>
            </div>
          ) : null}
          {config.frequency === 'monthly' ? (
            <div className="flex gap-3">
              <AForm.Item
                className="flex-1 mb-0!"
                name={['precomputeConfig', 'monthDay']}
                rules={[{ message: '请选择日期', required: true }]}
              >
                <ASelect
                  options={Array.from({ length: 31 }, (_, index) => ({ label: `${index + 1} 日`, value: index + 1 }))}
                  placeholder="请选择日期"
                />
              </AForm.Item>
              <AForm.Item
                className="flex-1 mb-0!"
                name={['precomputeConfig', 'time']}
                rules={[{ message: '请选择执行时间', required: true }]}
              >
                <TimeStringPicker />
              </AForm.Item>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-5 border border-[#dbe5ff] rounded bg-[#f6f8ff] px-4 py-3 text-[#4568c8]">
        {getPrecomputeSummary(config)}
      </div>
    </div>
  )
}
