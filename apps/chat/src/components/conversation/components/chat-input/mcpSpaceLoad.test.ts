import { describe, expect, it, vi } from 'vitest'

import { buildMcpGroupQuery, isSuccessfulMcpResponse, loadCurrentMcpItems, shouldReloadMcpOnSpaceChange } from './mcpSpaceLoad'

describe('MCP space loading', () => {
  it('空间切换后使用新 spaceId，仅对已加载的全局 MCP 立即重载', () => {
    expect(buildMcpGroupQuery(202, 101)).toEqual({
      groupType: 'mcp',
      pageNum: 1,
      pageSize: 100,
      spaceId: 202,
    })
    expect(shouldReloadMcpOnSpaceChange(101, 202, true, false)).toBe(true)
    expect(shouldReloadMcpOnSpaceChange(101, 202, false, false)).toBe(false)
    expect(shouldReloadMcpOnSpaceChange(101, 202, true, true)).toBe(false)
    expect(shouldReloadMcpOnSpaceChange(202, 202, true, false)).toBe(false)
  })

  it('等待请求明确成功后才消费 MCP 列表', async () => {
    const order: string[] = []
    const result = await loadCurrentMcpItems({
      request: async () => {
        order.push('request')
        return { code: 200, data: { records: [{ id: 1 }] } }
      },
      isCurrent: () => true,
      isSuccess: isSuccessfulMcpResponse,
      selectItems: (response) => {
        order.push('select')
        return response.data.records
      },
    })

    expect(result).toEqual([{ id: 1 }])
    expect(order).toEqual(['request', 'select'])
  })

  it('业务失败、reject 或旧空间迟到响应均不消费列表', async () => {
    const selectItems = vi.fn(() => [{ id: 1 }])
    const common = {
      isSuccess: isSuccessfulMcpResponse,
      selectItems,
    }

    await expect(
      loadCurrentMcpItems({
        ...common,
        request: async () => ({ code: 500 }),
        isCurrent: () => true,
      }),
    ).resolves.toBeNull()
    await expect(
      loadCurrentMcpItems({
        ...common,
        request: async () => {
          throw new Error('offline')
        },
        isCurrent: () => true,
      }),
    ).resolves.toBeNull()
    await expect(
      loadCurrentMcpItems({
        ...common,
        request: async () => ({ code: 200 }),
        isCurrent: () => false,
      }),
    ).resolves.toBeNull()

    expect(selectItems).not.toHaveBeenCalled()
  })
})
