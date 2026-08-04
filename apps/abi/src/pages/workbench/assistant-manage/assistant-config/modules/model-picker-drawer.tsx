import { AppstoreOutlined, SearchOutlined } from '@ant-design/icons'
import { Checkbox, Empty, Input, Spin } from 'antd'
import { useEffect, useRef, useState } from 'react'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { fetchModelList, fetchProviderList } from '@/service/api'
import React from 'react'

import { GroupNavItem, PickerToolRow } from './tool-picker-drawer'

/**
 * AI模型配置 - 模型选择抽屉
 * 左侧「全部 + 供应商」目录，右侧模型列表；打开抽屉后才请求，结果缓存
 * id 统一带 model_ 前缀，避免与其他能力选中集合冲突
 */

export type ModelOption = { id: string; name: string; providerId?: number; description?: string }

interface ProviderItem {
  providerId: number
  providerName: string
}

interface Props {
  open: boolean
  spaceId?: number | string
  selectedIds: Set<string>
  /** 单选模式：仅允许选中一个模型，隐藏「全选」 */
  singleSelect?: boolean
  onToggle: (id: string, checked: boolean) => void
  onBatchToggle: (ids: string[], checked: boolean) => void
  /** 列表加载完成后回传模型元数据（可选，用于父组件展示已选项名称） */
  onOptionsLoaded?: (options: ModelOption[]) => void
  onClose: () => void
}

const ModelPickerDrawer: React.FC<Props> = ({ open, spaceId, selectedIds, singleSelect = false, onToggle, onBatchToggle, onOptionsLoaded, onClose }) => {
  const [keyword, setKeyword] = useState('')
  // activeProviderId 为 null 表示「全部」
  const [activeProviderId, setActiveProviderId] = useState<number | null>(null)

  const [providers, setProviders] = useState<ProviderItem[]>([])
  const [models, setModels] = useState<ModelOption[]>([])
  const [loading, setLoading] = useState(false)
  const loadedRef = useRef(false)

  // 空间切换后清空缓存，避免展示上个空间的数据
  useEffect(() => {
    loadedRef.current = false
    setProviders([])
    setModels([])
    setActiveProviderId(null)
  }, [spaceId])

  /** 加载供应商 + 模型列表，仅首次 */
  async function loadData() {
    if (loadedRef.current || !spaceId) return
    setLoading(true)
    try {
      const [providerData, modelRes] = await Promise.all([
        fetchProviderList(),
        fetchModelList({ pageNum: 1, pageSize: 999, spaceId: Number(spaceId) }) as any,
      ])
      const providerList: any[] = Array.isArray(providerData) ? providerData : []
      setProviders(providerList.map((p) => ({ providerId: p.providerId, providerName: p.providerName || '-' })))
      // 仅展示语言模型（modelType==='1'，大模型），过滤掉向量/嵌入模型
      const rows: any[] = (modelRes?.data?.data ?? []).filter((m: any) => String(m.modelType) === '1')
      const options: ModelOption[] = rows.map((m) => ({
        id: `model_${m.modelId ?? m.llmId}`,
        name: m.modelName || '-',
        providerId: m.providerId,
        description: m.description || m.modelType || '',
      }))
      setModels(options)
      loadedRef.current = true
      onOptionsLoaded?.(options)
    } catch {
      setProviders([])
      setModels([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) loadData()
  }, [open, spaceId])

  const kw = keyword.trim().toLowerCase()
  const providerFiltered = activeProviderId == null ? models : models.filter((m) => m.providerId === activeProviderId)
  const filteredList = kw ? providerFiltered.filter((m) => m.name.toLowerCase().includes(kw)) : providerFiltered

  const allChecked = filteredList.length > 0 && filteredList.every((m) => selectedIds.has(m.id))
  const checkedCount = filteredList.filter((m) => selectedIds.has(m.id)).length
  const indeterminate = checkedCount > 0 && checkedCount < filteredList.length

  return (
    <CommonDrawer
      destroyOnClose={false}
      icon={<AppstoreOutlined />}
      open={open}
      placement="right"
      title="添加模型"
      width={620}
      onClose={onClose}
    >
      <div style={{ display: 'flex', gap: 12, height: '100%' }}>
        {/* 左：全部 + 供应商目录 */}
        <div
          style={{
            borderRight: '1px solid rgba(130, 140, 200, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'auto',
            paddingRight: 8,
            width: 150,
          }}
        >
          <div style={{ color: '#8fa0b5', fontSize: 12, fontWeight: 600, padding: '4px 8px 8px' }}>供应商</div>
          <Spin spinning={loading && providers.length === 0}>
            <GroupNavItem active={activeProviderId == null} name="全部" onClick={() => setActiveProviderId(null)} />
            {providers.map((p) => (
              <GroupNavItem key={p.providerId} active={p.providerId === activeProviderId} name={p.providerName} onClick={() => setActiveProviderId(p.providerId)} />
            ))}
          </Spin>
        </div>

        {/* 右：模型列表 */}
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0 }}>
          <Input
            allowClear
            placeholder="搜索模型名称"
            prefix={<SearchOutlined style={{ color: '#8fa0b5' }} />}
            size="small"
            style={{ borderRadius: 8, marginBottom: 8 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {singleSelect ? (
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                gap: 8,
                padding: '4px 8px',
                userSelect: 'none',
              }}
            >
              <span style={{ color: '#595959', fontSize: 12, fontWeight: 600 }}>模型列表</span>
              <span style={{ color: '#bfbfbf', fontSize: 11 }}>({filteredList.length})</span>
              <span style={{ color: '#8fa0b5', fontSize: 11, marginLeft: 'auto' }}>{checkedCount > 0 ? '已选 1 项' : '未选择'}</span>
            </div>
          ) : (
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                gap: 8,
                padding: '4px 8px',
                userSelect: 'none',
              }}
            >
              <Checkbox
                checked={allChecked}
                disabled={filteredList.length === 0}
                indeterminate={indeterminate}
                onChange={(e) =>
                  onBatchToggle(
                    filteredList.map((m) => m.id),
                    e.target.checked,
                  )
                }
              />
              <span style={{ color: '#595959', fontSize: 12, fontWeight: 600 }}>全选</span>
              <span style={{ color: '#bfbfbf', fontSize: 11 }}>({filteredList.length})</span>
              <span style={{ color: '#8fa0b5', fontSize: 11, marginLeft: 'auto' }}>已选 {checkedCount} 项</span>
            </div>
          )}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Spin spinning={loading}>
              {filteredList.length === 0 && !loading ? (
                <Empty description={kw ? '无匹配模型' : '暂无模型'} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 48 }} />
              ) : (
                filteredList.map((item) => (
                  <PickerToolRow
                    key={item.id}
                    description={item.description}
                    name={item.name}
                    selected={selectedIds.has(item.id)}
                    onToggle={() => onToggle(item.id, !selectedIds.has(item.id))}
                  />
                ))
              )}
            </Spin>
          </div>
        </div>
      </div>
    </CommonDrawer>
  )
}

export default ModelPickerDrawer
