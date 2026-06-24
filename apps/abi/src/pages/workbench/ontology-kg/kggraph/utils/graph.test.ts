import { describe, expect, it, vi } from 'vitest'

import type { OntologyEntity, OntologyRelation } from '@/pages/workbench/ontology-kg/shared-network-types'

import { deduplicateEdges, requestGraphWhenAllowed, shouldRequestGraph } from './graph'

const entity: OntologyEntity = {
  attributeCount: 0,
  color: '#5B7CF7',
  createBy: null,
  createTime: '2026-06-23 10:00:00',
  entityCode: 'customer',
  entityName: 'Customer',
  id: 'entity-1',
  labelId: null,
  remark: null,
  spaceId: 'space-1',
  updateTime: '2026-06-23 10:00:00',
  validFlag: '1',
}

const relation: OntologyRelation = {
  createBy: null,
  createTime: '2026-06-23 10:00:00',
  endEntityId: 'entity-2',
  id: 'relation-1',
  inverseFlag: '0',
  labelId: null,
  relation: 'purchases',
  remark: null,
  spaceId: 'space-1',
  startEntityId: 'entity-1',
  updateTime: '2026-06-23 10:00:00',
}

describe('shouldRequestGraph', () => {
  it('waits for both filter requests to finish', () => {
    expect(shouldRequestGraph(false, [entity], [relation])).toBe(false)
  })

  it('skips the graph request and clears to an empty state when both filters are empty', () => {
    expect(shouldRequestGraph(true, [], [])).toBe(false)
  })

  it('allows a graph request when either loaded filter has options', () => {
    expect(shouldRequestGraph(true, [entity], [])).toBe(true)
    expect(shouldRequestGraph(true, [], [relation])).toBe(true)
  })
})

describe('requestGraphWhenAllowed', () => {
  it('does not enter the graph request path before filters finish loading', async () => {
    const request = vi.fn(async (): Promise<void> => undefined)

    await expect(requestGraphWhenAllowed(false, [entity], [relation], request)).resolves.toBe(false)
    expect(request).not.toHaveBeenCalled()
  })

  it('does not enter the graph request path when both loaded filters are empty', async () => {
    const request = vi.fn(async (): Promise<void> => undefined)

    await expect(requestGraphWhenAllowed(true, [], [], request)).resolves.toBe(false)
    expect(request).not.toHaveBeenCalled()
  })

  it('enters the graph request path when either loaded filter has options', async () => {
    const request = vi.fn(async (): Promise<void> => undefined)

    await expect(requestGraphWhenAllowed(true, [entity], [], request)).resolves.toBe(true)
    await expect(requestGraphWhenAllowed(true, [], [relation], request)).resolves.toBe(true)
    expect(request).toHaveBeenCalledTimes(2)
  })
})

describe('deduplicateEdges', () => {
  it('keeps graph edges from the api data and only removes duplicate ids', () => {
    const duplicateRelation: OntologyRelation = { ...relation }

    expect(deduplicateEdges([relation, duplicateRelation])).toEqual([relation])
  })
})
