import { Modal } from 'antd'
import React, { useEffect, useCallback, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { newConv } from '../../service/api/conv'
import CreateModal from './CreateModal'
import EditSessionModal from './EditSessionModal'
import { createApp, deleteSession, fetchAppList, updateApp } from '../../service/api/app'
import { fetchSemanticTree } from '../../service/api/semantic'
import { fetchModelList } from '../../service/api/abi-system'
import { CHAT_MODE } from '../../constant'
import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import Conversation from '../conversation'
import type { ConversationHandle } from '../conversation'
import ChatHeader from '../conversation/components/chat-header'
import type { ModelOption } from '../conversation/components/chat-header'
import NewChatWelcome from './NewChatWelcome'
import ChatInput from '../conversation/components/chat-input'
import type { ChatInputModeKey, SemanticSelectedData } from '../conversation/components/chat-input'
import { message } from 'antd'
import { getSpaceId } from '../../utils'
import ConverList from './conver_list'
import { hasSelectedConversationData } from '../conversation/components/chat-input/sendValidation'
import { useSidebarCollapse } from '../layout/SidebarCollapseContext'

// ── 模块级工作台缓存（跨组件卸载/重挂载保留，按 spaceId 区分）──
// 技能商店 / 应用工坊为独立路由，进入后 ConversationAnalysis 会被卸载；
// 切回对话时组件冷挂载，若无缓存会重新拉取 appList/模型/语义，产生 1-2s 加载遮罩。
// 用模块级缓存保存这些数据，冷挂载时直接命中缓存即时渲染、仅静默刷新，体验与对话↔对话一致。
interface WorkbenchCache {
  appList: any[]
  modelOptions: ModelOption[]
  currentModel: ModelOption | null
  embedModelId: string | number
  modelLoaded: boolean
  semanticTree: any[]
  semanticLoaded: boolean
}

const workbenchCacheBySpace = new Map<number, WorkbenchCache>()

function getWorkbenchCache(spaceId: number): WorkbenchCache | undefined {
  if (Number.isNaN(spaceId)) return undefined
  return workbenchCacheBySpace.get(spaceId)
}

function patchWorkbenchCache(spaceId: number, patch: Partial<WorkbenchCache>) {
  if (Number.isNaN(spaceId)) return
  const prev = workbenchCacheBySpace.get(spaceId) || {
    appList: [],
    modelOptions: [],
    currentModel: null,
    embedModelId: '',
    modelLoaded: false,
    semanticTree: [],
    semanticLoaded: false,
  }
  workbenchCacheBySpace.set(spaceId, { ...prev, ...patch })
}

interface ConversationAnalysisProps {
  spaceId?: number
  chatId?: string
  hideSidebar?: boolean
}

const ConversationAnalysis: React.FC<ConversationAnalysisProps> = ({ spaceId: propSpaceId, chatId: routeChatId, hideSidebar = false }) => {
  // 冷挂载时优先用模块级缓存预解析初始值，避免重新拉取导致的加载闪烁
  const initialSpaceId = propSpaceId !== undefined ? Number(propSpaceId) : getSpaceId()
  const initialCache = getWorkbenchCache(initialSpaceId)
  const initialApp = (() => {
    if (routeChatId === 'new') return undefined
    if (!initialCache?.appList?.length) return undefined
    if (routeChatId) {
      // 指定了会话：仅在缓存命中时预设，未命中不预设（避免闪现错误会话），等静默刷新后由切换 effect 归位
      return initialCache.appList.find((item: any) => String(item.chat_id) === String(routeChatId))
    }
    const cachedChatId = localStorage.getItem('chatId') || ''
    return (cachedChatId && initialCache.appList.find((item: any) => String(item.chat_id) === String(cachedChatId))) || initialCache.appList[0]
  })()

  const { collapseSidebar } = useSidebarCollapse()
  const [visible, setVisible] = useState(false)
  const [curApp, setCurApp] = useState<any>(initialApp ? { ...initialApp } : {})
  const [appList, setAppList] = useState<any[]>(initialCache?.appList || [])
  const [curConv, setCurConv] = useState<any>(initialApp?.conv_uid ? { ...initialApp } : undefined)
  const [loading, setLoading] = useState(false)
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
  const [currentSpaceId, setCurrentSpaceId] = useState<number>(() => initialSpaceId)

  // ── 统一输入框状态 ──
  const [convLoading, setConvLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState<ChatInputModeKey>('interact')
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(false)
  const [uploadFileEnabled, setUploadFileEnabled] = useState(false)
  const [externalInputValue, setExternalInputValue] = useState('')
  const [creating, setCreating] = useState(false)
  const chatHeaderRef = useRef<any>(null)

  // 报告预览占用右侧空间时，幂等收起系统菜单，为双栏正文留出可读宽度。
  // 关闭报告不自动展开，避免覆盖用户在预览期间主动选择的侧栏状态。
  const handleReportPreviewChange = useCallback((open: boolean) => {
    setReportPreviewOpen(open)
    if (open) collapseSidebar()
  }, [collapseSidebar])

  // ── 模型列表状态（全局加载一次）──
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(initialCache?.modelOptions || [])
  const [currentModel, setCurrentModel] = useState<ModelOption | null>(initialCache?.currentModel || null)
  const [embedModelId, setEmbedModelId] = useState<string | number>(initialCache?.embedModelId ?? '')
  const modelLoadedRef = useRef(initialCache?.modelLoaded ?? false)

  // ── 数据语义状态（统一节点树，一次性拉取）──
  const [semanticTree, setSemanticTree] = useState<any[]>(initialCache?.semanticTree || [])
  const [expandedSemGroups, setExpandedSemGroups] = useState<Set<string>>(new Set())
  const [selectedData, setSelectedData] = useState<SemanticSelectedData | null>(null)
  const [selectedExcel, setSelectedExcel] = useState<any>(null)
  const [semLoading, setSemLoading] = useState(false)
  const semGroupsLoadedRef = useRef(initialCache?.semanticLoaded ?? false)

  // ── 模型列表加载（只调一次）──
  useEffect(() => {
    if (modelLoadedRef.current) return
    modelLoadedRef.current = true
    fetchModelList({ spaceId: currentSpaceId })
      .then((res: any) => {
        const list = res?.data?.data || res?.data || []
        if (Array.isArray(list) && list.length > 0) {
          // 找到嵌入模型（从完整列表中查找）
          let resolvedEmbedId: string | number = ''
          const embedModel = list.find((item: any) => item.modelKey === 'bge-large')
          if (embedModel) {
            resolvedEmbedId = embedModel.modelId ?? embedModel.id ?? embedModel.llmId
            setEmbedModelId(resolvedEmbedId)
          }
          // 只筛选 status 为 1 的大模型（modelType='1' 为语言模型，排除 modelType='2' 向量/嵌入模型）
          const filteredList = list.filter(
            (item: any) => String(item.status) === '1' && String(item.modelType) === '1',
          )
          const options: ModelOption[] = filteredList.map((item: any) => ({
            id: item.modelId ?? item.id ?? item.llmId ?? '',
            key: item.modelKey || item.model_name || item.key || '',
            label: item.modelName || item.model_name || item.llmModel || item.label || '',
            desc: item.remark || item.description || item.desc || '',
            isDefault: item.isDefault,
            isSupportThinking: item.isSupportThinking,
          }))
          setModelOptions(options)
          if (options.length > 0) {
            setCurrentModel(options[0])
          }
          // 写入模块级缓存，供切回对话时冷挂载直接命中
          patchWorkbenchCache(currentSpaceId, {
            modelOptions: options,
            currentModel: options.length > 0 ? options[0] : null,
            embedModelId: resolvedEmbedId,
            modelLoaded: true,
          })
        }
      })
      .catch(() => {})
  }, [currentSpaceId])

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

  // ── 数据语义加载（分组树一次性返回，含各级子分组与数据语义叶子）──
  useEffect(() => {
    if (semGroupsLoadedRef.current) return
    semGroupsLoadedRef.current = true
    setSemLoading(true)
    fetchSemanticTree({ spaceId: currentSpaceId })
      .then((res: any) => {
        const list = res?.data || res?.rows || []
        const tree = Array.isArray(list) ? list : []
        setSemanticTree(tree)
        patchWorkbenchCache(currentSpaceId, { semanticTree: tree, semanticLoaded: true })
      })
      .catch(() => {})
      .finally(() => setSemLoading(false))
  }, [currentSpaceId])

  // 展开/收起分组节点（数据已全量返回，无需懒加载）
  const toggleSemGroup = useCallback((nodeId: string) => {
    setExpandedSemGroups(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  // ── SpaceId 同步 ──
  useEffect(() => {
    if (propSpaceId === undefined) return
    const next = Number(propSpaceId)
    if (!Number.isNaN(next) && next !== currentSpaceId) {
      setCurrentSpaceId(next)
    }
  }, [propSpaceId, currentSpaceId])

  useEffect(() => {
    const handleSpaceChange = (event: Event) => {
      const detail = (event as CustomEvent)?.detail
      const next = Number(detail?.spaceId)
      if (!Number.isNaN(next)) {
        setCurrentSpaceId(next)
        setCurApp({})
        setCurConv(null)
        converListRef.current?.setSelectedChatId(null)
        // 重新加载语义
        semGroupsLoadedRef.current = false
      }
    }
    window.addEventListener('space-change', handleSpaceChange)
    return () => { window.removeEventListener('space-change', handleSpaceChange) }
  }, [])

  // ── App 列表 ──
  const sortAppList = (list: any[]) => {
    return list.sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime())
  }

  const getAppList = useCallback(async (options?: { silent?: boolean }) => {
    const userInfoString = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
    try {
      if (!options?.silent) setLoading(true)
      const res = await fetchAppList({
        chat_mode: CHAT_MODE,
        space_id: currentSpaceId,
        create_by: userInfoString?.userName,
      })
      const data = sortAppList(res.data) || []
      setAppList(data)
      patchWorkbenchCache(currentSpaceId, { appList: data })
      if (options?.silent) return res.data
      const chatId = localStorage.getItem('chatId') || ''
      const targetApp = (chatId && data.find((item: any) => String(item.chat_id) === String(chatId))) || data[0]
      if (targetApp) {
        setCurApp({ ...targetApp })
        setCurConv(targetApp.conv_uid ? { ...targetApp } : undefined)
        localStorage.setItem('chatId', String(targetApp.chat_id))
      } else {
        setCurApp(undefined)
        setCurConv(undefined)
        localStorage.removeItem('chatId')
      }
      return res.data
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [currentSpaceId])

  useEffect(() => {
    if (currentSpaceId === null || Number.isNaN(currentSpaceId)) return
    if (lastSpaceIdRef.current === currentSpaceId) return
    lastSpaceIdRef.current = currentSpaceId
    // 命中缓存（冷挂载但曾进入过工作台）时静默刷新，避免加载遮罩；新对话也静默
    const cached = getWorkbenchCache(currentSpaceId)
    getAppList(routeChatId === 'new' || cached ? { silent: true } : undefined)
  }, [currentSpaceId, getAppList, routeChatId])

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

  // 路由变为 'new' 时清除当前会话，确保展示欢迎页
  useEffect(() => {
    if (routeChatId === 'new') {
      setCurConv(undefined)
    }
  }, [routeChatId])

  // ── 统一发送逻辑 ──
  // 创建新会话（仅创建，不发送消息），返回创建后的会话对象
  const createNewConv = useCallback(async (): Promise<any> => {
    const appRes: any = await createApp({
      space_id: currentSpaceId,
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
      message.error('创建会话失败')
      return null
    }
    justCreatedRef.current = true
    const newApp = { ...app, title: app.title || '新建对话', biz_name: app.title || '新建对话' }
    setCurApp(newApp)
    setCurConv(newApp)
    localStorage.setItem('chatId', String(app.chat_id))
    setAppList((prev) => [newApp, ...prev])
    navigate({
      to: TASK_DETAIL_ROUTE,
      params: { taskId: String(app.chat_id) },
    })
    window.dispatchEvent(new CustomEvent('conversation-created'))
    return newApp
  }, [currentSpaceId, navigate])

  // 确保存在可用会话：已有则直接返回，没有则先创建（用于上传文件等需要 conv_uid 的场景）
  const ensureConv = useCallback(async (): Promise<any> => {
    if (curConv?.conv_uid) return curConv
    if (creating) return null
    setCreating(true)
    try {
      return await createNewConv()
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        message.error(err?.message || '创建会话失败')
      }
      return null
    } finally {
      setCreating(false)
    }
  }, [curConv, creating, createNewConv])

  const handleUnifiedSend = useCallback(async (value: string, options?: { mode?: ChatInputModeKey }) => {
    if (creating) return
    const sendMode = options?.mode || selectedMode

    // 所有对话模式共享同一数据前置条件，报告模式不得绕过交互模式的校验。
    if (!hasSelectedConversationData(selectedData, selectedExcel)) {
      message.warning('选择已有数据或上传excel，即可开始对话')
      return
    }

    const meta = {
      // 这里的分组是数据语义所属分组，不是对话分组
      groupName: selectedData?.groupName || '',
      semanticName: selectedData?.name || '',
      semanticSchemaId: selectedData?.schemaId,
      // 新建会话时通过 meta 把已选 Excel 透传到 Conversation，避免切换路由后状态丢失
      selectedExcel: selectedExcel?.file_id
        ? { file_id: selectedExcel.file_id, file_name: selectedExcel.file_name }
        : undefined,
    }

    const sendByMode = () => {
      if (sendMode === 'report') {
        // 同一 Conversation 只统一展示；报告发送仍走独立异步任务接口。
        if (!conversationRef.current?.handleReportSend) return false
        conversationRef.current.handleReportSend(value)
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
      if (!sendByMode()) {
        waitAndSend()
      }
      return
    }

    // 新建会话时不保留上一份 Excel（文件与 conv_uid 绑定）
    setSelectedExcel(null)

    // 无会话 → 先创建，再发送
    setCreating(true)
    try {
      const newApp = await createNewConv()
      if (!newApp) {
        setCreating(false)
        return
      }

      // 等待目标模式组件 mount 后通过 ref 发送。
      waitAndSend(0, () => setCreating(false))
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        message.error(err?.message || '创建会话失败')
      }
      setCreating(false)
    }
  }, [curConv, creating, selectedData, selectedExcel, selectedMode, createNewConv])

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
        if (isEdit) {
          const res = await updateApp(val)
          if (res?.success) {
            setIsEdit(false)
            setVisible(false)
            setEditData({})
            handleUpdateList(res?.data)
          }
          return Promise.resolve()
        }
        const res = await createApp(val)
        setIsEdit(false)
        await getAppList()
        const currentApp = { ...res.data }
        setCurApp(currentApp)
        localStorage.setItem('chatId', String(currentApp.chat_id))
        const newConvRes = await newConv(currentApp)
        setCurConv({ ...newConvRes.data, ...currentApp })
        setVisible(false)
        return Promise.resolve()
      } catch (e) {
        message.error('创建失败')
        return Promise.reject()
      }
    } else {
      setVisible(false)
      setIsEdit(false)
      setEditData({})
      return Promise.resolve()
    }
  }

  const handleDeleteApp = useCallback(async (item: any) => {
    Modal.confirm({
      title: '确认删除对话',
      content: '是否确认删除当前对话？删除后无法恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true)
          await deleteSession({ sessionId: item.chat_id, convUid: item.conv_uid })
          message.success('对话已删除')
          if (curApp.chat_id === item.chat_id) {
            setCurConv(undefined)
          }
          getAppList()
        } catch (error) {
          message.error('删除对话失败')
        } finally {
          setLoading(false)
        }
      },
    })
  }, [])

  const handleUpdateList = useCallback((data: any) => {
    const newApp = data?.newApp
    const newConv = data?.newConv
    if (newApp) {
      setAppList((prev) => [newApp, ...prev.filter((a) => a.chat_id !== newApp.chat_id)])
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
        setAppList((prev) => prev.map((app) => (app.chat_id === data.chat_id ? { ...app, ...data } : app)))
        if (curApp.chat_id === data.chat_id) {
          setCurApp((prev: any) => ({ ...prev, ...data }))
        }
      }
    }
  }, [])

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
      await updateApp(values)
      message.success('更新成功')
      setEditVisible(false)
      await getAppList()
    },
    [],
  )

  // 推荐示例点击 → 填入输入框
  const handleExampleClick = useCallback((text: string) => {
    setExternalInputValue(text)
  }, [])

  // 切换会话/空间时清空已选 Excel（文件与 conv_uid 绑定）
  useEffect(() => {
    setSelectedExcel(null)
  }, [curConv?.conv_uid, currentSpaceId])

  return (
    <div className="h-full w-full" style={{ background: 'transparent' }}>
      <div className="h-full w-full flex">
        {!hideSidebar && (
          <ConverList
            ref={converListRef}
            handleEdit={handleEdit}
            appList={appList}
            handleSetCurApp={handleSetCurApp}
            handleDeleteApp={handleDeleteApp}
            setFold={setFold}
            fold={fold}
          />
        )}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 顶部 header（永驻） */}
          {!curConv && (
            <ChatHeader
              conv={curApp || {}}
              ref={chatHeaderRef}
              setConvContent={() => {}}
              onUpdateList={handleUpdateList}
              setIsSharing={() => {}}
              onClose={() => {}}
              modelOptions={modelOptions}
              currentModel={currentModel}
              onModelChange={handleModelChange}
              onEmbedModelFound={(id) => setEmbedModelId(id)}
            />
          )}
          {/* 内容区域 */}
          <div className="flex-1 min-h-0">
            {curConv ? (
              <Conversation
                fold={hideSidebar ? false : fold}
                conv={curConv}
                ref={conversationRef}
                onClose={() => setCurConv(undefined)}
                onUpdateList={handleUpdateList}
                onLoadingChange={setConvLoading}
                onReportLoadingChange={setReportLoading}
                onReportPreviewChange={handleReportPreviewChange}
                semanticId={selectedData?.schemaId}
                selectedExcel={selectedExcel}
                modelOptions={modelOptions}
                currentModel={currentModel}
                onModelChange={handleModelChange}
                embedModelId={embedModelId}
                deepThinkEnabled={deepThinkEnabled}
                spaceId={currentSpaceId}
                onHistorySemanticLoaded={(data) => setSelectedData(data)}
              />
            ) : (!routeChatId || routeChatId === 'new') ? (
              <NewChatWelcome onExampleClick={handleExampleClick} />
            ) : null}
          </div>

          {/* 动画层只改变可见性和占位高度，ChatInput 始终挂载以保留未发送草稿。 */}
          <div className={`report-composer-presence ${reportPreviewOpen ? 'report-composer-hidden' : ''}`} aria-hidden={reportPreviewOpen}>
            <div className="report-composer-presence-inner">
              <div className="composer-wrap">
                <div className="max-w-[53.75rem] w-full m-auto">
                  <ChatInput
                    conv={curConv}
                    ensureConv={ensureConv}
                    loading={(selectedMode === 'report' ? reportLoading : convLoading) || creating}
                    onSend={handleUnifiedSend}
                    onStop={() => {
                      if (selectedMode === 'report') {
                        conversationRef.current?.stopReportGenerating()
                        return
                      }

                      conversationRef.current?.stopGenerating()
                    }}
                    deepThinkEnabled={deepThinkEnabled}
                    uploadFileEnabled={uploadFileEnabled}
                    currentModel={currentModel}
                    onToggleDeepThink={() => setDeepThinkEnabled(!deepThinkEnabled)}
                    onToggleUploadFile={() => setUploadFileEnabled(!uploadFileEnabled)}
                    spaceId={currentSpaceId}
                    semanticTree={semanticTree}
                    selectedData={selectedData}
                    onSelectData={setSelectedData}
                    selectedExcel={selectedExcel}
                    setSelectedExcel={setSelectedExcel}
                    semLoading={semLoading}
                    expandedSemGroups={expandedSemGroups}
                    onToggleSemGroup={toggleSemGroup}
                    externalValue={externalInputValue}
                    onExternalValueConsumed={() => setExternalInputValue('')}
                    selectedModeKey={selectedMode}
                    onModeChange={setSelectedMode}
                  />
                </div>
                <div className="chat-footer">内容由 AI 生成，请注意甄别</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CreateModal
        onClose={onClose}
        initialValues={{
          ...EditData,
          title: EditData.title || 'AI智能助手',
          biz_name: EditData.biz_name || 'AI智能助手',
        }}
        isEdit={isEdit}
        visible={visible}
      />
      <EditSessionModal
        visible={editVisible}
        initialValues={editItem}
        onClose={() => setEditVisible(false)}
        onOk={handleEditOk}
      />
    </div>
  )
}

export default ConversationAnalysis
