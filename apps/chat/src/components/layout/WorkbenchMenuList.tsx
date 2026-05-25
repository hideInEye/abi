import { ConfigProvider, Menu } from 'antd'
import type { MenuProps } from 'antd'

import { menuSkinClass } from '@/constant/layout'

type WorkbenchMenuListProps = {
  collapsed: boolean
  items: MenuProps['items']
  onClick: MenuProps['onClick']
  selectedKeys?: string[]
  selectable?: boolean
}

export function WorkbenchMenuList({ collapsed, items, onClick, selectedKeys, selectable = true }: WorkbenchMenuListProps) {
  return (
      <Menu
        mode="inline"
        items={items}
        onClick={onClick}
        selectedKeys={selectedKeys}
        className={menuSkinClass}
        inlineCollapsed={collapsed}
        selectable={selectable}
        style={{ background: 'transparent', borderInlineEnd: 'none' }}
      />
  )
}
