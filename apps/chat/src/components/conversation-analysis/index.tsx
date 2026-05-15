import { Empty, Modal, Spin } from 'antd'
import React, { useEffect, useCallback, useRef } from 'react'
import { useState } from 'react'
import { deleteConv, fetchConvList, newConv } from '../../service/api/conv'
import CreateModal from './CreateModal'
import { createApp, fetchAppList, updateApp } from '../../service/api/app'
import { CHAT_MODE } from '../../constant'
import Conversation from '../conversation'
import AllConversations from './AllConversations'
import { message } from 'antd'
import { getSpaceId } from '../../utils'
import ConverList from './conver_list'
// redux hooks已注释
// import { useAppDispatch, useAppSelector } from '../../store/redux/hooks';
// import { setConvListForChat, upsertConvForChat, removeConvForChat, clearConvListForChat, selectConvListByChatId, setDatasourceCache, selectDatasourceCache } from '../../store/redux/slices/conversations';

const LAST_CONV_UID_MAP_KEY = 'SOY-REACT_lastConvUidByChatId'

const getLastConvUidByChatId = (chatId?: string | number) => {
  if (!chatId) return ''
  try {
    const cache = JSON.parse(localStorage.getItem(LAST_CONV_UID_MAP_KEY) || '{}')
    return cache[String(chatId)] || ''
  } catch {
    return ''
  }
}

const setLastConvUidByChatId = (chatId?: string | number, convUid?: string) => {
  if (!chatId) return
  try {
    const cache = JSON.parse(localStorage.getItem(LAST_CONV_UID_MAP_KEY) || '{}')
    if (convUid) {
      cache[String(chatId)] = convUid
    } else {
      delete cache[String(chatId)]
    }
    localStorage.setItem(LAST_CONV_UID_MAP_KEY, JSON.stringify(cache))
  } catch {}
}

interface ConversationAnalysisProps {
  spaceId?: number
  chatId?: string
  hideSidebar?: boolean
}

const ConversationAnalysis: React.FC<ConversationAnalysisProps> = ({ spaceId: propSpaceId, chatId: routeChatId, hideSidebar = false }) => {
  const [visible, setVisible] = useState(false)
  const [curApp, setCurApp] = useState<any>({})
  const [appList, setAppList] = useState<any[]>([])
  const [curConv, setCurConv] = useState<any>()
  const [showAllConversations, setShowAllConversations] = useState(false)
  const [loading, setLoading] = useState(false)
  const lastSpaceIdRef = useRef<number | null>(null)
  const skipNextConvFetchRef = useRef(false)
  const [isEdit, setIsEdit] = useState(false)
  const [EditData, setEditData] = useState<any>({})
  const conversationRef = useRef<any>(null)
  const converListRef = useRef<any>(null)
  const [fold, setFold] = useState(false)
  const [currentSpaceId, setCurrentSpaceId] = useState<number>(() => {
    return propSpaceId !== undefined ? Number(propSpaceId) : getSpaceId()
  })

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
      }
    }
    window.addEventListener('space-change', handleSpaceChange)
    return () => {
      window.removeEventListener('space-change', handleSpaceChange)
    }
  }, [])

  // 按 create_time 排序
  const sortAppList = (list: any[]) => {
    return list.sort((a, b) => {
      return new Date(b.create_time).getTime() - new Date(a.create_time).getTime()
    })
  }

  const handleClearConvHistory = () => {
    conversationRef.current?.setConvContent([])
  }

  // 获取app列表
  const getAppList = useCallback(async () => {
    const userInfoString = JSON.parse(localStorage.getItem('SOY-REACT_userInfo')! || '')
    console.log(userInfoString)

    try {
      setLoading(true)
      const res = await fetchAppList({
        chat_mode: CHAT_MODE,
        space_id: currentSpaceId,
        create_by: userInfoString?.userName,
        // space_id: 73 //测试对话
      })
      const data = sortAppList(res.data) || []
      setAppList(data)
      const preferredChatId = routeChatId || localStorage.getItem('chatId') || ''
      const targetApp = (preferredChatId && data.find((item) => String(item.chat_id) === String(preferredChatId))) || data[0]

      if (targetApp) {
        setCurApp({ ...targetApp })
        localStorage.setItem('chatId', String(targetApp.chat_id))
      } else {
        setCurApp(undefined)
        setCurConv(undefined)
        localStorage.removeItem('chatId')
      }
      return res.data
    } finally {
      setLoading(false)
    }
  }, [currentSpaceId, routeChatId])

  useEffect(() => {
    // 防止StrictMode导致的重复调用，同时在 spaceId 变化时刷新列表
    if (currentSpaceId === null || Number.isNaN(currentSpaceId)) return
    if (lastSpaceIdRef.current === currentSpaceId) return
    lastSpaceIdRef.current = currentSpaceId
    getAppList()
  }, [currentSpaceId, getAppList])

  // 获取会话列表
  const getConvList = async () => {
    try {
      setLoading(true)

      const res = await fetchConvList({
        chat_id: curApp.chat_id,
        chat_mode: CHAT_MODE,
        space_id: currentSpaceId,
        // space_id: 73,
      })
      const convList = res.data || []
      if (convList.length) {
        const lastConvUid = getLastConvUidByChatId(curApp.chat_id)
        const targetConv = convList.find((item: any) => item.conv_uid === lastConvUid) || convList[0]
        setCurConv({ ...targetConv, ...curApp })
        setLastConvUidByChatId(curApp.chat_id, targetConv.conv_uid)
      } else {
        setCurConv(undefined)
        setLastConvUidByChatId(curApp.chat_id)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 如果有选中的app就获取会话列表
    if (curApp&&curApp.chat_id) {
      if (skipNextConvFetchRef.current) {
        skipNextConvFetchRef.current = false
      } else {
        getConvList()
      }
    }
  }, [curApp])

  useEffect(() => {
    if (!routeChatId || !appList.length) return
    const nextApp = appList.find((item) => String(item.chat_id) === String(routeChatId))
    if (!nextApp) return
    if (String(curApp?.chat_id) === String(nextApp.chat_id)) return
    setCurApp({ ...nextApp })
    localStorage.setItem('chatId', String(nextApp.chat_id))
    setShowAllConversations(false)
  }, [routeChatId, appList, curApp?.chat_id])

  const handleSetCurApp = useCallback((item: any) => {
    if (!item) return
    setCurApp({ ...item })
    localStorage.setItem('chatId', String(item.chat_id))
    setShowAllConversations(false)
  }, [])

  const onClose = async (val?: any) => {
    if (val) {
      try {
        // console.log(val,'创建接口 - push')
        // console.log( JSON.parse(val.chat_config) ,'--------- config')
        if (isEdit) {
          const res = await updateApp(val)
          if (res?.success) {
            // message.success('更新成功');
            setIsEdit(false)
            setVisible(false)
            setEditData({})
            handleUpdateList(res?.data)
          }
          return Promise.resolve()
        }
        // 1. 创建应用
        const res = await createApp(val)
        // console.log(val,'创建接口- data')
        setIsEdit(false)
        // 2. 刷新应用列表
        await getAppList()

        const currentApp = { ...res.data }
        setCurApp(currentApp)
        localStorage.setItem('chatId', String(currentApp.chat_id))

        // 4. 创建新会话
        const newConvRes = await newConv(currentApp)

        // 5. 获取会话列表
        // await getConvList();

        // 6. 设置当前会话
        setCurConv({ ...newConvRes.data, ...currentApp })
        setLastConvUidByChatId(currentApp.chat_id, newConvRes?.data?.conv_uid)

        setShowAllConversations(false)
        setVisible(false)
        return Promise.resolve()
      } catch (e) {
        message.error('创建失败')
        return Promise.reject()
      } finally {
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
          const res = await fetchConvList({
            chat_id: item.chat_id,
            chat_mode: CHAT_MODE,
            space_id: currentSpaceId,
          })
          if (res.data?.length) {
            await Promise.all(res.data.map((conv: any) => deleteConv({ conv_uid: conv.conv_uid })))
            message.success('对话已删除')
          }
          if (curApp.chat_id === item.chat_id) {
            setCurConv(undefined)
            setLastConvUidByChatId(item.chat_id)
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
      skipNextConvFetchRef.current = true
      setCurApp(newApp)
      localStorage.setItem('chatId', String(newApp.chat_id))
      if (newConv) {
        setCurConv({ ...newConv, ...newApp })
        setLastConvUidByChatId(newApp.chat_id, newConv.conv_uid)
      }
      setShowAllConversations(false)
      return
    }
    if (data) {
      // 更新curConv
      if (data.conv_uid) {
        setCurConv((prev: any) => ({ ...prev, ...data }))
        setLastConvUidByChatId(data.chat_id || curApp.chat_id, data.conv_uid)
      }
      // 同步更新appList和curApp（编辑对话名称等信息）
      if (data.chat_id) {
        setAppList((prev) => prev.map((app) => (app.chat_id === data.chat_id ? { ...app, ...data } : app)))
        if (curApp.chat_id === data.chat_id) {
          setCurApp((prev: any) => ({ ...prev, ...data }))
        }
      }
    }
  }, [])

  const handleEdit = useCallback((key?: string, item?: any) => {
    setIsEdit(key === 'edit')
    setVisible(true)
    if (item) {
      setEditData(item)
    }
  }, [])

  return (
    <Spin spinning={loading} wrapperClassName="h-full">
      <div className="h-full w-full flex bg-white">
        {!hideSidebar && (
          <ConverList
            ref={converListRef}
            handleEdit={handleEdit}
            appList={appList}
            handleSetCurApp={handleSetCurApp}
            handleDeleteApp={handleDeleteApp}
            setShowAllConversations={setShowAllConversations}
            onUpdateList={handleUpdateList}
            handleClearConvHistory={handleClearConvHistory}
            setFold={setFold}
            fold={fold}
          />
        )}
        <div className="flex-1 min-w-0">
          {curConv && !showAllConversations && (
            <Conversation
              fold={hideSidebar ? false : fold}
              conv={curConv}
              ref={conversationRef}
              onClose={() => setCurConv(undefined)}
              onUpdateList={handleUpdateList}
            />
          )}
          {!curConv && !showAllConversations && (
            <div className="h-full w-full flex items-center justify-center">
              <Empty description="暂无可用对话" />
            </div>
          )}
          {showAllConversations && (
            <AllConversations
              onClose={() => setShowAllConversations(false)}
              onSelectApp={(item) => handleSetCurApp(item)}
              onUpdateList={handleUpdateList}
            />
          )}
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
    </Spin>
  )
}

export default ConversationAnalysis
