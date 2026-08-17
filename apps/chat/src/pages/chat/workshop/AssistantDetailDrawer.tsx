import { CloseOutlined } from '@ant-design/icons'
import { Drawer, Spin } from 'antd'
import type { FC } from 'react'
import { useEffect, useState } from 'react'

import { AssistantIconBlock } from '@/components/AssistantIcon'
import { fetchAssistantDetail } from '@/service/api/assistant'

/** 助手卡片兜底数据：抽屉打开瞬间先展示，详情接口返回后覆盖 */
export type AssistantDetailFallback = {
  id: string
  name: string
  description?: string
  icon?: string
  status?: string
  createTime?: string
}

type Props = {
  open: boolean
  onClose: () => void
  appId?: string | number
  fallback?: AssistantDetailFallback | null
}

/** 状态映射：1-已上线 / 0-草稿 / 2-已下线 */
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  '1': { label: '已上线', cls: 'on' },
  '0': { label: '草稿', cls: 'draft' },
  '2': { label: '已下线', cls: 'off' },
}

/** 应用类型映射：1-预置流程模板 / 2-自定义workflow / 3-自定义Agent */
const APP_TYPE_MAP: Record<string, string> = {
  '1': '预置流程模板',
  '2': '自定义 workflow',
  '3': '自定义 Agent',
}

/** chat 请求拦截器返回 { code, msg, data }，详情对象兼容 data.data / data */
function unwrapObject(res: any): any {
  const d = res?.data
  return d?.data || d || {}
}

/** 格式化时间：去掉 ISO 中的 T 及毫秒/时区后缀 */
function formatDateTime(s?: string) {
  if (!s) return '-'
  const t = String(s).replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '')
  return t || '-'
}

/** 应用工坊-我的助手：只读详情抽屉 */
const AssistantDetailDrawer: FC<Props> = ({ open, onClose, appId, fallback }) => {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!open || appId == null || appId === '') return
    setLoading(true)
    fetchAssistantDetail({ appId })
      .then((res: any) => {
        setDetail(unwrapObject(res))
      })
      .catch(() => {
        setDetail({})
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open, appId])

  // 详情接口字段优先，卡片兜底字段兼容（抽屉打开瞬间即有内容）
  const src = { ...(fallback || {}), ...detail } as Record<string, any>
  const name = src.appName || src.name || '-'
  const icon = src.icon
  const status = String(src.status ?? '1')
  const statusInfo = STATUS_MAP[status] || STATUS_MAP['1']
  const appType = src.appType ? APP_TYPE_MAP[String(src.appType)] : ''
  const description = src.description || ''
  const appPrompt = src.appPrompt || ''
  const prologue = src.prologue || ''

  return (
    <Drawer
      className="assistant-detail-drawer"
      closable={false}
      open={open}
      placement="right"
      title={null}
      width={520}
      onClose={onClose}
    >
      <div className="add-hero">
        <button type="button" className="add-close" onClick={onClose}>
          <CloseOutlined />
        </button>
        <AssistantIconBlock glow iconKey={icon} radius={16} size={56} />
        <div className="add-hero-main">
          <div className="add-hero-title" title={name}>
            {name}
          </div>
          <div className="add-hero-badges">
            <span className={`add-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
            {appType && <span className="add-badge type">{appType}</span>}
          </div>
        </div>
      </div>

      <Spin spinning={loading}>
        <div className="add-body">
          <div className="add-section">
            <div className="add-section-label">描述</div>
            <div className="add-section-text">{description || '暂无描述'}</div>
          </div>
          {appPrompt && (
            <div className="add-section">
              <div className="add-section-label">提示词</div>
              <div className="add-section-text pre">{appPrompt}</div>
            </div>
          )}
          {prologue && (
            <div className="add-section">
              <div className="add-section-label">开场白</div>
              <div className="add-section-text">{prologue}</div>
            </div>
          )}
          <div className="add-info">
            <div className="add-info-row">
              <span className="add-info-lbl">创建时间</span>
              <span className="add-info-val">{formatDateTime(src.createTime)}</span>
            </div>
            <div className="add-info-row">
              <span className="add-info-lbl">更新时间</span>
              <span className="add-info-val">{formatDateTime(src.updateTime)}</span>
            </div>
          </div>
        </div>
      </Spin>
    </Drawer>
  )
}

export default AssistantDetailDrawer
