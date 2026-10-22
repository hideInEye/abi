import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { settleExploreItem } from '../../components/conversation/exploration-mode/exploreProcessTimeline'
import type { ExploreItem } from '../../components/conversation/exploration-mode/types'
import type { ExploreStore, ExploreSessionSlot, PendingExploreRequest, StartContext } from './types'

/**
 * 探索模式 Zustand Store
 * 
 * 设计原则：
 * 1. Store 只负责同步状态，不处理异步操作
 * 2. SSE 生命周期由独立的 exploreService 管理
 * 3. 使用 Record 而非 Map，对 Zustand 更友好
 * 4. 公开 API 供 Hook 层调用，内部 API（下划线开头）供 Service 层调用
 */
export const useExploreStore = create<ExploreStore>()(
  devtools(
    (set, get) => ({
      sessions: {},

      // ─── 公开 API（Hook 层调用）────────────────────────────────────────────

      enqueue: (convUid, request, ctx) => {
        // 将上下文绑定到请求本身，而非会话级别
        const requestWithContext: PendingExploreRequest = { ...request, context: ctx }
        
        set((state) => {
          const slot = state.sessions[convUid] || {
            items: [],
            queue: [],
            loading: false,
            lastActivityAt: Date.now(),
          }

          // 队列长度限制：最多 5 个排队请求
          if (slot.queue.length >= 5) {
            // 静默拒绝，避免重复入队
            return state
          }

          const newItem: ExploreItem = {
            id: `explore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            question: request.question,
            sortOrder: Date.now(),
            status: 'queued',
            queueId: request.id,
            queuePosition: slot.queue.length + 1, // 队列位置显示
            tasks: [],
            steps: [],
            createdAt: Date.now(),
          }

          return {
            sessions: {
              ...state.sessions,
              [convUid]: {
                ...slot,
                lastActivityAt: Date.now(), // 更新活跃时间
                items: [...slot.items, newItem],
                queue: [...slot.queue, requestWithContext],
              },
            },
          }
        })

        // 如果空闲，触发 Service 层启动 SSE
        const slot = get().sessions[convUid]
        if (slot && !slot.loading) {
          // 延迟导入避免循环依赖
          import('./exploreService').then(({ exploreService }) => {
            exploreService.dequeueAndStart(convUid)
          })
        }
      },

      cancelQueued: (convUid, queueId) => {
        set((state) => {
          const slot = state.sessions[convUid]
          if (!slot) return state

          // 找到被取消项的位置，用于更新后续项的位置
          const cancelledItem = slot.items.find((it) => it.queueId === queueId)
          const cancelledPosition = cancelledItem?.queuePosition

          return {
            sessions: {
              ...state.sessions,
              [convUid]: {
                ...slot,
                queue: slot.queue.filter((q) => q.id !== queueId),
                items: slot.items
                  .filter((it) => it.queueId !== queueId)
                  .map((it) => {
                    // 更新被取消项之后的排队项位置
                    if (it.queuePosition && cancelledPosition && it.queuePosition > cancelledPosition) {
                      return { ...it, queuePosition: it.queuePosition - 1 }
                    }
                    return it
                  }),
              },
            },
          }
        })
      },

      stopActive: (convUid) => {
        // 先通过 Service 中止 SSE
        import('./exploreService').then(({ exploreService }) => {
          exploreService.abort(convUid)
        })

        set((state) => {
          const slot = state.sessions[convUid]
          if (!slot) return state

          return {
            sessions: {
              ...state.sessions,
              [convUid]: {
                ...slot,
                loading: false,
                queue: [],
                items: slot.items
                  .map((item) =>
                    item.status === 'running'
                      ? settleExploreItem(item, 'cancelled', 'user_cancelled')
                      : item,
                  )
                  .filter((item) => item.status !== 'queued'),
              },
            },
          }
        })
      },

      removeItemsByRounds: (convUid, rounds) => {
        set((state) => {
          const slot = state.sessions[convUid]
          if (!slot) return state

          const roundSet = new Set(rounds)
          return {
            sessions: {
              ...state.sessions,
              [convUid]: {
                ...slot,
                items: slot.items.filter(
                  (item) => item.roundIndex === undefined || !roundSet.has(item.roundIndex),
                ),
              },
            },
          }
        })
      },

      stopAll: () => {
        // 先通过 Service 中止所有 SSE
        import('./exploreService').then(({ exploreService }) => {
          exploreService.abortAll()
        })

        set((state) => {
          const newSessions: Record<string, ExploreSessionSlot> = {}

          Object.entries(state.sessions).forEach(([convUid, slot]) => {
            newSessions[convUid] = {
              ...slot,
              loading: false,
              queue: [],
              items: slot.items
                .map((item) =>
                  item.status === 'running'
                    ? settleExploreItem(item, 'cancelled', 'user_cancelled')
                    : item,
                )
                .filter((item) => item.status !== 'queued'),
            }
          })

          return { sessions: newSessions }
        })
      },

      reset: () => {
        // 先通过 Service 清理所有 AbortController
        import('./exploreService').then(({ exploreService }) => {
          exploreService.abortAll()
        })

        set({ sessions: {} })
      },

      cleanupInactiveSessions: (maxInactiveMs = 30 * 60 * 1000) => {
        // 默认 30 分钟不活跃的会话将被清理
        const now = Date.now()
        const cutoff = now - maxInactiveMs

        set((state) => {
          const newSessions: Record<string, ExploreSessionSlot> = {}
          let hasChanges = false

          Object.entries(state.sessions).forEach(([convUid, slot]) => {
            const hasActiveItems = slot.items.some(
              (item) => item.status === 'running' || item.status === 'queued',
            )

            // 保留有活跃任务的会话，或者最近活跃的会话
            if (hasActiveItems || slot.lastActivityAt > cutoff) {
              newSessions[convUid] = slot
            } else {
              hasChanges = true
            }
          })

          if (!hasChanges) return state

          return { sessions: newSessions }
        })
      },

      // ─── 内部 API（Service 层调用）──────────────────────────────────────────

      _updateItem: (convUid, itemId, updater) => {
        set((state) => {
          const slot = state.sessions[convUid]
          if (!slot) return state

          return {
            sessions: {
              ...state.sessions,
              [convUid]: {
                ...slot,
                items: slot.items.map((item) => (item.id === itemId ? updater(item) : item)),
              },
            },
          }
        })
      },

      _setLoading: (convUid, loading) => {
        set((state) => {
          const slot = state.sessions[convUid]
          if (!slot) return state

          return {
            sessions: {
              ...state.sessions,
              [convUid]: {
                ...slot,
                loading,
              },
            },
          }
        })
      },

      _shiftQueue: (convUid) => {
        const slot = get().sessions[convUid]
        if (!slot || slot.queue.length === 0) return undefined

        const [first, ...rest] = slot.queue

        // 在 set() 之前查找 itemId（此时 queueId 尚未被清除）
        const itemId = slot.items.find((it) => it.queueId === first.id)?.id

        set((state) => {
          const currentSlot = state.sessions[convUid]
          if (!currentSlot) return state

          return {
            sessions: {
              ...state.sessions,
              [convUid]: {
                ...currentSlot,
                queue: rest,
                items: itemId
                  ? currentSlot.items.map((it) => {
                      if (it.id === itemId) {
                        return { ...it, status: 'running' as const, queueId: undefined, queuePosition: undefined }
                      }
                      // 更新其他排队项的位置
                      if (it.queuePosition && it.queuePosition > 1) {
                        return { ...it, queuePosition: it.queuePosition - 1 }
                      }
                      return it
                    })
                  : currentSlot.items,
              },
            },
          }
        })

        // 返回 request 和 itemId，避免 startSSE 中因 queueId 已清除而找不到 item
        return itemId ? { request: first, itemId } : undefined
      },
    }),
    { name: 'ExploreStore' },
  ),
)

// ─── 细粒度选择器 ─────────────────────────────────────────────────────────────

// 稳定的空值引用，避免每次渲染创建新对象导致无限重渲染
const EMPTY_ITEMS: ExploreItem[] = []
const EMPTY_QUEUE: PendingExploreRequest[] = []

/** 选择指定会话的 items */
export const selectExploreItems = (convUid: string) => (state: ExploreStore) =>
  state.sessions[convUid]?.items ?? EMPTY_ITEMS

/** 选择指定会话的 queue */
export const selectExploreQueue = (convUid: string) => (state: ExploreStore) =>
  state.sessions[convUid]?.queue ?? EMPTY_QUEUE

/** 选择指定会话的 loading 状态 */
export const selectExploreLoading = (convUid: string) => (state: ExploreStore) =>
  state.sessions[convUid]?.loading ?? false

/** 选择指定会话的完整 slot */
export const selectExploreSlot = (convUid: string) => (state: ExploreStore) =>
  state.sessions[convUid]
