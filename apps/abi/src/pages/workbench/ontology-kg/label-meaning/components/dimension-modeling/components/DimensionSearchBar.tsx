import React, { useState } from 'react'

import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar'

import type { DimensionSearchParams } from '../types/dimensionModeling.types'

interface Props {
  readonly onDateRangeChange?: (range: any) => void
  readonly onQuery: () => void
  readonly onReset: () => void
  readonly onSearchChange: (value: Partial<DimensionSearchParams>) => void
  readonly searchParams: DimensionSearchParams
}

export const DimensionSearchBar: React.FC<Props> = ({
  onDateRangeChange,
  onQuery,
  onReset,
  onSearchChange,
  searchParams
}) => {
  const [dateRange, setDateRange] = useState<any>(null)

  const handleReset = () => {
    setDateRange(null)
    onDateRangeChange?.(null)
    onReset()
  }

  return (
    <section className="abi-searchbar">
      <SearchFilterBar
        searchPlaceholder="检索中文名"
        searchValue={searchParams.bizName}
        onQuery={onQuery}
        onReset={handleReset}
        onSearchChange={(value) => onSearchChange({ bizName: value })}
        filters={
          <>
            <SearchFilterField label="时间范围">
              <DeferredRangePicker
                allowClear
                className="abi-field-input"
                format="YYYY-MM-DD"
                getPopupContainer={getFilterPopupContainer}
                placeholder={['开始时间', '结束时间']}
                value={dateRange}
                onChange={(dates) => { setDateRange(dates); onDateRangeChange?.(dates); }}
              />
            </SearchFilterField>
            <SearchFilterField label="英文名">
              <AInput
                allowClear
                className="abi-field-input"
                placeholder="检索英文名"
                value={searchParams.techName}
                onChange={(event) => onSearchChange({ techName: event.target.value })}
                onPressEnter={onQuery}
              />
            </SearchFilterField>
          </>
        }
      />
    </section>
  )
}
