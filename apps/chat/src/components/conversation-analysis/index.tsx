import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import type { ConversationHandle } from '../conversation'
import type { ConversationProps } from '../conversation/hooks/useConversationController'
import type { ChatHeaderProps, ModelOption } from '../conversation/components/chat-header'
import NewChatWelcome from './NewChatWelcome'
import type { ChatInputModeKey, ChatInputProps, ChatInputSendOptions, SemanticSelectedData } from '../conversation/components/chat-input'
import type { ImageAttachment } from '../conversation/components/chat-input/imageAttachment'
import { getSpaceId } from '../../utils/runtime'
import type { ConverListProps } from './conver_list'
import { hasSelectedConversationData } from '../conversation/components/chat-input/sendValidation'
import { useSidebarCollapse } from '../layout/SidebarCollapseContext'
import { useChatBootstrap, useChatConversations, useChatModels, useChatSemantic } from '@/resources/chatBootstrap'
import { LazyFeatureFallback, RetryableLazy } from '@/components/performance/RetryableLazy'
import { useAfterFirstPaint } from '@/components/performance/useAfterFirstPaint'
// 助手会话（appId≠0）：输入框的数据语义/技能/MCP 只能从助手绑定资源里拿。
import {
  buildBoundSemanticTree,
  fetchAssistantBoundResources,
  type AssistantBoundResources,
} from '../../pages/chat/workshop/-assistantResources'
import { exploreService } from '@/store/exploration-mode/exploreService'
import { useExploreStore } from '@/store/exploration-mode/exploreStore'

import { ClockCircleOutlined } from '@ant-design/icons'

const loadCreateModal = () => import('./CreateModal')
const loadEditSessionModal = () => import('./EditSessionModal')
const loadChatInput = () => import('../conversation/components/chat-input')
const loadAppApi = () => import('../../service/api/app')
const loadConversationApi = () => import('../../service/api/conv')
const loadSpaceSelector = () => import('../layout/SpaceSelector').then(module => ({ default: module.SpaceSelector }))
const loadScheduleTaskDrawer = () => import('../layout/ScheduleTaskDrawer')
interface DeferredChatHeaderProps extends ChatHeaderProps {
  headerRef: React.Ref<any>
}
const loadChatHeader = () => import('../conversation/components/chat-header').then(({ default: ChatHeader }) => ({
  default: ({ headerRef, ...props }: DeferredChatHeaderProps) => (
    <ChatHeader ref={headerRef} {...props} />
  ),
}))
interface DeferredConverListProps extends ConverListProps {
  listRef: React.Ref<any>
}
const loadConverList = () => import('./conver_list').then(({ default: ConverList }) => ({
  default: ({ listRef, ...props }: DeferredConverListProps) => (
    <ConverList ref={listRef} {...props} />
  ),
}))
interface DeferredConversationProps extends ConversationProps {
  conversationRef: React.Ref<ConversationHandle>
}
const loadConversation = () => import('../conversation').then(({ default: Conversation }) => ({
  default: ({ conversationRef, ...props }: DeferredConversationProps) => (
    <Conversation ref={conversationRef} {...props} />
  ),
}))
const EMPTY_APP_LIST: any[] = []
const pendingSessionDetailRequests = new Map<string, Promise<any>>()

function fetchSessionDetailOnce(sessionId: string): Promise<any> {
  const pending = pendingSessionDetailRequests.get(sessionId)
  if (pending) return pending

  const request = loadAppApi().then(({ fetchSessionDetail }) => fetchSessionDetail({ sessionId }))
  pendingSessionDetailRequests.set(sessionId, request)
  const clearRequest = () => {
    window.setTimeout(() => {
      if (pendingSessionDetailRequests.get(sessionId) === request) {
        pendingSessionDetailRequests.delete(sessionId)
      }
    }, 2000)
  }
  void request.then(clearRequest, clearRequest)
  return request
}

function showMessage(type: 'error' | 'success' | 'warning', content: string): void {
  void import('antd/es/message').then(({ default: message }) => {
    message[type](content)
  })
}

/** 深度优先取第一个数据语义叶子（type=schema），用于“默认选中第一个” */
const findFirstSchemaLeaf = (nodes: any[]): any | null => {
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    if (node.type === 'schema') return node
    const hit = Array.isArray(node.children) ? findFirstSchemaLeaf(node.children) : null
    if (hit) return hit
  }
  return null
}

interface ConversationAnalysisProps {
  spaceId?: number
  chatId?: string
  hideSidebar?: boolean
  /** 路由携带的待命助手 ID（点助手卡片只跳转不建会话：欢迎页展示该助手开场引导，首次发送才创建绑定会话） */
  pendingAssistantId?: string
}

const ConversationAnalysis: React.FC<ConversationAnalysisProps> = ({ spaceId: propSpaceId, chatId: routeChatId, hideSidebar = false, pendingAssistantId }) => {
  const bootstrap = useChatBootstrap()
  const conversations = useChatConversations()
  const models = useChatModels()
  const semantic = useChatSemantic()
  const interactiveReady = useAfterFirstPaint()
  const initialSpaceId = propSpaceId !== undefined ? Number(propSpaceId) : bootstrap.identity.spaceId || getSpaceId()
  const initialAppList = conversations.data ?? EMPTY_APP_LIST
  const initialApp = (() => {
    if (routeChatId === 'new') return undefined
    if (!initialAppList.length) return undefined
    if (routeChatId) {
      return initialAppList.find((item: any) => String(item.chat_id) === String(routeChatId))
    }
    const cachedChatId = localStorage.getItem('chatId') || ''
    return (cachedChatId && initialAppList.find((item: any) => String(item.chat_id) === String(cachedChatId))) || initialAppList[0]
  })()

  const { collapseSidebar } = useSidebarCollapse()
  const [visible, setVisible] = useState(false)
  const [curApp, setCurApp] = useState<any>(initialApp ? { ...initialApp } : {})
  const appList = conversations.data ?? EMPTY_APP_LIST
  const [curConv, setCurConv] = useState<any>(initialApp?.conv_uid ? { ...initialApp } : undefined)
  const [, setLoading] = useState(false)
  const lastSpaceIdRef = useRef<number | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [EditData, setEditData] = useState<any>({})
  const [editVisible, setEditVisible] = useState(false)
  const navigate = useNavigate()
  const [editItem, setEditItem] = useState<any>()
  const conversationRef = useRef<ConversationHandle>(null)
  const converListRef = useRef<any>(null)
  const [fold, setFold] = useState(false)
  const justCreatedRef = useRef(false)
  const currentSpaceId = Number(propSpaceId ?? bootstrap.identity.spaceId ?? initialSpaceId)

  // ── 统一输入框状态 ──
  const [convLoading, setConvLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [exploreLoading, setExploreLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState<ChatInputModeKey>('interact')
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  const [explorePreviewOpen, setExplorePreviewOpen] = useState(false)
  const [studioPortalEl, setStudioPortalEl] = useState<HTMLDivElement | null>(null)
  const [reportPortalEl, setReportPortalEl] = useState<HTMLDivElement | null>(null)
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(false)
  const [uploadFileEnabled, setUploadFileEnabled] = useState(false)
  const [externalInputValue, setExternalInputValue] = useState('')
  const [creating, setCreating] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const chatHeaderRef = useRef<any>(null)

  // 离开聊天页面时中止所有后台探索 SSE，避免无主连接持续占用
  useEffect(() => {
    return () => {
      exploreService.abortAll()
      useExploreStore.getState().stopAll()
    }
  }, [])

  // 报告预览占用右侧空间时，幂等收起系统菜单，为双栏正文留出可读宽度。
  // 关闭报告不自动展开，避免覆盖用户在预览期间主动选择的侧栏状态。
  const handleReportPreviewChange = useCallback((open: boolean) => {
    setReportPreviewOpen(open)
    if (open) collapseSidebar()
  }, [collapseSidebar])

  const handleExplorePreviewChange = useCallback((open: boolean) => {
    setExplorePreviewOpen(open)
    if (open) collapseSidebar()
  }, [collapseSidebar])

  const modelOptions = (models.data?.options ?? []) as ModelOption[]
  const [currentModel, setCurrentModel] = useState<ModelOption | null>(
    () => (models.data?.currentModel as ModelOption | null | undefined) ?? null,
  )
  const [embedModelOverride, setEmbedModelOverride] = useState<string | number>('')
  const embedModelId = embedModelOverride || models.data?.embedModelId || ''

  const semanticTree = semantic.data ?? []
  const [selectedData, setSelectedData] = useState<SemanticSelectedData | null>(null)
  const [selectedExcel, setSelectedExcel] = useState<any>(null)
  const semLoading = semantic.status === 'loading'
  // 待发送图片附件（base64）：三模式共享，发送后清空。
  const [selectedImages, setSelectedImages] = useState<ImageAttachment[]>([])

  // ── 助手会话绑定资源（按 curConv.appId）：非空时输入框候选仅从其中取 ──
  const [boundResources, setBoundResources] = useState<AssistantBoundResources | null>(null)
  const [boundResourcesLoading, setBoundResourcesLoading] = useState(false)

  useEffect(() => {
    const initialModel = models.data?.currentModel as ModelOption | null | undefined
    setCurrentModel(initialModel ?? null)
    setEmbedModelOverride('')
  }, [models.data, currentSpaceId])

  // 模型是否支持关闭思考（1 为支持，0 或其他为不支持）
  const isSupportCloseThinking = useCallback((model: ModelOption | null | undefined) => {
    return model?.isSupportThinking === 1 || model?.isSupportThinking === '1'
  }, [])

  const handleModelChange = useCallback((model: ModelOption) => {
    setCurrentModel(model)
    // 不支持关闭思考的模型，强制开启思考且不允许用户关闭
    if (!isSupportCloseThinking(model)) {
      setDeepThinkEnabled(true)
    }
  }, [isSupportCloseThinking])

  // 当前模型切换或初始默认模型设置后，若不支持关闭思考则强制点亮思考按钮
  useEffect(() => {
    if (currentModel && !isSupportCloseThinking(currentModel)) {
      setDeepThinkEnabled(true)
    }
  }, [currentModel, isSupportCloseThinking])

  // ── 助手会话绑定资源加载（普通会话 appId=0 不请求、不限制；待命助手按路由 appId）──
  const assistantId = curConv ? String(curConv.appId ?? 0) : (pendingAssistantId ? String(pendingAssistantId) : '0')
  useEffect(() => {
    if (assistantId === '0') {
      setBoundResources(null)
      return
    }
    let cancelled = false
    setBoundResourcesLoading(true)
    fetchAssistantBoundResources(assistantId)
      .then((resources) => {
        if (!cancelled) setBoundResources(resources)
      })
      .finally(() => {
        if (!cancelled) setBoundResourcesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [assistantId])

  // 切换绑定助手（或回到普通会话）时清空已选数据语义，避免携带旧助手语义发送。
  useEffect(() => {
    setSelectedData(null)
  }, [assistantId])

  // 助手会话时输入框数据语义弹窗只用绑定候选（扁平叶子树）；加载中展示空列表 + 加载态。
  const boundSemanticTree = useMemo(
    () => (assistantId !== '0' ? buildBoundSemanticTree(boundResources?.semantics ?? []) : null),
    [assistantId, boundResources],
  )
  // 绑定技能 / MCP 候选（memo 保证引用稳定，避免 ChatInput 内部误清已选）
  const assistantSkills = useMemo(
    () => (assistantId !== '0' ? boundResources?.skills ?? [] : null),
    [assistantId, boundResources],
  )
  const assistantMcps = useMemo(
    () => (assistantId !== '0' ? boundResources?.mcps ?? [] : null),
    [assistantId, boundResources],
  )

  // 数据语义默认选中第一个：候选就绪且当前未选中时自动选中首个叶子
  // （助手会话用绑定候选，普通会话用全局树；历史会话回填后不覆盖）。
  useEffect(() => {
    if (selectedData) return
    const isAssistant = assistantId !== '0'
    if (isAssistant && boundResourcesLoading) return
    const leaf = findFirstSchemaLeaf(isAssistant ? (boundSemanticTree ?? []) : semanticTree)
    if (!leaf) return
    setSelectedData({ name: leaf.name, schemaId: leaf.schemaId, groupName: leaf.groupName })
  }, [selectedData, assistantId, boundResourcesLoading, boundSemanticTree, semanticTree])

  // 助手会话且消息为空时：展示类欢迎页（标题=助手名、文案=开场引导，不展示推荐示例）
  const assistantWelcome = useMemo(() => {
    if (assistantId === '0' || !boundResources) return undefined
    return (
      <NewChatWelcome
        hideExamples
        title={boundResources.appName || undefined}
        subtitle={boundResources.prologue || boundResources.description || undefined}
      />
    )
  }, [assistantId, boundResources])

  // 待命助手（已跳转但尚未建会话）：首次发送创建会话时绑定对应助手，
  // 载荷与之前“点卡片立即创建”一致（appId + 助手名标题），仅时机延后。
  const pendingAssistantCreate = useMemo(() => {
    if (curConv || assistantId === '0') return undefined
    return { appId: assistantId, title: boundResources?.appName || undefined }
  }, [curConv, assistantId, boundResources])

  useEffect(() => {
    if (lastSpaceIdRef.current === null) {
      lastSpaceIdRef.current = currentSpaceId
      return
    }
    if (lastSpaceIdRef.current === currentSpaceId) return
    lastSpaceIdRef.current = currentSpaceId
    setCurApp({})
    setCurConv(null)
    converListRef.current?.setSelectedChatId(null)
    setSelectedData(null)
  }, [currentSpaceId])

  const getAppList = useCallback(async (options?: { force?: boolean; silent?: boolean }) => {
    try {
      if (!options?.silent) setLoading(true)
      const data = await bootstrap.loadConversations({ force: options?.force })
      if (options?.silent) return data
      const chatId = localStorage.getItem('chatId') || ''
      const targetApp = (chatId && data.find((item: any) => String(item.chat_id) === String(chatId))) || data[0]
      if (targetApp) {
        setCurApp({ ...targetApp })
        setCurConv(targetApp.conv_uid ? { ...targetApp } : undefined)
        localStorage.setItem('chatId', String(targetApp.chat_id))
      } else {
        setCurApp({})
        setCurConv(undefined)
        localStorage.removeItem('chatId')
      }
      return data
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [bootstrap.loadConversations])

  useEffect(() => {
    if (currentSpaceId === null || Number.isNaN(currentSpaceId)) return
    // 路由已指向具体会话时只静默刷新列表：助手会话不在 session/list 内，非静默分支会因找不到而把 curConv 重置成别的会话或空，导致 assistantId 归零、已选技能被清空
    void getAppList({ silent: Boolean(routeChatId) || Boolean(appList.length) })
  }, [appList.length, currentSpaceId, getAppList, routeChatId])

  useEffect(() => {
    if (!routeChatId || routeChatId === 'new' || !appList.length) return
    if (justCreatedRef.current) {
      justCreatedRef.current = false
      return
    }
    if (curConv && String(curConv.chat_id) === String(routeChatId)) return
    const nextApp = appList.find((item) => String(item.chat_id) === String(routeChatId))
    if (!nextApp) return
    setCurApp({ ...nextApp })
    setCurConv(nextApp.conv_uid ? { ...nextApp } : undefined)
    localStorage.setItem('chatId', String(nextApp.chat_id))
  }, [routeChatId, appList.length])

  // 助手会话（appId≠0）被 session/list 的 appId=0 隔离在侧栏列表外：
  // 路由会话不在列表时，用 session/get 兜底恢复会话对象（含 appId），
  // 使对话正文正常渲染并触发绑定资源限制。
  useEffect(() => {
    if (!routeChatId || routeChatId === 'new') return
    if (curConv && String(curConv.chat_id) === String(routeChatId)) return
    if (appList.some((item) => String(item.chat_id) === String(routeChatId))) return
    let cancelled = false
    fetchSessionDetailOnce(String(routeChatId))
      .then((res: any) => {
        const convData = res?.data?.data || res?.data
        if (cancelled || !convData || typeof convData !== 'object') return
        const merged = {
          ...convData,
          chat_id: convData.chat_id ?? convData.sessionId ?? convData.session_id ?? convData.chatId ?? routeChatId,
          title: convData.title || convData.biz_name || '',
          biz_name: convData.title || convData.biz_name || '',
          appId: convData.appId ?? convData.app_id ?? 0,
        }
        setCurApp(merged)
        setCurConv(merged)
        localStorage.setItem('chatId', String(merged.chat_id))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [routeChatId, appList, curConv])

  // 路由变为 'new' 时清除当前会话，确保展示欢迎页
  useEffect(() => {
    if (routeChatId === 'new') {
      setCurConv(undefined)
    }
  }, [routeChatId])

  // ── 统一发送逻辑 ──
  // 创建新会话（仅创建，不发送消息），返回创建后的会话对象；
  // options 用于待命助手延后创建：绑定助手 appId + 助手名标题。
  const createNewConv = useCallback(async (options?: { appId?: string | number; title?: string }): Promise<any> => {
    const { createApp } = await loadAppApi()
    const appRes: any = await createApp({
      space_id: currentSpaceId,
      appId: options?.appId,
      title: options?.title,
    })
    const rawApp = appRes?.data ?? appRes
    const app = {
      ...rawApp,
      chat_id: rawApp?.chat_id ?? rawApp?.sessionId ?? rawApp?.session_id ?? rawApp?.chatId,
      space_id: rawApp?.space_id ?? rawApp?.spaceId,
      app_code: rawApp?.app_code ?? rawApp?.appCode,
      agent_id: rawApp?.agent_id ?? rawApp?.agentId,
      conv_uid: rawApp?.conv_uid ?? rawApp?.convUid,
    }
    if (!app.chat_id) {
      showMessage('error', '创建会话失败')
      return null
    }
    justCreatedRef.current = true
    const fallbackTitle = app.title || options?.title || '新建对话'
    const newApp = {
      ...app,
      appId: options?.appId ?? app.appId ?? 0,
      title: fallbackTitle,
      biz_name: fallbackTitle,
    }
    setCurApp(newApp)
    setCurConv(newApp)
    localStorage.setItem('chatId', String(app.chat_id))
    bootstrap.updateConversations(prev => [newApp, ...prev])
    // 携带 appId 保持待命助手身份：navigate 后 pendingAssistantId 不丢，避免 assistantId 短暂归零触发绑定资源重载、连带清空已选技能
    navigate({
      to: TASK_DETAIL_ROUTE,
      params: { taskId: String(app.chat_id) },
      search: options?.appId != null && options.appId !== '' ? { appId: String(options.appId) } : {},
    })
    return newApp
  }, [bootstrap.updateConversations, currentSpaceId, navigate])

  // 确保存在可用会话：已有则直接返回，没有则先创建（用于上传文件等需要 conv_uid 的场景）
  const ensureConv = useCallback(async (): Promise<any> => {
    if (curConv?.conv_uid) return curConv
    if (creating) return null
    setCreating(true)
    try {
      return await createNewConv(pendingAssistantCreate)
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        showMessage('error', err?.message || '创建会话失败')
      }
      return null
    } finally {
      setCreating(false)
    }
  }, [curConv, creating, createNewConv, pendingAssistantCreate])

  const handleUnifiedSend = useCallback(async (value: string, options?: ChatInputSendOptions) => {
    if (creating) return
    const sendMode = options?.mode || selectedMode

    // 所有对话模式共享同一数据前置条件，报告模式不得绕过交互模式的校验。
    if (!hasSelectedConversationData(selectedData, selectedExcel)) {
      showMessage('warning', '选择已有数据或上传excel，即可开始对话')
      return
    }

    const meta = {
      // 这里的分组是数据语义所属分组，不是对话分组
      groupName: selectedData?.groupName || '',
      semanticName: selectedData?.name || '',
      semanticSchemaId: selectedData?.schemaId,
      // 选中数据语义分组时的真实分组 id（与 semanticSchemaId 互斥）
      semanticGroupId: selectedData?.groupId,
      // 新建会话时通过 meta 把已选 Excel 透传到 Conversation，避免切换路由后状态丢失
      selectedExcel: selectedExcel?.file_id
        ? { file_id: selectedExcel.file_id, file_name: selectedExcel.file_name }
        : undefined,
      // 图片附件随消息透传（三模式共用），由各发送链路写入请求体。
      images: options?.images,
    }

    const sendByMode = () => {
      if (sendMode === 'report') {
        // 同一 Conversation 只统一展示；报告发送仍走独立异步任务接口。
        if (!conversationRef.current?.handleReportSend) return false
        conversationRef.current.handleReportSend(value, options?.reportSources, options?.images)
        return true
      }

      if (sendMode === 'explore') {
        if (!selectedData?.schemaId) {
          showMessage('warning', '探索模式请选择具体数据语义')
          return true
        }
        if (!conversationRef.current?.handleExploreSend) return false
        conversationRef.current.handleExploreSend(value, selectedData.schemaId, {
          groupId: selectedData.groupId,
          skillSourceVersionIds: options?.skillSourceVersionIds,
          mcpSourceVersionIds: options?.mcpSourceVersionIds,
          images: options?.images,
        })
        return true
      }

      // 交互模式保持原实现，继续走 Conversation/useConversationController。
      if (!conversationRef.current?.handleSend) return false
      conversationRef.current.handleSend(value, meta)
      return true
    }

    const waitAndSend = (retries = 0, onSent?: () => void) => {
      if (retries > 20) {
        onSent?.()
        return
      }

      requestAnimationFrame(() => {
        if (sendByMode()) {
          onSent?.()
        } else {
          setTimeout(() => waitAndSend(retries + 1, onSent), 50)
        }
      })
    }

    // 已有会话 → 按当前输入模式分流发送，两种消息保留在同一时间线。
    if (curConv) {
      if (sendByMode()) {
        setSelectedImages([])
      } else {
        waitAndSend(0, () => setSelectedImages([]))
      }
      return
    }

    // 新建会话时不保留上一份 Excel（文件与 conv_uid 绑定）
    setSelectedExcel(null)

    // 无会话 → 先创建（待命助手则绑定对应助手），再发送
    setCreating(true)
    try {
      const newApp = await createNewConv(pendingAssistantCreate)
      if (!newApp) {
        setCreating(false)
        return
      }

      // 等待目标模式组件 mount 后通过 ref 发送。
      waitAndSend(0, () => { setCreating(false); setSelectedImages([]) })
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        showMessage('error', err?.message || '创建会话失败')
      }
      setCreating(false)
    }
  }, [curConv, creating, selectedData, selectedExcel, selectedMode, createNewConv, pendingAssistantCreate])

  // ── 回调 ──
  const handleSetCurApp = useCallback((item: any) => {
    if (!item) return
    setCurApp({ ...item })
    setCurConv(item.conv_uid ? { ...item } : undefined)
    localStorage.setItem('chatId', String(item.chat_id))
  }, [])

  const onClose = async (val?: any) => {
    if (val) {
      try {
        const appApi = await loadAppApi()
        if (isEdit) {
          const res = await appApi.updateApp(val)
          if (res?.success) {
            setIsEdit(false)
            setVisible(false)
            setEditData({})
            handleUpdateList(res?.data)
          }
          return Promise.resolve()
        }
        const res = await appApi.createApp(val)
        setIsEdit(false)
        await getAppList({ force: true })
        const currentApp = { ...res.data }
        setCurApp(currentApp)
        localStorage.setItem('chatId', String(currentApp.chat_id))
        const { newConv } = await loadConversationApi()
        const newConvRes = await newConv(currentApp)
        setCurConv({ ...newConvRes.data, ...currentApp })
        setVisible(false)
        return Promise.resolve()
      } catch (e) {
        showMessage('error', '创建失败')
        return Promise.reject()
      }
    } else {
      setVisible(false)
      setIsEdit(false)
      setEditData({})
      return Promise.resolve()
    }
  }

  const handleDeleteApp = useCallback((item: any) => {
    void import('antd/es/modal').then(({ default: Modal }) => {
      Modal.confirm({
        title: '确认删除对话',
        content: '是否确认删除当前对话？删除后无法恢复。',
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            setLoading(true)
            const { deleteSession } = await loadAppApi()
            await deleteSession({ sessionId: item.chat_id, convUid: item.conv_uid })
            showMessage('success', '对话已删除')
            if (curApp.chat_id === item.chat_id) {
              setCurConv(undefined)
            }
            void getAppList({ force: true })
          } catch (error) {
            showMessage('error', '删除对话失败')
          } finally {
            setLoading(false)
          }
        },
      })
    })
  }, [curApp.chat_id, getAppList])

  const handleUpdateList = useCallback((data: any) => {
    const newApp = data?.newApp
    const newConv = data?.newConv
    if (newApp) {
      bootstrap.updateConversations(prev => [newApp, ...prev.filter(a => a.chat_id !== newApp.chat_id)])
      setCurApp(newApp)
      setCurConv(newApp.conv_uid ? { ...newApp } : undefined)
      localStorage.setItem('chatId', String(newApp.chat_id))
      if (newConv) {
        setCurConv({ ...newConv, ...newApp })
      }
      return
    }
    if (data) {
      if (data.conv_uid) {
        setCurConv((prev: any) => ({ ...prev, ...data }))
      }
      if (data.chat_id) {
        bootstrap.updateConversations(prev => prev.map(app => (app.chat_id === data.chat_id ? { ...app, ...data } : app)))
        if (curApp.chat_id === data.chat_id) {
          setCurApp((prev: any) => ({ ...prev, ...data }))
        }
      }
    }
  }, [bootstrap.updateConversations, curApp.chat_id])

  const handleEdit = useCallback((key?: string, item?: any) => {
    if (key === 'edit' && item) {
      setEditItem(item)
      setEditVisible(true)
      return
    }
    setIsEdit(key === 'edit')
    setVisible(true)
    if (item) {
      setEditData(item)
    }
  }, [])

  const handleEditOk = useCallback(
    async (values: { sessionId: string | number; title: string }) => {
      const { updateApp } = await loadAppApi()
      await updateApp(values)
      showMessage('success', '更新成功')
      setEditVisible(false)
      await getAppList({ force: true })
    },
    [getAppList],
  )

  // 推荐示例点击 → 填入输入框
  const handleExampleClick = useCallback((text: string) => {
    setExternalInputValue(text)
  }, [])

  // 切换会话/空间时清空已选 Excel 与图片（文件与 conv_uid 绑定）
  useEffect(() => {
    setSelectedExcel(null)
    setSelectedImages([])
  }, [curConv?.conv_uid, currentSpaceId])

  return (
    <div className="h-full w-full" style={{ background: 'transparent' }}>
      <div className="h-full w-full flex">
        {!hideSidebar && (
          <RetryableLazy
            loader={loadConverList}
            componentProps={{
              listRef: converListRef,
              handleEdit,
              appList,
              handleSetCurApp,
              handleDeleteApp,
              setFold,
              fold,
            }}
            fallback={<div aria-busy="true" className="h-full w-[12.5rem] shrink-0 animate-pulse border-r border-slate-200 bg-white/20" />}
          />
        )}
        <div className="flex-1 min-w-0 flex">
          {/* 中间内容区：标题栏 + 内容 + 输入框 */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* 顶部 header（永驻） */}
            {!curConv && (interactiveReady ? (
              <RetryableLazy
                loader={loadChatHeader}
                componentProps={{
                  headerRef: chatHeaderRef,
                  conv: curApp || {},
                  setConvContent: () => {},
                  onUpdateList: handleUpdateList,
                  setIsSharing: () => {},
                  onClose: () => {},
                  modelOptions,
                  currentModel,
                  onModelChange: handleModelChange,
                  onEmbedModelFound: setEmbedModelOverride,
                }}
                fallback={<header aria-busy="true" className="chat-header" style={{ boxSizing: 'border-box', height: 70 }} />}
              />
            ) : (
              <header aria-busy="true" className="chat-header" style={{ boxSizing: 'border-box', height: 70 }} />
            ))}
            
            {/* 定时任务和工作空间选择器 - 固定在中间栏顶部 */}
            <div className="middle-column-topright">
              <button
                type="button"
                className="header-schedule-btn"
                onClick={() => setScheduleOpen(true)}
                onFocus={() => void loadScheduleTaskDrawer()}
                onMouseEnter={() => void loadScheduleTaskDrawer()}
              >
                <ClockCircleOutlined />
                定时任务
              </button>
              <RetryableLazy
                loader={loadSpaceSelector}
                componentProps={{ collapsed: false }}
                fallback={<div aria-busy="true" className="space-switcher-wrap"><div className="space-switcher-glass h-9 w-32 animate-pulse" /></div>}
              />
              {scheduleOpen && (
                <RetryableLazy
                  loader={loadScheduleTaskDrawer}
                  componentProps={{ open: scheduleOpen, onClose: () => setScheduleOpen(false) }}
                  fallback={<LazyFeatureFallback label="正在加载定时任务…" style={{ position: 'fixed', inset: '0 0 0 auto', zIndex: 1000, width: 480, minHeight: '100vh' }} />}
                />
              )}
            </div>
            {/* 内容区域：overflow-hidden 建立 BFC，确保内部 h-full 正确解析高度 */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {curConv ? (
                <RetryableLazy
                  loader={loadConversation}
                  componentProps={{
                    conversationRef,
                    fold: hideSidebar ? false : fold,
                    conv: curConv,
                    onClose: () => setCurConv(undefined),
                    onUpdateList: handleUpdateList,
                    onLoadingChange: setConvLoading,
                    onReportLoadingChange: setReportLoading,
                    onExploreLoadingChange: setExploreLoading,
                    onReportPreviewChange: handleReportPreviewChange,
                    onExplorePreviewChange: handleExplorePreviewChange,
                    semanticId: selectedData?.schemaId,
                    semanticGroupId: selectedData?.groupId,
                    selectedExcel,
                    modelOptions,
                    currentModel,
                    onModelChange: handleModelChange,
                    embedModelId,
                    deepThinkEnabled,
                    spaceId: currentSpaceId,
                    onHistorySemanticLoaded: setSelectedData,
                    emptyContent: assistantWelcome,
                    studioPortal: studioPortalEl,
                    reportPortal: reportPortalEl,
                  }}
                  fallback={<LazyFeatureFallback label="正在加载会话内容…" style={{ height: '100%' }} />}
                />
              ) : (!routeChatId || routeChatId === 'new') ? (
                (assistantWelcome ?? (assistantId !== '0' ? null : <NewChatWelcome onExampleClick={handleExampleClick} />))
              ) : null}
            </div>

            {/* 动画层只改变可见性和占位高度，ChatInput 始终挂载以保留未发送草稿。报告预览已移至独立面板，输入框保持可见。 */}
            <div className="report-composer-presence">
            <div className="report-composer-presence-inner">
              <div className="composer-wrap">
                <div className="max-w-[53.75rem] w-full m-auto">
                  {interactiveReady ? (
                    <RetryableLazy<ChatInputProps>
                    loader={loadChatInput}
                    componentProps={{
                      conv: curConv,
                      ensureConv,
                      loading: (selectedMode === 'report' ? reportLoading : selectedMode === 'explore' ? exploreLoading : convLoading) || creating,
                      onSend: handleUnifiedSend,
                      onStop: () => {
                        if (selectedMode === 'report') {
                          conversationRef.current?.stopReportGenerating()
                          return
                        }

                        if (selectedMode === 'explore') {
                          conversationRef.current?.stopExploreGenerating()
                          return
                        }

                        conversationRef.current?.stopGenerating()
                      },
                      deepThinkEnabled,
                      uploadFileEnabled,
                      currentModel,
                      onToggleDeepThink: () => setDeepThinkEnabled(!deepThinkEnabled),
                      onToggleUploadFile: () => setUploadFileEnabled(!uploadFileEnabled),
                      spaceId: currentSpaceId,
                      semanticTree,
                      assistantSemanticTree: boundSemanticTree,
                      assistantSkills,
                      assistantMcps,
                      assistantKey: assistantId,
                      selectedData,
                      onSelectData: setSelectedData,
                      selectedExcel,
                      setSelectedExcel,
                      selectedImages,
                      setSelectedImages,
                      semLoading: semLoading || (assistantId !== '0' && boundResourcesLoading),
                      externalValue: externalInputValue,
                      onExternalValueConsumed: () => setExternalInputValue(''),
                      selectedModeKey: selectedMode,
                      onModeChange: setSelectedMode,
                    }}
                      fallback={<div aria-busy="true" className="mx-auto h-[108px] w-full max-w-[53.75rem] animate-pulse rounded-2xl bg-slate-100/80" />}
                    />
                  ) : (
                    <div aria-busy="true" className="mx-auto h-[108px] w-full max-w-[53.75rem] animate-pulse rounded-2xl bg-slate-100/80" />
                  )}
                </div>
                <div className="chat-footer">内容由 AI 生成，请注意甄别</div>
              </div>
            </div>
          </div>
          </div>

          {/* 右侧独立面板：工作室和报告预览 */}
          <div
            ref={setStudioPortalEl}
            className={`right-panel ${explorePreviewOpen ? 'right-panel-open' : ''}`}
          />
          <div
            ref={setReportPortalEl}
            className={`right-panel ${reportPreviewOpen ? 'right-panel-open' : ''}`}
          />
        </div>
      </div>
      {visible && (
        <RetryableLazy
          loader={loadCreateModal}
          componentProps={{
            onClose,
            initialValues: {
              ...EditData,
              title: EditData.title || 'AI智能助手',
              biz_name: EditData.biz_name || 'AI智能助手',
            },
            isEdit,
            visible: true,
          }}
          fallback={<LazyFeatureFallback label="正在加载会话配置…" />}
        />
      )}
      {editVisible && (
        <RetryableLazy
          loader={loadEditSessionModal}
          componentProps={{ visible: true, initialValues: editItem, onClose: () => setEditVisible(false), onOk: handleEditOk }}
          fallback={<LazyFeatureFallback label="正在加载会话编辑…" />}
        />
      )}
    </div>
  )
}

export default ConversationAnalysis
