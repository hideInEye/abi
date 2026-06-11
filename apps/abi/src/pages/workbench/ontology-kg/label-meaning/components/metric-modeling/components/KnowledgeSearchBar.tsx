import { DownOutlined } from '@ant-design/icons'
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
    <div className="mb-4 w-full">
      <div className="w-full flex flex-wrap items-center gap-3">
        <AInput allowClear className="w-220px" placeholder="请输入搜索关键字" value={searchParams.techName} onChange={(e) => onSearchChange({ techName: e.target.value })} />
        <ASelect
          allowClear
          className="w-180px"
          options={INDICATOR_TYPE_FILTER_OPTIONS}
          placeholder="指标类型"
          value={searchParams.type || undefined}
          onChange={(value) => onSearchChange({ type: value || '' })}
        />
        <ASelect allowClear className="w-180px" options={STATUS_OPTIONS} placeholder="状态" value={searchParams.status} onChange={(value) => onSearchChange({ status: value })} />
        <AButton type="primary" onClick={onQuery}>
          查询
        </AButton>
        <AButton onClick={onReset}>重置</AButton>
      </div>
      <div className="mt-3">
        <Dropdown.Button className="ml-auto justify-end" disabled={addDisabled} menu={{ items: addMenus, onClick: handleMenuClick }} type="primary" icon={<DownOutlined />} onClick={onAddAtomic}>
          新增
        </Dropdown.Button>
      </div>
    </div>
  )
}
