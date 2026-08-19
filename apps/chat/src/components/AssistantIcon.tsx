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
  FileTextOutlined,
  LineChartOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  TableOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { AntdIconProps } from '@ant-design/icons/lib/components/AntdIcon'
import type React from 'react'

/**
 * 助手图标：统一使用「渐变圆角方块 + 白色线性图标」样式。
 * 15 种预设图标，与 abi 端 AssistantIcon 保持一致，供「应用工坊-我的助手」卡片展示复用。
 */

export interface AssistantIconConfig {
  key: string
  name: string
  group: string
  Icon: React.ComponentType<AntdIconProps>
  gradient: string
  glow: string
}

/** 15 种预设图标（每个图标独立配色，与 abi 端配置对齐） */
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

/** 渐变圆角方块 + 白色图标（对齐 abi 端 AssistantIconBlock） */
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

export default AssistantIconBlock
