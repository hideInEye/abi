import { DownOutlined, SearchOutlined } from '@ant-design/icons'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import React, { useMemo } from 'react'

import { INDICATOR_TYPE_FILTER_OPTIONS, STATUS_OPTIONS } from '../constants/metricModeling.constants'
import type { KnowledgeSearchParams } from '../types/metricModeling.types'

interface Props {
  readonly onQuery: () => void
  readonly onReset: () => void
  readonly onSearchChange: (value: Partial<KnowledgeSearchParams>) => void
  readonly searchParams: KnowledgeSearchParams
}

export const KnowledgeSearchBar: React.FC<Props> = ({   onQuery, onReset, onSearchChange, searchParams }) => {




  return (
    <section className="abi-searchbar">
      <div className="abi-search-row">
        <AInput
          allowClear
          className="abi-field-input w-220px"
          placeholder="请输入搜索关键字"
          prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
          value={searchParams.techName}
          onChange={(e) => onSearchChange({ techName: e.target.value })}
        />
        <ASelect
          allowClear
          className="abi-field-input w-180px"
          options={INDICATOR_TYPE_FILTER_OPTIONS}
          placeholder="指标类型"
          value={searchParams.type || undefined}
          onChange={(value) => onSearchChange({ type: value || '' })}
        />
        <ASelect
          allowClear
          className="abi-field-input w-180px"
          options={STATUS_OPTIONS}
          placeholder="状态"
          value={searchParams.status}
          onChange={(value) => onSearchChange({ status: value })}
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
