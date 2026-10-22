import { EditOutlined } from '@ant-design/icons'
import { Table, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import React, { useCallback, useMemo } from 'react'

import MetadataAnalysisDrawer, { useMetadataAnalysis } from '@/components/metadata-analysis'
import { OntologyCardList } from '@/pages/workbench/ontology-kg/components/OntologyCardList'
import { OntologyMetadataActions } from '@/pages/workbench/ontology-kg/components/OntologyMetadataActions'
import { OntologyTablePagination } from '@/pages/workbench/ontology-kg/components/OntologyTablePagination'
import type { OntologyViewMode } from '@/pages/workbench/ontology-kg/hooks/useOntologyViewControls'
import { formatDateTime, formatDisplayValue } from '@/pages/workbench/ontology-kg/utils/table-display'
import { shouldDisplayColumn } from '@/pages/workbench/ontology-kg/utils/view-controls'

import { INDICATOR_TYPE_TEXT_MAP, QUALITY_LEVEL_DISPLAY_TEXT_MAP, STATUS_TEXT_MAP } from '../constants/metricModeling.constants'
import type { KnowledgeIndicatorItem, KnowledgePagination } from '../types/metricModeling.types'

interface Props {
  readonly dataSource: KnowledgeIndicatorItem[]
  readonly loading?: boolean
  readonly onDelete: (record: KnowledgeIndicatorItem) => Promise<void>
  readonly onEdit: (record: KnowledgeIndicatorItem) => void
  readonly onPaginationChange: (page: number, pageSize: number) => void
  readonly onSelectedRowKeysChange: (keys: string[]) => void
  readonly pagination: KnowledgePagination
  readonly selectedRowKeys: string[]
  readonly viewMode: OntologyViewMode
  readonly visibleColumnKeys: ReadonlySet<string>
}

const statusColorMap: Record<string, string> = {
  '0': 'default',
  '1': 'success',
  '2': 'processing',
}

export const KnowledgeTable: React.FC<Props> = ({
  dataSource,
  loading,
  onDelete,
  onEdit,
  onPaginationChange,
  onSelectedRowKeysChange,
  pagination,
  selectedRowKeys,
  viewMode,
  visibleColumnKeys
}) => {
  const { analysisContext, openAnalysis, closeAnalysis } = useMetadataAnalysis()
  const handleAnalysis = useCallback((record: KnowledgeIndicatorItem) => {
    openAnalysis({ nodeId: record.indId, nodeName: record.bizName, nodeType: 'INDICATOR' })
  }, [openAnalysis])
  const renderIndicatorClass = useCallback((value: string) => {
    const text = INDICATOR_TYPE_TEXT_MAP[value] || formatDisplayValue(value)
    return <Tag color="blue">{text}</Tag>
  }, [])
  const renderStatus = useCallback((value: string | number) => {
    const key = String(value ?? '2')
    return <Tag color={statusColorMap[key] || 'default'}>{STATUS_TEXT_MAP[key] || '草稿'}</Tag>
  }, [])
  const renderQualityLevel = useCallback((value: string | number) => {
    const key = String(value ?? '').toLowerCase()
    return QUALITY_LEVEL_DISPLAY_TEXT_MAP[key] || formatDisplayValue(value)
  }, [])

  const columns = useMemo<TableColumnsType<KnowledgeIndicatorItem>>(
    () => [
      {
        align: 'center',
        dataIndex: 'bizName',
        ellipsis: true,
        key: 'bizName',
        render: formatDisplayValue,
        title: '指标名称',
        width: 180
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
      { align: 'center', dataIndex: 'qualityLevel', key: 'qualityLevel', render: renderQualityLevel, title: '质量等级', width: 120 },
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
          <div className="ds-action-group">
            <AButton className="abi-action-link" icon={<EditOutlined />} size="small" variant="link" onClick={() => onEdit(record)}>
              编辑
            </AButton>
            <OntologyMetadataActions
              deleteDescription="确定删除该指标吗？"
              onAnalysis={() => handleAnalysis(record)}
              onDelete={() => onDelete(record)}
            />
          </div>
        ),
        title: '操作',
        width: 200,
      },
    ],
    [onDelete, onEdit, handleAnalysis, renderIndicatorClass, renderQualityLevel, renderStatus],
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
        { key: 'createBy', label: '创建人', render: (record: KnowledgeIndicatorItem) => formatDisplayValue(record.createBy) },
        { key: 'createTime', label: '创建时间', render: (record: KnowledgeIndicatorItem) => formatDateTime(record.createTime) },
        { key: 'updateTime', label: '操作时间', render: (record: KnowledgeIndicatorItem) => formatDateTime(record.updateTime) },
      ],
    [],
  )

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {viewMode === 'card' ? (
        <OntologyCardList
          actions={(record) => (
            <div className="flex w-full items-center gap-1">
              <AButton className="abi-action-link" icon={<EditOutlined />} size="small" variant="link" onClick={() => onEdit(record)}>
                编辑
              </AButton>
              <OntologyMetadataActions
                deleteDescription="确定删除该指标吗？"
                viewMode="card"
                onAnalysis={() => handleAnalysis(record)}
                onDelete={() => onDelete(record)}
              />
            </div>
          )}
          dataSource={dataSource}
          emptyText="暂无指标"
          fields={cardFields}
          loading={loading}
          rowKey={(record) => String(record.indId || record.termId || record.bizName || record.techName)}
          title={(record) => formatDisplayValue(record.bizName)}
          titleExtra={(record) => INDICATOR_TYPE_TEXT_MAP[record.indicatorClass || ''] || formatDisplayValue(record.indicatorClass)}
        />
      ) : (
        <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: '12px', overflow: 'hidden', flex: 1, minHeight: 0, width: '100%' }}>
          <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
            <Table
              className="abi-std-table"
              locale={{ emptyText: <TableEmpty description="暂无指标" /> }}
              columns={tableColumns}
              dataSource={dataSource}
              loading={loading}
              pagination={false}
              rowKey={(record) => String(record.indId || record.termId || record.bizName || record.techName)}
              rowSelection={{
                columnWidth: 48,
                fixed: true,
                selectedRowKeys,
                onChange: keys => onSelectedRowKeysChange(keys.map(String))
              }}
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
      <MetadataAnalysisDrawer context={analysisContext} open={Boolean(analysisContext)} onClose={closeAnalysis} />
    </div>
  )
}
