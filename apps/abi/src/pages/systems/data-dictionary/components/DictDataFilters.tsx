import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Select } from 'antd'

import { SearchFilterField } from '@/components/SearchFilterBar'

import styles from '../data-dictionary.module.scss'
import type { DictDataFilters as DictDataFiltersValue, SysDictType } from '../types'

interface DictDataFiltersProps {
  readonly loadingTypes: boolean
  readonly onChange: (value: DictDataFiltersValue) => void
  readonly onQuery: () => void
  readonly onReset: () => void
  readonly typeOptions: SysDictType[]
  readonly value: DictDataFiltersValue
}

export function DictDataFilters({
  loadingTypes,
  onChange,
  onQuery,
  onReset,
  typeOptions,
  value
}: DictDataFiltersProps) {
  function updateFilter<Key extends keyof DictDataFiltersValue>(key: Key, nextValue: DictDataFiltersValue[Key]) {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <section
      aria-label="系统字典筛选"
      className="abi-searchbar"
    >
      <div className={`abi-search-row ${styles.visibleFilterBar}`}>
        <div className={styles.visibleFilterFields}>
          <SearchFilterField label="字典类型">
            <Select
              allowClear
              showSearch
              aria-label="字典类型"
              className="abi-field-input w-full"
              loading={loadingTypes}
              notFoundContent={loadingTypes ? '类别加载中…' : '暂无字典类别'}
              optionFilterProp="label"
              placeholder="请选择字典类型"
              value={value.dictType || undefined}
              options={typeOptions.map(item => ({
                label: `${item.dictName} (${item.dictType})`,
                value: item.dictType
              }))}
              onChange={nextValue => updateFilter('dictType', nextValue ?? '')}
            />
          </SearchFilterField>
          <SearchFilterField label="状态">
            <Select
              allowClear
              aria-label="状态"
              className="abi-field-input w-full"
              placeholder="请选择状态"
              value={value.status || undefined}
              options={[
                { label: '正常', value: '0' },
                { label: '停用', value: '1' }
              ]}
              onChange={nextValue => updateFilter('status', nextValue ?? '')}
            />
          </SearchFilterField>
        </div>
        <div className={styles.visibleFilterActions}>
          <Button
            icon={<ReloadOutlined />}
            onClick={onReset}
          >
            重置
          </Button>
          <Button
            className="btn-accent-gradient"
            icon={<SearchOutlined />}
            type="primary"
            onClick={onQuery}
          >
            查询
          </Button>
        </div>
      </div>
    </section>
  )
}
