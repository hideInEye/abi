import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ spaceList: vi.fn() }))
vi.mock('../service/api/data-space', () => api)
import { invalidateSpaceListPages, loadSpaceListPage } from './spaceListResource'

import { mergeSpacePages } from './spaceListMerge'

beforeEach(() => vi.stubGlobal('localStorage', { getItem: () => null }))
afterEach(() => { invalidateSpaceListPages(); vi.unstubAllGlobals() })

describe('space list request outcomes', () => {
  it('preserves the server ordering on success', async () => {
    api.spaceList.mockResolvedValue({ error: null, response: { data: { rows: [{ spaceId: 8, spaceName: '第一' }, { spaceId: 7, spaceName: '第二' }] } } })
    expect((await loadSpaceListPage(1, '')).rows.map(row => row.spaceId)).toEqual([8, 7])
  })
  it.each([{ error: new Error('failed') }, {}, { data: [] }])('rejects an unsuccessful response instead of applying empty spaces', async result => {
    api.spaceList.mockResolvedValue(result)
    await expect(loadSpaceListPage(1, '')).rejects.toThrow()
  })
})

describe('mergeSpacePages', () => {
  it('appends new pages and replaces duplicate space rows', () => {
    expect(mergeSpacePages(
      [{ spaceId: 1, spaceName: '旧名称' }],
      [{ spaceId: 1, spaceName: '新名称' }, { spaceId: 2, spaceName: '空间二' }],
      false,
    )).toEqual([
      { spaceId: 1, spaceName: '新名称' },
      { spaceId: 2, spaceName: '空间二' },
    ])
  })

  it('drops old rows when a search starts from page one', () => {
    expect(mergeSpacePages(
      [{ spaceId: 1, spaceName: '旧空间' }],
      [{ spaceId: 2, spaceName: '搜索结果' }],
      true,
    )).toEqual([{ spaceId: 2, spaceName: '搜索结果' }])
  })
})
