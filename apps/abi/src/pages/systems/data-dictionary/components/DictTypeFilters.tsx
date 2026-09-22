import { Input, Select } from 'antd'

import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar'

import styles from '../data-dictionary.module.scss'
import type { DictTypeFilters as DictTypeFiltersValue } from '../types'

interface DictTypeFiltersProps {
  readonly onChange: (value: DictTypeFiltersValue) => void
  readonly onQuery: () => void
  readonly onReset: () => void
  readonly value: DictTypeFiltersValue
}

export function DictTypeFilters({ onChange, onQuery, onReset, value }: DictTypeFiltersProps) {
  function updateFilter<Key extends keyof DictTypeFiltersValue>(key: Key, nextValue: DictTypeFiltersValue[Key]) {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <section
      aria-label="字典类别筛选"
      className="abi-searchbar"
    >
      <SearchFilterBar
        filterGridClassName="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2"
        filterPanelClassName={styles.filterPanel}
        searchPlaceholder="请输入字典名称"
        searchValue={value.dictName}
        filters={
          <>
            <SearchFilterField label="字典类型">
              <Input
                allowClear
                aria-label="字典类型"
                className="abi-field-input w-full"
                placeholder="例如 semantic_biz_type"
                value={value.dictType}
                onChange={event => updateFilter('dictType', event.target.value)}
              />
            </SearchFilterField>
            <SearchFilterField label="状态">
              <Select
                allowClear
                aria-label="状态"
                className="abi-field-input w-full"
                getPopupContainer={getFilterPopupContainer}
                placeholder="请选择状态"
                value={value.status || undefined}
                options={[
                  { label: '正常', value: '0' },
                  { label: '停用', value: '1' }
                ]}
                onChange={nextValue => updateFilter('status', nextValue ?? '')}
              />
            </SearchFilterField>
          </>
        }
        onQuery={onQuery}
        onReset={onReset}
        onSearchChange={dictName => updateFilter('dictName', dictName)}
      />
    </section>
  )
}
