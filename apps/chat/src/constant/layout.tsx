import { CalendarOutlined, DesktopOutlined, FolderOpenOutlined, HistoryOutlined, MailOutlined, ShopOutlined, UserOutlined, VideoCameraOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'

import type { TopicItem } from '@/types/layout'

export const SIDER_WIDTH = 200
export const SIDER_COLLAPSED_WIDTH = 80
export const HISTORY_MENU_KEY = 'history-topic'
export const HISTORY_ROUTE_PREFIX = '/chat/history'
export const HISTORY_ROUTE = '/chat/history'
export const TASK_ROUTE_PREFIX = '/chat/task'
export const TASK_DETAIL_ROUTE = '/chat/task/$taskId'

export const menuSkinClass = [
  '[&_.ant-menu]:border-r-0',
  '[&_.ant-menu]:bg-transparent',
  '[&_.ant-menu-item]:w-full',
  '[&_.ant-menu-item]:mx-0',
  '[&_.ant-menu-item]:rounded-[10px]',
  // '[&_.ant-menu-item]:!bg-transparent',
  '[&_.ant-menu-item]:!text-[#333333]',
  // '[&_.ant-menu-item:hover]:!bg-transparent',
  '[&_.ant-menu-item:hover]:!text-[#111111]',
  '[&_.ant-menu-item-selected]:!bg-transparent',
  '[&_.ant-menu-item-selected]:!text-[#111111]',
  '[&_.ant-menu-item-selected::after]:!border-r-0',
  '[&_.ant-menu-item_.ant-menu-item-icon]:!text-current',
  '[&_.ant-menu-submenu-title]:w-full',
  '[&_.ant-menu-submenu-title]:mx-0',
  '[&_.ant-menu-submenu-title]:rounded-[10px]',
  '[&_.ant-menu-submenu-title]:!bg-transparent',
  '[&_.ant-menu-submenu-title]:!text-[#333333]',
  '[&_.ant-menu-submenu-title:hover]:!bg-transparent',
  '[&_.ant-menu-submenu-title:hover]:!text-[#111111]',
].join(' ')

export const middleMenus: MenuProps['items'] = [
  // { key: 'schedule', icon: <CalendarOutlined />, label: '日程' },
  // { key: 'files', icon: <FolderOpenOutlined />, label: '文件' },
  // { key: 'mail', icon: <MailOutlined />, label: '邮箱' },
  // { key: 'device', icon: <DesktopOutlined />, label: '设备' },
  // { type: 'divider' },
  { key: 'skills', icon: <ShopOutlined />, label: '技能商店' },
  // { key: 'video', icon: <VideoCameraOutlined />, label: '视频创作' },
  // { key: 'agent-world', icon: <UserOutlined />, label: 'Agent World' },
]

export const bottomMenus: MenuProps['items'] = [{ key: HISTORY_MENU_KEY, icon: <HistoryOutlined />, label: '历史话题' }]

export const fallbackTopics: TopicItem[] = []
