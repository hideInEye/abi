import { LockOutlined } from '@ant-design/icons'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Input, Modal, Spin } from 'antd'
import { useEffect, useState } from 'react'

import ChatWidget from '@/components/chat-widget/ChatWidget'
import { checkAssistantShare } from '@/service/api/assistant'

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
        if (d.passwordFlag) {
          setPasswordModalVisible(true)
        } else {
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
    if (!password) return
    setPasswordLoading(true)
    try {
      const d = unwrap(await checkAssistantShare({ shareCode, sharePassword: password }))
      const appId = String(d.appId ?? d.projectId ?? '')
      if (d.result && appId) {
        setPasswordModalVisible(false)
        setVerifiedAppId(appId)
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
        <ChatWidget shareCode={shareCode} apiBase={apiBase} mode="page" verifiedAppId={verifiedAppId} />
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
