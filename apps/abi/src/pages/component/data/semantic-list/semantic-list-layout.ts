import type { TableColumnsType } from 'antd'

import type { SemanticRule } from './types'

export const TABLE_SELECTION_COLUMN_WIDTH = 48

export function getTableScrollWidth(columns: TableColumnsType<SemanticRule>): number {
  return columns.reduce(
    (total, column) => total + (typeof column.width === 'number' ? column.width : 0),
    TABLE_SELECTION_COLUMN_WIDTH
  )
}

export function getResponsiveOverlayWidths(isDesktop: boolean | undefined): {
  confirmWidth: string
  drawerWidth: string
} {
  if (isDesktop) return { confirmWidth: '50%', drawerWidth: '50%' }
  return { confirmWidth: '90%', drawerWidth: '96%' }
}
