import {
  AccountBookOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BookOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  DollarCircleOutlined,
  DownOutlined,
  FileTextOutlined,
  LineChartOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  TableOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { Popover } from 'antd'
import React, { useState } from 'react'
import type { AntdIconProps } from '@ant-design/icons/lib/components/AntdIcon'

/**
 * 助手图标：统一使用「渐变圆角方块 + 白色线性图标」样式（参考 chat-ui.html 的 .as-card-icon）。
 * 15 种预设图标，按业务分组：数据 / 编排 / 文本 / 财报 / 运维 / 分析 / 其他。
 * 供「我的助手」「助手管理」卡片、助手编辑抽屉标题的图标选择器共用。
 */

export type AssistantIconKey =
  | 'data'
  | 'table'
  | 'orchestration'
  | 'flow'
  | 'automation'
  | 'text'
  | 'chat'
  | 'doc'
  | 'finance'
  | 'account'
  | 'ops'
  | 'security'
  | 'analysis'
  | 'chart'
  | 'other'

export interface AssistantIconConfig {
  /** 唯一键，持久化到应用的 icon 字段 */
  key: AssistantIconKey
  /** 展示名称 */
  name: string
  /** 所属分组 */
  group: string
  /** Ant Design 图标组件 */
  Icon: React.ComponentType<AntdIconProps>
  /** 渐变背景（135deg） */
  gradient: string
  /** 阴影辉光色 */
  glow: string
}

/** 15 种预设图标（每个图标独立配色，视觉更丰富） */
export const ASSISTANT_ICONS: AssistantIconConfig[] = [
  { key: 'data', name: '数据', group: '数据', Icon: DatabaseOutlined, gradient: 'linear-gradient(135deg,#5b7cf7,#6d8dfa)', glow: 'rgba(91,124,247,0.35)' },
  { key: 'table', name: '数据表', group: '数据', Icon: TableOutlined, gradient: 'linear-gradient(135deg,#6366f1,#818cf8)', glow: 'rgba(99,102,241,0.35)' },
  { key: 'orchestration', name: '编排', group: '编排', Icon: DeploymentUnitOutlined, gradient: 'linear-gradient(135deg,#8b5cf6,#a78bfa)', glow: 'rgba(139,92,246,0.35)' },
  { key: 'flow', name: '流程', group: '编排', Icon: ApartmentOutlined, gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)', glow: 'rgba(124,58,237,0.35)' },
  { key: 'automation', name: '自动化', group: '编排', Icon: ThunderboltOutlined, gradient: 'linear-gradient(135deg,#d946ef,#e879f9)', glow: 'rgba(217,70,239,0.35)' },
  { key: 'text', name: '文本', group: '文本', Icon: FileTextOutlined, gradient: 'linear-gradient(135deg,#ec4899,#f472b6)', glow: 'rgba(236,72,153,0.35)' },
  { key: 'chat', name: '对话', group: '文本', Icon: MessageOutlined, gradient: 'linear-gradient(135deg,#f43f5e,#fb7185)', glow: 'rgba(244,63,94,0.35)' },
  { key: 'doc', name: '文档', group: '文本', Icon: BookOutlined, gradient: 'linear-gradient(135deg,#06b6d4,#22d3ee)', glow: 'rgba(6,182,212,0.35)' },
  { key: 'finance', name: '财报', group: '财报', Icon: DollarCircleOutlined, gradient: 'linear-gradient(135deg,#10b981,#34d399)', glow: 'rgba(16,185,129,0.35)' },
  { key: 'account', name: '账务', group: '财报', Icon: AccountBookOutlined, gradient: 'linear-gradient(135deg,#059669,#34d399)', glow: 'rgba(5,150,105,0.35)' },
  { key: 'ops', name: '运维', group: '运维', Icon: CloudServerOutlined, gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)', glow: 'rgba(245,158,11,0.35)' },
  { key: 'security', name: '安全', group: '运维', Icon: SafetyCertificateOutlined, gradient: 'linear-gradient(135deg,#f97316,#fb923c)', glow: 'rgba(249,115,22,0.35)' },
  { key: 'analysis', name: '分析', group: '分析', Icon: LineChartOutlined, gradient: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', glow: 'rgba(14,165,233,0.35)' },
  { key: 'chart', name: '图表', group: '分析', Icon: BarChartOutlined, gradient: 'linear-gradient(135deg,#14b8a6,#2dd4bf)', glow: 'rgba(20,184,166,0.35)' },
  { key: 'other', name: '其他', group: '其他', Icon: AppstoreOutlined, gradient: 'linear-gradient(135deg,#94a3b8,#cbd5e1)', glow: 'rgba(148,163,184,0.35)' },
]

/** 分组顺序（用于选择器弹窗分区展示） */
export const ASSISTANT_ICON_GROUP_ORDER = ['数据', '编排', '文本', '财报', '运维', '分析', '其他']

/** 按分组聚合的图标列表 */
export const ASSISTANT_ICON_GROUPS: { group: string; items: AssistantIconConfig[] }[] = ASSISTANT_ICON_GROUP_ORDER.map(
  (group) => ({ group, items: ASSISTANT_ICONS.filter((it) => it.group === group) }),
)

/** 兜底图标（其他） */
export const DEFAULT_ASSISTANT_ICON = ASSISTANT_ICONS[ASSISTANT_ICONS.length - 1]

/** 根据 key 获取图标配置，缺省返回「其他」 */
export function getAssistantIcon(key?: string | null): AssistantIconConfig {
  if (!key) return DEFAULT_ASSISTANT_ICON
  return ASSISTANT_ICONS.find((it) => it.key === key) || DEFAULT_ASSISTANT_ICON
}

export interface AssistantIconBlockProps {
  /** 图标 key */
  iconKey?: string | null
  /** 方块边长（px） */
  size?: number
  /** 圆角（px） */
  radius?: number
  /** 是否显示辉光阴影 */
  glow?: boolean
  style?: React.CSSProperties
}

/**
 * 渐变圆角方块 + 白色图标（chat-ui.html 的 .as-card-icon 样式）
 */
export const AssistantIconBlock: React.FC<AssistantIconBlockProps> = ({ iconKey, size = 42, radius = 12, glow = true, style }) => {
  const cfg = getAssistantIcon(iconKey)
  const Icon = cfg.Icon
  return (
    <div
      style={{
        alignItems: 'center',
        background: cfg.gradient,
        borderRadius: radius,
        boxShadow: glow ? `0 3px 10px ${cfg.glow}` : undefined,
        display: 'flex',
        flexShrink: 0,
        height: size,
        justifyContent: 'center',
        width: size,
        ...style,
      }}
    >
      <Icon style={{ color: '#fff', fontSize: Math.round(size * 0.46) }} />
    </div>
  )
}

export interface AssistantIconPickerProps {
  /** 当前选中 key */
  value?: string | null
  /** 选择回调 */
  onChange?: (key: AssistantIconKey) => void
  /** 触发器方块尺寸 */
  size?: number
  /** 触发器圆角 */
  radius?: number
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义触发器：提供时替换默认「图标 + 下拉箭头」，用于整行点击等场景 */
  children?: React.ReactNode
}

/**
 * 助手图标选择器：触发器为「当前图标 + 下拉箭头」，点击弹出按分组罗列的可选图标。
 * 放置在助手编辑抽屉标题处（原 headerIcon 位置）。
 */
export const AssistantIconPicker: React.FC<AssistantIconPickerProps> = ({ value, onChange, size = 30, radius = 8, disabled, children }) => {
  const [open, setOpen] = useState(false)
  const current = getAssistantIcon(value)

  const content = (
    <div style={{ maxHeight: 360, overflowY: 'auto', padding: '4px 2px', width: 280 }}>
      {ASSISTANT_ICON_GROUPS.map((grp) => (
        <div key={grp.group} style={{ marginBottom: 10 }}>
          <div style={{ color: '#8494ad', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', margin: '2px 4px 8px' }}>{grp.group}</div>
          <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {grp.items.map((it) => {
              const selected = it.key === current.key
              return (
                <div
                  key={it.key}
                  role="button"
                  title={it.name}
                  onClick={() => {
                    onChange?.(it.key)
                    setOpen(false)
                  }}
                  style={{
                    alignItems: 'center',
                    background: selected ? 'rgba(91,124,247,0.10)' : 'transparent',
                    border: selected ? '1px solid rgba(91,124,247,0.45)' : '1px solid transparent',
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    padding: '6px 2px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <AssistantIconBlock iconKey={it.key} radius={9} size={34} />
                  <span style={{ color: selected ? '#5b7cf7' : '#8494ad', fontSize: 11, fontWeight: selected ? 600 : 500, lineHeight: 1.2 }}>{it.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <Popover
      content={content}
      open={disabled ? false : open}
      placement="bottomLeft"
      title={<span style={{ fontSize: 13, fontWeight: 600 }}>选择图标</span>}
      trigger="click"
      onOpenChange={setOpen}
    >
      {children ?? (
        <div
          style={{
            alignItems: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            gap: 4,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <AssistantIconBlock iconKey={value} radius={radius} size={size} />
          <DownOutlined style={{ color: '#8494ad', fontSize: 10, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
        </div>
      )}
    </Popover>
  )
}

export default AssistantIconPicker
