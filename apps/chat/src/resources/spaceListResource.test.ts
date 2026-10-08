import { describe, expect, it } from 'vitest'

import { mergeChatSpacePages } from './spaceListMerge'

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
