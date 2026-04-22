import {
  CalendarOutlined,
  CodeOutlined,
  DesktopOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  MailOutlined,
  ShopOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

import type { TopicItem } from '@/types/layout'

export const SIDER_WIDTH = 200
export const SIDER_COLLAPSED_WIDTH = 80
export const HISTORY_MENU_KEY = 'history-topic'
export const CONVERSATION_ROUTE_PREFIX = '/chat/conversation'
export const CONVERSATION_DETAIL_ROUTE = '/chat/conversation/$conversationId'

export const menuSkinClass = [
  '[&_.ant-menu]:border-r-0',
  '[&_.ant-menu]:bg-transparent',
  '[&_.ant-menu-item]:w-full',
  '[&_.ant-menu-item]:mx-0',
  '[&_.ant-menu-item]:rounded-[10px]',
  '[&_.ant-menu-submenu-title]:w-full',
  '[&_.ant-menu-submenu-title]:mx-0',
  '[&_.ant-menu-submenu-title]:rounded-[10px]',
].join(' ')

export const middleMenus: MenuProps['items'] = [
  { key: 'schedule', icon: <CalendarOutlined />, label: '日程' },
  { key: 'files', icon: <FolderOpenOutlined />, label: '文件' },
  { key: 'mail', icon: <MailOutlined />, label: '邮箱' },
  { key: 'device', icon: <DesktopOutlined />, label: '设备' },
  { type: 'divider' },
  { key: 'skills', icon: <ShopOutlined />, label: '技能商店' },
  { key: 'video', icon: <VideoCameraOutlined />, label: '视频创作' },
  { key: 'code', icon: <CodeOutlined />, label: '扣子编程' },
  { key: 'agent-world', icon: <UserOutlined />, label: 'Agent World' },
]

export const bottomMenus: MenuProps['items'] = [
  { key: HISTORY_MENU_KEY, icon: <HistoryOutlined />, label: '历史话题' },
]

export const fallbackTopics: TopicItem[] = [
  { chatId: 'demo-1', title: '北京今天天气查询', updateTime: '2026-04-20 14:56:00' },
  { chatId: 'demo-2', title: '扣子的自我介绍', updateTime: '2026-01-12 14:15:00' },
]
