import { ApartmentOutlined, CopyOutlined, DeleteOutlined, EditOutlined, LeftOutlined, MoreOutlined, PlusOutlined, RightOutlined, SearchOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { Dropdown, Select, Space } from 'antd'
import { MODAL_TYPE_OPTIONS, PROVIDER_OPTIONS } from '@/constants/manage'
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types'
import { useAppSelector } from '@/hooks/business/useStore'
import { getSpaceId } from '@/store/slice/app'
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

  // 搜索条件变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [searchValue])

  const totalCount = filteredModels.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const pagedModels = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredModels.slice(start, start + pageSize)
  }, [filteredModels, currentPage, pageSize])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* v5 Search Bar */}
      <div className="abi-searchbar">
        <div className="abi-search-row">
          <AInput
            value={searchValue}
            placeholder="搜索模型名称或基础模型"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            allowClear
            className="abi-field-input"
            style={{ width: '14rem' }}
            onChange={e => onSearchValueChange(e.target.value)}
          />
          <AButton className="btn-accent-gradient ml-auto" onClick={onAdd}>
            <PlusOutlined />
            新增
          </AButton>
        </div>
      </div>

      {/* Card Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 20px 12px 12px' }}>
        {filteredModels.length === 0 ? (
          <AEmpty description="暂无模型数据" style={{ marginTop: 80 }} />
        ) : (
          <div className="abi-card-grid">
            <div className="abi-card-grid-inner">
              {pagedModels.map(item => {
                const modelTypeLabel = MODAL_TYPE_OPTIONS.find(o => o.value === item.modelType)?.label || item.modelType
                // 供应商图标：通过 providerId 在 providers 中匹配
                const provider = providers.find(p => p.providerId === item.providerId)
                const providerIcon = provider?.iconUrl || ''
                const providerLabel = provider?.providerName || ''
                // 模型来源标签：'1'=公有, '2'=本地
                const modelSourceLabel = item.modelSource === '2' ? '本地' : '公有'
                const tagColor = modelTypeTagColorMap[item.modelType] || 'default'

                const dropdownItems = [
                  {
                    key: 'edit',
                    label: (
                      <span>
                        <EditOutlined style={{ marginRight: 6 }} />
                        {t('page.manage.common.edit')}
                      </span>
                    ),
                  },
                  {
                    key: 'copy',
                    label: (
                      <span>
                        <CopyOutlined style={{ marginRight: 6 }} />
                        复制
                      </span>
                    ),
                  },
                  ...((['1', '2', '3'].includes(item.modelType)) ? [{
                    key: 'setDefault',
                    disabled: item.isDefault === 1,
                    label: (
                      <span style={{ color: item.isDefault === 1 ? '#bfbfbf' : undefined }}>
                        <StarOutlined style={{ marginRight: 6 }} />
                        设为默认模型
                      </span>
                    ),
                  }] : []),
                  {
                    key: 'analysis',
                    label: (
                      <span>
                        <ApartmentOutlined style={{ marginRight: 6 }} />
                        元数据分析
                      </span>
                    ),
                  },
                  {
                    key: 'delete',
                    label: (
                      <span style={{ color: '#ff4d4f' }}>
                        <DeleteOutlined style={{ marginRight: 6 }} />
                        {t('page.manage.common.delete')}
                      </span>
                    ),
                  },
                ]

                return (
                  <div
                    key={item.modelId}
                    className="abi-data-card"
                    style={{ position: 'relative' }}
                  >
                    {/* 默认模型角标 */}
                    {item.isDefault === 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: 24,
                          height: 24,
                          background: '#faad14',
                          borderRadius: '0 12px 0 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                        }}
                      >
                        <StarFilled style={{ color: '#fff', fontSize: 12 }} />
                      </div>
                    )}

                    {/* 卡片头部 */}
                    <div className="abi-data-card-head">
                      <div className="abi-data-card-title">
                        {providerIcon ? (
                          <img src={providerIcon} alt={providerLabel} style={{ width: 22, height: 16, objectFit: 'contain', flexShrink: 0 }} />
                        ) : (
                          <span style={{
                            width: 22,
                            height: 22,
                            borderRadius: 4,
                            background: '#f0f5ff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            color: '#1677ff',
                            fontWeight: 'bold',
                            flexShrink: 0,
                          }}>
                            {providerLabel?.slice(0, 1)}
                          </span>
                        )}
                        <span className="abi-data-card-name">{item.modelName}</span>
                      </div>
                      <ATag color={tagColor} bordered style={{ margin: 0 }}>{modelTypeLabel}</ATag>
                    </div>

                    {/* 卡片主体 */}
                    <div className="abi-data-card-body">
                      <div className="row"><span className="lbl">基础模型</span><span className="val" title={item.modelKey || '-'}>{item.modelKey || '-'}</span></div>
                      <div className="row"><span className="lbl">模型来源</span><span className="val">{modelSourceLabel}</span></div>
                      <div className="row">
                        <span className="lbl">状态</span>
                        <span className={`abi-status-tag ${item.status === '1' ? 'status-normal' : 'status-disabled'}`}>
                          {item.status === '1' ? '启用' : '禁用'}
                        </span>
                      </div>
                    </div>

                    {/* 操作菜单 */}
                    <div style={{ position: 'absolute', bottom: 18, right: 20, zIndex: 10 }}>
                      <Dropdown
                        menu={{
                          items: dropdownItems,
                          onClick: ({ key }) => {
                            if (key === 'edit') onEdit(item)
                            else if (key === 'copy') onCopy(item.modelId)
                            else if (key === 'setDefault') onSetDefault(item.modelId)
                            else if (key === 'analysis') {
                              onAnalysis({
                                nodeId: item.modelId,
                                nodeName: item.modelName,
                                nodeType: 'LLM',
                                spaceId: spaceId || undefined,
                              })
                            } else if (key === 'delete') onDelete(item.modelId)
                          },
                        }}
                        trigger={['hover']}
                      >
                        <AButton type="text" size="small" style={{ color: '#8c8c8c' }}>
                          <MoreOutlined />
                        </AButton>
                      </Dropdown>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )}
      </div>
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
  )
}

export default ModelCardList
