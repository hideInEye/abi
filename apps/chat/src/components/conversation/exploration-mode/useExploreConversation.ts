import { message } from 'antd'
import { useCallback, useEffect, useRef } from 'react'

import { useExploreStore, selectExploreItems, selectExploreQueue, selectExploreLoading } from '@/store/exploration-mode/exploreStore'
import type { PendingExploreRequest, StartContext } from '@/store/exploration-mode/types'
import type { ExploreSendOptions } from './types'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

interface UseExploreConversationOptions {
  conv: any
  spaceId?: number
  currentModelId?: string | number
  embedModelId?: string | number
  /** 免登录分享场景注入的 Authorization 头；缺省时 streamExplorePlan 读取登录态，主对话行为不变。 */
  authorization?: string | null
}

// 内存清理间隔：每 5 分钟检查一次
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
// 不活跃会话保留时间：30 分钟
const MAX_INACTIVE_MS = 30 * 60 * 1000

// ─── Hook 实现 ────────────────────────────────────────────────────────────────

/**
 * 探索模式对话控制器（Zustand 版本）
 * 
 * 设计特点：
 * 1. 使用细粒度 selector 订阅，避免不必要的重渲染
 * 2. actions 通过 getState 获取，避免订阅整个 store
 * 3. 会话切换时 SSE 保持连接，切回时同步最新状态
 * 4. 支持同会话内排队执行，自动出队
 * 5. 定期清理不活跃会话，防止内存泄漏
 */
export function useExploreConversation({
  conv,
  spaceId,
  currentModelId,
  embedModelId,
  authorization,
}: UseExploreConversationOptions) {
  const convUid = conv?.conv_uid || ''

  // 细粒度订阅：只在关心的字段变化时重渲染
  const items = useExploreStore(selectExploreItems(convUid))
  const queue = useExploreStore(selectExploreQueue(convUid))
  const loading = useExploreStore(selectExploreLoading(convUid))

  // actions 通过 getState 获取，避免订阅整个 store
  const enqueue = useExploreStore.getState().enqueue
  const stopActive = useExploreStore.getState().stopActive
  const cancelQueued = useExploreStore.getState().cancelQueued
  const removeItemsByRounds = useExploreStore.getState().removeItemsByRounds
  const cleanupInactiveSessions = useExploreStore.getState().cleanupInactiveSessions

  // 保持最新 ctx 引用
  const ctxRef = useRef<StartContext>({
    conv,
    spaceId,
    currentModelId,
    embedModelId,
    authorization,
  })
  ctxRef.current = { conv, spaceId, currentModelId, embedModelId, authorization }

  // 定期清理不活跃会话，防止内存泄漏
  useEffect(() => {
    const timer = setInterval(() => {
      cleanupInactiveSessions(MAX_INACTIVE_MS)
    }, CLEANUP_INTERVAL_MS)
    
    return () => clearInterval(timer)
  }, [cleanupInactiveSessions])

  const handleSend = useCallback(
    (question: string, schemaId: string | number, options?: ExploreSendOptions) => {
      if (!conv?.conv_uid || !conv?.chat_id) {
        message.error('会话未就绪')
        return
      }

      // 队列长度限制：最多 5 个排队请求，超出静默忽略
      const currentSlot = useExploreStore.getState().sessions[conv.conv_uid]
      if (currentSlot && currentSlot.queue.length >= 5) {
        return
      }

      const request: PendingExploreRequest = {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        question,
        schemaId,
        options,
        enqueuedAt: Date.now(),
        context: ctxRef.current,
      }

      enqueue(conv.conv_uid, request, ctxRef.current)
    },
    [conv?.conv_uid, conv?.chat_id, enqueue],
  )

  const stopGenerating = useCallback(() => {
    if (convUid) {
      stopActive(convUid)
    }
  }, [convUid, stopActive])

  const handleCancelQueued = useCallback(
    (queueId: string) => {
      if (convUid) {
        cancelQueued(convUid, queueId)
      }
    },
    [convUid, cancelQueued],
  )

  const handleRemoveItemsByRounds = useCallback(
    (rounds: number[]) => {
      if (convUid) {
        removeItemsByRounds(convUid, rounds)
      }
    },
    [convUid, removeItemsByRounds],
  )

  return {
    items,
    loading,
    queue,
    handleSend,
    stopGenerating,
    cancelQueued: handleCancelQueued,
    removeItemsByRounds: handleRemoveItemsByRounds,
  }
}
