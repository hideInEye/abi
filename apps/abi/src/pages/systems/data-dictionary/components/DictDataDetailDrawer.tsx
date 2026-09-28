import { AppstoreOutlined, AuditOutlined, LinkOutlined, ReloadOutlined, TagsOutlined } from '@ant-design/icons'
import { Button, Spin, Tag } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import styles from '../data-dictionary.module.scss'
import type { SysDictData } from '../types'

interface DictDataDetailDrawerProps {
  readonly fetchTypeItems: (dictType: string) => Promise<SysDictData[]>
  readonly onClose: () => void
  readonly onEdit: (record: SysDictData) => void
  readonly open: boolean
  readonly record: SysDictData | null
  readonly width: string
}

function DetailItem({
  full = false,
  label,
  monospace = false,
  value
}: {
  readonly full?: boolean
  readonly label: string
  readonly monospace?: boolean
  readonly value: ReactNode
}) {
  return (
    <div className={`${full ? 'md:col-span-2 xl:col-span-3' : ''} ${styles.detailItem}`}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={monospace ? styles.detailCode : styles.detailValue}>{value}</div>
    </div>
  )
}

function RelatedItemsContent({
  error,
  items,
  onRetry
}: {
  readonly error: boolean
  readonly items: SysDictData[]
  readonly onRetry: () => void
}) {
  if (error) {
    return (
      <div className={styles.relatedState}>
        <span>同类型字典项加载失败，不影响当前详情。</span>
        <Button
          icon={<ReloadOutlined />}
          size="small"
          onClick={onRetry}
        >
          重试
        </Button>
      </div>
    )
  }

  if (!items.length) return <div className={styles.relatedState}>当前类型暂无字典项</div>

  return (
    <div className={styles.relatedList}>
      {items.map(item => (
        <div
          className={styles.relatedItem}
          key={String(item.dictCode)}
        >
          <span>{item.dictLabel || '-'}</span>
          <code>{item.dictValue || '-'}</code>
          <span className={item.status === '0' ? styles.relatedNormal : styles.relatedDisabled}>
            {item.status === '0' ? '正常' : '停用'}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DictDataDetailDrawer({
  fetchTypeItems,
  onClose,
  onEdit,
  open,
  record,
  width
}: DictDataDetailDrawerProps) {
  const [relatedItems, setRelatedItems] = useState<SysDictData[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [relatedError, setRelatedError] = useState(false)
  const relatedSequence = useRef(0)

  const loadRelated = useCallback(async (): Promise<void> => {
    if (!open || !record?.dictType) return
    relatedSequence.current += 1
    const requestId = relatedSequence.current
    setRelatedLoading(true)
    setRelatedError(false)
    try {
      const items = await fetchTypeItems(record.dictType)
      if (requestId !== relatedSequence.current) return
      setRelatedItems(items)
    } catch {
      if (requestId === relatedSequence.current) {
        setRelatedItems([])
        setRelatedError(true)
      }
    } finally {
      if (requestId === relatedSequence.current) setRelatedLoading(false)
    }
  }, [fetchTypeItems, open, record?.dictType])

  useEffect(() => {
    if (open) {
      setRelatedItems([])
      loadRelated().catch(() => undefined)
    }
    return () => {
      relatedSequence.current += 1
    }
  }, [loadRelated, open, record?.dictCode])

  if (!record) return null

  return (
    <CommonDrawer
      destroyOnClose
      description={record.dictType}
      icon={<AppstoreOutlined />}
      open={open}
      rootClassName={styles.dictionaryOverlayRoot}
      title="字典项详情"
      width={width}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>关闭</Button>
          <Button
            className="btn-accent-gradient"
            type="primary"
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
        </div>
      }
      onClose={onClose}
    >
      <div className={styles.drawerForm}>
        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <LinkOutlined />
            映射信息
          </div>
          <div className={styles.mappingHero}>
            <span className={styles.mappingHeroLabel}>{record.dictLabel || '-'}</span>
            <span
              aria-hidden="true"
              className={styles.mappingArrow}
            >
              →
            </span>
            <code className={styles.mappingHeroValue}>{record.dictValue || '-'}</code>
          </div>
          <div className="grid grid-cols-1 mt-4 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem
              monospace
              label="字典编码"
              value={String(record.dictCode)}
            />
            <DetailItem
              monospace
              label="字典类型"
              value={record.dictType || '-'}
            />
            <DetailItem
              label="字典排序"
              value={record.dictSort ?? '-'}
            />
            <DetailItem
              label="默认项"
              value={
                <Tag
                  bordered={false}
                  color={record.isDefault === 'Y' ? 'blue' : undefined}
                >
                  {record.isDefault === 'Y' ? '是' : '否'}
                </Tag>
              }
            />
            <DetailItem
              label="状态"
              value={
                <Tag
                  bordered={false}
                  color={record.status === '0' ? 'success' : 'default'}
                >
                  {record.status === '0' ? '正常' : '停用'}
                </Tag>
              }
            />
            <DetailItem
              label="表格样式"
              value={record.listClass || '-'}
            />
            <DetailItem
              label="样式扩展"
              value={record.cssClass || '-'}
            />
            <DetailItem
              full
              label="备注"
              value={record.remark || '-'}
            />
          </div>
        </section>

        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <AuditOutlined />
            审计信息
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem
              label="创建人"
              value={record.createBy || '-'}
            />
            <DetailItem
              label="创建时间"
              value={record.createTime || '-'}
            />
            <DetailItem
              label="更新人"
              value={record.updateBy || '-'}
            />
            <DetailItem
              label="更新时间"
              value={record.updateTime || '-'}
            />
          </div>
        </section>

        <section className="ds-form-section">
          <div className="ds-form-section-title">
            <TagsOutlined />
            同类型字典项
          </div>
          <Spin spinning={relatedLoading}>
            <RelatedItemsContent
              error={relatedError}
              items={relatedItems}
              onRetry={() => loadRelated().catch(() => undefined)}
            />
          </Spin>
        </section>
      </div>
    </CommonDrawer>
  )
}
