import { describe, expect, it } from 'vitest'

import { mergeSpacePages } from './spaceListMerge'

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
