import { Popconfirm, Table, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import React, { useCallback, useMemo } from 'react'

import { OntologyCardList } from '@/pages/workbench/ontology-kg/components/OntologyCardList'
import { OntologyTablePagination } from '@/pages/workbench/ontology-kg/components/OntologyTablePagination'
import type { OntologyViewMode } from '@/pages/workbench/ontology-kg/hooks/useOntologyViewControls'
import { formatDisplayValue } from '@/pages/workbench/ontology-kg/utils/table-display'
import { shouldDisplayColumn } from '@/pages/workbench/ontology-kg/utils/view-controls'

import { INDICATOR_TYPE_TEXT_MAP, STATUS_TEXT_MAP } from '../constants/metricModeling.constants'
import type { KnowledgeIndicatorItem, KnowledgePagination } from '../types/metricModeling.types'

interface Props {
  readonly dataSource: KnowledgeIndicatorItem[]
  readonly loading?: boolean
  readonly onDelete: (record: KnowledgeIndicatorItem) => void
  readonly onEdit: (record: KnowledgeIndicatorItem) => void
  readonly onPaginationChange: (page: number, pageSize: number) => void
  readonly pagination: KnowledgePagination
  readonly viewMode: OntologyViewMode
  readonly visibleColumnKeys: ReadonlySet<string>
}

const statusColorMap: Record<string, string> = {
  '0': 'default',
  '1': 'success',
  '2': 'processing',
}

export const KnowledgeTable: React.FC<Props> = ({ dataSource, loading, onDelete, onEdit, onPaginationChange, pagination, viewMode, visibleColumnKeys }) => {
  const renderIndicatorClass = useCallback((value: string) => {
    const text = INDICATOR_TYPE_TEXT_MAP[value] || formatDisplayValue(value)
    return <Tag color="blue">{text}</Tag>
  }, [])
  const renderStatus = useCallback((value: string | number) => {
    const key = String(value ?? '2')
    return <Tag color={statusColorMap[key] || 'default'}>{STATUS_TEXT_MAP[key] || '草稿'}</Tag>
  }, [])

  const columns = useMemo<TableColumnsType<KnowledgeIndicatorItem>>(
    () => [
      {
        align: 'center',
        dataIndex: 'techName',
        ellipsis: true,
        key: 'techName',
        title: '指标名称',
        width: 180,
      },
      {
        align: 'center',
        dataIndex: 'indicatorCode',
        ellipsis: true,
        key: 'indicatorCode',
        render: formatDisplayValue,
        title: '指标编码',
        width: 180,
      },
      {
        align: 'center',
        dataIndex: 'indicatorClass',
        key: 'indicatorClass',
        render: renderIndicatorClass,
        title: '指标类型',
        width: 130,
      },
      { align: 'center', dataIndex: 'qualityLevel', key: 'qualityLevel', render: formatDisplayValue, title: '质量等级', width: 120 },
      {
        align: 'center',
        dataIndex: 'status',
        key: 'status',
        render: renderStatus,
        title: '状态',
        width: 100,
      },
      {
        align: 'center',
        fixed: 'right',
        key: 'action',
        render: (_: unknown, record: KnowledgeIndicatorItem) => (
          <div className="flex items-center justify-center" style={{ gap: 2 }}>
            <AButton className="abi-action-link" size="small" variant="link" onClick={() => onEdit(record)}>
              编辑
            </AButton>
            <Popconfirm cancelText="取消" description="确定删除该指标吗？" okText="确定" title="提示" onConfirm={() => onDelete(record)}>
              <AButton className="abi-action-link-danger" size="small" variant="link">
                删除
              </AButton>
            </Popconfirm>
          </div>
        ),
        title: '操作',
        width: 140,
      },
    ],
    [onDelete, onEdit, renderIndicatorClass, renderStatus],
  )

  const visibleColumns = useMemo(() => columns.filter((column) => shouldDisplayColumn(column.key, visibleColumnKeys)), [columns, visibleColumnKeys])
  const tableWidth = useMemo(() => visibleColumns.reduce((sum, item) => sum + (Number(item.width) || 120), 0), [visibleColumns])
  const tableColumns = useMemo(
    () =>
      dataSource.length
        ? visibleColumns
        : (visibleColumns.map((item) => ({
            ...item,
            fixed: undefined,
            width: undefined,
          })) as TableColumnsType<KnowledgeIndicatorItem>),
    [dataSource.length, visibleColumns],
  )
  const handlePaginationChange = useCallback((page: number, nextPageSize: number) => {
    onPaginationChange(page, nextPageSize)
  }, [onPaginationChange])

  const cardFields = useMemo(
    () =>
      [
        { key: 'indicatorCode', label: '指标编码', render: (record: KnowledgeIndicatorItem) => formatDisplayValue(record.indicatorCode) },
        { key: 'indicatorClass', label: '指标类型', render: (record: KnowledgeIndicatorItem) => renderIndicatorClass(record.indicatorClass || '') },
        { key: 'qualityLevel', label: '质量等级', render: (record: KnowledgeIndicatorItem) => formatDisplayValue(record.qualityLevel) },
        { key: 'status', label: '状态', render: (record: KnowledgeIndicatorItem) => renderStatus(record.status ?? '') },
      ].filter((field) => visibleColumnKeys.has(field.key)),
    [renderIndicatorClass, renderStatus, visibleColumnKeys],
  )

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {viewMode === 'card' ? (
        <OntologyCardList
          actions={(record) => (
            <div className="flex items-center gap-1">
              <AButton className="abi-action-link" size="small" variant="link" onClick={() => onEdit(record)}>
                编辑
              </AButton>
              <Popconfirm cancelText="取消" description="确定删除该指标吗？" okText="确定" title="提示" onConfirm={() => onDelete(record)}>
                <AButton className="abi-action-link-danger" size="small" variant="link">
                  删除
                </AButton>
              </Popconfirm>
            </div>
          )}
          dataSource={dataSource}
          emptyText="暂无指标"
          fields={cardFields}
          loading={loading}
          rowKey={(record) => String(record.indId || record.termId || record.techName || record.bizName)}
          title={(record) => formatDisplayValue(record.techName)}
          titleExtra={(record) => renderIndicatorClass(record.indicatorClass || '')}
        />
      ) : (
        <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: '12px', overflow: 'hidden', flex: 1, minHeight: 0, width: '100%' }}>
          <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
            <Table
              className="assistant-table-scroll abi-std-table"
              columns={tableColumns}
              dataSource={dataSource}
              loading={loading}
              pagination={false}
              rowKey={(record) => String(record.indId || record.termId || record.techName || record.bizName)}
              scroll={dataSource.length > 0 ? { x: tableWidth } : undefined}
              size="middle"
            />
          </div>
        </div>
      )}
      <OntologyTablePagination
        pageNum={pagination.pageNum}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onChange={handlePaginationChange}
      />
    </div>
  )
}
