import React, { useState } from 'react'

import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar'

import { INDICATOR_TYPE_FILTER_OPTIONS, STATUS_OPTIONS } from '../constants/metricModeling.constants'
import type { KnowledgeSearchParams } from '../types/metricModeling.types'

interface Props {
  readonly onQuery: () => void
  readonly onReset: () => void
  readonly onSearchChange: (value: Partial<KnowledgeSearchParams>) => void
  readonly searchParams: KnowledgeSearchParams
}

export const KnowledgeSearchBar: React.FC<Props> = ({ onQuery, onReset, onSearchChange, searchParams }) => {
  const [dateRange, setDateRange] = useState<any>(null)

  const handleReset = () => {
    setDateRange(null)
    onReset()
  }

  return (
    <section className="abi-searchbar">
      <SearchFilterBar
        searchPlaceholder="请输入搜索关键字"
        searchValue={searchParams.techName}
        onQuery={onQuery}
        onReset={handleReset}
        onSearchChange={(value) => onSearchChange({ techName: value })}
        filters={
          <>
            <SearchFilterField label="指标类型">
              <ASelect
                allowClear
                className="abi-field-input w-full"
                getPopupContainer={getFilterPopupContainer}
                options={INDICATOR_TYPE_FILTER_OPTIONS}
                placeholder="指标类型"
                value={searchParams.type || undefined}
                onChange={(value) => onSearchChange({ type: value || '' })}
              />
            </SearchFilterField>
            <SearchFilterField label="状态">
              <ASelect
                allowClear
                className="abi-field-input w-full"
                getPopupContainer={getFilterPopupContainer}
                options={STATUS_OPTIONS}
                placeholder="状态"
                value={searchParams.status}
                onChange={(value) => onSearchChange({ status: value })}
              />
            </SearchFilterField>
            <SearchFilterField label="时间范围">
              <ADatePicker.RangePicker
                allowClear
                className="abi-field-input"
                format="YYYY-MM-DD"
                getPopupContainer={getFilterPopupContainer}
                placeholder={['开始时间', '结束时间']}
                value={dateRange}
                onChange={(dates) => setDateRange(dates)}
              />
            </SearchFilterField>
          </>
        }
      />
    </section>
  )
}
