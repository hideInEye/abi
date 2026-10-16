import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ fetchSpaceList: vi.fn() }))
vi.mock('../service/api/space', () => api)
import { loadChatSpacePage } from './spaceListResource'

import { mergeChatSpacePages } from './spaceListMerge'

describe('chat space list request outcomes', () => {
  it('preserves server ordering on success', async () => {
    api.fetchSpaceList.mockResolvedValue({ code: 200, rows: [{ spaceId: 8, spaceName: '第一' }, { spaceId: 7, spaceName: '第二' }] })
    expect((await loadChatSpacePage(1, '', true)).rows.map(row => row.spaceId)).toEqual([8, 7])
  })
  it.each([{ code: 500, msg: 'failed' }, {}, { code: 401 }, { code: 500, success: true }])('rejects failed responses instead of selecting a cached space', async result => {
    api.fetchSpaceList.mockResolvedValue(result)
    await expect(loadChatSpacePage(1, '', true)).rejects.toThrow()
  })
})

describe('mergeChatSpacePages', () => {
  it('merges pagination rows by space id', () => {
    expect(mergeChatSpacePages(
      [{ spaceId: 1, spaceName: 'A' }],
      [{ spaceId: 1, spaceName: 'A2' }, { spaceId: 2, spaceName: 'B' }],
      false,
    )).toEqual([
      { spaceId: 1, spaceName: 'A2' },
      { spaceId: 2, spaceName: 'B' },
    ])
  })
})
