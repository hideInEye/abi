import React from 'react'

import type { DimensionSearchParams } from '../types'

interface Props {
  readonly addDisabled?: boolean
  readonly onAdd: () => void
  readonly onQuery: () => void
  readonly onReset: () => void
  readonly onSearchChange: (value: Partial<DimensionSearchParams>) => void
  readonly searchParams: DimensionSearchParams
}

export const DimensionSearchBar: React.FC<Props> = ({
  addDisabled,
  onAdd,
  onQuery,
  onReset,
  onSearchChange,
  searchParams
}) => {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <AInput
        allowClear
        className="w-260px"
        placeholder="检索维度名称"
        value={searchParams.keyword}
        onChange={e => onSearchChange({ keyword: e.target.value })}
        onPressEnter={onQuery}
      />
      <AButton
        type="primary"
        onClick={onQuery}
      >
        查询
      </AButton>
      <AButton onClick={onReset}>重置</AButton>
      <AButton
        className="ml-auto"
        disabled={addDisabled}
        type="primary"
        onClick={onAdd}
      >
        新增维度
      </AButton>
    </div>
  )
}
