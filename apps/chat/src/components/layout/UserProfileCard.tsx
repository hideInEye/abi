import { SettingOutlined } from '@ant-design/icons'
import { Avatar } from 'antd'

type UserProfileCardProps = {
  collapsed: boolean
  userName: string
}

function getUserInitial(userName: string): string {
  const initial = userName.trim().charAt(0).toUpperCase()
  return initial || 'U'
}

export function UserProfileCard({ collapsed, userName }: UserProfileCardProps) {
  return (
    <div
      className="user-bar-glass"
      style={{
        padding: collapsed ? '8px 0' : '8px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
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
        }}
      >
        {getUserInitial(userName)}
      </div>
      {!collapsed && (
        <>
          <div className="flex-1 min-w-0">
            <div
              className="truncate"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
            >
              {userName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
              数据分析师
            </div>
          </div>
          <SettingOutlined
            style={{
              fontSize: 16,
              color: 'var(--ink-3)',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            className="hover:text-[var(--accent)]"
          />
        </>
      )}
    </div>
  )
}
