import { fetchConvMaxRound, streamExplorePlan } from '../../service/api/conv'
import { getConversationUserName, isApiSuccess } from '../../components/conversation/hooks/conversationRequests'

import { interruptExploreItem, settleExploreItem } from '../../components/conversation/exploration-mode/exploreProcessTimeline'
import { parseExploreStreamEvent, reduceExploreEvent } from '../../components/conversation/exploration-mode/exploreStreamReducer'
import { toImageListPayload } from '../../components/conversation/components/chat-input/imageAttachment'
import { buildMcpSourceVersionFields } from '../../utils/exploration-mode/buildMcpSourceVersionFields'
import { useExploreStore } from './exploreStore'
import type { PendingExploreRequest, StartContext } from './types'
import type { ExploreItem } from '../../components/conversation/exploration-mode/types'

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function getCurrentUserId(): number {
  try {
    const userInfo = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
    return userInfo.userId != null ? Number(userInfo.userId) : 0
  } catch {
    return 0
  }
}

function normalizeIdList(ids?: Array<string | number>): Array<string | number> {
  return Array.from(new Set((ids || []).filter((id) => id !== '' && id !== null && id !== undefined)))
}

// ─── SSE 生命周期管理服务 ─────────────────────────────────────────────────────

/**
 * 探索模式 SSE 生命周期管理
 * 
 * 设计原则：
 * 1. 独立于 Store，专注管理 AbortController 和 SSE 连接
 * 2. 通过 useExploreStore.getState() 访问和更新状态
 * 3. 不存储状态，只管理副作用
 */
class ExploreStreamService {
  private activeControllers = new Map<string, AbortController>()

  /** 出队并启动下一个 SSE */
  async dequeueAndStart(convUid: string) {
    const state = useExploreStore.getState()
    const slot = state.sessions[convUid]
    
    if (!slot || slot.queue.length === 0) {
      useExploreStore.getState()._setLoading(convUid, false)
      return
    }

    // 取出队首（通过 store action，保持单一数据源）
    // _shiftQueue 同时返回 request 和 itemId，避免竞态丢失
    const shifted = useExploreStore.getState()._shiftQueue(convUid)
    if (!shifted) return

    const { request, itemId } = shifted

    // 从请求本身获取上下文，而非会话级别的 lastContext
    const ctx = request.context
    if (!ctx) {
      useExploreStore.getState()._setLoading(convUid, false)
      return
    }

    // 设置 loading 状态
    useExploreStore.getState()._setLoading(convUid, true)

    const controller = new AbortController()
    this.activeControllers.set(convUid, controller)

    try {
      await this.startSSE(convUid, request, controller, ctx, itemId)
    } finally {
      this.activeControllers.delete(convUid)
    }
  }

  /** 启动 SSE 流 */
  private async startSSE(
    convUid: string,
    request: PendingExploreRequest,
    controller: AbortController,
    ctx: StartContext,
    itemId: string,
  ) {
    const { conv, spaceId, currentModelId, embedModelId, authorization } = ctx

    const mcpFields = buildMcpSourceVersionFields(request.options?.mcpSourceVersionIds)
    const imageList = toImageListPayload(request.options?.images ?? [])

    const payload = {
      messages: request.question,
      app_id: conv.appId ?? conv.app_id ?? 0,
      space_id: spaceId ?? conv.space_id,
      model_setting: {},
      schema_id: request.schemaId,
      ...(request.options?.groupId != null && request.options.groupId !== '' ? { group_id: request.options.groupId } : {}),
      knowledge_setting: {},
      conv_id: conv.conv_uid,
      session_id: conv.chat_id,
      user_id: getCurrentUserId(),
      user_name: getConversationUserName(),
      embed_model_id: embedModelId || 0,
      chat_model_id: currentModelId || 0,
      sse_mcp_source_version_ids: mcpFields.sse,
      mcp_streamable_source_version_ids: mcpFields.streamable,
      skills_source_version_ids: normalizeIdList(request.options?.skillSourceVersionIds),
      ...(imageList.length ? { image_list: imageList } : {}),
    }

    try {
      await streamExplorePlan({
        data: payload,
        signal: controller.signal,
        authorization,
        async onopen(response) {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: 探索接口请求失败`)
          }
        },
        onmessage: (event) => {
          if (controller.signal.aborted) return
          if (!event.data || event.data.startsWith(':')) return

          const parsed = parseExploreStreamEvent(event.data)
          if (!parsed) return

          // 通过 store action 更新
          useExploreStore.getState()._updateItem(convUid, itemId, (item) =>
            reduceExploreEvent(item, parsed),
          )

          if (parsed.type === 'done' || parsed.type === 'failed') {
            controller.abort()
            // 同步持久化轮次号
            void this.syncPersistedRoundIndex(convUid, itemId, authorization)
            // SSE 结束，检查队列
            this.dequeueAndStart(convUid)
          }
        },
        onclose: () => {
          if (controller.signal.aborted) return
          useExploreStore.getState()._updateItem(convUid, itemId, interruptExploreItem)
          this.dequeueAndStart(convUid)
        },
        onerror: (err) => {
          if (controller.signal.aborted) throw err
          useExploreStore.getState()._updateItem(convUid, itemId, (current) =>
            settleExploreItem(current, 'failed', undefined, {
              message: err?.message || '探索任务执行失败',
            }),
          )
          throw err
        },
      })
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      useExploreStore.getState()._updateItem(convUid, itemId, (current) =>
        settleExploreItem(current, 'failed', undefined, current.error || { message: err?.message || '探索任务执行失败' }),
      )
      this.dequeueAndStart(convUid)
    }
  }

  /** 同步后端持久化的轮次号（仅非分享场景） */
  private async syncPersistedRoundIndex(convUid: string, itemId: string, authorization?: string | null) {
    if (authorization) return
    try {
      const response: unknown = await fetchConvMaxRound({ conv_uid: convUid })
      if (!isApiSuccess(response)) return
      const roundIndex = Number((response as Record<string, unknown>).data)
      if (!Number.isSafeInteger(roundIndex) || roundIndex <= 0) return
      useExploreStore.getState()._updateItem(convUid, itemId, (item) => ({ ...item, roundIndex }))
    } catch {
      // 本次只影响实时卡片的删除资格；重新进入会话后历史 roundIndex 会正常恢复。
    }
  }

  /** 中止指定会话的 SSE */
  abort(convUid: string) {
    this.activeControllers.get(convUid)?.abort()
    this.activeControllers.delete(convUid)
  }

  /** 中止所有会话的 SSE */
  abortAll() {
    this.activeControllers.forEach((controller) => controller.abort())
    this.activeControllers.clear()
  }
}

/** 全局单例 */
export const exploreService = new ExploreStreamService()
