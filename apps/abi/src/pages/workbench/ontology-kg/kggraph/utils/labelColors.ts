import type { OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'

interface LabelColorScheme {
  border: string
  background: string
  accent: string
  text: string
}

const COLOR_PALETTES: LabelColorScheme[] = [
  { border: '#5B7CF7', background: 'rgba(91, 124, 247, 0.08)', accent: '#5B7CF7', text: '#1a2744' },
  { border: '#10B981', background: 'rgba(16, 185, 129, 0.08)', accent: '#10B981', text: '#1a2744' },
  { border: '#F59E0B', background: 'rgba(245, 158, 11, 0.08)', accent: '#F59E0B', text: '#1a2744' },
  { border: '#EF4444', background: 'rgba(239, 68, 68, 0.08)', accent: '#EF4444', text: '#1a2744' },
  { border: '#8B5CF6', background: 'rgba(139, 92, 246, 0.08)', accent: '#8B5CF6', text: '#1a2744' },
  { border: '#EC4899', background: 'rgba(236, 72, 153, 0.08)', accent: '#EC4899', text: '#1a2744' },
  { border: '#06B6D4', background: 'rgba(6, 182, 212, 0.08)', accent: '#06B6D4', text: '#1a2744' },
  { border: '#84CC16', background: 'rgba(132, 204, 22, 0.08)', accent: '#84CC16', text: '#1a2744' },
]

const labelColorMap = new Map<string, LabelColorScheme>()

function hashLabelId(labelId: string): number {
  let hash = 0
  for (let i = 0; i < labelId.length; i++) {
    const char = labelId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function getLabelColorScheme(labelId: OntologyNetworkId | null | undefined): LabelColorScheme {
  if (!labelId) {
    return COLOR_PALETTES[0]
  }

  const key = String(labelId)
  if (labelColorMap.has(key)) {
    return labelColorMap.get(key)!
  }

  const index = hashLabelId(key) % COLOR_PALETTES.length
  const scheme = COLOR_PALETTES[index]
  labelColorMap.set(key, scheme)
  return scheme
}

export function getNodeBorderColor(labelId: OntologyNetworkId | null | undefined, isSelected: boolean, isHovered: boolean): string {
  const scheme = getLabelColorScheme(labelId)
  if (isSelected) return scheme.border
  if (isHovered) return scheme.border
  return `${scheme.border}80`
}

export function getNodeBackground(labelId: OntologyNetworkId | null | undefined, isSelected: boolean, isHovered: boolean): string {
  const scheme = getLabelColorScheme(labelId)
  if (isSelected) return scheme.background.replace('0.08', '0.18')
  if (isHovered) return scheme.background.replace('0.08', '0.14')
  return '#FFFFFF'
}

export function getNodeShadowColor(labelId: OntologyNetworkId | null | undefined, isSelected: boolean, isHovered: boolean): string {
  const scheme = getLabelColorScheme(labelId)
  if (isSelected) return scheme.border
  if (isHovered) return scheme.border
  return '#AAB6C8'
}
