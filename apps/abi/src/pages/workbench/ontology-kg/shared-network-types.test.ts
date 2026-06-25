import { describe, expect, it } from 'vitest'

import { getOntologyNetworkRecords } from './shared-network-types'
import type { OntologyEntity, OntologyNetworkPageResult } from './shared-network-types'

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

describe('getOntologyNetworkRecords', () => {
  it('uses the api data.records array without transforming its records', () => {
    const records = [entity]
    const data: OntologyNetworkPageResult<OntologyEntity> = { current: 1, pages: 1, records, size: 10, total: 1 }

    expect(getOntologyNetworkRecords(data)).toBe(records)
  })

  it('returns an empty array when api data or records is absent', () => {
    expect(getOntologyNetworkRecords<OntologyEntity>({})).toEqual([])
    expect(getOntologyNetworkRecords<OntologyEntity>(undefined)).toEqual([])
  })
})
