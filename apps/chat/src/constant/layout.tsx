import { AppstoreOutlined, CalendarOutlined, DesktopOutlined, FolderOpenOutlined, HistoryOutlined, MailOutlined, ShopOutlined, ToolOutlined, UserOutlined, VideoCameraOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'

import type { TopicItem } from '@/types/layout'

export const SIDER_WIDTH = 280
export const SIDER_COLLAPSED_WIDTH = 72
export const HISTORY_MENU_KEY = 'history-topic'
export const HISTORY_ROUTE_PREFIX = '/chat/history'
export const HISTORY_ROUTE = '/chat/history'
export const TASK_ROUTE_PREFIX = '/chat/task'
export const TASK_DETAIL_ROUTE = '/chat/task/$taskId'

/** Menu key for skill store — used to detect clicks and switch view */
export const SKILL_STORE_MENU_KEY = 'skills'

export const menuSkinClass = [
  '[&_.ant-menu]:border-r-0',
  '[&_.ant-menu]:bg-transparent',
  '[&_.ant-menu-item]:w-full',
  '[&_.ant-menu-item]:mx-0',
  '[&_.ant-menu-item]:rounded-[8px]',
  '[&_.ant-menu-item]:!text-[var(--ink-2)]',
  '[&_.ant-menu-item]:!text-[13px]',
  '[&_.ant-menu-item]:!font-medium',
  '[&_.ant-menu-item:hover]:!bg-[var(--accent-soft)]',
  '[&_.ant-menu-item:hover]:!text-[var(--ink)]',
  '[&_.ant-menu-item-selected]:!bg-[var(--accent-soft)]',
  '[&_.ant-menu-item-selected]:!text-[var(--accent)]',
  '[&_.ant-menu-item-selected::after]:!border-r-0',
  '[&_.ant-menu-item_.ant-menu-item-icon]:!text-current',
  '[&_.ant-menu-submenu-title]:w-full',
  '[&_.ant-menu-submenu-title]:mx-0',
  '[&_.ant-menu-submenu-title]:rounded-[8px]',
  '[&_.ant-menu-submenu-title]:!bg-transparent',
  '[&_.ant-menu-submenu-title]:!text-[var(--ink-2)]',
  '[&_.ant-menu-submenu-title:hover]:!bg-[var(--accent-soft)]',
  '[&_.ant-menu-submenu-title:hover]:!text-[var(--ink)]',
].join(' ')

export const middleMenus: MenuProps['items'] = [
  {
    key: 'workshop',
    icon: <ToolOutlined />,
    label: '应用工坊',
    children: [
      { key: 'my-apps', label: '我的应用' },
      { key: 'my-reports', label: '我的报告' },
      { key: 'my-analysis', label: '我的分析' },
      { key: 'my-dashboards', label: '我的报表' },
    ],
  },
  { key: SKILL_STORE_MENU_KEY, icon: <ShopOutlined />, label: '技能商店' },
]

export const bottomMenus: MenuProps['items'] = [{ key: HISTORY_MENU_KEY, icon: <HistoryOutlined />, label: '历史话题' }]

export const fallbackTopics: TopicItem[] = []

/** Static conversation groups for sidebar "对话分组" section */
export const conversationGroups = [
  {
    key: 'data-analysis',
    label: '数据分析',
    items: [
      { key: 'g1-1', title: '用户画像维度分析' },
      { key: 'g1-2', title: '订单趋势月度报告' },
      { key: 'g1-3', title: 'RFM模型构建讨论' },
    ],
  },
  {
    key: 'knowledge',
    label: '知识图谱',
    items: [
      { key: 'g2-1', title: '本体模型设计讨论' },
      { key: 'g2-2', title: '实体关系抽取方案' },
    ],
  },
]

/** Skill store mock data */
export type SkillCard = {
  key: string
  title: string
  description: string
  /** 'builtin' | 'custom' | 'plugin' */
  tag: string
  tagLabel: string
  /** Color class: c1-c6 */
  color: string
  enabled: boolean
}

export const skillStoreCards: SkillCard[] = [
  {
    key: 'data-query',
    title: '数据查询',
    description: '连接数据库执行SQL查询，支持MySQL、PG、MongoDB等多种数据源',
    tag: 'builtin',
    tagLabel: '内置',
    color: 'c1',
    enabled: true,
  },
  {
    key: 'nlp-analysis',
    title: 'NLP文本分析',
    description: '自然语言处理，实体识别、情感分析、关键词提取',
    tag: 'custom',
    tagLabel: '自定义',
    color: 'c2',
    enabled: false,
  },
  {
    key: 'chart-gen',
    title: '图表生成器',
    description: '根据数据自动生成可视化图表，支持折线图、柱状图、饼图等',
    tag: 'plugin',
    tagLabel: '插件',
    color: 'c3',
    enabled: true,
  },
  {
    key: 'api-orchestrator',
    title: 'API编排引擎',
    description: '多API串联调用与结果聚合，支持条件分支和错误处理',
    tag: 'builtin',
    tagLabel: '内置',
    color: 'c4',
    enabled: false,
  },
  {
    key: 'smart-summary',
    title: '智能摘要',
    description: '长文档自动摘要与关键信息提取，支持多语言',
    tag: 'custom',
    tagLabel: '自定义',
    color: 'c5',
    enabled: false,
  },
  {
    key: 'anomaly-detect',
    title: '异常检测',
    description: '时序数据异常点检测与告警，支持多种统计算法',
    tag: 'builtin',
    tagLabel: '内置',
    color: 'c6',
    enabled: true,
  },
]
