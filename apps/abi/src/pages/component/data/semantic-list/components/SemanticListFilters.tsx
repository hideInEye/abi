import { AutoComplete, Select } from 'antd'

import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar'

import { LIST_TYPE_OPTIONS, MATCH_METHOD_OPTIONS, VISIBILITY_OPTIONS } from '../constants'
import styles from '../semantic-list.module.scss'
import type { SemanticDictionaryOption, SemanticRuleFilters } from '../types'

interface SemanticListFiltersProps {
  readonly businessCategoryOptions: readonly SemanticDictionaryOption[]
  readonly dictionaryLoading: boolean
  readonly matchTargetOptions: readonly SemanticDictionaryOption[]
  readonly onChange: (value: SemanticRuleFilters) => void
  readonly onQuery: () => void
  readonly onReset: () => void
  readonly value: SemanticRuleFilters
}

export function SemanticListFilters({
  businessCategoryOptions,
  dictionaryLoading,
  matchTargetOptions,
  onChange,
  onQuery,
  onReset,
  value
}: SemanticListFiltersProps) {
  function updateFilter<Key extends keyof SemanticRuleFilters>(key: Key, nextValue: SemanticRuleFilters[Key]) {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <section
      aria-label="语义名单筛选"
      className="abi-searchbar"
    >
      <SearchFilterBar
        filterGridClassName="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2"
        filterLabel="更多"
        filterPanelClassName={styles.semanticFilterPanel}
        searchPlaceholder="请输入规则名称或编码"
        searchValue={value.ruleCodeOrName}
        filters={
          <>
            <SearchFilterField label="名单类型">
              <Select
                allowClear
                aria-label="名单类型"
                className="abi-field-input w-full"
                getPopupContainer={getFilterPopupContainer}
                options={LIST_TYPE_OPTIONS}
                placeholder="请选择名单类型"
                value={value.type || undefined}
                onChange={nextValue => updateFilter('type', nextValue ?? '')}
              />
            </SearchFilterField>
            <SearchFilterField label="业务类别">
              <AutoComplete
                allowClear
                aria-label="业务类别"
                className="abi-field-input w-full"
                getPopupContainer={getFilterPopupContainer}
                options={[...businessCategoryOptions]}
                placeholder="请选择或输入业务类别"
                value={value.category || undefined}
                filterOption={(inputValue, option) =>
                  String(option?.label ?? option?.value ?? '')
                    .toLocaleLowerCase()
                    .includes(inputValue.toLocaleLowerCase())
                }
                onChange={nextValue => updateFilter('category', nextValue ?? '')}
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
                  { label: '启用', value: '1' },
                  { label: '禁用', value: '0' }
                ]}
                onChange={nextValue => updateFilter('status', nextValue ?? '')}
              />
            </SearchFilterField>
            <SearchFilterField label="匹配目标">
              <Select
                allowClear
                showSearch
                aria-label="匹配目标"
                className="abi-field-input w-full"
                getPopupContainer={getFilterPopupContainer}
                loading={dictionaryLoading}
                notFoundContent={dictionaryLoading ? '加载中...' : '暂无可用匹配目标'}
                optionFilterProp="label"
                options={[...matchTargetOptions]}
                placeholder="请选择匹配目标"
                value={value.target || undefined}
                onChange={nextValue => updateFilter('target', nextValue ?? '')}
              />
            </SearchFilterField>
            <SearchFilterField label="可见性">
              <Select
                allowClear
                aria-label="可见性"
                className="abi-field-input w-full"
                getPopupContainer={getFilterPopupContainer}
                options={VISIBILITY_OPTIONS}
                placeholder="请选择可见性"
                value={value.visibility || undefined}
                onChange={nextValue => updateFilter('visibility', nextValue ?? '')}
              />
            </SearchFilterField>
            <SearchFilterField label="匹配方式">
              <Select
                allowClear
                aria-label="匹配方式"
                className="abi-field-input w-full"
                getPopupContainer={getFilterPopupContainer}
                options={MATCH_METHOD_OPTIONS}
                placeholder="请选择匹配方式"
                value={value.method || undefined}
                onChange={nextValue => updateFilter('method', nextValue ?? '')}
              />
            </SearchFilterField>
          </>
        }
        onQuery={onQuery}
        onReset={onReset}
        onSearchChange={ruleCodeOrName => updateFilter('ruleCodeOrName', ruleCodeOrName)}
      />
    </section>
  )
}
