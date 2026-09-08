import { LockOutlined } from '@ant-design/icons'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Input, Modal, Spin, message } from 'antd'
import { useEffect, useState } from 'react'

import ChatWidget from '@/components/chat-widget/ChatWidget'
import type { ProjectType } from '@/components/chat-widget/service'
import { checkAssistantShare } from '@/service/api/assistant'

/** 后端分享校验响应携带项目类型（已确认）：自主助手=react / 工作流助手=workflow；异常值抛错便于联调时暴露字段问题 */
function normalizeType(raw: unknown): ProjectType {
  if (raw === 'react' || raw === 'workflow' || raw === 'dashboard') return raw
  throw new Error(`checkSharePassword 响应缺少有效 type：${String(raw)}`)
}

/** chat 请求拦截器返回 { code, msg, data }，详情对象兼容 data.data / data */
function unwrap(res: any): any {
  const d = res?.data
  return d?.data || d || {}
}

/** 助手分享页视图：后端传路径前端跳转，交互复刻大屏 ShareViewPage（先校验密码再渲染悬浮面板） */
export function AssistantSharePageView({ shareCode }: { shareCode: string }) {
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [verifiedAppId, setVerifiedAppId] = useState('')
  const [verifiedType, setVerifiedType] = useState<ProjectType>('react')
  const [verifiedToken, setVerifiedToken] = useState('')

  const apiBase = window.APP_CONFIG?.VITE_BASE_API || ''

  // 进入页面，先调 checkAssistantShare（密码传空）判断是否需要密码，并拿到 appId
  useEffect(() => {
    if (!shareCode) return
    const init = async () => {
      try {
        const d = unwrap(await checkAssistantShare({ shareCode, sharePassword: '' }))
        // 统一分享接口返回 projectId（=助手 appId），兼容后端直接返回 appId 的情况
        const appId = String(d.appId ?? d.projectId ?? '')
        if (!appId) {
          setFailed(true)
          setLoading(false)
          return
        }
        // 校验通过后后端下发临时 token，后续接口随 Authorization 携带
        if (d.token) setVerifiedToken(String(d.token))
        if (d.passwordFlag) {
          setPasswordModalVisible(true)
          setVerifiedType(normalizeType(d.type))
        } else {
          setVerifiedType(normalizeType(d.type))
          setVerifiedAppId(appId)
        }
      } catch {
        setFailed(true)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [shareCode])

  // 用户输入密码后校验
  const handlePasswordSubmit = async () => {
    if (!password) {
      message.warning('请输入密码')
      return
    }
    setPasswordLoading(true)
    try {
      const d = unwrap(await checkAssistantShare({ shareCode, sharePassword: password }))
      const appId = String(d.appId ?? d.projectId ?? '')
      // 与 widget checkSharePassword 同口径：后端校验通过时 result 可能缺省，仅显式 false 判为失败
      if (d.result !== false && appId) {
        setPasswordModalVisible(false)
        // type 缺失时复用探测阶段已归一化的 verifiedType，避免抛错中断跳转
        if (d.type) setVerifiedType(normalizeType(d.type))
        if (d.token) setVerifiedToken(String(d.token))
        setVerifiedAppId(appId)
        message.success('验证成功')
      } else {
        message.error('密码错误')
      }
    } finally {
      setPasswordLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f5fa' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (failed) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a94a6', background: '#f2f5fa' }}>
        获取分享信息失败
      </div>
    )
  }

  return (
    <>
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <LockOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <div>该分享需要密码访问</div>
          </div>
        }
        open={passwordModalVisible}
        closable={false}
        footer={null}
        centered
        width={400}
      >
        <div style={{ padding: '20px 0' }}>
          <Input.Password
            placeholder="请输入访问密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={() => void handlePasswordSubmit()}
            size="large"
            style={{ marginBottom: 20 }}
          />
          <Button type="primary" block size="large" loading={passwordLoading} onClick={() => void handlePasswordSubmit()}>
            确认
          </Button>
        </div>
      </Modal>

      {verifiedAppId && (
        <ChatWidget shareCode={shareCode} apiBase={apiBase} mode="page" verifiedAppId={verifiedAppId} verifiedType={verifiedType} verifiedToken={verifiedToken} />
      )}
    </>
  )
}

function AssistantSharePage() {
  const { shareCode } = Route.useParams()
  return <AssistantSharePageView shareCode={shareCode} />
}

export const Route = createFileRoute('/assistant-share-page/$shareCode')({
  component: AssistantSharePage,
})
