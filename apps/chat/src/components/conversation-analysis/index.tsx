import { Modal } from 'antd'
import React, { useEffect, useCallback, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { newConv } from '../../service/api/conv'
import CreateModal from './CreateModal'
import EditSessionModal from './EditSessionModal'
import { createApp, deleteSession, fetchAppList, updateApp } from '../../service/api/app'
import { fetchSemanticGroups, fetchSemanticSchemas } from '../../service/api/semantic'
import { fetchModelList } from '../../service/api/abi-system'
import { CHAT_MODE } from '../../constant'
import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import Conversation from '../conversation'
import type { ConversationHandle } from '../conversation'
import ChatHeader from '../conversation/components/chat-header'
import type { ModelOption } from '../conversation/components/chat-header'
import NewChatWelcome from './NewChatWelcome'
import GroupSessionListView from './GroupSessionListView'
import ChatInput from '../conversation/components/chat-input'
import type { SemanticSelectedData } from '../conversation/components/chat-input'
import { message } from 'antd'
import { getSpaceId } from '../../utils'
import ConverList from './conver_list'

interface ConversationAnalysisProps {
  spaceId?: number
  chatId?: string
  hideSidebar?: boolean
  groupId?: string
}

const ConversationAnalysis: React.FC<ConversationAnalysisProps> = ({ spaceId: propSpaceId, chatId: routeChatId, hideSidebar = false, groupId }) => {
  const [visible, setVisible] = useState(false)
  const [curApp, setCurApp] = useState<any>({})
  const [appList, setAppList] = useState<any[]>([])
  const [curConv, setCurConv] = useState<any>()
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
  const [currentSpaceId, setCurrentSpaceId] = useState<number>(() => {
    return propSpaceId !== undefined ? Number(propSpaceId) : getSpaceId()
  })

  // ── 统一输入框状态 ──
  const [convLoading, setConvLoading] = useState(false)
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(false)
  const [uploadFileEnabled, setUploadFileEnabled] = useState(false)
  const [externalInputValue, setExternalInputValue] = useState('')
  const [creating, setCreating] = useState(false)
  const [groupRefreshKey, setGroupRefreshKey] = useState(0)
  const chatHeaderRef = useRef<any>(null)

  // ── 模型列表状态（全局加载一次）──
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([])
  const [currentModel, setCurrentModel] = useState<ModelOption | null>(null)
  const [embedModelId, setEmbedModelId] = useState<string | number>('')
  const modelLoadedRef = useRef(false)

  // ── 数据语义状态（从 NewChatWelcome 迁移）──
  const [semanticGroups, setSemanticGroups] = useState<any[]>([])
  const [semanticGroupSchemas, setSemanticGroupSchemas] = useState<Map<string, any[]>>(new Map())
  const [expandedSemGroups, setExpandedSemGroups] = useState<Set<string>>(new Set())
  const [selectedData, setSelectedData] = useState<SemanticSelectedData | null>(null)
  const [selectedExcel, setSelectedExcel] = useState<any>(null)
  const [semLoading, setSemLoading] = useState(false)
  const semGroupsLoadedRef = useRef(false)

  // ── 模型列表加载（只调一次）──
  useEffect(() => {
    if (modelLoadedRef.current) return
    modelLoadedRef.current = true
    fetchModelList({ spaceId: currentSpaceId })
      .then((res: any) => {
        const list = res?.data?.data || res?.data || []
        if (Array.isArray(list) && list.length > 0) {
          // 找到嵌入模型（从完整列表中查找）
          const embedModel = list.find((item: any) => item.modelKey === 'bge-large')
          if (embedModel) {
            setEmbedModelId(embedModel.modelId ?? embedModel.id ?? embedModel.llmId)
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
          }))
          setModelOptions(options)
          if (options.length > 0) {
            setCurrentModel(options[0])
          }
        }
      })
      .catch(() => {})
  }, [currentSpaceId])

  const handleModelChange = useCallback((model: ModelOption) => {
    setCurrentModel(model)
  }, [])

  // ── 数据语义加载 ──
  useEffect(() => {
    if (semGroupsLoadedRef.current) return
    semGroupsLoadedRef.current = true
    setSemLoading(true)
    fetchSemanticGroups({ groupType: 'shema', pageNum: 1, pageSize: 100, spaceId: currentSpaceId })
      .then((res: any) => {
        const list = res?.data || res?.rows || []
        setSemanticGroups(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
      .finally(() => setSemLoading(false))
  }, [currentSpaceId])

  const toggleSemGroup = useCallback((groupId: string) => {
    setExpandedSemGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
        if (!semanticGroupSchemas.has(groupId)) {
          fetchSemanticSchemas({ groupId: groupId, pageNum: 1, pageSize: 100 })
            .then((res: any) => {
              const list = res?.data || res?.rows || []
              setSemanticGroupSchemas(prev => new Map(prev).set(groupId, Array.isArray(list) ? list : []))
            })
            .catch(() => {})
        }
      }
      return next
    })
  }, [semanticGroupSchemas])

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
    getAppList(routeChatId === 'new' ? { silent: true } : undefined)
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

  // 路由变为 'new' 时清除当前会话，确保展示欢迎页或分组列表
  // 同时加入 groupId 依赖：从对话切回分组视图时，即使 routeChatId 未变也会强制清除 curConv
  useEffect(() => {
    if (routeChatId === 'new' || groupId) {
      setCurConv(undefined)
    }
  }, [routeChatId, groupId])

  // ── 统一发送逻辑 ──
  // 创建新会话（仅创建，不发送消息），返回创建后的会话对象
  const createNewConv = useCallback(async (): Promise<any> => {
    const appRes: any = await createApp({
      space_id: currentSpaceId,
      ...(groupId ? { groupId: String(groupId) } : {}),
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
  }, [currentSpaceId, groupId, navigate])

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

  const handleUnifiedSend = useCallback(async (value: string) => {
    if (creating) return

    // 校验是否已选数据语义或 Excel 文件
    if (!selectedData?.schemaId && !selectedExcel?.file_id) {
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

    // 已有会话 → 直接通过 ref 发送
    if (curConv && conversationRef.current) {
      conversationRef.current.handleSend(value, meta)
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

      // 等待 Conversation mount 后通过 ref 发送
      const waitAndSend = (retries = 0) => {
        if (retries > 20) { setCreating(false); return }
        requestAnimationFrame(() => {
          if (conversationRef.current?.handleSend) {
            conversationRef.current.handleSend(value, meta)
            setCreating(false)
          } else {
            setTimeout(() => waitAndSend(retries + 1), 50)
          }
        })
      }
      waitAndSend()
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        message.error(err?.message || '创建会话失败')
      }
      setCreating(false)
    }
  }, [curConv, creating, selectedData, selectedExcel, createNewConv])

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

  // 分组视图：打开已有会话（复用同一路由，只切中间内容）
  const openSession = useCallback(
    (chatId: string) => {
      navigate({ to: TASK_DETAIL_ROUTE, params: { taskId: String(chatId) } })
    },
    [navigate],
  )

  // 分组视图：当前分组被删除后回到欢迎页
  const handleGroupDeleted = useCallback(() => {
    navigate({ to: TASK_DETAIL_ROUTE, params: { taskId: 'new' } })
  }, [navigate])

  // 分组列表刷新信号（会话创建/删除/移动时）
  useEffect(() => {
    const handler = () => setGroupRefreshKey((k) => k + 1)
    window.addEventListener('conversation-created', handler)
    return () => window.removeEventListener('conversation-created', handler)
  }, [])

  return (
    <div className="h-full w-full" style={{ background: 'transparent' }}>
      <div className="h-full w-full flex" style={{ background: '#F5F5FA' }}>
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
                semanticId={selectedData?.schemaId}
                selectedExcel={selectedExcel}
                modelOptions={modelOptions}
                currentModel={currentModel}
                onModelChange={handleModelChange}
                embedModelId={embedModelId}
                deepThinkEnabled={deepThinkEnabled}
                onHistorySemanticLoaded={(data) => setSelectedData(data)}
              />
            ) : groupId ? (
              <GroupSessionListView
                groupId={groupId}
                onOpenSession={openSession}
                onGroupDeleted={handleGroupDeleted}
                refreshKey={groupRefreshKey}
              />
            ) : (!routeChatId || routeChatId === 'new') ? (
              <NewChatWelcome onExampleClick={handleExampleClick} />
            ) : null}
          </div>

          {/* 统一输入框（永驻） */}
          <div className="composer-wrap">
            <div className="max-w-[53.75rem] w-full m-auto">
              <ChatInput
                conv={curConv}
                ensureConv={ensureConv}
                loading={convLoading || creating}
                onSend={handleUnifiedSend}
                onStop={() => conversationRef.current?.stopGenerating()}
                deepThinkEnabled={deepThinkEnabled}
                uploadFileEnabled={uploadFileEnabled}
                onToggleDeepThink={() => setDeepThinkEnabled(!deepThinkEnabled)}
                onToggleUploadFile={() => setUploadFileEnabled(!uploadFileEnabled)}
                spaceId={currentSpaceId}
                semanticGroups={semanticGroups}
                semanticGroupSchemas={semanticGroupSchemas}
                selectedData={selectedData}
                onSelectData={setSelectedData}
                selectedExcel={selectedExcel}
                setSelectedExcel={setSelectedExcel}
                semLoading={semLoading}
                expandedSemGroups={expandedSemGroups}
                onToggleSemGroup={toggleSemGroup}
                externalValue={externalInputValue}
                onExternalValueConsumed={() => setExternalInputValue('')}
              />
            </div>
            <div className="chat-footer">内容由 AI 生成，请注意甄别</div>
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
