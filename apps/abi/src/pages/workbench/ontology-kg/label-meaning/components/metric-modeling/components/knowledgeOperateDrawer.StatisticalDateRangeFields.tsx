import { Form as AForm, InputNumber as AInputNumber, Select as ASelect, Space as ASpace } from 'antd'
import React from 'react'

import { STATISTICAL_DATE_RANGE_MODE_OPTIONS } from '../constants/metricModeling.constants'
import type { KnowledgeFormValues, StatisticalDateRangeMode } from '../types/metricModeling.types'
import {
  getStatisticalDateRangeUnitOptions,
  isDynamicStatisticalDateRangeMode,
  normalizeStatisticalDateRangeUnit
} from '../utils/precomputeConfig'

import styles from './knowledgeOperateDrawer.StatisticalDateRangeFields.module.scss'

interface StatisticalDateRangeFieldsProps {
  readonly id?: string
  readonly mode: StatisticalDateRangeMode
  readonly onChange?: (value: number | null) => void
  readonly value?: number | null
}

export const StatisticalDateRangeFields: React.FC<StatisticalDateRangeFieldsProps> = ({
  id,
  mode,
  onChange,
  value
}) => {
  const form = AForm.useFormInstance<KnowledgeFormValues>()
  const dynamicMode = isDynamicStatisticalDateRangeMode(mode)

  const handleModeChange = (nextMode: StatisticalDateRangeMode) => {
    const currentUnit = form.getFieldValue(['statisticalCaliber', 'dateRangeUnit'])
    const nextUnit = normalizeStatisticalDateRangeUnit(nextMode, currentUnit)
    if (nextUnit !== currentUnit) {
      form.setFieldValue(['statisticalCaliber', 'dateRangeUnit'], nextUnit)
    }
    if (!isDynamicStatisticalDateRangeMode(nextMode)) {
      form.setFields([{ errors: [], name: ['statisticalCaliber', 'dateRangeValue'] }])
    }
  }

  return (
    <ASpace.Compact
      block
      className={`${styles.dateRangeCompact} ${dynamicMode ? '' : styles.singleMode}`}
    >
      <AForm.Item
        noStyle
        name={['statisticalCaliber', 'dateRangeMode']}
        rules={[{ message: '请选择日期范围', required: true }]}
      >
        <ASelect
          aria-label="日期范围方式"
          className={styles.rangeMode}
          options={STATISTICAL_DATE_RANGE_MODE_OPTIONS}
          onChange={handleModeChange}
        />
      </AForm.Item>
      {dynamicMode ? (
        <>
          <AInputNumber
            aria-label="统计窗口数量"
            className={styles.rangeValue}
            id={id}
            max={999}
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
            <ASelect
              aria-label="日期范围单位"
              className={styles.rangeUnit}
              options={getStatisticalDateRangeUnitOptions(mode)}
            />
          </AForm.Item>
        </>
      ) : null}
    </ASpace.Compact>
  )
}
