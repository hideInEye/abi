import { LogoutOutlined } from '@ant-design/icons'
import { Popover, Modal } from 'antd'
import { useState } from 'react'

import { logoutNow } from '@/service/logout'

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
      onOk: () => logoutNow(),
    })
  }

  const popContent = (
    <div className="chat-user-logout-item" onClick={handleLogout}>
      <LogoutOutlined />
      {/* 侧边栏收起时仅展示退出图标，不展示“退出登录”文案 */}
      {!collapsed && <span>退出登录</span>}
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
      overlayInnerStyle={{ padding: '8px 12px', borderRadius: 12, minWidth: 0 }}
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
