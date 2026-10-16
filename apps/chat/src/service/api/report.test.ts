import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { handleLoginExpired } from '../../utils/auth'
import { buildReportEventsUrl, fetchReportTaskStatus, submitReportTask } from './report'

vi.mock('../../utils/auth', () => ({
  getAuthorization: () => 'Bearer test-token',
  handleLoginExpired: vi.fn(async () => undefined),
}))

const request = {
  messages: '生成销售分析报告',
  app_id: 1,
  space_id: 52,
  schema_id: 3003,
  conv_id: 'conversation-1',
  session_id: 'session-1',
  user_id: 9,
  user_name: 'account_a',
  chat_model_id: 18,
  sse_mcp_source_version_ids: [{ 'mcp-sse-version': 'mcp-sse-group' }],
  mcp_streamable_source_version_ids: ['mcp-streamable-version'],
  skills_source_version_ids: ['external-skill-version'],
  builtin_tools_source_version_ids: ['builtin-skill-version'],
}

describe('report task submit api', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      APP_CONFIG: {
        VITE_BASE_API: '/api',
        VITE_REPORT_SUBMIT_API: 'https://report.example.test/chat-proxy/api/v1/chat/report',
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('使用普通 POST 提交并标准化 202 响应字段', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      message: '报告生成任务已提交',
      data: {
        conv_id: 'conversation-1',
        task_id: 'task-1',
        status: 'queued',
        stream_key: 'report:conversation-1:1',
      },
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitReportTask(request)).resolves.toEqual({
      conversationId: 'conversation-1',
      taskId: 'task-1',
      streamKey: 'report:conversation-1:1',
      status: 'queued',
    })

    expect(fetchMock).toHaveBeenCalledWith('https://report.example.test/chat-proxy/api/v1/chat/report', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    }))
  })

  it('未配置完整地址时使用 baseApi 加 chat-proxy 路径', async () => {
    vi.stubGlobal('window', {
      APP_CONFIG: {
        VITE_BASE_API: '/api',
        VITE_REPORT_SUBMIT_API: '',
      },
    })
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        conv_id: 'conversation-1',
        task_id: 'task-1',
        status: 'queued',
        stream_key: 'report:conversation-1:1',
      },
    }), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await submitReportTask(request)

    expect(fetchMock).toHaveBeenCalledWith('/api/chat-proxy/api/v1/chat/report', expect.any(Object))
  })

  it('拒绝缺失 stream_key 的成功响应', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        conv_id: 'conversation-1',
        task_id: 'task-1',
        status: 'queued',
        stream_key: null,
      },
    }), { status: 202 })))

    await expect(submitReportTask(request)).rejects.toThrow('conv_id、task_id 或 stream_key 不完整')
  })

  it('收到 401 时触发统一登录过期处理', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })))

    await expect(submitReportTask(request)).rejects.toThrow('登录已过期')
    expect(handleLoginExpired).toHaveBeenCalledOnce()
  })

  it('使用 chat-proxy task 接口查询并标准化任务状态', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      message: '任务状态查询成功',
      data: {
        task_id: 'task-1',
        status: 'started',
        completed: false,
        successful: false,
        message: '报告正在生成',
      },
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchReportTaskStatus('task-1')).resolves.toEqual({
      taskId: 'task-1',
      status: 'started',
      completed: false,
      successful: false,
      message: '报告正在生成',
      result: undefined,
      error: undefined,
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/chat-proxy/api/v1/chat/report/task?task_id=task-1', {
      method: 'GET',
      headers: { Authorization: 'Bearer test-token' },
      signal: undefined,
    })
  })

  it('Java SSE 地址固定使用 abi-debug，并显式从 0-0 回放或按 last_id 续读', () => {
    expect(buildReportEventsUrl({ stream_key: 'report:conversation-1:1' }))
      .toBe('/api/abi-debug/v1/report-stream/events?stream_key=report%3Aconversation-1%3A1&last_id=0-0')
    expect(buildReportEventsUrl({ stream_key: 'report:conversation-1:1', last_id: '1784873130441-2' }))
      .toBe('/api/abi-debug/v1/report-stream/events?stream_key=report%3Aconversation-1%3A1&last_id=1784873130441-2')
  })
})
