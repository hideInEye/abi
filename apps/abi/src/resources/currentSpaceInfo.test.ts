import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../service/api/data-space', () => ({ getSpaceInfo: vi.fn() }))
import { getSpaceInfo } from '../service/api/data-space'
import { loadCurrentSpaceInfo } from './currentSpaceInfo'

beforeEach(() => vi.clearAllMocks())

describe('current space details (getSpaceInfo)', () => {
  it('waits for a successful response and resolves the matching ID/name pair', async () => {
    vi.mocked(getSpaceInfo).mockResolvedValueOnce({ error: null, data: { spaceId: '160', spaceName: ' 目标空间 ' } } as never)
    await expect(loadCurrentSpaceInfo(160)).resolves.toEqual({ spaceId: 160, spaceName: '目标空间' })
    expect(getSpaceInfo).toHaveBeenCalledWith(160)
  })

  it.each([
    { error: new Error('失败'), data: { spaceId: 160, spaceName: '空间' } },
    { error: null, data: null },
    { error: null, data: { spaceId: 200, spaceName: '其他空间' } },
    { error: null, data: { spaceId: 160, spaceName: '' } },
  ])('rejects unsuccessful or mismatched details: %j', async (result) => {
    vi.mocked(getSpaceInfo).mockResolvedValueOnce(result as never)
    await expect(loadCurrentSpaceInfo(160)).rejects.toThrow()
  })
})
