import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

import { CHAT_MODE } from '@/constant'
import type { SessionGroup } from '@/service/api/app'
import { getSpaceId } from '@/utils/runtime'
import { getCurrentUser, subscribeCurrentUser } from '@/utils/identity'

import { getChatBootstrapKeys } from './chatBootstrapKeys'
import type { ChatBootstrapIdentity, ChatBootstrapKeys } from './chatBootstrapKeys'
import { RequestResource } from './requestResource'
import type { RequestResourceSnapshot } from './requestResource'

export interface BootstrapModelOption {
  desc: string
  id: string | number
  isDefault?: number | string
  isSupportThinking?: number | string
  key: string
  label: string
}

export interface BootstrapModels {
  currentModel: BootstrapModelOption | null
  embedModelId: string | number
  options: BootstrapModelOption[]
}

interface LoadResourceOptions {
  force?: boolean
}

interface ChatBootstrapValue {
  identity: ChatBootstrapIdentity
  keys: ChatBootstrapKeys
  invalidateConversations: () => void
  invalidateGroups: () => void
  loadConversations: (options?: LoadResourceOptions) => Promise<any[]>
  loadGroups: (options?: LoadResourceOptions) => Promise<SessionGroup[]>
  loadModels: (options?: LoadResourceOptions) => Promise<BootstrapModels>
  loadSemantic: (options?: LoadResourceOptions) => Promise<any[]>
  updateConversations: (updater: (current: any[]) => any[]) => void
  updateGroups: (updater: (current: SessionGroup[]) => SessionGroup[]) => void
}

const conversationsResource = new RequestResource<any[]>()
const groupsResource = new RequestResource<SessionGroup[]>()
const modelsResource = new RequestResource<BootstrapModels>()
const semanticResource = new RequestResource<any[]>()

const ChatBootstrapContext = createContext<ChatBootstrapValue | null>(null)

function readIdentity(spaceId?: number): ChatBootstrapIdentity {
  const user = getCurrentUser()
  return {
    spaceId: Number(spaceId ?? getSpaceId()) || 0,
    userName: user.userName || '',
  }
}

function normalizeGroups(response: any): SessionGroup[] {
  const rows = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : [])
  return rows.filter((item: unknown): item is SessionGroup => Boolean(item && typeof item === 'object'))
}

function normalizeConversations(response: any): any[] {
  const rows = Array.isArray(response?.data) ? response.data : []
  return [...rows].sort((left, right) => {
    return new Date(right?.create_time || 0).getTime() - new Date(left?.create_time || 0).getTime()
  })
}

function normalizeModels(response: any): BootstrapModels {
  const rows = response?.data?.data || response?.data || []
  const list = Array.isArray(rows) ? rows : []
  const embedModel = list.find((item: any) => item.modelKey === 'bge-large')
  const options = list
    .filter((item: any) => String(item.status) === '1' && String(item.modelType) === '1')
    .map((item: any): BootstrapModelOption => ({
      id: item.modelId ?? item.id ?? item.llmId ?? '',
      key: item.modelKey || item.model_name || item.key || '',
      label: item.modelName || item.model_name || item.llmModel || item.label || '',
      desc: item.remark || item.description || item.desc || '',
      isDefault: item.isDefault,
      isSupportThinking: item.isSupportThinking,
    }))
  return {
    options,
    currentModel: options.find(option => option.isDefault === 1) || options[0] || null,
    embedModelId: embedModel?.modelId ?? embedModel?.id ?? embedModel?.llmId ?? '',
  }
}

function normalizeSemantic(response: any): any[] {
  const rows = response?.data || response?.rows || []
  return Array.isArray(rows) ? rows : []
}

function useSnapshot<T>(resource: RequestResource<T>, key: string): RequestResourceSnapshot<T> {
  return useSyncExternalStore(
    resource.subscribe,
    () => resource.getSnapshot(key),
    () => resource.getSnapshot(key),
  )
}

function abortIdentity(identity: ChatBootstrapIdentity): void {
  const keys = getChatBootstrapKeys(identity)
  conversationsResource.abort(keys.conversations)
  groupsResource.abort(keys.groups)
  modelsResource.abort(keys.models)
  semanticResource.abort(keys.semantic)
}

export function ChatBootstrapProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<ChatBootstrapIdentity>(() => readIdentity())
  const keys = useMemo(() => getChatBootstrapKeys(identity), [identity])

  const loadConversations = useCallback((options: LoadResourceOptions = {}) => {
    if (!identity.userName) return Promise.resolve([])
    return conversationsResource.load(
      keys.conversations,
      signal => import('@/service/api/app')
        .then(({ fetchAppList }) => fetchAppList({
          chat_mode: CHAT_MODE,
          space_id: identity.spaceId,
          create_by: identity.userName,
        }, signal))
        .then(normalizeConversations),
      { force: options.force },
    )
  }, [identity, keys.conversations])

  const loadGroups = useCallback((options: LoadResourceOptions = {}) => {
    if (!identity.userName) return Promise.resolve([])
    return groupsResource.load(
      keys.groups,
      signal => import('@/service/api/app')
        .then(({ fetchSessionGroupList }) => fetchSessionGroupList({
          spaceId: identity.spaceId || undefined,
          createBy: identity.userName || undefined,
        }, signal))
        .then(normalizeGroups),
      { force: options.force },
    )
  }, [identity, keys.groups])

  const loadModels = useCallback((options: LoadResourceOptions = {}) => {
    if (!identity.userName) return Promise.resolve({ currentModel: null, embedModelId: '', options: [] })
    return modelsResource.load(
      keys.models,
      signal => import('@/service/api/abi-system')
        .then(({ fetchModelList }) => fetchModelList({ spaceId: identity.spaceId }, signal))
        .then(normalizeModels),
      { force: options.force },
    )
  }, [identity.spaceId, identity.userName, keys.models])

  const loadSemantic = useCallback((options: LoadResourceOptions = {}) => {
    if (!identity.userName) return Promise.resolve([])
    return semanticResource.load(
      keys.semantic,
      signal => import('@/service/api/semantic')
        .then(({ fetchSemanticTree }) => fetchSemanticTree({ spaceId: identity.spaceId }, signal))
        .then(normalizeSemantic),
      { force: options.force },
    )
  }, [identity.spaceId, identity.userName, keys.semantic])

  const invalidateConversations = useCallback(() => {
    conversationsResource.invalidate(keys.conversations)
  }, [keys.conversations])

  const invalidateGroups = useCallback(() => {
    groupsResource.invalidate(keys.groups)
  }, [keys.groups])

  const updateConversations = useCallback((updater: (current: any[]) => any[]) => {
    conversationsResource.update(keys.conversations, updater(conversationsResource.peek(keys.conversations) ?? []))
  }, [keys.conversations])

  const updateGroups = useCallback((updater: (current: SessionGroup[]) => SessionGroup[]) => {
    groupsResource.update(keys.groups, updater(groupsResource.peek(keys.groups) ?? []))
  }, [keys.groups])

  useEffect(() => {
    if (!identity.userName) return
    void loadConversations().catch(() => {})
    void loadGroups().catch(() => {})
    void loadModels().catch(() => {})
    void loadSemantic().catch(() => {})
  }, [identity.userName, loadConversations, loadGroups, loadModels, loadSemantic])

  useEffect(() => subscribeCurrentUser(() => {
    setIdentity(current => {
      // 登录完成后一起读取账号和空间，让资源缓存键与新身份一致，无需重挂载页面。
      const next = readIdentity()
      return current.userName === next.userName && current.spaceId === next.spaceId ? current : next
    })
  }), [])

  useEffect(() => {
    const handleSpaceChange = (event: Event) => {
      const nextSpaceId = Number((event as CustomEvent)?.detail?.spaceId)
      if (!Number.isFinite(nextSpaceId) || nextSpaceId <= 0) return
      setIdentity(current => {
        if (current.spaceId === nextSpaceId) return current
        abortIdentity(current)
        return readIdentity(nextSpaceId)
      })
    }
    window.addEventListener('space-change', handleSpaceChange)
    return () => window.removeEventListener('space-change', handleSpaceChange)
  }, [])

  // 身份变化时终止旧账号或旧空间的在途请求，避免继续消耗资源或更新过期缓存。
  useEffect(() => () => abortIdentity(identity), [identity])

  // Context 只承载身份和稳定操作，资源加载状态由消费者独立订阅，避免刷新列表连带更新整个工作台。
  const value = useMemo<ChatBootstrapValue>(() => ({
    identity,
    keys,
    invalidateConversations,
    invalidateGroups,
    loadConversations,
    loadGroups,
    loadModels,
    loadSemantic,
    updateConversations,
    updateGroups,
  }), [
    identity,
    keys,
    invalidateConversations,
    invalidateGroups,
    loadConversations,
    loadGroups,
    loadModels,
    loadSemantic,
    updateConversations,
    updateGroups,
  ])

  return <ChatBootstrapContext.Provider value={value}>{children}</ChatBootstrapContext.Provider>
}

export function useChatBootstrap(): ChatBootstrapValue {
  const value = useContext(ChatBootstrapContext)
  if (!value) throw new Error('useChatBootstrap 必须在 ChatBootstrapProvider 内使用')
  return value
}

export function useChatConversations(): RequestResourceSnapshot<any[]> {
  const { keys } = useChatBootstrap()
  return useSnapshot(conversationsResource, keys.conversations)
}

export function useChatGroups(): RequestResourceSnapshot<SessionGroup[]> {
  const { keys } = useChatBootstrap()
  return useSnapshot(groupsResource, keys.groups)
}

export function useChatModels(): RequestResourceSnapshot<BootstrapModels> {
  const { keys } = useChatBootstrap()
  return useSnapshot(modelsResource, keys.models)
}

export function useChatSemantic(): RequestResourceSnapshot<any[]> {
  const { keys } = useChatBootstrap()
  return useSnapshot(semanticResource, keys.semantic)
}
