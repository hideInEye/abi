import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAssistantDebugChat } from '../../../pages/chat/workshop/-useAssistantDebugChat'
import { streamExplorePlan } from '../../../service/api/conv'
import { useExploreStore } from '@/store/exploration-mode/exploreStore'

import type { ExploreStreamEvent } from './types'
import { useExploreConversation } from './useExploreConversation'

// 记录 hook 状态槽，只测试流回调与请求边界；真实 React 生命周期由浏览器回放覆盖。
const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }))
vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = state.cursor++
    if (!(index in state.slots)) state.slots[index] = initial
    return [state.slots[index], (value: unknown) => {
      state.slots[index] = typeof value === 'function' ? value(state.slots[index]) : value
    }]
  },
  useRef: (initial: unknown) => {
    const index = state.cursor++
    if (!(index in state.slots)) state.slots[index] = { current: initial }
    return state.slots[index]
  },
  useCallback: (callback: unknown) => callback,
  // useEffect 只在首次 render 时执行（模拟 React 的依赖稳定语义），
  // 后续 render 不重跑，避免 debug hook 的 resetSession 清空已建立的状态。
  useEffect: (cb: Function) => {
    const index = state.cursor++
    if (!(index in state.slots)) {
      state.slots[index] = cb()
    }
  },
}))
vi.mock('antd', () => ({ message: { error: vi.fn() } }))
vi.mock('../../../service/api/conv', () => ({ streamExplorePlan: vi.fn(), fetchConvMaxRound: vi.fn(async () => ({ code: 200, data: 9 })) }))
vi.mock('../../../service/api/app', () => ({ createApp: vi.fn(async () => ({ data: { conv_uid: 'debug-conv', chat_id: 'debug-session' } })) }))

const factories = {
  chat: function useChat() { return useExploreConversation({ conv: { conv_uid: 'conv', chat_id: 'session' }, spaceId: 1, currentModelId: 2 }) },
  debug: function useDebug() { return useAssistantDebugChat({ appId: 1, spaceId: 1, schemaId: 3, chatModelId: 2 }) },
}

beforeEach(() => {
  state.slots = []
  state.cursor = 0
  vi.clearAllMocks()
  // 清除 Zustand store 的全局状态，避免跨测试污染
  useExploreStore.getState().reset()
  vi.mocked(streamExplorePlan).mockImplementation(() => new Promise(() => undefined))
})

for (const kind of ['chat', 'debug'] as const) describe(`${kind} 探索流消费`, () => {
  const render = () => { state.cursor = 0; return factories[kind]() }
  async function start() {
    const previousCalls = vi.mocked(streamExplorePlan).mock.calls.length
    const hook = render()
    if (kind === 'chat') void (hook as ReturnType<typeof useExploreConversation>).handleSend('测试', 3)
    else void (hook as ReturnType<typeof useAssistantDebugChat>).handleSend('测试')
    await vi.waitFor(() => expect(vi.mocked(streamExplorePlan).mock.calls.length).toBe(previousCalls + 1))
    return vi.mocked(streamExplorePlan).mock.calls[previousCalls][0]
  }
  const send = (options: Awaited<ReturnType<typeof start>>, event: ExploreStreamEvent) => options.onmessage?.({ data: JSON.stringify(event), id: '', event: '' })

  it('请求参数保留，final 不结束，done 收尾并中止连接', async () => {
    const options = await start()
    expect(options.data).toMatchObject({ messages: '测试', schema_id: 3, chat_model_id: 2 })
    send(options, { type: 'final', content: '回答' })
    expect(render().loading).toBe(true)
    send(options, { type: 'summary', content: '完整摘要' })
    send(options, { type: 'done', finish_reason: 'completed' })
    options.onclose?.()
    const hook = render()
    expect(hook.loading).toBe(false)
    expect(hook.items[0]).toMatchObject({ status: 'completed', finalContent: '回答', summary: '完整摘要' })
    expect(options.signal?.aborted).toBe(true)
  })

  it('提前关闭结束运行并保留输出', async () => {
    const options = await start()
    send(options, { type: 'step.chunk', id: 's', content: '部分输出' })
    options.onclose?.()
    expect(render().items[0]).toMatchObject({ status: 'failed', finishReason: 'stream_interrupted', steps: [{ status: 'failed', outputs: [{ content: '部分输出' }] }] })
    expect(render().loading).toBe(false)
  })

  it('停止后迟到回调不能修改已取消内容', async () => {
    const options = await start()
    send(options, { type: 'plan.thought.chunk', round: 1, thinking_delta: '已收到的思考' })
    render().stopGenerating()
    send(options, { type: 'done' })
    send(options, { type: 'summary', content: '迟到内容' })
    options.onclose?.()
    expect(render().items[0]).toMatchObject({ status: 'cancelled', processTimeline: [{ reasoning: '已收到的思考', status: 'done' }] })
    expect(render().items[0].summary).toBeUndefined()
    expect(options.signal?.aborted).toBe(true)
  })

  it('旧连接的关闭与消息不会结束新连接', async () => {
    const old = await start()
    render().stopGenerating()
    await new Promise((resolve) => setTimeout(resolve, 2))
    const current = await start()
    old.onclose?.()
    send(old, { type: 'failed', message: '迟到失败' })
    expect(render().loading).toBe(true)
    send(current, { type: 'done' })
    expect(render().items.map((item) => item.status)).toEqual(['cancelled', 'completed'])
  })

  it('failed 后的 done 不改成成功', async () => {
    const options = await start()
    send(options, { type: 'failed', message: '执行失败' })
    send(options, { type: 'done' })
    expect(render().items[0]).toMatchObject({ status: 'failed', error: { message: '执行失败' } })
  })

  it('网络异常结束运行并禁止自动重试', async () => {
    const options = await start()
    expect(() => options.onerror?.(new Error('网络错误'))).toThrow('网络错误')
    expect(render().items[0]).toMatchObject({ status: 'failed', error: { message: '网络错误' } })
    expect(render().loading).toBe(false)
    expect(() => options.onerror?.(new Error('迟到异常'))).toThrow('迟到异常')
    expect(render().items[0].error?.message).toBe('网络错误')
  })
})
