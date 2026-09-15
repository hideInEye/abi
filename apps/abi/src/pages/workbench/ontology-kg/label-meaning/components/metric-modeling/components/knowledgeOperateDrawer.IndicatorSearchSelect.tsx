import { useDebounceFn } from 'ahooks'
import type { SelectProps } from 'antd'
import React from 'react'

interface Props
  extends Omit<
    SelectProps<string | number>,
    'filterOption' | 'loading' | 'onDropdownVisibleChange' | 'onPopupScroll' | 'onSearch' | 'options' | 'showSearch'
  > {
  readonly loading?: boolean
  readonly onLoadMore?: () => void
  readonly onSearch: (searchText: string) => void
  readonly options: SelectProps<string | number>['options']
}

const LOAD_MORE_THRESHOLD = 16

export const KnowledgeIndicatorSearchSelect: React.FC<Props> = ({
  loading,
  onLoadMore,
  onSearch,
  options,
  ...props
}) => {
  const { cancel: cancelLoadMore, run: runLoadMore } = useDebounceFn(() => onLoadMore?.(), { wait: 500 })

  return (
    <ASelect
      {...props}
      showSearch
      filterOption={false}
      loading={loading}
      options={options}
      onSearch={onSearch}
      onDropdownVisibleChange={visible => {
        if (visible) onSearch('')
        else cancelLoadMore()
      }}
      onPopupScroll={event => {
        const target = event.currentTarget
        const remainingDistance = target.scrollHeight - target.scrollTop - target.clientHeight
        if (remainingDistance <= LOAD_MORE_THRESHOLD) runLoadMore()
      }}
    />
  )
}
