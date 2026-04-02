import { Form, message } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import cloneDeep from 'lodash/cloneDeep'

import { fetchOperate, fetchShareEmail } from '../../../service/api/abi-system'
import {
  fetchConvHistoryRoundGrouped,
  fetchConvMaxRound,
  fetchDimension,
  fetchExceptionGuidance,
  groupMessagesByOrder,
  fetchQueryRewrite,
  fetchRecommendQuestion,
  fetchRecommendedQuestionOpenings,
  streamConvAnswer
} from '../../../service/api/conv'
import { useDebugStore } from '../../../store'
import { getHumanInHistoryByOrderIndex, getOpeningText } from '../../../utils'
import { useScreenshot } from '../useScreenShot'

import type { chatHeaderRefMethod } from '../../../types'

export interface ConversationProps {
  conv: any
  onClose: () => void
  onUpdateList: (data: any) => void
  fold: boolean
}

const groupConversationByOrder = (messages: any[]) => {
  const firstMessageGroups = messages
    .filter((item: any) => item?.role === 'first')
    .map((item: any) => [item])
  const normalMessages = messages.filter((item: any) => item?.role !== 'first')
  return [...firstMessageGroups, ...groupMessagesByOrder(normalMessages)]
}

const mergeAiMessagesForRender = (aiMessages: any[]) => {
  if (!aiMessages.length) return null

  const lastAi = aiMessages[aiMessages.length - 1]
  const latestWithContent = [...aiMessages].reverse().find((item: any) => String(item?.context || '').trim())
  const mergedContext = latestWithContent?.context ?? lastAi?.context ?? ''

  return {
    ...lastAi,
    context: mergedContext,
    aiSteps: aiMessages.map((item: any, index: number) => ({
      id: `${item?.order ?? 'temp'}-${index}`,
      name: item?.name || '',
      content: item?.context || '',
      role: item?.role,
      order: item?.order,
      roundIndex: item?.roundIndex
    }))
  }
}

const groupConversationByOrder3d = (groups2d: any[][]) => {
  return groups2d.map((group: any[]) => {
    if (!Array.isArray(group) || !group.length) return []

    if (group.length === 1 && group[0]?.role === 'first') {
      return [[group[0]]]
    }

    const humanItems = group.filter((item: any) => item?.role === 'human')
    const aiItems = group.filter((item: any) => item?.role === 'ai')
    const viewItems = group.filter((item: any) => item?.role === 'view')
    const otherItems = group.filter((item: any) => !['first', 'human', 'ai', 'view'].includes(item?.role))

    const mergedAi = mergeAiMessagesForRender(aiItems)
    const bodyItems = [...(mergedAi ? [mergedAi] : []), ...viewItems, ...otherItems]

    const sections: any[][] = []
    if (humanItems.length) sections.push(humanItems)
    if (bodyItems.length) sections.push(bodyItems)

    if (!sections.length) {
      sections.push(group)
    }

    return sections
  })
}

export const useConversationController = (
  props: ConversationProps,
  ref: React.Ref<{ setConvContent: (content: any[]) => void }>
) => {
  const { conv, onClose, onUpdateList } = props
  const [confirmShareType, setConfirmShareType] = useState('')
  const [shareEmailForm] = Form.useForm()
  const [shareStep, setShareStep] = useState(1)
  const [isStorage, setIsStorage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [convContent, setConvContent] = useState<any[]>([])
  const convContent2d = useMemo(() => groupConversationByOrder(convContent), [convContent])
  const convContent3d = useMemo(() => groupConversationByOrder3d(convContent2d), [convContent2d])
  const [currentMessage, setCurrentMessage] = useState('')
  const [checkAll, setCheckAll] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [sharingList, setSharingList] = useState<any[]>([])
  const [confirmShareVisible, setConfirmShareVisible] = useState(false)
  const [confirmShareLoading, setConfirmShareLoading] = useState(false)
  const [paramsData, setParamsData] = useState<any>(null)
  const isFirstMessage = useRef(true)
  const isRequesting = useRef(false)
  const messageRef = useRef('')
  const groupCountRef = useRef(0)
  const closedGroupCountRef = useRef(0)
  const abortController = useRef<AbortController | null>(null)
  const [loadingRoundIndex, setLoadingRoundIndex] = useState<number>(0)
  const startTimeRef = useRef<number>(0)
  const [isGettingData, setIsGettingData] = useState(false)
  const hasTriggeredIsGetting = useRef(false)
  const [selectedExcel, setSelectedExcel] = useState<any>({})
  const [referenceDialog, setReferenceDialog] = useState<any>({})
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(false)
  const [uploadFileEnabled, setUploadFileEnabled] = useState(false)
  const [cur, setCur] = useState<any>()
  const [debugModalVisible, setDebugModalVisible] = useState(false)
  const {
    setDebugInfoMap,
    setUserDebugInfoMap,
    userDebugInfoMap
  } = useDebugStore()
  const isMessageAdded = useRef(false)
  const [smLoading, setSmLoading] = useState(false)
  const [doneStatus, setDoneStatus] = useState(false)
  const prevSpaceId = useRef<number | undefined>(undefined)
  const webSocketViewAdded = useRef(false)
  const isAborting = useRef(false)
  const [exceptionGuidanceLoading, setExceptionGuidanceLoading] = useState(false)
  const [tempUserId, setTempUserId] = useState<string>('')
  const baseId = useId()

  const [minRoundIndex, setMinRoundIndex] = useState<number | undefined>(undefined)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const chatHeaderRef = useRef<chatHeaderRefMethod>(null)
  const requestTokenRef = useRef(0)
  const wsRef = useRef<WebSocket | null>(null)
  const wsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [hasError, setHasError] = useState(false)

  const { ref: sharingRef, download } = useScreenshot()

  const nextRequestToken = () => {
    requestTokenRef.current += 1
    return requestTokenRef.current
  }

  const isRequestTokenActive = (token: number) => requestTokenRef.current === token

  useImperativeHandle(ref, () => ({
    setConvContent
  }))

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  const loadMoreHistory = async () => {
    if (historyLoading || !hasMoreHistory || minRoundIndex === undefined) return

    const chatContainer = chatContainerRef.current
    if (!chatContainer) return

    const oldScrollHeight = chatContainer.scrollHeight
    const oldScrollTop = chatContainer.scrollTop

    let isLocked = true
    const maintainScroll = () => {
      if (isLocked && chatContainer) {
        const currentHeight = chatContainer.scrollHeight
        const heightDiff = currentHeight - oldScrollHeight
        const targetScroll = oldScrollTop + heightDiff
        if (chatContainer.scrollTop !== targetScroll) {
          chatContainer.scrollTop = targetScroll
        }
      }
    }

    const observer = new MutationObserver(() => {
      maintainScroll()
    })

    observer.observe(chatContainer, {
      childList: true,
      subtree: true,
      attributes: false
    })

    const preventScroll = (event: Event) => {
      if (isLocked) {
        event.preventDefault()
        event.stopPropagation()
        maintainScroll()
      }
    }

    const originalOverflow = chatContainer.style.overflow
    const originalScrollBehavior = chatContainer.style.scrollBehavior
    chatContainer.style.overflow = 'hidden'
    chatContainer.style.scrollBehavior = 'auto'
    chatContainer.addEventListener('scroll', preventScroll, { capture: true, passive: false })

    isLoadingHistory.current = true
    setHistoryLoading(true)

    try {
      const res = await fetchConvHistoryRoundGrouped({
        conv_uid: conv.conv_uid,
        round_index: minRoundIndex
      })

      const newMessages = (res?.data || []).flat()
      if (newMessages.length < 10) {
        setHasMoreHistory(false)
      }

      if (newMessages.length > 0) {
        const orders = newMessages.map((item: any) => item.order)
        const newMin = Math.min(...orders)
        setMinRoundIndex(newMin)

        const processedMessages = newMessages.map((item: any) => ({
          ...item,
          roundIndex: item.order,
          describe: true,
          arrowStatus: true
        }))

        flushSync(() => {
          setConvContent((prev) => {
            const opening = prev.length > 0 ? prev[0] : null
            const rest = prev.length > 0 ? prev.slice(1) : []
            const hasOpening = opening && opening.role === 'first'

            if (hasOpening) {
              return [opening, ...processedMessages, ...rest]
            }
            return [...processedMessages, ...prev]
          })
        })

        maintainScroll()

        const checkInterval = setInterval(maintainScroll, 0)

        setTimeout(() => {
          clearInterval(checkInterval)
          isLocked = false
          observer.disconnect()
          chatContainer.removeEventListener('scroll', preventScroll, { capture: true } as any)
          chatContainer.style.overflow = originalOverflow
          chatContainer.style.scrollBehavior = originalScrollBehavior

          setHistoryLoading(false)
          isLoadingHistory.current = false
          canLoadMore.current = true
        }, 100)
      } else {
        isLocked = false
        observer.disconnect()
        chatContainer.removeEventListener('scroll', preventScroll, { capture: true } as any)
        chatContainer.style.overflow = originalOverflow
        chatContainer.style.scrollBehavior = originalScrollBehavior
        setHistoryLoading(false)
        isLoadingHistory.current = false
        canLoadMore.current = true
      }
    } catch (error) {
      isLocked = false
      observer.disconnect()
      chatContainer.removeEventListener('scroll', preventScroll, { capture: true } as any)
      chatContainer.style.overflow = originalOverflow
      chatContainer.style.scrollBehavior = originalScrollBehavior
      setHistoryLoading(false)
      isLoadingHistory.current = false
      canLoadMore.current = true
    }
  }

  const [userScrolled, setUserScrolled] = useState(false)
  const lastScrollTop = useRef(0)
  const canLoadMore = useRef(false)
  const isLoadingHistory = useRef(false)

  const handleCollect = async () => {
    const userInfoString = localStorage.getItem('SOY-REACT_userInfo')
    const userInfo = JSON.parse(userInfoString || '{}')
    fetchOperate({
      ...conv,
      type: 1,
      name: conv.biz_name || 'AI智能助手',
      operator: userInfo.userName,
      update_by: userInfo.userName,
      create_by: userInfo.userName
    })
  }

  useEffect(() => {
    const chatContainer = chatContainerRef.current
    if (!chatContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer
      const isScrollingUp = scrollTop < lastScrollTop.current
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (isScrollingUp && distanceFromBottom > 100) {
        setUserScrolled(true)
      } else if (distanceFromBottom <= 50) {
        setUserScrolled(false)
      }

      if (canLoadMore.current && isScrollingUp && hasMoreHistory && !historyLoading && minRoundIndex !== undefined) {
        const getMsgId = document.querySelector(`#human-msg-${minRoundIndex + 2}`)?.getBoundingClientRect()
        const containerRect = chatContainer.getBoundingClientRect()
        if (getMsgId && getMsgId.top <= containerRect.bottom && getMsgId.bottom >= containerRect.top) {
          canLoadMore.current = false
          loadMoreHistory()
        }
      }

      lastScrollTop.current = scrollTop
    }

    chatContainer.addEventListener('scroll', handleScroll)
    return () => chatContainer.removeEventListener('scroll', handleScroll)
  }, [hasMoreHistory, historyLoading, minRoundIndex, conv.conv_uid])

  useEffect(() => {
    if (!userScrolled && !historyLoading && !isLoadingHistory.current) {
      scrollToBottom()
    }
  }, [convContent, currentMessage, userScrolled, historyLoading])

  useEffect(() => {
    const requestToken = nextRequestToken()
    if (isRequesting.current) {
      stopGenerating()
    }

    if (wsRef.current) {
      wsRef.current.close()
    }
    if (wsTimeoutRef.current) {
      clearTimeout(wsTimeoutRef.current)
      wsTimeoutRef.current = null
    }

    const currentSpaceId = conv.space_id
    if (prevSpaceId.current !== undefined && prevSpaceId.current !== currentSpaceId) {
      // cache cleared
    }
    prevSpaceId.current = currentSpaceId
    handleCollect()
    chatHeaderRef.current?.handleIsFavorite()
    setSelectedExcel({})
    setReferenceDialog({})

    setMinRoundIndex(undefined)
    setHasMoreHistory(true)
    setHistoryLoading(false)
    canLoadMore.current = false
    isLoadingHistory.current = false

    handleChatHistory(requestToken)

    const { model_name, biz_name, chat_config, ...elseCov } = conv
    const context = {
      ...elseCov,
      app_code: conv.app_code || conv.chat_mode,
      extra: {
        db_name: '',
        if_debug: true,
        dsl_or_db: 'db',
        predict_type: 'time_series_predict',
        predict_param: {},
        sql: ''
      }
    }
    const paramData = {
      model: window.APP_CONFIG.VITE_CHAT_MODEL || 'qwen3:30b-a3b-fp16',
      stream: true,
      temperature: 0.0,
      max_new_tokens: 4096,
      incremental: true,
      enable_vis: false,
      context: context
    }
    setParamsData(paramData)
  }, [conv])

  const handleChatHistory = async (requestToken: number) => {
    if (conv && conv.conv_uid) {
      let isUpdate = false
      let maxOrder = 0
      await getHistory(isUpdate, maxOrder, requestToken)
    }
  }

  const getHistory = async (isUpdate: boolean, maxOrder: number, requestToken: number) => {
    let conversationList: any = []
    const { conv_uid: convUid = '', agent_id: agentId = '' } = conv
    const text: string = getOpeningText(false)
    let openingMessage = {
      question: {
        items: [],
        page: 1,
        page_size: 0,
        total_count: 0,
        total_pages: 1
      },
      context: text,
      role: 'first',
      id: `opening_${convUid}`,
      timestamp: Date.now()
    }
    try {
      let questionData = []
      if (agentId) {
        const res2: any = await fetchRecommendedQuestionOpenings({
          agent_id: agentId,
          page_size: 100,
          page: 3
        })
        if (!isRequestTokenActive(requestToken)) return

        questionData = res2?.data?.items || []
        if (!res2?.success || !res2) {
          openingMessage = {
            question: {
              items: [],
              page: 1,
              page_size: 0,
              total_count: 0,
              total_pages: 1
            },
            context: getOpeningText(false),
            role: 'first',
            id: `opening_${convUid}`,
            timestamp: Date.now()
          }
        }
      }

      let text: string = getOpeningText(questionData.length > 0)

      openingMessage = {
        question: {
          items: questionData,
          page: 1,
          page_size: questionData.length,
          total_count: questionData.length,
          total_pages: 1
        },
        context: text,
        role: 'first',
        id: `opening_${convUid}`,
        timestamp: Date.now()
      }
    } catch {}

    if (convUid) {
      let result: any = []
      conversationList = [openingMessage]
      result = await fetchConvHistoryRoundGrouped({
        conv_uid: convUid
      })
      if (!isRequestTokenActive(requestToken)) return

      const flatHistory = (result?.data || []).flat()

      if (flatHistory.length > 0) {
        const orders = flatHistory.map((item: any) => item.order)
        const minOrder = Math.min(...orders)
        if (!isRequestTokenActive(requestToken)) return
        setMinRoundIndex(minOrder)

        if (flatHistory.length < 10) {
          setHasMoreHistory(false)
        } else {
          setHasMoreHistory(true)
        }

        flatHistory.forEach((item: any) => {
          setUserDebugInfoMap({
            order: item.order,
            roundIndex: item.order
          })
        })
      } else {
        setHasMoreHistory(false)
      }
      conversationList = conversationList.concat(flatHistory)
    }

    if (!isRequestTokenActive(requestToken)) return
    setConvContent(
      conversationList.map((item: any) => {
        return {
          ...item,
          roundIndex: item.order,
          describe: true,
          arrowStatus: true
        }
      })
    )

    setTimeout(() => {
      if (!isRequestTokenActive(requestToken)) return
      scrollToBottom()
      setTimeout(() => {
        if (!isRequestTokenActive(requestToken)) return
        canLoadMore.current = true
      }, 500)
    }, 300)
  }

  const stopGenerating = () => {
    if (abortController.current) {
      isAborting.current = true
      abortController.current.abort()
      abortController.current = null
      isRequesting.current = false
      setLoading(false)
      setIsGettingData(false)
      setSmLoading(false)
      isMessageAdded.current = false
      hasTriggeredIsGetting.current = false

      setConvContent((prevState: any[]) => {
        return prevState.map((item: any) => {
          if (item.role === 'ai' && item.smLoading) {
            return {
              ...item,
              smLoading: false,
              isStreaming: false,
              isDone: true
            }
          }
          return item
        })
      })

      message.error('请求已中断')
    }
  }

  const handleExceptionGuidance = async (data: any) => {
    setExceptionGuidanceLoading(true)
    const res: any = await fetchExceptionGuidance({
      ...data,
      extra: { except_guidance: 'true' }
    })
    console.log(res)
    updateAiMessage({ context: res.content })

    setExceptionGuidanceLoading(false)
  }

  const connectWebSocket = (convUid: string, roundIndex: number) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    try {
      const baseUrl = window.APP_CONFIG.VITE_WEBSOCKET_API
      const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
      const url = `${normalizedBaseUrl}/ws-proxy/abi-debug/ws/stream/consume?convUid=${convUid}&roundIndex=${roundIndex}`

      wsRef.current = new WebSocket(url)

      if (wsTimeoutRef.current) {
        clearTimeout(wsTimeoutRef.current)
      }

      wsTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket连接超时')
          wsRef.current.close()
          setLoading(false)
          setIsGettingData(false)
          setSmLoading(false)
          isRequesting.current = false
          message.error('WebSocket连接超时，请重试')
        }
        wsTimeoutRef.current = null
      }, 10000)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        if (wsTimeoutRef.current) {
          clearTimeout(wsTimeoutRef.current)
          wsTimeoutRef.current = null
        }

        setDebugInfoMap({
          uid: `${convUid}_${roundIndex}`,
          metrics: {
            current_stage: 1
          },
          loading: true
        })
      }

      let partialMessage = ''
      wsRef.current.onmessage = (event) => {
        const message = event.data

        try {
          if (message) {
            partialMessage += message
            while (partialMessage.startsWith('{') && partialMessage.endsWith('}')) {
              try {
                const debugInfo = JSON.parse(partialMessage)

                if (debugInfo.logs?.length > 0 && debugInfo.logs[0] && !exceptionGuidanceLoading) {
                  handleExceptionGuidance({
                    conv_uid: convUid,
                    round_index: roundIndex
                  })
                }

                const enhancedDebugInfo = {
                  ...debugInfo,
                  name: debugInfo.name || {}
                }

                setDebugInfoMap(enhancedDebugInfo)

                partialMessage = ''
                setHasError(false)
              } catch (error) {
                setHasError(true)
                console.error('Error parsing message:', error)
                break
              }
            }
          }
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        if (wsTimeoutRef.current) {
          clearTimeout(wsTimeoutRef.current)
          wsTimeoutRef.current = null
        }

        setLoading(false)
        setIsGettingData(false)
        setSmLoading(false)
        isRequesting.current = false
        message.error('WebSocket连接异常，请重试')
      }
      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        })
        if (wsTimeoutRef.current) {
          clearTimeout(wsTimeoutRef.current)
          wsTimeoutRef.current = null
        }

        if (!event.wasClean) {
          console.warn('WebSocket异常关闭，清理loading状态')
          setLoading(false)
          setIsGettingData(false)
          setSmLoading(false)
          isRequesting.current = false
        }
      }
    } catch (error) {
      console.error('WebSocket连接创建失败:', error)
      if (wsTimeoutRef.current) {
        clearTimeout(wsTimeoutRef.current)
        wsTimeoutRef.current = null
      }

      setLoading(false)
      setIsGettingData(false)
      setSmLoading(false)
      isRequesting.current = false
      message.error('WebSocket连接创建失败，请重试')
    }
  }

  const syncTempOrderToRoundIndex = (tempOrder: string, roundIndex: number) => {
    setConvContent((prevState: any[]) => {
      return prevState.map((item: any) => {
        if (item.order === tempOrder) {
          return {
            ...item,
            order: roundIndex,
            roundIndex
          }
        }
        return item
      })
    })
  }

  const getAnswer = async ({ question, IC }: any) => {
    if (isRequesting.current) {
      return
    }
    const tempUserId = `${baseId}-${Date.now()}`
    setTempUserId(tempUserId)

    setTimeout(scrollToBottom, 300)
    abortController.current = new AbortController()
    isAborting.current = false
    const params = cloneDeep(paramsData)
    params.context.extra.db_name = ''
    params.context.extra.modelName = ''
    params.messages = question
    params.context.extra.sql_command = ''
    if (!deepThinkEnabled) {
      params.context.extra.quick_mode = true
    }

    const userMessage = {
      context: question,
      role: 'human',
      id: Date.now(),
      order: tempUserId,
      roundIndex: tempUserId
    }
    setConvContent((state) => [...state, userMessage])

    const startTime = performance.now()
    setLoading(true)
    isRequesting.current = true
    messageRef.current = ''
    startTimeRef.current = startTime
    isMessageAdded.current = false
    webSocketViewAdded.current = false
    setSmLoading(false)
    setDoneStatus(false)
    setCurrentMessage('')

    try {
      isFirstMessage.current = true

      hasTriggeredIsGetting.current = false
      setIsGettingData(false)

      if (selectedExcel?.file_id) {
        params.context.app_code = 'chat_excel'
        params.context.chat_mode = 'chat_excel'
        params.context.extra.excel_file_id = selectedExcel.file_id
      }
      if (referenceDialog?.order) {
        params.context.extra.conv_uid = conv.conv_uid
        params.context.extra.round_index = referenceDialog.order
      }

      if (IC) {
        params.context.extra.clarify_flag = IC.clarify_flag
        params.context.extra.chat_mode = IC.chat_mode
        if (IC.extra) {
          Object.assign(params.context.extra, IC.extra)
        }
        if (IC.structured_data) {
          params.context.extra.structured_data = IC.structured_data
        }
      }

      let roundIndex: any = undefined
      let retryCount = 0
      const maxRetries = 2

      await streamConvAnswer({
        data: params,
        signal: abortController.current.signal,
        async onopen(response) {
          const contentType = response.headers.get('content-type') || ''
          if (response.ok && contentType.includes('text/event-stream')) {
            retryCount = 0
            return
          }

          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`HTTP ${response.status}: 请求失败，请检查请求参数`)
          }

          if (retryCount >= maxRetries) {
            throw new Error('对话接口发生异常，请检查系统！')
          }
        },
        async onmessage(event) {
          if (event.data) {
            if (event.data.includes('round_index')) {
              const roundIndexMatch = event.data.match(/round_index:(\d+)/)
              if (roundIndexMatch) {
                const extractedRoundIndex = parseInt(roundIndexMatch[1], 10)
                roundIndex = Number(extractedRoundIndex)
                setLoadingRoundIndex(roundIndex)
                setUserDebugInfoMap({
                  order: tempUserId,
                  roundIndex
                })
                setUserDebugInfoMap({
                  order: roundIndex,
                  roundIndex
                })
                syncTempOrderToRoundIndex(tempUserId, roundIndex)
              }
            }

            if (!event.data.includes('chatcmpl')) {
              messageRef.current += event.data

              const startCount = (messageRef.current.match(/<think>/g) || []).length
              const endCount = (messageRef.current.match(/<\/think>/g) || []).length

              if (endCount > closedGroupCountRef.current) {
                closedGroupCountRef.current = endCount
              }

              if (startCount > groupCountRef.current) {
                updateAiMessage({ smLoading: false, isDone: true })

                if (!isAborting.current) {
                  let currentSubChatMode = undefined
                  if (event.data.includes('sub_chat_mode')) {
                    const subChatModeMatch = event.data.match(/sub_chat_mode:(\w+)/)
                    if (subChatModeMatch) {
                      currentSubChatMode = subChatModeMatch[1]
                    }
                  }

                  setConvContent((state) => [
                    ...state,
                    {
                      context: '',
                      role: 'ai',
                      useSimpleStyle: false,
                      smLoading: true,
                      isStreaming: true,
                      isDone: false,
                      sub_chat_mode: currentSubChatMode,
                      order: tempUserId,
                      roundIndex
                    }
                  ])
                }
                groupCountRef.current = startCount
              } else if (event.data.includes('sub_chat_mode')) {
                const subChatModeMatch = event.data.match(/sub_chat_mode:(\w+)/)
                if (subChatModeMatch) {
                  const extractedSubChatMode = subChatModeMatch[1]
                  updateAiMessage({
                    sub_chat_mode: extractedSubChatMode
                  })
                }
              }

              let displayMessage = ''
              const lastOpen = messageRef.current.lastIndexOf('<think>')
              if (lastOpen >= 0) {
                displayMessage = messageRef.current.substring(lastOpen + 7)
                const closeIdx = displayMessage.indexOf('</think>')
                if (closeIdx >= 0) {
                  displayMessage = displayMessage.substring(0, closeIdx)
                }
              }
              displayMessage = displayMessage.replace(/round_index:\d+,?\s*/, '')
              displayMessage = displayMessage.replace(/"illegal_query":\s*"([^"]+)"/, '$1')
              setCurrentMessage(displayMessage.replace(/\\n/g, '\n'))
            }

            if (event.data === '[DONE]') {
              const endTime = performance.now()
              const thinkTimeMs = endTime - startTimeRef.current
              const calculatedThinkTime = Math.round(thinkTimeMs / 1000)

              const parts = messageRef.current.split('</think>')
              if (parts.length > 1) {
                updateAiMessage({
                  smLoading: false,
                  isDone: true,
                  thinkTime: calculatedThinkTime,
                  roundIndex
                })
              }

              if (!roundIndex) {
                try {
                  const maxRoundRes: any = await fetchConvMaxRound({
                    conv_uid: conv.conv_uid
                  })
                  roundIndex = Number(maxRoundRes?.data || 0)
                  setLoadingRoundIndex(roundIndex)
                  setUserDebugInfoMap({
                    order: tempUserId,
                    roundIndex
                  })
                  setUserDebugInfoMap({
                    order: roundIndex,
                    roundIndex
                  })
                  syncTempOrderToRoundIndex(tempUserId, roundIndex)
                } catch {}
              }
              setIsGettingData(false)

              setLoading(false)
              setIsGettingData(false)

              const isExcelScenario = params?.context?.chat_mode === 'chat_excel'

              if (isExcelScenario || !webSocketViewAdded.current) {
                setConvContent((state: any) => [
                  ...state,
                  {
                    context: 'describe',
                    describe: true,
                    role: 'view',
                    arrowStatus: false,
                    order: roundIndex || tempUserId,
                    roundIndex
                  }
                ])
              }

              return
            }

            if (event.data.includes('illegal_query')) {
              const data = event.data
              const regex = /<think>"illegal_query":\s?"(.*?)"<\/think>/
              const match: any = data.match(regex)

              updateAiMessage({
                context: match[1],
                isStreaming: false,
                smLoading: false,
                isDone: true,
                isIllegalQuery: true
              })

              setLoading(false)
              setIsGettingData(false)
              setSmLoading(false)
              isRequesting.current = false
              abortController.current = null
              return
            }

            if (event.data.includes('intent_clarify')) {
              const data = JSON.parse(event.data)
              const assemble = {
                data: data || {},
                context: '您好，系统检测到您当前提出的问题意图尚不明确，需进一步澄清。'
              }
              updateAiMessage({
                context: assemble.context,
                questionData: assemble.data,
                isStreaming: false,
                smLoading: false,
                isDone: true
              })

              setLoading(false)
              setIsGettingData(false)
              setSmLoading(false)
              isRequesting.current = false
              abortController.current = null
              return
            }
          }
        },
        onclose() {
          setLoading(false)
          setIsGettingData(false)
          setSmLoading(false)
          isRequesting.current = false
          abortController.current = null
          isMessageAdded.current = false
          hasTriggeredIsGetting.current = false
          groupCountRef.current = 0
          closedGroupCountRef.current = 0

          setConvContent((prevState: any[]) => {
            return prevState.map((item: any) => {
              if (item.role === 'ai' && item.smLoading) {
                return {
                  ...item,
                  smLoading: false,
                  isStreaming: false,
                  isDone: true
                }
              }
              return item
            })
          })
        },
        onerror(err: any) {
          retryCount++
          if (retryCount > maxRetries) {
            setLoading(false)
            setIsGettingData(false)
            setSmLoading(false)
            isRequesting.current = false
            abortController.current = null
            isMessageAdded.current = false
            hasTriggeredIsGetting.current = false

            message.error('对话接口发生异常，请检查系统！')

            setConvContent((prevState: any[]) => {
              return prevState.map((item: any) => {
                if (item.role === 'ai' && item.smLoading) {
                  return {
                    ...item,
                    smLoading: false,
                    isStreaming: false,
                    isDone: true
                  }
                }
                return item
              })
            })

            throw new Error('已达到最大重试次数')
          }
        }
      })
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        setConvContent((prevState: any[]) => {
          return prevState.map((item: any) => {
            if (item.role === 'ai' && item.smLoading) {
              return {
                ...item,
                smLoading: false,
                isStreaming: false,
                isDone: true
              }
            }
            return item
          })
        })
      }
      setLoading(false)
      setIsGettingData(false)
      setSmLoading(false)
      isRequesting.current = false
      abortController.current = null
      isMessageAdded.current = false
      hasTriggeredIsGetting.current = false
    }
  }

  const getRecommend = async ({ type, params }: any) => {
    if (isRequesting.current) {
      return
    }
    setLoading(true)
    isRequesting.current = true
    abortController.current = new AbortController()

    setConvContent((state) => [...state, { context: params.messages, role: 'human' }])
    setUserScrolled(false)

    webSocketViewAdded.current = false

    try {
      setCurrentMessage('')

      let res
      if (type === 'getQa') {
        res = await fetchRecommendQuestion(params)
      } else {
        res = await fetchDimension(params)
      }

      setConvContent((prevState: any) => {
        const state = prevState.map((item: any) => {
          if (item.role === 'ai' && item.smLoading) {
            return {
              ...item,
              smLoading: false,
              isStreaming: false,
              isDone: true
            }
          }
          return item
        })
        return [
          ...state,
          {
            context:
              type === 'getQa'
                ? {
                    recommendQuestions: res?.data?.recommend_questions
                  }
                : {
                    rewrite: type === 'getD' ? res?.data?.items?.rec_dim : res?.data?.items?.rec_ind
                  },
            role: 'view'
          }
        ]
      })
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        message.error('获取失败')
      }
      setConvContent((prevState: any[]) => {
        return prevState.map((item: any) => {
          if (item.role === 'ai' && item.smLoading) {
            return {
              ...item,
              smLoading: false,
              isStreaming: false,
              isDone: true
            }
          }
          return item
        })
      })
    } finally {
      setConvContent((prevState: any[]) => {
        return prevState.map((item: any) => {
          if (item.role === 'ai' && item.smLoading) {
            return {
              ...item,
              smLoading: false,
              isStreaming: false,
              isDone: true
            }
          }
          return item
        })
      })
      setLoading(false)
      setIsGettingData(false)
      isRequesting.current = false
      abortController.current = null
      isMessageAdded.current = false
      hasTriggeredIsGetting.current = false
    }
  }

  const getQueryRewrite = async (params: any) => {
    if (isRequesting.current) {
      return
    }

    abortController.current = new AbortController()

    setConvContent((state) => [
      ...state,
      { context: params.messages, role: 'human' },
      {
        context: '',
        role: 'ai',
        smLoading: true,
        isStreaming: true,
        isDone: false
      }
    ])
    setUserScrolled(false)

    setLoading(true)
    isRequesting.current = true
    isMessageAdded.current = true
    webSocketViewAdded.current = false
    messageRef.current = ''

    try {
      setCurrentMessage('')

      const res = await fetchQueryRewrite(params)

      if (
        !res ||
        !res.data ||
        res.data.code === 500 ||
        (res.data.msg && res.data.msg.includes('404 NOT_FOUND')) ||
        (res.data.msg && res.data.msg.includes('ERROR'))
      ) {
        const errorMsg = res?.data?.msg || '获取失败'
        message.error(errorMsg)

        setConvContent((prevState: any[]) => {
          return prevState.map((item: any) => {
            if (item.role === 'ai' && item.smLoading) {
              return {
                ...item,
                smLoading: false,
                isStreaming: false,
                isDone: true
              }
            }
            return item
          })
        })
        return
      }

      if (!res?.data?.items || res.data.items.length === 0) {
        message.warning('暂无相关数据')

        setConvContent((prevState: any[]) => {
          return prevState.map((item: any) => {
            if (item.role === 'ai' && item.smLoading) {
              return {
                ...item,
                smLoading: false,
                isStreaming: false,
                isDone: true
              }
            }
            return item
          })
        })
        return
      }

      setConvContent((state: any) => {
        const newState = [...state]
        for (let i = newState.length - 1; i >= 0; i--) {
          if (newState[i].role === 'ai' && newState[i].smLoading) {
            newState[i] = {
              ...newState[i],
              smLoading: false,
              isStreaming: false,
              isDone: true
            }
            break
          }
        }

        newState.push({
          context: { recommendQuestions: res?.data?.items },
          role: 'view'
        })

        return newState
      })
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        let errorMessage = '获取失败'
        if (error.code === 'ECONNABORTED') {
          errorMessage = '请求超时，服务器响应时间过长，请稍后重试'
        } else if (error.message && error.message.includes('timeout')) {
          errorMessage = '请求超时，请稍后重试'
        } else if (error.message && error.message.includes('Network Error')) {
          errorMessage = '网络连接失败，请检查网络后重试'
        }

        message.error(errorMessage)
      }

      setConvContent((state: any) => {
        return state.map((item: any) => {
          if (item.role === 'ai' && item.smLoading) {
            return {
              ...item,
              smLoading: false,
              isStreaming: false,
              isDone: true
            }
          }
          return item
        })
      })
    } finally {
      setLoading(false)
      setIsGettingData(false)
      setSmLoading(false)
      isRequesting.current = false
      abortController.current = null
      isMessageAdded.current = false
      hasTriggeredIsGetting.current = false
    }
  }

  const handleSend = (value: string) => {
    if (!value.trim() || loading) return
    handleCollect()
    const messageContent = {
      question: value,
      file_id: selectedExcel?.file_id,
      file_name: selectedExcel?.file_name,
      reference_order: referenceDialog?.order,
      reference_context: referenceDialog?.context
    }

    getAnswer(messageContent)
    handleRemoveDialog()
  }

  const handleRemoveExcel = () => {
    setSelectedExcel({})
  }

  const getReference = (orderIndex: number) => {
    const questions = getHumanInHistoryByOrderIndex(orderIndex, convContent)
    setReferenceDialog(questions)
  }

  const handleRemoveDialog = () => {
    setReferenceDialog({})
  }

  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (wsTimeoutRef.current) {
        clearTimeout(wsTimeoutRef.current)
        wsTimeoutRef.current = null
      }
    }
  }, [])

  const updateAiMessage = (updateData: any) => {
    setConvContent((prevState: any[]) => {
      let aiMessageIndex = -1

      for (let i = prevState.length - 1; i >= 0; i--) {
        if (prevState[i].role === 'ai') {
          aiMessageIndex = i
          break
        }
      }

      if (aiMessageIndex !== -1) {
        const updatedState = [...prevState]
        updatedState[aiMessageIndex] = {
          ...updatedState[aiMessageIndex],
          ...updateData
        }
        return updatedState
      }

      return prevState
    })
  }

  useEffect(() => {
    if (loading && !isMessageAdded.current && !isAborting.current) {
      setConvContent((prevState: any[]) => [
        ...prevState,
        {
          context: currentMessage,
          order: tempUserId,
          role: 'ai',
          useSimpleStyle: false,
          smLoading: true
        }
      ])
      isMessageAdded.current = true
      groupCountRef.current = 1
      closedGroupCountRef.current = 0
    } else if (currentMessage) {
      updateAiMessage({ context: currentMessage })
    }
  }, [currentMessage, loading])

  useEffect(() => {
    if (smLoading) {
      updateAiMessage({ smLoading: !smLoading })
    }
  }, [smLoading])

  const handleShareOk = async () => {
    if (isRequesting.current) {
      return
    }

    try {
      isRequesting.current = true
      message.loading('正在生成快照，请稍候...', 0)
      await new Promise((resolve) => setTimeout(resolve, 100))

      const userInfoString = localStorage.getItem('SOY-REACT_userInfo')
      const userInfo = JSON.parse(userInfoString || '{}')

      const [_, res] = await Promise.all([
        download(),
        fetchOperate({
          ...conv,
          type: 3,
          name: conv.biz_name || 'AI智能助手',
          operator: userInfo.userName || '未知用户'
        })
      ])

      message.destroy()

      if ((res as any).code !== 200) {
        message.error((res as any).msg || '分享失败，请稍后再试')
        return
      }

      message.success('快照已生成，分享成功')
      setIsSharing(false)
      setConfirmShareVisible(false)
    } catch {
      message.destroy()
      message.error('快照生成失败，请重试')
    } finally {
      isRequesting.current = false
      setConfirmShareLoading(false)
    }
  }

  const handleConfirmCancel = () => {
    setConfirmShareVisible(false)
    setConfirmShareLoading(false)
    setShareStep(1)
    shareEmailForm.resetFields()
  }

  const handleShareEmail = () => {
    setConfirmShareLoading(true)
    const roundIndexs = sharingList.map((item: any) => item.order).join(',')

    shareEmailForm
      .validateFields()
      .then((values) => {
        let data = {
          convUid: conv.conv_uid,
          chatId: conv.chat_id,
          agentId: conv.agent_id,
          spaceId: conv.space_id,
          extra: {},
          chatName: conv.biz_name,
          roundIndexs,
          ...values,
          executeTime: values?.sendTime?.time
        }
        if (values.executeFrequency === 2) {
          data.weekendTargetDay = values?.sendTime?.status
        }
        if (values.executeFrequency === 3) {
          data.monthlyTargetDay = values?.sendTime?.status
        }
        delete data.sendTime
        fetchShareEmail(data).then((res: any) => {
          setConfirmShareLoading(false)
          if (res.code === 200) {
            message.success('分享成功')
            setIsSharing(false)
            setConfirmShareVisible(false)
            shareEmailForm.resetFields()
            setShareStep(1)
            setConfirmShareLoading(false)
          } else {
            message.error('服务器错误')
          }
        })
      })
      .catch(() => {
        setConfirmShareLoading(false)
      })
  }

  const openDebugPanel = (item: any) => {
    setCur(item)
    setDebugModalVisible(true)
    setTimeout(() => {
      connectWebSocket(conv.conv_uid, userDebugInfoMap.get(item.order)?.roundIndex || 0)
    }, 0)
  }

  const closeDebugPanel = () => {
    setDebugModalVisible(false)
    if (wsRef.current) {
      wsRef.current.close()
    }
  }

  return {
    chatContainerRef,
    chatHeaderRef,
    convContent,
    convContent2d,
    convContent3d,
    setConvContent,
    checkAll,
    setCheckAll,
    isSharing,
    setIsSharing,
    sharingList,
    setSharingList,
    confirmShareType,
    setConfirmShareType,
    confirmShareVisible,
    setConfirmShareVisible,
    confirmShareLoading,
    setConfirmShareLoading,
    shareStep,
    setShareStep,
    shareEmailForm,
    handleConfirmCancel,
    handleShareOk,
    handleShareEmail,
    selectedExcel,
    setSelectedExcel,
    referenceDialog,
    setReferenceDialog,
    handleRemoveExcel,
    handleRemoveDialog,
    deepThinkEnabled,
    setDeepThinkEnabled,
    uploadFileEnabled,
    setUploadFileEnabled,
    handleSend,
    stopGenerating,
    loading,
    isStorage,
    setIsStorage,
    doneStatus,
    isGettingData,
    getAnswer,
    getRecommend,
    getQueryRewrite,
    getReference,
    setCur,
    openDebugPanel,
    closeDebugPanel,
    debugModalVisible,
    cur,
    loadingRoundIndex,
    sharingRef,
    download,
    onClose,
    onUpdateList
  }
}
