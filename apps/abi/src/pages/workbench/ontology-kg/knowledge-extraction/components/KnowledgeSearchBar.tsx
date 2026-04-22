import React from 'react'

import { INDICATOR_TYPE_OPTIONS, STATUS_OPTIONS } from '../constants'
import type { KnowledgeSearchParams } from '../types'

interface Props {
  readonly addDisabled?: boolean
  readonly onAdd: () => void
  readonly onQuery: () => void
  readonly onReset: () => void
  readonly onSearchChange: (value: Partial<KnowledgeSearchParams>) => void
  readonly searchParams: KnowledgeSearchParams
}

export const KnowledgeSearchBar: React.FC<Props> = ({
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
        className="w-220px"
        placeholder="请输入搜索关键字"
        value={searchParams.keyword}
        onChange={e => onSearchChange({ keyword: e.target.value })}
      />
      <ASelect
        allowClear
        className="w-180px"
        options={INDICATOR_TYPE_OPTIONS}
        placeholder="指标类型"
        value={searchParams.type || undefined}
        onChange={value => onSearchChange({ type: value || '' })}
      />
      <ASelect
        allowClear
        className="w-180px"
        options={STATUS_OPTIONS}
        placeholder="状态"
        value={searchParams.status}
        onChange={value => onSearchChange({ status: value })}
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
        新建
      </AButton>
    </div>
  )
}
