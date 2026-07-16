import { ApartmentOutlined, CopyOutlined, DeleteOutlined, DownOutlined, EditOutlined, LeftOutlined, MoreOutlined, PlusOutlined, RightOutlined, SearchOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { Dropdown, Select, Space } from 'antd'
import { MODAL_TYPE_OPTIONS, PROVIDER_OPTIONS } from '@/constants/manage'
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types'
import { useAppSelector } from '@/hooks/business/useStore'
import { getSpaceId } from '@/store/slice/app'
import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'
import './model-card-list.css'

interface ModelItem {
  modelId: number
  providerId: number
  providerName?: string
  modelName: string
  modelKey?: string
  modelType: string
  modelSource?: string
  status: string
  remark?: string
  isDefault?: number
  [key: string]: any
}

interface ProviderItem {
  providerId: number
  providerName: string
  providerKey: string
  providerType: string
  iconUrl?: string
}

interface Props {
  models: ModelItem[]
  providers?: ProviderItem[]
  searchValue: string
  onSearchValueChange: (val: string) => void
  onAdd: () => void
  onEdit: (record: ModelItem) => void
  onCopy: (id: number) => void
  onDelete: (id: number) => void
  onBatchDelete: (ids: number[]) => void
  onSetDefault: (id: number) => void
  onAnalysis: (context: MetadataAnalysisContext) => void
}

const modelTypeTagColorMap: Record<string, import('antd/es/tag').TagProps['color']> = {
  '1': 'blue',
  '2': 'green',
  '3': 'orange',
}

const ModelCardList: FC<Props> = ({
  models,
  providers = [],
  searchValue,
  onSearchValueChange,
  onAdd,
  onEdit,
  onCopy,
  onDelete,
  onBatchDelete,
  onSetDefault,
  onAnalysis,
}) => {
  const { t } = useTranslation()
  const spaceId = useAppSelector(getSpaceId)

  const filteredModels = useMemo(() => {
    const kw = searchValue.trim().toLowerCase()
    if (!kw) return models
    return models.filter(m =>
      (m.modelName || '').toLowerCase().includes(kw) ||
      (m.modelKey || '').toLowerCase().includes(kw)
    )
  }, [models, searchValue])

  // v5 pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [jumpValue, setJumpValue] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')
  const [dateRange, setDateRange] = useState<[any, any] | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'modelName', label: '供应商名称', visible: true },
    { key: 'modelDisplayName', label: '模型名称', visible: true },
    { key: 'modelKey', label: '基础模型', visible: true },
    { key: 'modelType', label: '模型类型', visible: true },
    { key: 'modelSource', label: '模型来源', visible: true },
    { key: 'status', label: '状态', visible: true },
  ])
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c))
  }

  // 搜索条件变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1)
    setSelectedRowKeys([])
  }, [searchValue])

  const totalCount = filteredModels.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const pagedModels = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredModels.slice(start, start + pageSize)
  }, [filteredModels, currentPage, pageSize])

  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions])

  // 表格列定义 — v5 style with minWidth
  const allTableColumns = useMemo(() => [
    {
      align: 'left' as const,
      className: 'col-model-name col-first-data',
      dataIndex: 'providerId',
      key: 'modelName',
      minWidth: 180,
      onHeaderCell: () => ({ className: 'col-model-name col-first-data' }),
      render: (_: any, record: ModelItem) => {
        const provider = providers.find(p => p.providerId === record.providerId)
        return (
          <span className="source-name-cell">
            {provider?.iconUrl && <img src={provider.iconUrl} alt="" className="source-name-icon" />}
            <span className="source-name-text" title={provider?.providerName || '-'} style={{ fontWeight: 600, color: '#1a2744' }}>{provider?.providerName || '-'}</span>
          </span>
        )
      },
      title: '供应商名称',
    },
    {
      align: 'left' as const,
      dataIndex: 'modelName',
      key: 'modelDisplayName',
      minWidth: 150,
      render: (text: string) => <span style={{ fontWeight: 500, color: '#3e5068' }} title={text}>{text}</span>,
      title: '模型名称',
    },
    {
      align: 'center' as const,
      dataIndex: 'modelKey',
      key: 'modelKey',
      minWidth: 150,
      render: (v: string) => v || '-',
      title: '基础模型',
    },
    {
      align: 'center' as const,
      dataIndex: 'modelType',
      key: 'modelType',
      minWidth: 110,
      render: (v: string) => {
        const tag = MODAL_TYPE_OPTIONS.find(o => o.value === v)
        return <ATag color={modelTypeTagColorMap[v] || 'default'} bordered style={{ margin: 0 }}>{tag?.label || v}</ATag>
      },
      title: '模型类型',
    },
    {
      align: 'center' as const,
      dataIndex: 'modelSource',
      key: 'modelSource',
      minWidth: 100,
      render: (v: string) => v === '2' ? '本地' : '公有',
      title: '模型来源',
    },
    {
      align: 'center' as const,
      dataIndex: 'status',
      key: 'status',
      minWidth: 90,
      render: (v: string) => <span className={`abi-status-tag ${v === '1' ? 'status-normal' : 'status-disabled'}`}>{v === '1' ? '启用' : '禁用'}</span>,
      title: '状态',
    },
    {
      align: 'center' as const,
      fixed: 'right' as const,
      key: 'operate',
      minWidth: 140,
      render: (_: any, record: ModelItem) => (
        <div className="ds-action-group">
          <AButton className="abi-action-link" size="small" variant="link" onClick={() => onEdit(record)}>
            <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
          </AButton>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'copy',
                  label: <span><CopyOutlined style={{ marginRight: 4 }} />复制</span>,
                  onClick: () => onCopy(record.modelId),
                },
                ...((['1', '2', '3'].includes(record.modelType)) ? [{
                  key: 'setDefault',
                  disabled: record.isDefault === 1,
                  label: (
                    <span style={{ color: record.isDefault === 1 ? '#bfbfbf' : undefined }}>
                      <StarOutlined style={{ marginRight: 4 }} />
                      {record.isDefault === 1 ? '已是默认' : '设为默认'}
                    </span>
                  ),
                  onClick: () => { if (record.isDefault !== 1) onSetDefault(record.modelId) },
                }] : []),
                {
                  key: 'analysis',
                  label: <span><ApartmentOutlined style={{ marginRight: 4 }} />元数据分析</span>,
                  onClick: () => onAnalysis({ nodeId: record.modelId, nodeName: record.modelName, nodeType: 'LLM', spaceId: spaceId || undefined }),
                },
                { type: 'divider' as const },
                {
                  key: 'delete',
                  danger: true,
                  label: (
                    <APopconfirm title="提示" description={t('common.confirmDelete')} onConfirm={() => onDelete(record.modelId)}>
                      <span><DeleteOutlined style={{ marginRight: 4 }} />删除</span>
                    </APopconfirm>
                  ),
                },
              ],
            }}
          >
            <AButton className="abi-action-link" size="small" variant="link">
              更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
            </AButton>
          </Dropdown>
        </div>
      ),
      title: '操作',
    },
  ], [spaceId, t, providers, onEdit, onCopy, onDelete, onSetDefault, onAnalysis])

  // Filter columns by visibility (always keep operate column)
  const tableColumns = useMemo(() => {
    return allTableColumns.filter(col => col.key === 'operate' || visibleKeys.has(col.key))
  }, [columnOptions, allTableColumns])

  // Build dropdown items for card view
  const buildCardDropdownItems = (item: ModelItem) => [
    ...((['1', '2', '3'].includes(item.modelType)) ? [{
      key: 'setDefault',
      disabled: item.isDefault === 1,
      label: (
        <span style={{ color: item.isDefault === 1 ? '#bfbfbf' : undefined }}>
          {item.isDefault === 1 ? '已是默认' : '设为默认'}
        </span>
      ),
      onClick: () => { if (item.isDefault !== 1) onSetDefault(item.modelId) },
    }] : []),
    {
      key: 'analysis',
      label: '元数据分析',
      onClick: () => onAnalysis({ nodeId: item.modelId, nodeName: item.modelName, nodeType: 'LLM', spaceId: spaceId || undefined }),
    },
    { type: 'divider' as const },
    {
      key: 'delete',
      danger: true,
      label: '删除',
      onClick: () => onDelete(item.modelId),
    },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* v5 Search Bar */}
      <section className="abi-searchbar">
        <div className="abi-search-row">
          <AInput
            value={searchValue}
            placeholder="搜索模型名称或基础模型"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            allowClear
            className="abi-field-input"
            style={{ width: '220px' }}
            onChange={e => onSearchValueChange(e.target.value)}
            onPressEnter={() => onSearchValueChange(searchValue)}
          />
          <AButton type="primary" className="btn-accent-gradient" onClick={() => onSearchValueChange(searchValue)}>
            <SearchOutlined /> 查询
          </AButton>
          <AButton className="btn-ghost-v5" onClick={() => { onSearchValueChange(''); setDateRange(null); }}>
            重置
          </AButton>
        </div>
      </section>

      {/* v5 Data Area */}
      <section className="abi-data-area">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" onClick={onAdd}>
              <PlusOutlined />新增模型
            </AButton>
            <APopconfirm
              title="确定要批量删除选中的模型吗？"
              onConfirm={() => onBatchDelete(selectedRowKeys.map(k => Number(k)))}
              disabled={selectedRowKeys.length === 0}
            >
              <AButton danger disabled={selectedRowKeys.length === 0} icon={<DeleteOutlined />}>
                批量删除{selectedRowKeys.length ? `(${selectedRowKeys.length})` : ''}
              </AButton>
            </APopconfirm>
          </div>
          <ViewControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Content: table or cards */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {viewMode === 'list' ? (
            <div className="model-table-wrapper" style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: 12, overflow: 'hidden', flex: 1, minHeight: 0 }}>
              <div className="assistant-table-scroll" style={{ overflow: 'hidden', maxHeight: '100%' }}>
                <ATable
                  rowKey="modelId"
                  columns={tableColumns as any}
                  dataSource={pagedModels}
                  pagination={false}
                  size="middle"
                  className="model-table abi-std-table"
                  scroll={pagedModels.length > 0 ? { x: 'max-content' } : undefined}
                  rowSelection={{
                    columnWidth: 48,
                    fixed: true,
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                  }}
                />
              </div>
            </div>
          ) : (
            filteredModels.length === 0 ? (
              <div className="abi-card-empty">
                <AEmpty description="暂无模型数据" image={AEmpty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <div className="abi-card-grid">
                <div className="abi-card-grid-inner">
                  {pagedModels.map(item => {
                    const modelTypeLabel = MODAL_TYPE_OPTIONS.find(o => o.value === item.modelType)?.label || item.modelType
                    const provider = providers.find(p => p.providerId === item.providerId)
                    const providerIcon = provider?.iconUrl || ''
                    const providerLabel = provider?.providerName || ''
                    const modelSourceLabel = item.modelSource === '2' ? '本地' : '公有'
                    const tagColor = modelTypeTagColorMap[item.modelType] || 'default'

                    return (
                      <div key={item.modelId} className="abi-data-card" style={{ position: 'relative' }}>
                        {/* 默认模型角标 */}
                        {item.isDefault === 1 && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 24,
                            height: 24,
                            background: 'linear-gradient(135deg, #faad14, #ffc53d)',
                            borderRadius: '0 14px 0 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                          }}>
                            <StarFilled style={{ color: '#fff', fontSize: 11 }} />
                          </div>
                        )}

                        {/* 卡片头部 */}
                        <div className="abi-data-card-head">
                          <div className="abi-data-card-title">
                            {providerIcon ? (
                              <span className="abi-data-card-icon">
                                <img src={providerIcon} alt={providerLabel} />
                              </span>
                            ) : (
                              <span className="abi-data-card-icon" style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                background: 'rgba(91, 124, 247, 0.10)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                color: '#5b7cf7',
                                fontWeight: 700,
                              }}>
                                {providerLabel?.slice(0, 1)}
                              </span>
                            )}
                            <span className="abi-data-card-name" title={item.modelName}>{item.modelName}</span>
                          </div>
                          <ATag color={tagColor} bordered style={{ margin: 0 }}>{modelTypeLabel}</ATag>
                        </div>

                        {/* 卡片主体 */}
                        <div className="abi-data-card-body">
                          {visibleKeys.has('modelKey') && (
                            <div className="row"><span className="lbl">基础模型</span><span className="val" title={item.modelKey || '-'}>{item.modelKey || '-'}</span></div>
                          )}
                          {visibleKeys.has('modelSource') && (
                            <div className="row"><span className="lbl">模型来源</span><span className="val">{modelSourceLabel}</span></div>
                          )}
                          {visibleKeys.has('status') && (
                            <div className="row">
                              <span className="lbl">状态</span>
                              <span className={`abi-status-tag ${item.status === '1' ? 'status-normal' : 'status-disabled'}`}>
                                {item.status === '1' ? '启用' : '禁用'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 卡片底部操作栏 */}
                        <div className="abi-data-card-footer">
                          <button className="abi-card-act" onClick={() => onEdit(item)}>
                            <EditOutlined style={{ marginRight: 3 }} />编辑
                          </button>
                          <button className="abi-card-act" onClick={() => onCopy(item.modelId)}>
                            <CopyOutlined style={{ marginRight: 3 }} />复制
                          </button>
                          <Dropdown
                            menu={{ items: buildCardDropdownItems(item) }}
                            trigger={['click']}
                          >
                            <button className="abi-card-more" onClick={(e) => e.stopPropagation()}>
                              <MoreOutlined />
                            </button>
                          </Dropdown>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          )}

          <div className="data-source-pagination">
            <span className="total-text">共 {totalCount} 条</span>
            <div className="pagination-controls">
              <Select
                value={pageSize}
                onChange={(val: number) => { setPageSize(val); setCurrentPage(1) }}
                options={[
                  { label: '12条/页', value: 12 },
                  { label: '20条/页', value: 20 },
                  { label: '30条/页', value: 30 },
                  { label: '50条/页', value: 50 },
                ]}
                className="page-size-select"
              />
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <LeftOutlined />
              </button>
              {(() => {
                const pages: number[] = []
                if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i) }
                else {
                  pages.push(1)
                  if (currentPage > 3) pages.push(-1)
                  const start = Math.max(2, currentPage - 1)
                  const end = Math.min(totalPages - 1, currentPage + 1)
                  for (let i = start; i <= end; i++) pages.push(i)
                  if (currentPage < totalPages - 2) pages.push(-2)
                  pages.push(totalPages)
                }
                return pages.map(p => p < 0 ? <span key={p} className="page-item page-ellipsis">...</span> : <span key={p} className={`page-item${p === currentPage ? ' page-active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</span>)
              })()}
              <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <RightOutlined />
              </button>
              <span className="quick-jumper">
                前往
                <AInput className="jump-input" style={{ width: 48, textAlign: 'center' }} value={jumpValue} onChange={(e: any) => setJumpValue(e.target.value)} onPressEnter={() => { const p = parseInt(jumpValue, 10); if (p >= 1 && p <= totalPages) setCurrentPage(p); setJumpValue('') }} />
                页
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ModelCardList
