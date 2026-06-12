import { DownOutlined, SearchOutlined } from '@ant-design/icons'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import React from 'react'

import { INDICATOR_TYPE_FILTER_OPTIONS, STATUS_OPTIONS } from '../constants/metricModeling.constants'
import type { KnowledgeSearchParams } from '../types/metricModeling.types'

interface Props {
  readonly addDisabled?: boolean
  readonly onAddAtomic: () => void
  readonly onAddCustom: () => void
  readonly onQuery: () => void
  readonly onReset: () => void
  readonly onSearchChange: (value: Partial<KnowledgeSearchParams>) => void
  readonly searchParams: KnowledgeSearchParams
}

export const KnowledgeSearchBar: React.FC<Props> = ({ addDisabled, onAddAtomic, onAddCustom, onQuery, onReset, onSearchChange, searchParams }) => {
  const addMenus = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'atomic',
        label: (
          <div className="py-1">
            <div className="text-base font-semibold">原子指标映射</div>
            <div className="mt-1 text-sm text-gray-400">配置来源字段并生成原子指标</div>
          </div>
        ),
      },
      {
        key: 'custom',
        label: (
          <div className="py-1">
            <div className="text-base font-semibold">指标自定义</div>
            <div className="mt-1 text-sm text-gray-400">创建派生指标或衍生指标</div>
          </div>
        ),
      },
    ],
    [],
  )

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'atomic') {
      onAddAtomic()
      return
    }
    onAddCustom()
  }

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
        <Dropdown.Button
          className="ml-auto btn-accent-dropdown"
          disabled={addDisabled}
          icon={<DownOutlined />}
          menu={{ items: addMenus, onClick: handleMenuClick }}
          type="primary"
          onClick={onAddAtomic}
        >
          + 新增
        </Dropdown.Button>
      </div>
    </section>
  )
}
