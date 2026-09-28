import { Button, ConfigProvider, DatePicker, Input, Modal, Segmented, Switch, message } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import type { Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'

import { useAppSelector } from '@/hooks/business/useStore'
import type { AgentMock } from '@/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer'
import { shareProjectApi } from '@/service/api/share'
import { getSpaceId } from '@/store/slice/app'

interface Props {
  /** 当前分享的助手（为空时不渲染内容） */
  agent?: (AgentMock & { icon?: string }) | null
  open: boolean
  onClose: () => void
  /** 分享成功（拿到分享链接）后回调，用于刷新分享记录 */
  onShared?: () => void
}

/**
 * 助手分享弹窗
 * UI 参考「我的大屏」分享弹窗（访问密码保护 / 链接有效期 / 生成链接 / 复制链接）。
 * 对接统一分享接口 /api/dashboard/api/v1/project/share（abi 助手 type=workflow）。
 */
const AssistantShareModal: React.FC<Props> = ({ agent, open, onClose, onShared }) => {
  const spaceId = useAppSelector(getSpaceId)
  const [sharePasswordFlag, setSharePasswordFlag] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [sharePassword, setSharePassword] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [expirationMode, setExpirationMode] = useState<string>('forever')
  const [expirationDate, setExpirationDate] = useState<Dayjs | null>(null)

  // 关闭后重置弹窗内所有状态，避免下次打开残留
  useEffect(() => {
    if (!open) {
      setSharePasswordFlag(false)
      setShareLink('')
      setSharePassword(null)
      setShareLoading(false)
      setExpirationMode('forever')
      setExpirationDate(null)
    }
  }, [open])

  const handleShare = async () => {
    if (!agent?.id) return
    setShareLoading(true)
    try {
      const expirationDays = ['1', '7', '30'].includes(expirationMode) ? Number(expirationMode) : undefined
      const expirationDateStr =
        expirationMode === 'custom' && expirationDate ? expirationDate.format('YYYY-MM-DD HH:mm:ss') : undefined
      const { data, error } = await shareProjectApi({
        projectId: agent.id,
        spaceId: spaceId || 0,
        type: 'workflow',
        sharePasswordFlag,
        ...(expirationDays !== undefined ? { expirationDays } : {}),
        ...(expirationDateStr ? { expirationDate: expirationDateStr } : {}),
      })
      const shareUrl = (data as any)?.shareUrl ?? ''
      if (error || !shareUrl) {
        message.error('获取分享链接失败')  
        return
      }
      // 直接展示后端返回的分享链接
      setShareLink(shareUrl)
      setSharePassword((data as any)?.sharePassword ?? null)
      // 新增分享记录后通知外部刷新（分享记录 tab 保持挂载，不会自动重拉）
      onShared?.()
    } finally {
      setShareLoading(false)
    }
  }

  const handleCopyLink = () => {
    const text = sharePassword ? `分享链接：${shareLink}\n访问密码：${sharePassword}` : shareLink
    navigator.clipboard.writeText(text).then(() => {
      message.success(sharePassword ? '分享链接和密码已复制到剪贴板' : '分享链接已复制到剪贴板')
    })
  }

  return (
    <Modal title="分享助手" open={open} onCancel={onClose} footer={null} width={520} centered destroyOnClose>
      <div style={{ padding: '8px 0 4px' }}>
        {/* 访问密码 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            background: '#f7f8fa',
            borderRadius: '10px',
            marginBottom: '12px',
          }}
        >
          <div>
            <div style={{ fontWeight: 500, color: '#262626', marginBottom: '2px' }}>访问密码保护</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>开启后将生成随机访问密码</div>
          </div>
          <Switch checked={sharePasswordFlag} onChange={setSharePasswordFlag} disabled={!!shareLink} />
        </div>

        {/* 链接有效期 */}
        <div
          style={{
            padding: '14px 16px',
            background: '#f7f8fa',
            borderRadius: '10px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontWeight: 500, color: '#262626', marginBottom: '10px' }}>链接有效期</div>
          <Segmented
            value={expirationMode}
            onChange={(val) => setExpirationMode(String(val))}
            options={[
              { label: '永久', value: 'forever' },
              { label: '1 天', value: '1' },
              { label: '7 天', value: '7' },
              { label: '30 天', value: '30' },
              { label: '自定义', value: 'custom' },
            ]}
            block
          />
          {expirationMode === 'custom' && (
            <div style={{ marginTop: '12px' }}>
              <ConfigProvider locale={{ ...zhCN, DatePicker: { ...zhCN.DatePicker, lang: { ...zhCN.DatePicker?.lang, ok: '确认' } } as any }}>
                <DatePicker
                  value={expirationDate}
                  onChange={(date) => setExpirationDate(date)}
                  showTime={{ format: 'HH:mm:ss' }}
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="选择过期日期和时间"
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current.isBefore(new Date(), 'day')}
                />
              </ConfigProvider>
            </div>
          )}
        </div>

        {/* 生成按钮 / 结果区 */}
        {!shareLink ? (
          <Button
            type="primary"
            block
            size="large"
            loading={shareLoading}
            onClick={handleShare}
            disabled={expirationMode === 'custom' && !expirationDate}
            style={{ borderRadius: '8px', height: '44px' }}
          >
            生成分享链接
          </Button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#f7f8fa', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>分享链接</div>
              <Input.TextArea
                value={shareLink}
                readOnly
                rows={2}
                style={{ background: 'transparent', border: 'none', padding: 0, resize: 'none', boxShadow: 'none' }}
              />
            </div>
            {sharePassword && (
              <div style={{ background: '#F7F8FA', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '6px' }}>访问密码</div>
                <div style={{ fontWeight: 700, fontSize: '22px', letterSpacing: '6px', color: '#666' }}>{sharePassword}</div>
              </div>
            )}
            <Button type="primary" block size="large" onClick={handleCopyLink} style={{ borderRadius: '8px', height: '44px' }}>
              {sharePassword ? '复制链接和密码' : '复制链接'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default AssistantShareModal
