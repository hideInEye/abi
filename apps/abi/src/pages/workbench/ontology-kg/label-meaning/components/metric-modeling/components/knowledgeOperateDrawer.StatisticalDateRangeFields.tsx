import { Form as AForm, InputNumber as AInputNumber, Select as ASelect, Space as ASpace } from 'antd'
import React from 'react'

import { STATISTICAL_DATE_UNIT_OPTIONS } from '../constants/metricModeling.constants'

import styles from './knowledgeOperateDrawer.StatisticalDateRangeFields.module.scss'

interface StatisticalDateRangeFieldsProps {
  readonly id?: string
  readonly onChange?: (value: number | null) => void
  readonly value?: number | null
}

export const StatisticalDateRangeFields: React.FC<StatisticalDateRangeFieldsProps> = ({ id, onChange, value }) => (
  <ASpace.Compact
    block
    className={styles.dateRangeCompact}
  >
    <AInputNumber
      addonBefore="最近"
      id={id}
      min={1}
      precision={0}
      value={value}
      onChange={onChange}
    />
    <AForm.Item
      noStyle
      name={['statisticalCaliber', 'dateRangeUnit']}
      rules={[{ message: '请选择日期单位', required: true }]}
    >
      <ASelect options={STATISTICAL_DATE_UNIT_OPTIONS} />
    </AForm.Item>
  </ASpace.Compact>
)
