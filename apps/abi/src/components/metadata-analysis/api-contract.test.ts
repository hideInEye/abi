import { expect, it, vi } from 'vitest'

import { queryLineageRelationList } from '@/service/api/data-preparation'
import { apiRequest } from '@/service/request'

vi.mock('@/service/request', () => ({ apiRequest: vi.fn() }))
vi.mock('@/utils/storage', () => ({ localStg: { get: vi.fn() } }))
vi.mock('@/service/request/shared', () => ({ getUserId: vi.fn() }))

it('所有分析入口复用原血缘接口的 POST body，不修改 ID 字段与路由', async () => {
  const data = { spaceId: 164, targetNodeType: 'COPILOT', targetNodeId: '90071992547409931' }
  const result = { data: [], error: null }
  vi.mocked(apiRequest).mockResolvedValue(result as never)
  await expect(queryLineageRelationList(data)).resolves.toBe(result)
  expect(apiRequest).toHaveBeenCalledWith({ url: '/api/abi-data/api/v1/lineage/getRelation', method: 'post', data })
})
