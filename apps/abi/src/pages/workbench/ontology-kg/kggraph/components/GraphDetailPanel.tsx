import { ApartmentOutlined, BarChartOutlined, BranchesOutlined, ProfileOutlined, TagsOutlined } from '@ant-design/icons'
import { Empty, Tag } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React, { useMemo } from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import type { OntologyEntityAttribute, OntologyGraphEdge, OntologyGraphNode } from '@/pages/workbench/ontology-kg/shared-network-types'

interface GraphDetailPanelProps {
  readonly edge: OntologyGraphEdge | null
  readonly entityNameMap: Map<string, string>
  readonly node: OntologyGraphNode | null
  readonly onClose: () => void
  readonly open: boolean
}

const ATTRIBUTE_TITLES: Array<{ icon: React.ReactNode; key: OntologyEntityAttribute['attributeType']; title: string }> = [
  { icon: <ApartmentOutlined />, key: 'dimension', title: '维度属性' },
  { icon: <BarChartOutlined />, key: 'indicator', title: '指标属性' },
  { icon: <TagsOutlined />, key: 'label', title: '标签属性' },
]

export const GraphDetailPanel: React.FC<GraphDetailPanelProps> = ({ edge, entityNameMap, node, open, onClose }) => {
  const groupedAttributes = useMemo(() => {
    const attributes = node?.attributes ?? []
    return new Map(ATTRIBUTE_TITLES.map((item) => [item.key, attributes.filter((attribute) => attribute.attributeType === item.key)]))
  }, [node])

  let title = '详情'
  if (node) title = '实体详情'
  else if (edge) title = '关系详情'

  return (
    <CommonDrawer open={open} title={title} width={380} onClose={onClose}>
      {node && (
        <div className="ds-form-section flex flex-col gap-5">
          <section>
            <OntologyFormSectionTitle icon={<ProfileOutlined />}>基本信息</OntologyFormSectionTitle>
            <div className="grid grid-cols-[88px_1fr] gap-y-3 text-sm">
              <span className="text-gray-500">实体名称</span>
              <span>{node.entityName}</span>
              <span className="text-gray-500">实体编码</span>
              <span>{node.entityCode}</span>
              <span className="text-gray-500">实体颜色</span>
              <span className="flex items-center gap-2">
                <i className="h-3 w-3 rounded-full" style={{ backgroundColor: node.color }} />
                {node.color || '-'}
              </span>
              <span className="text-gray-500">备注</span>
              <span>{node.remark || '-'}</span>
            </div>
          </section>
          {ATTRIBUTE_TITLES.map((item) => {
            const attributes = groupedAttributes.get(item.key) ?? []
            return (
              <section key={item.key}>
                <OntologyFormSectionTitle icon={item.icon}>{item.title}</OntologyFormSectionTitle>
                {attributes.length ? (
                  <div className="flex flex-wrap gap-2">
                    {attributes.map((attribute) => (
                      <Tag key={`${attribute.attributeType}-${attribute.attributeCode}`}>{attribute.attributeName}</Tag>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">暂无属性</span>
                )}
              </section>
            )
          })}
        </div>
      )}
      {!node && edge && (
        <div className="ds-form-section">
          <OntologyFormSectionTitle icon={<BranchesOutlined />}>基本信息</OntologyFormSectionTitle>
          <div className="grid grid-cols-[96px_1fr] gap-y-4 text-sm">
            <span className="text-gray-500">开始节点</span>
            <span>{entityNameMap.get(String(edge.startEntityId)) ?? '-'}</span>
            <span className="text-gray-500">关系名称</span>
            <span>{edge.relation}</span>
            <span className="text-gray-500">结束节点</span>
            <span>{entityNameMap.get(String(edge.endEntityId)) ?? '-'}</span>
            <span className="text-gray-500">是否可逆</span>
            <span>{Number(edge.inverseFlag) === 1 ? '是' : '否'}</span>
            <span className="text-gray-500">备注</span>
            <span>{edge.remark || '-'}</span>
            <span className="text-gray-500">创建人</span>
            <span>{edge.createBy || '-'}</span>
            <span className="text-gray-500">创建时间</span>
            <span>{edge.createTime || '-'}</span>
          </div>
        </div>
      )}
      {!node && !edge && <Empty description="请选择实体或关系" />}
    </CommonDrawer>
  )
}

export default GraphDetailPanel
