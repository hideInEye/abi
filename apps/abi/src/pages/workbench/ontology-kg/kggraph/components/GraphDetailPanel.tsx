import { ApartmentOutlined, BarChartOutlined, BranchesOutlined, CloseOutlined, ProfileOutlined, TagsOutlined } from '@ant-design/icons'
import { Empty, Tag } from 'antd'
import React, { useMemo } from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import type { OntologyEntityAttribute, OntologyGraphEdge, OntologyGraphNode } from '@/pages/workbench/ontology-kg/shared-network-types'

import { getGraphAttributeDisplayName } from './GraphDetailPanel.utils'
import styles from './detail.module.css'

interface GraphDetailPanelProps {
  readonly edge: OntologyGraphEdge | null
  readonly entityNameMap: Map<string, string>
  readonly getContainer?: () => HTMLElement
  readonly node: OntologyGraphNode | null
  readonly onClose: () => void
  readonly open: boolean
}

const ATTRIBUTE_TITLES: Array<{ icon: React.ReactNode; key: OntologyEntityAttribute['attributeType']; title: string }> = [
  { icon: <ApartmentOutlined />, key: 'dimension', title: '维度属性' },
  { icon: <BarChartOutlined />, key: 'indicator', title: '指标属性' },
  { icon: <TagsOutlined />, key: 'label', title: '标签属性' },
]

export const GraphDetailPanel: React.FC<GraphDetailPanelProps> = ({ edge, entityNameMap, getContainer, node, open, onClose }) => {
  const groupedAttributes = useMemo(() => {
    const attributes = node?.attributes ?? []
    return new Map(ATTRIBUTE_TITLES.map((item) => [item.key, attributes.filter((attribute) => attribute.attributeType === item.key)]))
  }, [node])

  let title = '详情'
  if (node) title = '实体详情'
  else if (edge) title = '关系详情'

  return (
    <AModal
      closable={false}
      footer={null}
      getContainer={getContainer}
      open={open}
      width={400}
      wrapClassName={styles.detailModalWrap}
      onCancel={onClose}
    >
      <div className={styles.detailModal}>
        {/* 头部 */}
        <div className={styles.detailHeader}>
          <div className={styles.detailHeaderTitle}>
            <span className={styles.detailHeaderIcon}>
              {node ? <ProfileOutlined /> : <BranchesOutlined />}
            </span>
            <span>{title}</span>
          </div>
          <button className={styles.detailCloseBtn} onClick={onClose} type="button">
            <CloseOutlined />
          </button>
        </div>

        {/* 内容 */}
        <div className={styles.detailBody}>
          {node && (
            <div className="ds-form-section flex flex-col gap-3">
              <section>
                <OntologyFormSectionTitle icon={<ProfileOutlined />}>基本信息</OntologyFormSectionTitle>
                <div className={`${styles.infoGrid} grid grid-cols-[88px_1fr] gap-y-2 text-sm`}>
                  <span className={styles.infoLabel}>实体名称</span>
                  <span className={styles.infoValue}>{node.entityName}</span>
                  <span className={styles.infoLabel}>实体编码</span>
                  <span className={styles.infoValue}>{node.entityCode}</span>
                  <span className={styles.infoLabel}>实体颜色</span>
                  <span className={styles.infoValue}>
                    <span className="flex items-center gap-2">
                      <i className="h-3 w-3 rounded-full" style={{ backgroundColor: node.color }} />
                      {node.color || '-'}
                    </span>
                  </span>
                  <span className={styles.infoLabel}>备注</span>
                  <span className={styles.infoValue}>{node.remark || '-'}</span>
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
                          <Tag key={`${attribute.attributeType}-${attribute.attributeCode}`} className={styles.attrTag}>
                            {getGraphAttributeDisplayName(attribute)}
                          </Tag>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.emptyText}>暂无属性</span>
                    )}
                  </section>
                )
              })}
            </div>
          )}
          {!node && edge && (
            <div className="ds-form-section">
              <OntologyFormSectionTitle icon={<BranchesOutlined />}>基本信息</OntologyFormSectionTitle>
              <div className={`${styles.infoGrid} grid grid-cols-[96px_1fr] gap-y-2 text-sm`}>
                <span className={styles.infoLabel}>开始节点</span>
                <span className={styles.infoValue}>{entityNameMap.get(String(edge.startEntityId)) ?? '-'}</span>
                <span className={styles.infoLabel}>关系名称</span>
                <span className={styles.infoValue}>{edge.relation}</span>
                <span className={styles.infoLabel}>结束节点</span>
                <span className={styles.infoValue}>{entityNameMap.get(String(edge.endEntityId)) ?? '-'}</span>
                <span className={styles.infoLabel}>是否可逆</span>
                <span className={styles.infoValue}>{Number(edge.inverseFlag) === 1 ? '是' : '否'}</span>
                <span className={styles.infoLabel}>备注</span>
                <span className={styles.infoValue}>{edge.remark || '-'}</span>
                <span className={styles.infoLabel}>创建人</span>
                <span className={styles.infoValue}>{edge.createBy || '-'}</span>
                <span className={styles.infoLabel}>创建时间</span>
                <span className={styles.infoValue}>{edge.createTime || '-'}</span>
              </div>
            </div>
          )}
          {!node && !edge && <Empty description="请选择实体或关系" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        </div>
      </div>
    </AModal>
  )
}

export default GraphDetailPanel
