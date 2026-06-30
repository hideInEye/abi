import { describe, expect, it } from 'vitest'

import { createVisibleColumnKeySet, shouldDisplayColumn, toggleColumnOption } from './view-controls'

describe('ontology view controls helpers', () => {
  it('creates a key set from visible column options only', () => {
    const keys = createVisibleColumnKeySet([
      { key: 'name', label: '名称', visible: true },
      { key: 'status', label: '状态', visible: false },
    ])

    expect(keys.has('name')).toBe(true)
    expect(keys.has('status')).toBe(false)
  })

  it('toggles a single column without mutating the original options', () => {
    const columns = [
      { key: 'name', label: '名称', visible: true },
      { key: 'status', label: '状态', visible: false },
    ]

    const nextColumns = toggleColumnOption(columns, 'status', true)

    expect(nextColumns).toEqual([
      { key: 'name', label: '名称', visible: true },
      { key: 'status', label: '状态', visible: true },
    ])
    expect(columns[1].visible).toBe(false)
  })

  it('always keeps operation columns visible', () => {
    const keys = createVisibleColumnKeySet([{ key: 'name', label: '名称', visible: false }])

    expect(shouldDisplayColumn('action', keys)).toBe(true)
    expect(shouldDisplayColumn('actions', keys)).toBe(true)
    expect(shouldDisplayColumn('operate', keys)).toBe(true)
    expect(shouldDisplayColumn('name', keys)).toBe(false)
  })
})
