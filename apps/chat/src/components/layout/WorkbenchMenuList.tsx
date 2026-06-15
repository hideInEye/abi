import { ShopOutlined, ToolOutlined } from '@ant-design/icons'
import { useCallback } from 'react'

import { SKILL_STORE_MENU_KEY } from '@/constant/layout'

type WorkbenchMenuListProps = {
  collapsed: boolean
  activeKey?: string
  onItemClick: (key: string) => void
}

/** Nav-link items matching reference glass style (应用工坊, 技能商店) */
export function WorkbenchMenuList({ collapsed, activeKey, onItemClick }: WorkbenchMenuListProps) {
  const handleClick = useCallback(
    (key: string) => {
      onItemClick(key)
    },
    [onItemClick],
  )

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 mb-2 px-1">
        <button
          type="button"
          className="nav-link-item"
          style={{ justifyContent: 'center', padding: '9px 0' }}
          onClick={() => handleClick('workshop')}
          title="应用工坊"
        >
          <div className="nav-icon"><ToolOutlined style={{ fontSize: 14 }} /></div>
        </button>
        <button
          type="button"
          className="nav-link-item"
          style={{ justifyContent: 'center', padding: '9px 0' }}
          onClick={() => handleClick(SKILL_STORE_MENU_KEY)}
          title="技能商店"
        >
          <div className="nav-icon"><ShopOutlined style={{ fontSize: 14 }} /></div>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 mb-2">
      <button
        type="button"
        className={`nav-link-item ${activeKey === 'workshop' ? 'active' : ''}`}
        onClick={() => handleClick('workshop')}
      >
        <div className="nav-icon"><ToolOutlined style={{ fontSize: 14 }} /></div>
        <span>应用工坊</span>
      </button>
      <button
        type="button"
        className={`nav-link-item ${activeKey === SKILL_STORE_MENU_KEY ? 'active' : ''}`}
        onClick={() => handleClick(SKILL_STORE_MENU_KEY)}
      >
        <div className="nav-icon"><ShopOutlined style={{ fontSize: 14 }} /></div>
        <span>技能商店</span>
      </button>
    </div>
  )
}
