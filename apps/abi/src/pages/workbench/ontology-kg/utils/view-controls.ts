import type { ColumnOption } from '@/components/ViewControls'

const DEFAULT_ALWAYS_VISIBLE_KEYS = new Set(['action', 'actions', 'operate'])

export function createVisibleColumnKeySet(columns: readonly ColumnOption[]): Set<string> {
  return new Set(columns.filter(column => column.visible).map(column => column.key))
}

export function toggleColumnOption(columns: readonly ColumnOption[], key: string, visible: boolean): ColumnOption[] {
  return columns.map(column => (column.key === key ? { ...column, visible } : column))
}

export function shouldDisplayColumn(columnKey: unknown, visibleColumnKeys: ReadonlySet<string>, alwaysVisibleKeys: ReadonlySet<string> = DEFAULT_ALWAYS_VISIBLE_KEYS): boolean {
  const normalizedKey = columnKey === null || columnKey === undefined ? '' : String(columnKey)
  return alwaysVisibleKeys.has(normalizedKey) || visibleColumnKeys.has(normalizedKey)
}
