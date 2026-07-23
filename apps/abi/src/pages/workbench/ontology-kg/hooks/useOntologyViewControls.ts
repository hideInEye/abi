import { useCallback, useMemo, useState } from 'react'

import type { ColumnOption } from '@/components/ViewControls'

import { createVisibleColumnKeySet, toggleColumnOption } from '../utils/view-controls'

export type OntologyViewMode = 'list' | 'card'

interface UseOntologyViewControlsResult {
  readonly columnOptions: ColumnOption[]
  readonly handleColumnToggle: (key: string, visible: boolean) => void
  readonly setViewMode: (mode: OntologyViewMode) => void
  readonly viewMode: OntologyViewMode
  readonly visibleColumnKeys: ReadonlySet<string>
}

export function useOntologyViewControls(initialColumns: readonly ColumnOption[]): UseOntologyViewControlsResult {
  const [viewMode, setViewMode] = useState<OntologyViewMode>('card')
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(() => initialColumns.map(column => ({ ...column })))

  const visibleColumnKeys = useMemo(() => createVisibleColumnKeySet(columnOptions), [columnOptions])

  const handleColumnToggle = useCallback((key: string, visible: boolean): void => {
    setColumnOptions(current => toggleColumnOption(current, key, visible))
  }, [])

  return {
    columnOptions,
    handleColumnToggle,
    setViewMode,
    viewMode,
    visibleColumnKeys,
  }
}
