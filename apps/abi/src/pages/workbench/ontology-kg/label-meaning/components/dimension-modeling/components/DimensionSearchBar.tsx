import { SearchOutlined } from '@ant-design/icons'
import React from 'react'

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
  return (
    <section className="abi-searchbar">
      <div className="abi-search-row">
        <AInput
          allowClear
          className="abi-field-input w-260px"
          placeholder="检索维度名称"
          prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
          value={searchParams.keyword}
          onChange={e => onSearchChange({ keyword: e.target.value })}
          onPressEnter={onQuery}
        />
        <AButton type="primary" className="btn-accent-gradient" onClick={onQuery}>
          <SearchOutlined /> 查询
        </AButton>
        <AButton className="btn-ghost-v5" onClick={onReset}>
          重置
        </AButton>
      </div>
    </section>
  )
}
