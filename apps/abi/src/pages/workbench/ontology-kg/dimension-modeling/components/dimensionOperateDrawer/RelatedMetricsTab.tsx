import React from 'react'

import { useRouterPush } from '@/hooks/common/routerPush'

import type { DimensionModelItem } from '../../types'

interface Props {
  readonly record?: DimensionModelItem | null
}

export const RelatedMetricsTab: React.FC<Props> = ({ record }) => {
  const { routerPushByKey } = useRouterPush()
  const [keyword, setKeyword] = React.useState('')
  const dataSource = React.useMemo(() => record?.relatedMetrics || [], [record?.relatedMetrics])
  const filteredData = React.useMemo(() => {
    const text = keyword.trim()
    if (!text) {
      return dataSource
    }

    return dataSource.filter(item =>
      [item.name, item.groupName, item.refType, item.updateTime].some(value => String(value || '').includes(text))
    )
  }, [dataSource, keyword])

  const goIndicatorModeling = () => {
    routerPushByKey('workbench_ontology-kg_knowledge-extraction')
  }

  return (
    <div className="space-y-4">
      <AAlert
        showIcon
        className="border-[#c9dcff] rounded-lg bg-[#eef5ff] py-3"
        message="相关指标由指标建模模块引用后自动生成，此处仅展示引用结果，不支持手工新增绑定。"
        type="info"
      />

      <div className="flex items-center justify-between gap-4">
        <AInput
          allowClear
          className="w-[260px]"
          placeholder="搜索指标名称"
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
        />
        <AButton
          type="primary"
          onClick={goIndicatorModeling}
        >
          去指标建模配置
        </AButton>
      </div>

      <ATable
        className="[&_.ant-table-thead>tr>th]:bg-[#f4f6fb] [&_.ant-table-thead>tr>th]:font-semibold"
        dataSource={filteredData}
        locale={{ emptyText: '暂无关联指标' }}
        pagination={false}
        rowKey={(item, index) => String(item.id || `${item.name}-${index}`)}
        size="small"
        columns={[
          {
            dataIndex: 'name',
            key: 'name',
            render: (value: string) => (
              <AButton
                className="px-0 font-semibold"
                type="link"
                onClick={goIndicatorModeling}
              >
                {value || '-'}
              </AButton>
            ),
            title: '指标名称'
          },
          { dataIndex: 'groupName', key: 'groupName', render: (v: string) => v || '-', title: '指标分组' },
          { dataIndex: 'refType', key: 'refType', render: (v: string) => v || '-', title: '引用方式' },
          {
            dataIndex: 'updateTime',
            key: 'updateTime',
            render: (v: string) => (v ? String(v).slice(0, 10) : '-'),
            title: '最近更新时间'
          }
        ]}
      />
    </div>
  )
}
