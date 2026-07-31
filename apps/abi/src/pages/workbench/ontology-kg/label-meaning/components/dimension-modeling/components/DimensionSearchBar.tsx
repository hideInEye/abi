import React, { useState } from 'react'
import { useDebounceFn } from 'ahooks'

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
  const { cancel: cancelDebouncedQuery, run: runDebouncedQuery } = useDebounceFn(onQuery, { wait: 1000 })

  const handleReset = () => {
    cancelDebouncedQuery()
    setDateRange(null)
    onDateRangeChange?.(null)
    onReset()
  }

  const handleTechNameChange = (value: string) => {
    onSearchChange({ techName: value })
    if (value) {
      runDebouncedQuery()
    } else {
      cancelDebouncedQuery()
      onQuery()
    }
  }

  const handleTechNamePressEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    cancelDebouncedQuery()
    onQuery()
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
                onChange={(event) => handleTechNameChange(event.target.value)}
                onPressEnter={handleTechNamePressEnter}
              />
            </SearchFilterField>
          </>
        }
      />
    </section>
  )
}
