export const NODE_TYPE_LABELS: Record<string, string> = {
  CHAT: '对话',
  COPILOT: '智能助手',
  DATASET: '数据集',
  DATA_SOURCE: '数据源',
  DICTIONARY: '数据字典',
  DIMENSION: '维度',
  ENTITY: '实体',
  INDICATOR: '指标',
  LABLE: '标签',
  LLM: '大模型',
  MCP: 'MCP插件',
  METIRC: '度量',
  PHYSICAL_TABLE: '数据表',
  TABLE_SEMANTIC: '表语义',
  TOOL: '工具',
  SKILL: '技能'
}

export const NODE_TYPE_COLORS: Record<string, string> = {
  CHAT: '#6f78ff',
  COPILOT: '#4f46e5',
  DATASET: '#10b981',
  DATA_SOURCE: '#0284c7',
  DICTIONARY: '#f59e0b',
  DIMENSION: '#f43f5e',
  ENTITY: '#6366f1',
  INDICATOR: '#ef4444',
  LABLE: '#fb923c',
  LLM: '#8b5cf6',
  MCP: '#14b8a6',
  METIRC: '#ec4899',
  PHYSICAL_TABLE: '#64748b',
  TABLE_SEMANTIC: '#22c55e',
  TOOL: '#0ea5e9',
  SKILL: '#a855f7'
}

export const RELATION_TYPE_LABELS: Record<string, string> = {
  DECOMPOSITION: '拆解',
  DECOMPOSION: '拆解',
  DEPENDENCY: '依赖',
  DERIVED: '派生',
  MAPPED_TO: '映射'
}

export const RELATION_TYPE_COLORS: Record<string, { color: string; dash?: number[] }> = {
  DECOMPOSITION: { color: '#ef4444', dash: [8, 4] },
  DECOMPOSION: { color: '#ef4444', dash: [8, 4] },
  DEPENDENCY: { color: '#2563eb' },
  DERIVED: { color: '#16a34a' },
  MAPPED_TO: { color: '#f59e0b', dash: [4, 4] }
}

export const STATUS_LABELS = {
  '0': '启用',
  '1': '关闭'
} as const
