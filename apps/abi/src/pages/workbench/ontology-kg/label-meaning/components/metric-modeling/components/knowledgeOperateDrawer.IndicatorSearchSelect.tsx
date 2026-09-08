import type { SelectProps } from 'antd'
import React from 'react'

interface Props
  extends Omit<
    SelectProps<string | number>,
    'filterOption' | 'loading' | 'onDropdownVisibleChange' | 'onSearch' | 'options' | 'showSearch'
  > {
  readonly loading?: boolean
  readonly onSearch: (searchText: string) => void
  readonly options: SelectProps<string | number>['options']
}

export const KnowledgeIndicatorSearchSelect: React.FC<Props> = ({ loading, onSearch, options, ...props }) => (
  <ASelect
    {...props}
    showSearch
    filterOption={false}
    loading={loading}
    options={options}
    onSearch={onSearch}
    onDropdownVisibleChange={visible => {
      if (visible) onSearch('')
    }}
  />
)
