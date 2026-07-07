import { LogoutOutlined } from '@ant-design/icons'
import { Popover, Modal } from 'antd'
import { useState } from 'react'
import { authManager } from '../../utils/auth'

type UserProfileCardProps = {
  collapsed: boolean
  userName: string
}

function getUserInitial(userName: string): string {
  const initial = userName.trim().charAt(0).toUpperCase()
  return initial || 'U'
}

export function UserProfileCard({ collapsed, userName }: UserProfileCardProps) {
  const [popOpen, setPopOpen] = useState(false)

  const handleLogout = () => {
    setPopOpen(false)
    Modal.confirm({
      title: '提示',
      content: '确定要退出登录吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        await authManager.logout({ preserveRedirect: false })
      },
    })
  }

  const popContent = (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 13, color: 'var(--ink)' }}
      onClick={handleLogout}
    >
      <LogoutOutlined style={{ fontSize: 14 }} />
      <span>退出登录</span>
    </div>
  )

  return (
    <Popover
      content={popContent}
      trigger="click"
      placement="top"
      arrow={false}
      open={popOpen}
      onOpenChange={setPopOpen}
      overlayInnerStyle={{ padding: '8px 12px', minWidth: 0 }}
      overlayStyle={{ width: 'calc(100% - 32px)' }}
      getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
    >
      <div
        className="user-bar-glass"
        style={{
          position: 'relative',
          padding: collapsed ? '8px 0' : '8px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            zIndex: 1,
          }}
        >
          {getUserInitial(userName)}
        </div>
        {!collapsed && (
          <div
            className="truncate"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink)',
              maxWidth: 'calc(100% - 80px)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {userName}
          </div>
        )}
      </div>
    </Popover>
  )
}
