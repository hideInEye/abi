import { describe, expect, it } from 'vitest'

import { mergeHomeSpaceData, readRequiredFlatData, readSpaceRows } from './homeRequests'

describe('home request state gates', () => {
  it('rejects a failed required home request', () => {
    expect(() => readRequiredFlatData({ data: null, error: new Error('failed') }, 'failed')).toThrow('failed')
  })

  it('keeps home data when the optional space request fails', () => {
    const rows = readSpaceRows({ data: null, error: new Error('failed') })
    expect(mergeHomeSpaceData({ total: 1, spaceList: [{ spaceId: 1 }] }, rows)).toEqual({
      total: 1,
      spaceList: [{ spaceId: 1 }],
    })
  })

  it('uses successful space rows without making another home request', () => {
    const rows = readSpaceRows({ data: [{ spaceId: 2 }], error: null })
    expect(mergeHomeSpaceData({ spaceList: [] }, rows).spaceList).toEqual([{ spaceId: 2, type: 'space' }])
  })
})
