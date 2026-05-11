import { ApartmentOutlined, CopyOutlined, DeleteOutlined, EditOutlined, MoreOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { Dropdown, Space } from 'antd'
import { MODAL_TYPE_OPTIONS, PROVIDER_OPTIONS } from '@/constants/manage'
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types'
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
  searchType: 'modelName' | 'baseModel'
  onSearchValueChange: (val: string) => void
  onSearchTypeChange: (type: 'modelName' | 'baseModel') => void
  onSearch: () => void
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
  searchType,
  onSearchValueChange,
  onSearchTypeChange,
  onSearch,
  onAdd,
  onEdit,
  onCopy,
  onDelete,
  onSetDefault,
  onAnalysis,
}) => {
  const { t } = useTranslation()

  const searchTypeOptions = [
    { label: '模型名称', value: 'modelName' },
    { label: '基础模型', value: 'baseModel' },
  ]

  const filteredModels = useMemo(() => {
    if (!searchValue) return models
    const text = searchValue.toLowerCase()
    return models.filter(m => {
      if (searchType === 'modelName') return m.modelName?.toLowerCase().includes(text)
      if (searchType === 'baseModel') return m.modelKey?.toLowerCase().includes(text)
      return false
    })
  }, [models, searchValue, searchType])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ACard
        bordered={false}
        size="small"
        title={
          <div style={{ fontWeight: 'normal' }}>
          <Space.Compact style={{ width: 320 }}>
            <ASelect
              value={searchType}
              options={searchTypeOptions}
              style={{ width: '38%' }}
              onChange={onSearchTypeChange}
            />
            <AInput
              value={searchValue}
              placeholder="请输入关键词"
              style={{ width: '62%' }}
              allowClear
              onChange={e => onSearchValueChange(e.target.value)}
              onPressEnter={onSearch}
            />
          </Space.Compact>
          </div>
        }
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '12px 16px' } }}
        extra={
          <AButton type="primary" onClick={onAdd}>
            新增
          </AButton>
        }
      >
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 20px 12px 12px' }}>
          {filteredModels.length === 0 ? (
            <AEmpty description="暂无模型数据" style={{ marginTop: 80 }} />
          ) : (
            <div className="model-card-grid">
              {filteredModels.map(item => {
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
                    className="model-card-item"
                    style={{
                      position: 'relative',
                      border: '1px solid #d9d9d9',
                      borderRadius: 8,
                      padding: 16,
                      minHeight: 180,
                      height: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background: '#fff',
                      boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
                    }}
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
                          borderRadius: '0 8px 0 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                        }}
                      >
                        <StarFilled style={{ color: '#fff', fontSize: 12 }} />
                      </div>
                    )}

                    {/* 操作菜单（默认一直显示） */}
                    <div
                      className="model-card-more"
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        zIndex: 10,
                        opacity: 1,
                      }}
                    >
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
                                spaceId: Number(localStorage.getItem('spaceId')) || undefined,
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

                    {/* 上部：图标 + 名称 + 标签 */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: providerIcon ? 'transparent' : '#f0f5ff',
                          borderRadius: 8,
                          fontSize: 20,
                          color: '#1677ff',
                          fontWeight: 'bold',
                        }}
                      >
                        {providerIcon ? (
                          <img src={providerIcon} alt={providerLabel} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
                        ) : (
                          providerLabel?.slice(0, 1)
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={item.modelName}
                        >
                          {item.modelName}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ATag color={tagColor} bordered style={{ margin: 0 }}>
                            {modelTypeLabel}
                          </ATag>
                          <ATag bordered style={{ margin: 0 }}>
                            {modelSourceLabel}
                          </ATag>
                        </div>
                      </div>
                    </div>

                    {/* 下部：基础模型 + 状态 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ color: '#8c8c8c', flexShrink: 0 }}>基础模型</span>
                        <span
                          style={{
                            color: '#595959',
                            fontFamily: 'monospace',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={item.modelKey || '-'}
                        >
                          {item.modelKey || '-'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ color: '#8c8c8c', flexShrink: 0 }}>状&emsp;态&emsp;</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: item.status === '1' ? '#52c41a' : '#bfbfbf',
                            }}
                          />
                          <span style={{ color: item.status === '1' ? '#434343' : '#8c8c8c' }}>
                            {item.status === '1' ? '启用' : '禁用'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ACard>
    </div>
  )
}

export default ModelCardList
