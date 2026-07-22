import React, { useState } from 'react'

import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar'

import type { DimensionSearchParams } from '../types/dimensionModeling.types'

interface Props {
  readonly onQuery: () => void
  readonly onReset: () => void
  readonly onSearchChange: (value: Partial<DimensionSearchParams>) => void
  readonly searchParams: DimensionSearchParams
}

export const DimensionSearchBar: React.FC<Props> = ({
  onQuery,
  onReset,
  onSearchChange,
  searchParams
}) => {
  const [dateRange, setDateRange] = useState<any>(null)

  const handleReset = () => {
    setDateRange(null)
    onReset()
  }

  return (
    <section className="abi-searchbar">
      <SearchFilterBar
        searchPlaceholder="检索维度名称"
        searchValue={searchParams.keyword}
        onQuery={onQuery}
        onReset={handleReset}
        onSearchChange={(value) => onSearchChange({ keyword: value })}
        filters={
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
        }
      />
    </section>
  )
}
