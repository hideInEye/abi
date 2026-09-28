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

/** 悬浮窗预设主题，取值与 chat-sdk theme.ts ThemeId 一致 */
type ShareTheme = 'blue' | 'light' | 'dark'

const THEME_OPTIONS: { value: ShareTheme; label: string; bg: string; bar: string; ink: string }[] = [
  { value: 'blue', label: '蓝色系', bg: '#d5daf5', bar: '#5b7cf7', ink: '#262626' },
  { value: 'light', label: '白色系', bg: '#ffffff', bar: '#5b7cf7', ink: '#1f2733' },
  { value: 'dark', label: '黑色系', bg: '#1a1d29', bar: '#282c3a', ink: '#e8ecf5' },
]

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
  const [theme, setTheme] = useState<ShareTheme>('blue')

  // 关闭后重置弹窗内所有状态，避免下次打开残留
  useEffect(() => {
    if (!open) {
      setSharePasswordFlag(false)
      setShareLink('')
      setSharePassword(null)
      setShareLoading(false)
      setExpirationMode('forever')
      setExpirationDate(null)
      setTheme('blue')
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
        theme,
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

        {/* 悬浮窗主题风格：预设三选一，随分享记录存储，SDK 校验分享时拉取套用 */}
        <div
          style={{
            padding: '14px 16px',
            background: '#f7f8fa',
            borderRadius: '10px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontWeight: 500, color: '#262626', marginBottom: '10px' }}>悬浮窗主题风格</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value
              return (
                <div
                  key={opt.value}
                  onClick={() => !shareLink && setTheme(opt.value)}
                  style={{
                    flex: 1,
                    cursor: shareLink ? 'not-allowed' : 'pointer',
                    opacity: shareLink && !active ? 0.5 : 1,
                    border: `2px solid ${active ? '#5b7cf7' : 'transparent'}`,
                    borderRadius: '10px',
                    background: '#fff',
                    padding: '6px',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* 缩略预览：标题栏 + 正文 + 一行文字示意 */}
                  <div style={{ background: opt.bg, borderRadius: '6px', overflow: 'hidden', height: '44px', border: '1px solid #eceef2' }}>
                    <div style={{ background: opt.bar, height: '14px' }} />
                    <div style={{ margin: '8px 8px 0', height: '6px', borderRadius: '3px', background: opt.ink, opacity: 0.45 }} />
                    <div style={{ margin: '6px 8px 0', width: '60%', height: '6px', borderRadius: '3px', background: opt.ink, opacity: 0.25 }} />
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '6px', color: active ? '#5b7cf7' : '#595959', fontWeight: active ? 600 : 400 }}>
                    {opt.label}
                  </div>
                </div>
              )
            })}
          </div>
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
