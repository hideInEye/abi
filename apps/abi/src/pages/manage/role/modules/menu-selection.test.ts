import { describe, expect, it } from 'vitest'

import { collectRoleMenuIds, getRoleMenuCheckedKeys } from './menu-selection'

const tree = [{ id: 1, children: [{ id: 2, children: [{ id: 3 }, { id: 4 }] }, { id: 5 }] }]

describe('system role menu selection', () => {
  it('includes all ancestors when saving an unchanged leaf selection', () => {
    expect(collectRoleMenuIds([3], tree)).toEqual([3, 2, 1])
  })
  it('does not turn half-checked parent IDs into sibling permissions on edit', () => {
    expect(getRoleMenuCheckedKeys([1, 2, 3], tree)).toEqual([3])
    expect(collectRoleMenuIds([1, 2, 3], tree)).toEqual([3, 2, 1])
  })
  it('includes the parent and all descendants when the whole branch is checked', () => {
    expect(collectRoleMenuIds([2], tree)).toEqual([3, 4, 2, 1])
  })
  it('deduplicates IDs and removes ancestors after clearing selection', () => {
    expect(collectRoleMenuIds([3, 3, 4], tree)).toEqual([3, 4, 2, 1])
    expect(collectRoleMenuIds([], tree)).toEqual([])
  })
  it('preserves long string IDs', () => {
    const longTree = [{ id: '9007199254740993', children: [{ id: '9007199254740995' }] }]
    expect(collectRoleMenuIds(['9007199254740995'], longTree)).toEqual(['9007199254740995', '9007199254740993'])
  })
})
