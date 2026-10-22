/**
 * Zustand Store 类型定义
 * 探索模式的状态管理架构
 */

import type { ExploreItem, ExploreSendOptions } from '../../components/conversation/exploration-mode/types'

// ─── 公共类型 ─────────────────────────────────────────────────────────────────

/** 待处理的探索请求 */
export interface PendingExploreRequest {
  id: string
  question: string
  schemaId: string | number
  options?: ExploreSendOptions
  enqueuedAt: number
  /** 请求级上下文：确保每个请求使用自己的上下文（模型、空间等） */
  context: StartContext
}

/** 会话槽位：每个会话的探索状态 */
export interface ExploreSessionSlot {
  items: ExploreItem[]
  queue: PendingExploreRequest[]
  loading: boolean
  /** 最近一次活跃时间，用于内存清理 */
  lastActivityAt: number
}

/** 请求构造参数（从 Hook 层透传） */
export interface StartContext {
  conv: any
  spaceId?: number
  currentModelId?: string | number
  embedModelId?: string | number
  authorization?: string | null
}

// ─── Store State ──────────────────────────────────────────────────────────────

/** Zustand Store 的状态部分 */
export interface ExploreState {
  /** 所有会话的探索状态，key 为 convUid */
  sessions: Record<string, ExploreSessionSlot>
}

// ─── Store Actions ────────────────────────────────────────────────────────────

/** Zustand Store 的公开操作（Hook 层调用） */
export interface ExplorePublicActions {
  /** 入队一个探索请求 */
  enqueue: (convUid: string, request: PendingExploreRequest, ctx: StartContext) => void
  
  /** 取消单个排队项 */
  cancelQueued: (convUid: string, queueId: string) => void
  
  /** 停止当前执行 + 清空队列 */
  stopActive: (convUid: string) => void
  
  /** 按轮次号移除已完成项（批量删除联动） */
  removeItemsByRounds: (convUid: string, rounds: number[]) => void
  
  /** 停止所有会话的 SSE（页面级清理） */
  stopAll: () => void
  
  /** 重置所有会话（测试/登出场景） */
  reset: () => void
  
  /** 清理长时间不活跃的会话（内存管理） */
  cleanupInactiveSessions: (maxInactiveMs?: number) => void
}

/** Zustand Store 的内部操作（Service 层调用） */
export interface ExploreInternalActions {
  /** 更新指定 ExploreItem */
  _updateItem: (convUid: string, itemId: string, updater: (item: ExploreItem) => ExploreItem) => void
  
  /** 设置 loading 状态 */
  _setLoading: (convUid: string, loading: boolean) => void
  
  /** 从队列中取出第一个请求，同时返回对应的 ExploreItem ID，避免竞态丢失 */
  _shiftQueue: (convUid: string) => { request: PendingExploreRequest; itemId: string } | undefined
}

/** 完整的 Store Actions */
export type ExploreActions = ExplorePublicActions & ExploreInternalActions

/** 完整的 Store 类型 */
export type ExploreStore = ExploreState & ExploreActions
