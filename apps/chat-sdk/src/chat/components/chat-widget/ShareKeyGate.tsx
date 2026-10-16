import { useState } from 'react'
import { Modal } from 'antd'

interface ShareKeyGateProps {
  /** 弹窗开合：宿主未注入密钥时打开，填入提交后关闭（外层写入请求上下文并初始化面板） */
  open: boolean
  /** 提交密钥对；由外层写入 manualKey 后随 props 流回请求上下文 */
  onSubmit: (apiKey: string, secretKey: string) => void
  /** 弹窗挂载容器（悬浮窗面板内需限定在面板内展示时传入） */
  getContainer?: () => HTMLElement
}

/**
 * 密钥填入弹窗：宿主未经标签属性注入 API Key 时（分享页 shareBridge、本地调试）在悬浮窗面板内弹出。
 * 只存组件内存、每次进入都要重填，不落 localStorage；弹窗不可关闭跳过，密钥是进入对话的前置条件。
 */
export default function ShareKeyGate({ open, onSubmit, getContainer }: ShareKeyGateProps) {
  const [apiKey, setApiKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const ak = apiKey.trim()
    const sk = secretKey.trim()
    if (!ak || !sk) {
      setError('请填写 API Key 与 Secret Key')
      return
    }
    onSubmit(ak, sk)
  }

  return (
    <Modal
      open={open}
      title="请输入访问密钥"
      footer={null}
      closable={false}
      maskClosable={false}
      keyboard={false}
      width={360}
      getContainer={getContainer}
    >
      <div className="abi-cw-keygate">
        <div className="abi-cw-keygate-desc">该分享需凭 API Key 访问，请填写后进入</div>
        <label className="abi-cw-keygate-field">
          <span className="abi-cw-keygate-label">API Key</span>
          <input
            className="abi-cw-keygate-input"
            type="text"
            value={apiKey}
            placeholder="请输入 API Key"
            autoComplete="off"
            aria-label="API Key"
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>
        <label className="abi-cw-keygate-field">
          <span className="abi-cw-keygate-label">Secret Key</span>
          <input
            className="abi-cw-keygate-input"
            type="password"
            value={secretKey}
            placeholder="请输入 Secret Key"
            autoComplete="off"
            aria-label="Secret Key"
            onChange={(e) => setSecretKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
          />
        </label>
        <div className="abi-cw-keygate-error">{error}</div>
        <button type="button" className="abi-cw-btn-primary abi-cw-keygate-submit" onClick={handleSubmit}>
          进入
        </button>
      </div>
    </Modal>
  )
}
