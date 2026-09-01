import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest, getUserId, localStorageGet } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  getUserId: vi.fn(),
  localStorageGet: vi.fn(),
}))

vi.mock('@/utils/storage', () => ({ localStg: { get: localStorageGet } }))
vi.mock('../request', () => ({ apiRequest }))
vi.mock('../request/shared', () => ({ getUserId }))

import { fetchAssistantConfigList } from './assistant-manage'
import { fetchDataCollectionList } from './data-preparation'

describe('ontology response adapters', () => {
  beforeEach(() => {
    apiRequest.mockReset()
    getUserId.mockReset()
    localStorageGet.mockReset()
  })

  describe('fetchAssistantConfigList', () => {
    it('maps rows only after an explicit successful response', async () => {
      const rows = [{ agentId: 1, bizName: '分析助手' }]
      apiRequest.mockResolvedValue({
        data: null,
        error: null,
        response: { data: { rows, total: 1 } },
      })

      const result = await fetchAssistantConfigList()

      expect(result.error).toBeNull()
      expect(result.data).toEqual({ data: rows, rows, total: 1 })
    })

    it('preserves a fulfilled failure without mapping it into success data', async () => {
      const failure = {
        data: null,
        error: new Error('business failed'),
        response: { data: { rows: [{ agentId: 1 }] } },
      }
      apiRequest.mockResolvedValue(failure)

      const result = await fetchAssistantConfigList()

      expect(result).toBe(failure)
      expect(result.data).toBeNull()
    })
  })

  describe('fetchDataCollectionList', () => {
    it('maps list data only after an explicit successful response', async () => {
      const rows = [{ viewId: 1, viewName: '订单数据集' }]
      apiRequest.mockResolvedValue({ data: { list: rows }, error: null, response: {} })

      const result = await fetchDataCollectionList()

      expect(result.error).toBeNull()
      expect(result.data).toEqual({ data: rows, list: rows })
    })

    it('preserves a fulfilled failure without consuming its list', async () => {
      const failure = {
        data: { list: [{ viewId: 1 }] },
        error: new Error('network failed'),
        response: {},
      }
      apiRequest.mockResolvedValue(failure)

      const result = await fetchDataCollectionList()

      expect(result).toBe(failure)
      expect(result.data).toEqual({ list: [{ viewId: 1 }] })
    })
  })
})
