import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import request from '../request/index'
import { deleteMessageByRound, fetchSessionDetail, fetchSessionMessages } from './app'

vi.mock('../request/index', () => ({
  default: vi.fn(),
}))

describe('fetchSessionMessages', () => {
  const requestMock = vi.mocked(request)

  beforeEach(() => {
    vi.stubGlobal('window', {
      APP_CONFIG: {
        VITE_BASE_API: '/api',
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('复用同参数的并发 query，请求结束后允许下一次业务刷新', async () => {
    let resolveFirstRequest: (value: unknown) => void = () => undefined
    const firstResponse = { code: 200, data: { data: [] } }
    const pendingRequest = new Promise((resolve) => {
      resolveFirstRequest = resolve
    })
    requestMock.mockReturnValueOnce(pendingRequest as ReturnType<typeof request>)

    const params = { convUid: 'conversation-1', pageNum: 1, pageSize: 20 }
    const first = fetchSessionMessages(params)
    const strictModeDuplicate = fetchSessionMessages({ ...params })

    expect(strictModeDuplicate).toBe(first)
    expect(requestMock).toHaveBeenCalledOnce()

    resolveFirstRequest(firstResponse)
    await expect(first).resolves.toEqual(firstResponse)

    const refreshedResponse = { code: 200, data: { data: [{ roundIndex: 1, messages: [] }] } }
    requestMock.mockResolvedValueOnce(refreshedResponse)
    await expect(fetchSessionMessages(params)).resolves.toEqual(refreshedResponse)
    expect(requestMock).toHaveBeenCalledTimes(2)
  })

  it('按轮次删除时使用单请求 items 透传两类来源', async () => {
    requestMock.mockResolvedValue({ code: 200 })

    await deleteMessageByRound({
      convUid: 'conversation-1',
      items: [
        { roundIndex: [1, 3], source: 'message' },
        { roundIndex: [7], source: 'report' },
      ],
    })

    expect(requestMock).toHaveBeenCalledOnce()
    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        convUid: 'conversation-1',
        items: [
          { roundIndex: [1, 3], source: 'message' },
          { roundIndex: [7], source: 'report' },
        ],
      },
      url: '/abi-chat/v1/app/message/deleteByRound',
    }))
  })
})

describe('fetchSessionDetail', () => {
  const requestMock = vi.mocked(request)

  beforeEach(() => {
    vi.stubGlobal('window', {
      APP_CONFIG: {
        VITE_BASE_API: '/api',
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('复用同一会话的并发详情请求，请求结束后允许重新加载', async () => {
    let resolveFirstRequest: (value: unknown) => void = () => undefined
    const firstResponse = { code: 200, data: { sessionId: 'conversation-1' } }
    const pendingRequest = new Promise(resolve => {
      resolveFirstRequest = resolve
    })
    requestMock.mockReturnValueOnce(pendingRequest as ReturnType<typeof request>)

    const first = fetchSessionDetail({ sessionId: 'conversation-1' })
    const duplicate = fetchSessionDetail({ sessionId: 'conversation-1' })

    expect(duplicate).toBe(first)
    expect(requestMock).toHaveBeenCalledOnce()

    resolveFirstRequest(firstResponse)
    await expect(first).resolves.toEqual(firstResponse)

    const refreshedResponse = { code: 200, data: { sessionId: 'conversation-1', title: 'refreshed' } }
    requestMock.mockResolvedValueOnce(refreshedResponse)
    await expect(fetchSessionDetail({ sessionId: 'conversation-1' })).resolves.toEqual(refreshedResponse)
    expect(requestMock).toHaveBeenCalledTimes(2)
  })
})
