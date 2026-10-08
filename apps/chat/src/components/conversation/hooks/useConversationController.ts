import { Form, message } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import cloneDeep from 'lodash/cloneDeep'

import { fetchOperate, fetchShareEmail } from '../../../service/api/abi-system'
import { fetchSessionMessages, deleteMessageByRound } from '../../../service/api/app'
import {
  fetchConvMaxRound,
  fetchDataBySql,
  groupMessagesByOrder,
  fetchQueryRewrite,
  fetchRecommendQuestion,
  streamConvAnswer
} from '../../../service/api/conv'
import { useDebugStore } from '../../../store'
import { getHumanInHistoryByOrderIndex, parseMessageContent } from '../../../utils'
import { buildScheduleConf, toShareEmailScheduleParams } from '../../../utils/job-schedule'
import { useScreenshot } from '../useScreenShot'
import { extractExploreHistoryItems, isExploreHistoryRound } from '../exploration-mode/historyAdapter'
import type { ExploreItem } from '../exploration-mode/types'
import { buildDeleteRoundItems, normalizeDeleteRounds } from '../helpers/deleteRoundSelection'
import { markHistoryResponseOrder } from '../helpers/historyResponseOrder'
import { areReportHistoryRoundsEqual, splitConversationHistoryRounds } from '../report-mode/reportHistoryAdapter'

import type { chatHeaderRefMethod } from '../../../types'
import type { ModelOption } from '../components/chat-header'
import type { ReportHistoryRoundGroup } from '../report-mode/types'
import { createGenerationGuard } from './generationGuard'
import { isApiSuccess, parseStoredUserInfo, runApiSuccessFlow } from './conversationRequests'

export interface ConversationProps {
  conv: any
  onClose: () => void
  onUpdateList: (data: any) => void
  fold: boolean
  selectedModel?: string
  selectedModelId?: string | number
  embedModelId?: string | number
  semanticId?: number | string
  /** 选中数据语义分组时的真实分组 id（长号）；与 semanticId 互斥，二选一 */
  semanticGroupId?: number | string
  selectedExcel?: any
  onLoadingChange?: (loading: boolean) => void
  modelOptions?: ModelOption[]
  currentModel?: ModelOption | null
  onModelChange?: (model: ModelOption) => void
  deepThinkEnabled?: boolean
  /** 报告提交所需的当前空间；普通对话 controller 同时使用 semanticId。 */
  spaceId?: number
  onReportLoadingChange?: (loading: boolean) => void
  onExploreLoadingChange?: (loading: boolean) => void
  onReportPreviewChange?: (open: boolean) => void
  onExplorePreviewChange?: (open: boolean) => void
  /** 打开历史会话时，回填最后一轮使用的数据语义到输入框 */
  onHistorySemanticLoaded?: (data: { name: string; schemaId?: number | string; groupId?: number | string; groupName?: string } | null) => void
  /** 消息列表为空时展示的占位内容（如助手会话开场引导欢迎页） */
  emptyContent?: ReactNode
}

interface ConfirmDeleteOptions {
  onMessageRoundsDeleted?: (rounds: number[]) => void
  reportRounds?: number[]
  onReportRoundsDeleted?: (rounds: number[]) => void
}

/**
 * 深度思考内容现在可能直接通过 delta.content 传输，并使用 Markdown 标题标记边界。
 * 开始标记：## 1. 🧠 思考过程
 * 结束标记：## 3. 🔧 查询模式
 */
const THINK_START_REGEX = /##\s*1\.\s*🧠\s*思考过程/
const THINK_END_REGEX = /##\s*3\.\s*🔧\s*查询模式/

/**
 * 闲聊/超范围屏蔽（illegal_query）的兜底提示语。
 * 后端把该提示语放在 <think>"illegal_query": "..."</think> 中，且提示语含真实换行；
 * 换行后的第二物理行既无 data: 前缀也无 ASCII 冒号，会被 @microsoft/fetch-event-source
 * 整行丢弃（见 lib/cjs/parse.js：非 data 字段行不会拼接到 message.data），
 * 导致 onmessage 只能拿到被截断的首行、拿不到闭合 </think> 与 [DONE]。
 * 此时用本兜底文案补全展示，避免提示被截成半句、与预期不一致。
 */
const ILLEGAL_QUERY_FALLBACK_TIP =
  '温馨提示：您的问题有点超出我当前的理解范围了。\n～可能是我掌握的“词汇量”还不够，暂时无法与我数据库语义信息匹配😊'

/**
 * 把 content 中内联的深度思考内容包装为 <think>...</think>，复用现有渲染链路。
 * 当未启用深度思考时，直接过滤掉思考段内容，不向下游渲染。
 * @param content 当前 chunk 的 content
 * @param isReasoning 当前是否已处于思考段中
 * @param enabled 是否启用深度思考展示
 * @returns 包装后的文本和最新的思考段状态
 */
const processContentWithInlineThinking = (
  content: string,
  isReasoning: boolean,
  enabled: boolean
): { text: string; isReasoning: boolean } => {
  if (enabled) {
    if (isReasoning) {
      const endMatch = content.match(THINK_END_REGEX)
      if (endMatch) {
        const thinkBody = content.slice(0, endMatch.index)
        const afterThink = content.slice(endMatch.index! + endMatch[0].length)
        return { text: thinkBody + '</think>' + afterThink, isReasoning: false }
      }
      return { text: content, isReasoning: true }
    }

    const startMatch = content.match(THINK_START_REGEX)
    if (startMatch) {
      const beforeThink = content.slice(0, startMatch.index)
      const afterStart = content.slice(startMatch.index! + startMatch[0].length)
      const endMatch = afterStart.match(THINK_END_REGEX)

      if (endMatch) {
        const thinkBody = afterStart.slice(0, endMatch.index)
        const afterThink = afterStart.slice(endMatch.index! + endMatch[0].length)
        return { text: beforeThink + '<think>' + thinkBody + '</think>' + afterThink, isReasoning: false }
      }

      return { text: beforeThink + '<think>' + afterStart, isReasoning: true }
    }

    return { text: content, isReasoning: false }
  }

  // 未启用深度思考：过滤思考段，只保留非思考内容
  if (isReasoning) {
    const endMatch = content.match(THINK_END_REGEX)
    if (endMatch) {
      const afterThink = content.slice(endMatch.index! + endMatch[0].length)
      return { text: afterThink, isReasoning: false }
    }
    return { text: '', isReasoning: true }
  }

  const startMatch = content.match(THINK_START_REGEX)
  if (startMatch) {
    const afterStart = content.slice(startMatch.index! + startMatch[0].length)
    const endMatch = afterStart.match(THINK_END_REGEX)

    if (endMatch) {
      const afterThink = afterStart.slice(endMatch.index! + endMatch[0].length)
      return { text: afterThink, isReasoning: false }
    }

    return { text: '', isReasoning: true }
  }

  return { text: content, isReasoning: false }
}

/**
 * 从 AI 历史消息内容中剥离尾部嵌入的 JSON 对象，
 * 仅保留可读的推理文本供 AiEle 渲染。
 * 策略：寻找最后一个顶级 { 并验证到末尾是否为合法 JSON。
 */
const stripTrailingJsonFromAiContent = (content: string): string => {
  if (!content || typeof content !== 'string') return content

  const trimmed = content.trim()
  if (!trimmed.endsWith('}')) return content

  // 从后往前找最外层匹配的 {
  let depth = 0
  for (let i = trimmed.length - 1; i >= 0; i--) {
    if (trimmed[i] === '}') depth++
    else if (trimmed[i] === '{') {
      depth--
      if (depth === 0) {
        // 确保前面不是 JSON 的一部分（前一个非空字符不能是 , : 等）
        const before = trimmed.substring(0, i).trimEnd()
        const lastChar = before[before.length - 1]
        if (lastChar && lastChar !== ',' && lastChar !== ':' && lastChar !== '{' && lastChar !== '[') {
          return before
        }
        break
      }
    }
  }
  return content
}

/**
 * 从 AI 消息内容中提取尾部嵌入的 JSON 对象。
 * 策略：寻找最后一个顶级 { 并验证到末尾是否为合法 JSON。
 */
const extractTrailingJson = (content: string): any => {
  if (!content || typeof content !== 'string') return null

  const trimmed = content.trim()
  if (!trimmed.endsWith('}')) return null

  let depth = 0
  for (let i = trimmed.length - 1; i >= 0; i--) {
    if (trimmed[i] === '}') depth++
    else if (trimmed[i] === '{') {
      depth--
      if (depth === 0) {
        const before = trimmed.substring(0, i).trimEnd()
        const lastChar = before[before.length - 1]
        if (lastChar && lastChar !== ',' && lastChar !== ':' && lastChar !== '{' && lastChar !== '[') {
          try {
            return JSON.parse(trimmed.substring(i))
          } catch {
            return null
          }
        }
        break
      }
    }
  }
  return null
}

/**
 * chat_with_knowledge（数据知识）：流式 content 是 ```json 围栏包裹、以 "thoughts" 为首字段的 JSON。
 * 此处增量提取 thoughts 值作为思考内容逐字展示（以 ## 思考过程 开头的 chat_with_db_execute 天然不匹配）。
 * @param raw 流式累积的原始内容（messageRef.current）
 * @returns thoughts 文本（未闭合时为已到达部分）；非该结构返回 null
 */
const extractKnowledgeThoughts = (raw: string): string | null => {
  if (!raw) return null
  // 跳过起始 ```json 围栏后匹配 { "thoughts": "
  const startMatch = raw.match(/^\s*```(?:json)?\s*\{\s*"thoughts"\s*:\s*"/i)
  if (!startMatch) return null

  let result = ''
  for (let i = startMatch[0].length; i < raw.length; i++) {
    const ch = raw[i]
    if (ch === '\\') {
      // 保留转义序列原文，交由下游统一反转义（\n、\"）
      result += ch + (raw[i + 1] ?? '')
      i++
      continue
    }
    if (ch === '"') break // thoughts 值结束
    result += ch
  }
  return result
}

/**
 * 将历史消息接口（/abi-chat/v1/app/message/query）返回的消息
 * 映射为内部渲染所需的统一格式（role / context / order / roundIndex）
 */
const mapHistoryMessage = (item: any) => {
  const roleType = item?.roleType || item?.messageDetail?.type
  let content = item?.messageDetail?.data?.content ?? ''
  const roundIndex = item?.roundIndex ?? item?.index ?? 0
  const name = item?.messageDetail?.data?.name || item?.messageDetail?.data?.additional_kwargs?.model_name || ''

  // AI 消息的内容通常包含推理文本 + 尾部嵌入的结构化 JSON（DSL/SQL 等），
  // 渲染时只需要推理文本部分，JSON 数据由 view 消息负责展示
  if (roleType === 'ai' && typeof content === 'string') {
    content = stripTrailingJsonFromAiContent(content)
  }

  return {
    ...item,
    role: roleType,
    context: content,
    order: roundIndex,
    roundIndex,
    name,
    describe: true,
    arrowStatus: true,
    isDone: true,
    feedback: item?.feedbackStatus,
  }
}

// 从一轮消息的 view/ai 内容（chart-view 或内嵌 JSON）中解析数据语义元信息。
// 历史会话的 human 消息不携带 _groupName/_semanticName/_semanticSchemaId，需从同轮答案回填。
const extractSemanticMetaFromMessages = (messages: any[]) => {
  for (const msg of messages) {
    const ctx = msg?.context
    if (typeof ctx !== 'string') continue
    let json: any = null
    if (ctx.includes('<chart-view')) {
      const match = ctx.match(/<chart-view content="([\s\S]*?)"\s*\/>/)
      if (match) {
        try { json = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/NaN/g, 'null')) } catch { /* ignore */ }
      }
    } else if (ctx.includes('semantic_group_name') || ctx.includes('semantic_name')) {
      try { json = JSON.parse(ctx) } catch { /* ignore */ }
    }
    if (json && (json.semantic_group_name || json.semantic_name || json.semantic_id != null || json.group_id != null)) {
      return {
        groupName: json.semantic_group_name || '',
        semanticName: json.semantic_name || '',
        semanticId: json.semantic_id,
        groupId: json.group_id,
      }
    }
  }
  return { groupName: '', semanticName: '', semanticId: undefined as any, groupId: undefined as any }
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
) => {
  const { conv, onClose, onUpdateList } = props
  // 用 ref 存储最新 conv，避免 useEffect 依赖整个对象
  const convRef = useRef(conv)
  convRef.current = conv
  // 用 ref 存储最新 paramsData，确保异步回调中始终取到最新值
  const paramsDataRef = useRef<any>(null)
  const [confirmShareType, setConfirmShareType] = useState('')
  const [shareEmailForm] = Form.useForm()
  const [shareStep, setShareStep] = useState(1)
  const [isStorage, setIsStorage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [convContent, setConvContent] = useState<any[]>([])
  const [reportHistoryRounds, setReportHistoryRounds] = useState<ReportHistoryRoundGroup[]>([])
  const [exploreHistoryItems, setExploreHistoryItems] = useState<ExploreItem[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
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
  const isReasoningRef = useRef(false)
  // 标记当前 <think> 是否由流式 reasoning_content 开启（归因分析等模式）。
  // 仅当思考流由 reasoning_content 驱动时，reasoning 变为 null 才意味着思考结束、需闭合 </think>；
  // 若 <think> 由 content 内联的 ## 1 思考过程标记开启（reasoning_content 恒为 null），则不能因 null 提前闭合。
  const reasoningFromStreamRef = useRef(false)
  // 记录上一次已追加的完整 content，用于过滤后端重复发送的固定前缀
  const lastContentRef = useRef('')
  const groupCountRef = useRef(0)
  const closedGroupCountRef = useRef(0)
  const abortController = useRef<AbortController | null>(null)
  const [loadingRoundIndex, setLoadingRoundIndex] = useState<number>(0)
  const startTimeRef = useRef<number>(0)
  const [isGettingData, setIsGettingData] = useState(false)
  const hasTriggeredIsGetting = useRef(false)
  const [selectedExcel, setSelectedExcel] = useState<any>({})
  // 支持外部（如 conversation-analysis 的统一输入框）透传已选 Excel，避免 UI 与请求参数不一致
  const effectiveSelectedExcel = props.selectedExcel !== undefined ? props.selectedExcel : selectedExcel
  const effectiveSelectedExcelRef = useRef(effectiveSelectedExcel)
  effectiveSelectedExcelRef.current = effectiveSelectedExcel
  const [referenceDialog, setReferenceDialog] = useState<any>({})
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(false)
  // 支持外部（如 conversation-analysis 的统一输入框）透传思考开关状态，避免 UI 与请求参数不一致
  const effectiveDeepThinkEnabled = props.deepThinkEnabled !== undefined ? props.deepThinkEnabled : deepThinkEnabled
  const effectiveDeepThinkEnabledRef = useRef(effectiveDeepThinkEnabled)
  effectiveDeepThinkEnabledRef.current = effectiveDeepThinkEnabled
  const [uploadFileEnabled, setUploadFileEnabled] = useState(false)
  const [cur, setCur] = useState<any>()
  const [debugModalVisible, setDebugModalVisible] = useState(false)
  const {
    setUserDebugInfoMap,
    userDebugInfoMap
  } = useDebugStore()
  const isMessageAdded = useRef(false)
  const [smLoading, setSmLoading] = useState(false)
  const [doneStatus, setDoneStatus] = useState(false)
  const prevSpaceId = useRef<number | undefined>(undefined)
  const webSocketViewAdded = useRef(false)
  const isAborting = useRef(false)
  const [tempUserId, setTempUserId] = useState<string>('')
  const baseId = useId()
  const generationGuardRef = useRef(createGenerationGuard())

  const [minRoundIndex, setMinRoundIndex] = useState<number | undefined>(undefined)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)

  // ── 批量删除（Qwen 风格：进入选择模式后按轮次多选删除）──
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteSelectedRounds, setDeleteSelectedRounds] = useState<number[]>([])
  const [deleteLoading, setDeleteLoading] = useState(false)
  // 所有可删除的轮次（仅持久化、roundIndex 为数字的消息，排除开场白与流式临时消息）
  const deletableRounds = useMemo(() => {
    const rounds = new Set<number>()
    convContent.forEach((item: any) => {
      if (item?.role === 'first') return
      const round = item?.roundIndex ?? item?.order
      if (typeof round === 'number') rounds.add(round)
    })
    return Array.from(rounds)
  }, [convContent])
  // 进入删除模式；若来源消息可删除则默认勾选该轮次
  const enterDeleteMode = (item?: any) => {
    const round = item?.deleteRoundIndex ?? item?.roundIndex ?? item?.order
    setIsDeleting(true)
    setDeleteSelectedRounds(typeof round === 'number' ? [round] : [])
  }

  const exitDeleteMode = () => {
    setIsDeleting(false)
    setDeleteSelectedRounds([])
  }

  const toggleDeleteRound = (round: number, checked: boolean) => {
    if (typeof round !== 'number') return
    setDeleteSelectedRounds((prev) => {
      if (checked) return prev.includes(round) ? prev : [...prev, round]
      return prev.filter((r) => r !== round)
    })
  }

  const toggleDeleteAll = (checked: boolean, rounds: number[] = deletableRounds) => {
    setDeleteSelectedRounds(checked ? normalizeDeleteRounds(rounds) : [])
  }

  const confirmDelete = async (options: ConfirmDeleteOptions = {}) => {
    const rounds = normalizeDeleteRounds(deleteSelectedRounds)
    if (!rounds.length) {
      message.warning('请选择要删除的对话')
      return
    }

    const items = buildDeleteRoundItems(rounds, options.reportRounds || [])

    setDeleteLoading(true)
    try {
      const response = await deleteMessageByRound({ convUid: conv.conv_uid, items })
      if (!isApiSuccess(response)) {
        const result = response as { err_msg?: string; msg?: string } | undefined
        message.error(result?.msg || result?.err_msg || '删除失败，请重试')
        return
      }

      const messageRounds = items.find((item) => item.source === 'message')?.roundIndex || []
      if (messageRounds.length > 0) {
        setConvContent((prev) => prev.filter((item: any) => {
          const round = item?.roundIndex ?? item?.order
          return !(typeof round === 'number' && messageRounds.includes(round))
        }))
        setExploreHistoryItems((prev) => prev.filter((item) => !messageRounds.includes(item.roundIndex ?? -1)))
        options.onMessageRoundsDeleted?.(messageRounds)
      }

      const reportRounds = items.find((item) => item.source === 'report')?.roundIndex || []
      if (reportRounds.length > 0) {
        options.onReportRoundsDeleted?.(reportRounds)
      }

      message.success('删除成功')
      exitDeleteMode()
    } catch {
      message.error('删除失败，请重试')
    } finally {
      setDeleteLoading(false)
    }
  }

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const chatHeaderRef = useRef<chatHeaderRefMethod>(null)
  const requestTokenRef = useRef(0)

  const { ref: sharingRef, download } = useScreenshot()

  const nextRequestToken = () => {
    requestTokenRef.current += 1
    return requestTokenRef.current
  }

  const isRequestTokenActive = (token: number) => requestTokenRef.current === token

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  /* 暂时禁用下滑加载更多历史：该功能目前历史数据接口存在问题，先整体注释避免误触发
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
      const result: any = await fetchSessionMessages({
        convUid: conv.conv_uid,
        pageNum: 1,
        pageSize: 20
      })

      // 新版历史接口返回结构：{ data: { total, data: [{ roundIndex, messages: [...] }, ...] } }
      const roundGroups = Array.isArray(result?.data?.data) ? result.data.data : []
      const newMessages: any[] = roundGroups.flatMap((group: any) =>
        Array.isArray(group?.messages) ? group.messages : []
      )
      if (newMessages.length < 10) {
        setHasMoreHistory(false)
      }

      if (newMessages.length > 0) {
        const orders = newMessages.map((item: any) => item.roundIndex ?? item.index ?? 0)
        const newMin = Math.min(...orders)
        setMinRoundIndex(newMin)

        const processedMessages = newMessages.map((item: any) => mapHistoryMessage(item))

        flushSync(() => {
          setConvContent((prev) => [...processedMessages, ...prev])
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
  */

  const [userScrolled, setUserScrolled] = useState(false)
  const lastScrollTop = useRef(0)
  const canLoadMore = useRef(false)
  const isLoadingHistory = useRef(false)

  const handleCollect = async () => {
    const userInfo = parseStoredUserInfo(localStorage.getItem('SOY-REACT_userInfo'))
    const result = await runApiSuccessFlow(() => fetchOperate({
        ...conv,
        type: 1,
        name: conv.biz_name || 'AI智能助手',
        operator: userInfo.userName,
        update_by: userInfo.userName,
        create_by: userInfo.userName
      }))
    return result.success
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

      // 暂时禁用下滑加载更多历史：该功能目前历史数据接口存在问题，先注释避免误触发
      // if (canLoadMore.current && isScrollingUp && hasMoreHistory && !historyLoading && minRoundIndex !== undefined) {
      //   const getMsgId = document.querySelector(`#human-msg-${minRoundIndex + 2}`)?.getBoundingClientRect()
      //   const containerRect = chatContainer.getBoundingClientRect()
      //   if (getMsgId && getMsgId.top <= containerRect.bottom && getMsgId.bottom >= containerRect.top) {
      //     canLoadMore.current = false
      //     loadMoreHistory()
      //   }
      // }

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

  // 用 conv_uid 作为依赖，避免对象引用变化导致重复请求
  const convUid = conv?.conv_uid
  const convChatId = conv?.chat_id
  // 仅在会话切换时触发（不包含 selectedModel，避免模型切换导致重复请求和 abort）
  useEffect(() => {
    const currentConv = convRef.current
    if (!currentConv || (!currentConv.conv_uid && !currentConv.chat_id)) return

    const requestToken = nextRequestToken()
    if (isRequesting.current) {
      stopGenerating()
    }

    const currentSpaceId = currentConv.space_id
    if (prevSpaceId.current !== undefined && prevSpaceId.current !== currentSpaceId) {
      // cache cleared
    }
    prevSpaceId.current = currentSpaceId
    void handleCollect()
    setSelectedExcel({})
    setReferenceDialog({})

    // 切换会话时重置批量删除状态，避免删除栏残留在新会话上
    setIsDeleting(false)
    setDeleteSelectedRounds([])
    setDeleteLoading(false)

    setMinRoundIndex(undefined)
    setHasMoreHistory(true)
    setHistoryLoading(false)
    setHistoryLoaded(false)
    setReportHistoryRounds([])
    setExploreHistoryItems([])
    canLoadMore.current = false
    isLoadingHistory.current = false

    // 新建对话没有历史消息也正常加载（空状态）
    handleChatHistory(requestToken)

    // 获取用户ID
    let userId = 0
    try {
      const userInfo = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
      userId = userInfo.userId != null ? Number(userInfo.userId) : 0
    } catch {}

    const context = {
      session_id: currentConv.chat_id,
      conv_uid: currentConv.conv_uid,
      chat_model_id: props.selectedModelId || 0,
      space_id: currentConv.space_id,
      app_id: currentConv.appId || 0,
      user_id: userId,
      chat_mode: 'chat_with_db_execute',
      embed_model_id: props.embedModelId || 0,
      last_question: currentConv.last_question || null,
      extra: {
        if_debug: true,
        semantic_id: props.semanticId ?? null,
        extra_body: {
          enable_thinking: effectiveDeepThinkEnabledRef.current
        }
      }
    }
    const paramData = {
      model: props.selectedModel || window.APP_CONFIG.VITE_CHAT_MODEL || 'qwen3:30b-a3b-fp16',
      stream: true,
      temperature: 0,
      max_new_tokens: 4096,
      incremental: true,
      enable_vis: false,
      context: context
    }
    setParamsData(paramData)
    paramsDataRef.current = paramData
  }, [convUid, convChatId])

  // 模型切换时仅更新 paramsData，不重载历史、不 abort 请求
  useEffect(() => {
    if (!props.selectedModel) return
    if (!paramsDataRef.current) return
    const updated = {
      ...paramsDataRef.current,
      model: props.selectedModel,
      context: {
        ...paramsDataRef.current.context,
        chat_model_id: props.selectedModelId || paramsDataRef.current.context.chat_model_id,
      }
    }
    setParamsData(updated)
    paramsDataRef.current = updated
  }, [props.selectedModel, props.selectedModelId])

  const handleChatHistory = async (requestToken: number) => {
    if (conv && conv.chat_id) {
      let isUpdate = false
      let maxOrder = 0
      await getHistory(isUpdate, maxOrder, requestToken)
    }
  }

  const getHistory = async (isUpdate: boolean, maxOrder: number, requestToken: number) => {
    let conversationList: any = []
    const { chat_id: sessionId = '', agent_id: agentId = '' } = conv

    try {
      if (sessionId) {
        const result: any = await fetchSessionMessages({
          convUid: conv.conv_uid
        })
        if (!isRequestTokenActive(requestToken)) return

        // query 只请求一次；报告 round 交给报告历史适配器，避免进入普通 ViewEle。
        const rawRoundGroups: ReportHistoryRoundGroup[] = Array.isArray(result?.data?.data) ? result.data.data : []
        const roundGroups = markHistoryResponseOrder(rawRoundGroups)
        setExploreHistoryItems(extractExploreHistoryItems(roundGroups))
        const { interactionRounds, reportRounds } = splitConversationHistoryRounds(roundGroups)
        // 同内容刷新保持原数组引用，避免报告恢复 Hook 重查全部 IndexedDB task。
        setReportHistoryRounds((currentRounds) => (
          areReportHistoryRoundsEqual(currentRounds, reportRounds) ? currentRounds : reportRounds
        ))
        // 探索轮次整轮交给探索卡片渲染，从普通历史中整轮剔除，避免 human 问题被重复渲染成气泡。
        const flatHistory: any[] = interactionRounds
          .filter((group) => !isExploreHistoryRound(group))
          .flatMap((group) => (Array.isArray(group?.messages)
            ? group.messages.map((item) => ({ ...item, historySequence: group.historySequence }))
            : []))

        if (flatHistory.length > 0) {
          const orders = flatHistory.map((item: any) => item.roundIndex ?? item.index ?? 0)
          const minOrder = Math.min(...orders)
          if (!isRequestTokenActive(requestToken)) return
          setMinRoundIndex(minOrder)

          // 当前接口一次返回全部轮次，无需分页加载
          setHasMoreHistory(false)

          flatHistory.forEach((item: any) => {
            const order = item.roundIndex ?? item.index ?? 0
            setUserDebugInfoMap({
              order,
              roundIndex: order
            })
          })
        } else {
          setHasMoreHistory(false)
        }
        conversationList = flatHistory.map((item: any) => mapHistoryMessage(item))
      }

      if (!isRequestTokenActive(requestToken)) return
      // 如果当前正在流式请求中，不覆盖已有的消息（避免竞态条件清空正在进行的对话）
      if (isRequesting.current) return
      setConvContent(conversationList)

      // 打开历史会话时，取最后一轮普通对话的数据语义回填到输入框。
      if (conversationList.length > 0 && props.onHistorySemanticLoaded) {
        const rounds = conversationList
          .map((m: any) => (typeof m.roundIndex === 'number' ? m.roundIndex : (typeof m.order === 'number' ? m.order : null)))
          .filter((r: any) => r != null) as number[]
        if (rounds.length) {
          const lastRound = Math.max(...rounds)
          const lastRoundMsgs = conversationList.filter((m: any) => (m.roundIndex ?? m.order) === lastRound)
          const meta = extractSemanticMetaFromMessages(lastRoundMsgs)
          if (meta.semanticName || meta.semanticId != null || meta.groupId != null) {
            props.onHistorySemanticLoaded({ name: meta.semanticName || meta.groupName, schemaId: meta.semanticId, groupId: meta.groupId, groupName: meta.groupName })
          }
        }
      }

      setTimeout(() => {
        if (!isRequestTokenActive(requestToken)) return
        scrollToBottom()
        setTimeout(() => {
          if (!isRequestTokenActive(requestToken)) return
          canLoadMore.current = true
        }, 500)
      }, 300)
    } catch (error) {
      if (isRequestTokenActive(requestToken)) {
        setReportHistoryRounds([])
        setExploreHistoryItems([])
        console.error('会话历史加载失败:', error)
      }
    } finally {
      if (isRequestTokenActive(requestToken)) setHistoryLoaded(true)
    }
  }

  /** task 已完成但 query 尚未落库时，由报告 Hook 触发一次完整历史刷新。 */
  const refreshHistory = async () => {
    const requestToken = nextRequestToken()
    await getHistory(false, 0, requestToken)
  }

  const stopGenerating = () => {
    generationGuardRef.current.invalidate()
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

  const getAnswer = async ({ question, IC, _meta, file_id, file_name, reference_order, reference_context }: any) => {
    if (isRequesting.current) {
      return
    }
    const generation = generationGuardRef.current.begin()
    const isCurrentGeneration = () => generationGuardRef.current.isCurrent(generation)
    const tempUserId = `${baseId}-${Date.now()}`
    setTempUserId(tempUserId)

    // 在请求开始时固定本次对话的思考开关状态，避免流式过程中用户切换开关导致渲染状态变化
    const currentDeepThinkEnabled = effectiveDeepThinkEnabledRef.current

    setTimeout(() => {
      if (isCurrentGeneration()) scrollToBottom()
    }, 300)
    abortController.current = new AbortController()
    isAborting.current = false
    const params = cloneDeep(paramsDataRef.current || paramsData)
    // 优先使用本次消息传入的 Excel 信息（新建会话时通过 meta 透传），否则回退到组件状态
    const activeExcel = (file_id && file_name)
      ? { file_id, file_name }
      : effectiveSelectedExcelRef.current?.file_id
        ? effectiveSelectedExcelRef.current
        : null
    const hasExcel = !!activeExcel?.file_id
    // 每次发送时注入最新的 deepThink 状态、数据语义元信息及 Excel 文件信息
    if (params.context) {
      params.context.chat_mode = hasExcel ? 'chat_excel' : 'chat_with_db_execute'
    }
    if (params.context?.extra) {
      params.context.extra.extra_body = { enable_thinking: currentDeepThinkEnabled }
      // 数据语义分组（group_id）与数据语义叶子（semantic_id）互斥：选中分组时只发 group_id 并清空 semantic_id。
      // 有本轮 meta 时按 meta 决定（避免重新生成时被输入框当前选择污染），无 meta 时回退组件当前选择。
      const metaHasSemanticData = !!_meta && (_meta.semanticGroupId != null || _meta.semanticSchemaId != null)
      const activeGroupId = metaHasSemanticData ? (_meta?.semanticGroupId ?? null) : (props.semanticGroupId ?? null)
      const activeSchemaId = metaHasSemanticData ? (_meta?.semanticSchemaId ?? null) : (props.semanticId ?? null)
      if (activeGroupId != null && activeGroupId !== '') {
        params.context.extra.group_id = activeGroupId
        params.context.extra.semantic_id = null
      } else {
        params.context.extra.semantic_id = activeSchemaId
        delete params.context.extra.group_id
      }
      params.context.extra.semantic_group_name = _meta?.groupName || ''
      params.context.extra.semantic_name = _meta?.semanticName || ''
      if (hasExcel) {
        params.context.extra.excel_file_id = activeExcel.file_id
        params.context.extra.excel_file_name = activeExcel.file_name
      } else {
        const { excel_file_id, excel_file_name, ...restExtra } = params.context.extra
        params.context.extra = restExtra
      }
    }
    params.messages = question

    const userMessageContext = hasExcel
      ? JSON.stringify({
          question,
          file_id: activeExcel.file_id,
          file_name: activeExcel.file_name,
        })
      : question

    const userMessage = {
      context: userMessageContext,
      role: 'human',
      id: Date.now(),
      order: tempUserId,
      roundIndex: tempUserId, 
      _groupName: _meta?.groupName,
      _semanticName: _meta?.semanticName,
      _semanticSchemaId: _meta?.semanticSchemaId,
      _semanticGroupId: _meta?.semanticGroupId,
    }
    setConvContent((state) => [...state, userMessage])

    const startTime = performance.now()
    setLoading(true)
    isRequesting.current = true
    messageRef.current = ''
    isReasoningRef.current = false
    reasoningFromStreamRef.current = false
    lastContentRef.current = ''
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

      let roundIndex: any = undefined
      let retryCount = 0
      const maxRetries = 2

      await streamConvAnswer({
        data: params,
        signal: abortController.current.signal,
        async onopen(response) {
          if (!isCurrentGeneration()) return
          const contentType = response.headers.get('content-type') || ''
          if (response.ok && contentType.includes('text/event-stream')) {
            retryCount = 0
            return
          }

          // 非事件流响应（含 HTTP 200 返回的业务错误体，如 {"code":500,"msg":"内部服务器错误"}）：解析并提示后终止
          if (!contentType.includes('text/event-stream')) {
            let backendMsg = ''
            try {
              const errData: any = await response.clone().json()
              if (errData && Number(errData.code) >= 400) {
                backendMsg = errData.msg || errData.message || ''
              }
            } catch {}
            if (!isCurrentGeneration()) return
            if (backendMsg) {
              message.error(backendMsg)
              throw new Error(backendMsg)
            }
          }

          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`HTTP ${response.status}: 请求失败，请检查请求参数`)
          }

          if (retryCount >= maxRetries) {
            throw new Error('对话接口发生异常，请检查系统！')
          }
        },
        async onmessage(event) {
          if (!isCurrentGeneration()) return
          if (event.data) {
            // 处理 [DONE] 信号
            if (event.data === '[DONE]') {
              // 流结束时如果仍在推理段，自动闭合 think 标签
              if (isReasoningRef.current) {
                messageRef.current += '</think>'
                isReasoningRef.current = false
                reasoningFromStreamRef.current = false
              }

              const endTime = performance.now()
              const thinkTimeMs = endTime - startTimeRef.current
              const calculatedThinkTime = Math.round(thinkTimeMs / 1000)

              // chat_with_knowledge（数据知识）：thoughts 作为思考内容展示，但 messageRef 中无
              // </think> 标记，需显式结束思考态并记录思考用时，保持与其他模式一致的“思考了 Xs”。
              const parts = messageRef.current.split('</think>')
              // thoughts 为后端结构化字段，不受深度思考开关影响始终下发，故不依赖 currentDeepThinkEnabled
              const isKnowledgeThoughts = extractKnowledgeThoughts(messageRef.current) !== null
              if (parts.length > 1 || isKnowledgeThoughts) {
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
                  if (!isCurrentGeneration()) return
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
              if (!isCurrentGeneration()) return
              setIsGettingData(false)

              setLoading(false)
              setIsGettingData(false)

              const isExcelScenario = params?.context?.chat_mode === 'chat_excel'

              // 尝试从 AI 消息中提取结构化 JSON，若包含 sql 则主动查询数据，
              // 避免依赖后端异步生成 view 消息导致 ViewEle 无数据。
              const responseJson = extractTrailingJson(messageRef.current)
              let viewContext: any = 'describe'
              let viewArrowStatus = false

              if (responseJson?.sql && convRef.current?.dbName) {
                try {
                  setIsGettingData(true)
                  const queryRes: any = await fetchDataBySql({
                    db_name: convRef.current.dbName,
                    query_sql: responseJson.sql
                  })
                  if (!isCurrentGeneration()) return
                  const queryData = queryRes?.data?.data ?? queryRes?.data
                  viewContext = JSON.stringify({
                    ...responseJson,
                    data: queryData,
                    sql: responseJson.sql
                  })
                  viewArrowStatus = true
                } catch (error) {
                  console.error('根据 SQL 查询数据失败:', error)
                } finally {
                  if (isCurrentGeneration()) setIsGettingData(false)
                }
              }

              if (isExcelScenario || !webSocketViewAdded.current) {
                setConvContent((state: any) => [
                  ...state,
                  {
                    context: viewContext,
                    describe: true,
                    role: 'view',
                    arrowStatus: viewArrowStatus,
                    order: roundIndex || tempUserId,
                    roundIndex
                  }
                ])
              }

              return
            }

            // illegal_query（闲聊/超范围屏蔽）兜底拦截：
            // 必须放在 reasoning / 深度思考过滤之前——否则未启用深度思考时，该内容会被
            // processContentWithInlineThinking 过滤为空并提前 return，导致 messageRef 拿不到
            // illegal_query：思考态无法结束（秒数不停），或展示为空。
            // 数据形如：<think>"illegal_query": "…提示语…"</think> [DONE]
            // 该提示语可能含真实换行，其第二物理行无 ASCII 冒号，会被
            // @microsoft/fetch-event-source 整行丢弃，导致只拿到被截断的首行、无闭合 </think>。
            const rawIllegalSource = (() => {
              try {
                const parsedRaw = JSON.parse(event.data)
                const rawContent = parsedRaw?.choices?.[0]?.delta?.content
                return typeof rawContent === 'string' ? rawContent : event.data
              } catch {
                return event.data
              }
            })()
            if (
              rawIllegalSource.includes('illegal_query') ||
              messageRef.current.includes('illegal_query')
            ) {
              const combined = messageRef.current + rawIllegalSource
              const closedMatch = combined.match(
                /<think>"illegal_query":\s*"([\s\S]*?)"\s*<\/think>/
              )
              // closedMatch：完整 <think>…</think> 已到达，尊重后端原文；
              // 否则闭合标签随换行被 SSE 丢弃、尾部不可恢复，用固定兜底文案补全，
              // 避免展示被截断成半句或为空。
              const illegalText = closedMatch
                ? (closedMatch[1] || '').replace(/\\n/g, '\n')
                : ILLEGAL_QUERY_FALLBACK_TIP
              updateAiMessage({
                context: illegalText,
                isStreaming: false,
                smLoading: false,
                isDone: true,
                isIllegalQuery: true
              })
              // 同步 currentMessage，避免 setLoading(false) 触发的 effect 用旧流式文本回写 context。
              setCurrentMessage(illegalText)
              setLoading(false)
              setIsGettingData(false)
              setSmLoading(false)
              isRequesting.current = false
              abortController.current = null
              return
            }

            // 从 OpenAI 兼容格式提取 content / reasoning_content
            let chunk = event.data
            try {
              const parsed = JSON.parse(event.data)
              // 意图澄清等业务事件本身是一段完整 JSON，并非 OpenAI 流式增量格式，
              // 若走 delta 提取会因 chunkText 为空而提前 return，导致澄清组件无法展示。
              // 这里保留原始数据并跳过 delta 提取，交由后续 intent_clarify 逻辑处理。
              if (parsed && typeof parsed === 'object' && parsed.agent_label) {
                chunk = event.data
              } else {
              const delta = parsed?.choices?.[0]?.delta
              let chunkText = ''

              const reasoning = delta?.reasoning_content
              const hasReasoning = typeof reasoning === 'string' && reasoning.length > 0

              if (hasReasoning) {
                // 归因分析等模式：真正的流式思考内容单独放在 reasoning_content 字段逐字输出，
                // 此时 content 为固定占位串（round_index / sub_chat_mode 标记及“正在查询…”状态提示），
                // 占位串不作为思考正文追加（其 round_index / sub_chat_mode 已由前一条 content 事件提取）。
                // 将 reasoning_content 包装为 <think>…</think>，复用现有流式思考展示链路。
                if (currentDeepThinkEnabled) {
                  if (!isReasoningRef.current) {
                    chunkText += '<think>'
                    isReasoningRef.current = true
                    reasoningFromStreamRef.current = true
                  }
                  chunkText += reasoning
                }
                // 记录占位串，避免 reasoning 结束后占位串被当作新正文重复处理
                if (typeof delta?.content === 'string') {
                  lastContentRef.current = delta.content
                }
                if (!chunkText) {
                  // 未启用深度思考时，reasoning 阶段无输出，跳过
                  return
                }
                chunk = chunkText
              } else {
                // reasoning_content 为 null 或不存在
                // 归因分析等模式：思考流（reasoning_content）在此切换为 null，先闭合 <think>
                // 仅当 <think> 由 reasoning_content 流开启时，reasoning 变为 null 才代表思考结束需闭合；
                // 内联 ## 思考过程模式下 reasoning_content 恒为 null，不能据此提前闭合（否则思考正文会被冻结在首个 chunk）。
                if (reasoning === null && isReasoningRef.current && reasoningFromStreamRef.current) {
                  chunkText += '</think>'
                  isReasoningRef.current = false
                  reasoningFromStreamRef.current = false
                  lastContentRef.current = ''
                }

                // 处理 content，过滤后端重复发送的固定前缀/完整内容
                if (delta?.content !== undefined && delta?.content !== null) {
                  const currentContent = delta.content
                  let contentToAppend = ''
                  if (
                    lastContentRef.current &&
                    currentContent.startsWith(lastContentRef.current)
                  ) {
                    contentToAppend = currentContent.slice(lastContentRef.current.length)
                  } else {
                    contentToAppend = currentContent
                  }
                  lastContentRef.current = currentContent

                  if (contentToAppend) {
                    // 后端把思考内容直接放在 content 中并用 Markdown 标题标记边界
                    const processed = processContentWithInlineThinking(
                      contentToAppend,
                      isReasoningRef.current,
                      currentDeepThinkEnabled
                    )
                    chunkText += processed.text
                    isReasoningRef.current = processed.isReasoning
                  }
                }

                if (!chunkText) {
                  // 没有有效 content 的事件跳过
                  return
                }
                chunk = chunkText
              }
              }
            } catch {
              // 非 JSON 格式，直接使用原始 event.data（兼容旧格式）
            }

            // 提取 round_index
            if (chunk.includes('round_index')) {
              const roundIndexMatch = chunk.match(/round_index:(\d+)/)
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

            // 累积内容
            messageRef.current += chunk

            // 处理 intent_clarify
            if (chunk.includes('intent_clarify')) {
              try {
                const data = JSON.parse(chunk)
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
              } catch {}
            }

            const startCount = (messageRef.current.match(/<think>/g) || []).length
            const endCount = (messageRef.current.match(/<\/think>/g) || []).length

            if (endCount > closedGroupCountRef.current) {
              closedGroupCountRef.current = endCount
            }

            if (startCount > groupCountRef.current) {
              updateAiMessage({ smLoading: false, isDone: true })

              if (!isAborting.current) {
                let currentSubChatMode = undefined
                if (chunk.includes('sub_chat_mode')) {
                  const subChatModeMatch = chunk.match(/sub_chat_mode:(\w+)/)
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
            } else if (chunk.includes('sub_chat_mode')) {
              const subChatModeMatch = chunk.match(/sub_chat_mode:(\w+)/)
              if (subChatModeMatch) {
                const extractedSubChatMode = subChatModeMatch[1]
                updateAiMessage({
                  sub_chat_mode: extractedSubChatMode
                })
              }
            }

            // 提取当前显示内容
            // chat_with_knowledge（数据知识）：content 为以 thoughts 为首字段的 JSON，
            // 无 ## 思考过程标记不会生成 <think>，此处把 thoughts 作为思考内容流式展示。
            // thoughts 是后端结构化字段（非 reasoning_content 门控），无论是否开启深度思考都会下发，
            // 因此不依赖 currentDeepThinkEnabled 始终提取；正则只匹配「{ "thoughts": "」开头，不影响其他模式。
            let displayMessage = ''
            const knowledgeThoughts = extractKnowledgeThoughts(messageRef.current)
            if (knowledgeThoughts !== null) {
              displayMessage = knowledgeThoughts.replace(/\\"/g, '"')
            } else {
              const lastOpen = messageRef.current.lastIndexOf('<think>')
              if (lastOpen >= 0) {
                displayMessage = messageRef.current.substring(lastOpen + 7)
                const closeIdx = displayMessage.indexOf('</think>')
                if (closeIdx >= 0) {
                  displayMessage = displayMessage.substring(0, closeIdx)
                }
              }
              displayMessage = displayMessage.replace(/round_index:\d+,?\s*/, '')
              displayMessage = displayMessage.replace(/sub_chat_mode:\w+,?\s*/, '')
              // 剥离 illegal_query 包裹：提示语可能内嵌英文双引号，需用 [\s\S]* 贪婪匹配到末尾引号，
              // 避免因内嵌引号提前截断导致展示与实际数据不一致。
              displayMessage = displayMessage.replace(/"illegal_query":\s*"([\s\S]*?)"?\s*$/, '$1')
            }
            setCurrentMessage(displayMessage.replace(/\\n/g, '\n'))
          }
        },
        onclose() {
          if (!isCurrentGeneration()) return
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
                // 兜底：闲聊屏蔽（illegal_query）提示语含真实换行，第二物理行无 ASCII 冒号
                // 会被 @microsoft/fetch-event-source 整行丢弃；若后端发完后直接关流（末尾无空行），
                // 解析器甚至不会派发任何事件（实测：onmessage 零触发），只有 onclose 执行。
                // 此时流已正常结束但消息仍处思考态且无任何内容 —— 用兜底文案补全展示，
                // 避免气泡整块空白。（正常回答到 onclose 时 context 必非空，不会误伤）
                const noContext = !item.context || !String(item.context).trim()
                const refHasIllegal = messageRef.current.includes('illegal_query')
                const refIsEmpty = !messageRef.current.trim()
                if (refHasIllegal || (noContext && refIsEmpty)) {
                  return {
                    ...item,
                    context: ILLEGAL_QUERY_FALLBACK_TIP,
                    smLoading: false,
                    isStreaming: false,
                    isDone: true,
                    isIllegalQuery: true
                  }
                }
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
          if (!isCurrentGeneration()) throw err
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
      if (!isCurrentGeneration()) return
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

  // 推荐问题：按 query_recommend 接口参数请求，返回推荐问题数组（无副作用，不新增消息，供 ViewEle 内嵌展示）
  // messages 取该轮次用户问题；semantic_id 实时对话取发送时选中的语义（human._semanticSchemaId），历史对话取该回答内嵌的数据语义（options.semanticId）
  const getRecommend = async (options: any = {}) => {
    const explicitQuestion =
      typeof options === 'string'
        ? options
        : options?.question ?? options?.messages ?? ''

    // 定位该轮次的用户消息，用于回填 messages 与实时选中的语义
    const roundOrder = typeof options === 'object' ? (options?.order ?? options?.roundIndex) : undefined
    const humanMsg =
      roundOrder !== undefined
        ? convContent.find(
            (item: any) =>
              item.role === 'human' && (item.order === roundOrder || item.roundIndex === roundOrder)
          )
        : undefined
    const humanQuestion = humanMsg
      ? parseMessageContent(humanMsg.context)?.question ||
        (typeof humanMsg.context === 'string' ? humanMsg.context : '')
      : ''

    const base = paramsDataRef.current || paramsData
    const ctx = base?.context || {}

    const messages = explicitQuestion || humanQuestion || ctx.last_question || ''
    // 实时对话优先取发送时选中的语义；历史对话取回答内嵌的数据语义；最后回退到会话级/props
    const semanticId =
      humanMsg?._semanticSchemaId ??
      (typeof options === 'object' ? options?.semanticId : undefined) ??
      ctx.extra?.semantic_id ??
      props.semanticId ??
      null

    // recommend_chat_mode：归因=analysis，预测=forecast，普通推荐问题=不填（不下发该字段）
    const recommendChatMode = typeof options === 'object' ? (options?.recommendChatMode || '') : ''

    const params = {
      messages,
      model: '',
      stream: true,
      context: {
        embed_model_id: ctx.embed_model_id ?? '',
        chat_model_id: ctx.chat_model_id ?? '',
        conv_uid: ctx.conv_uid ?? '',
        chat_mode: 'query',
        app_id: ctx.app_id ?? 0,
        space_id: ctx.space_id ?? '',
        extra: {
          semantic_id: semanticId,
          ...(recommendChatMode ? { recommend_chat_mode: recommendChatMode } : {}),
        },
      },
    }
    try {
      const res: any = await fetchRecommendQuestion(params)
      // 接口一次性返回三类问题，统一返回结构化对象，由 ViewEle 本地切片展示（每类每次 3 个）：
      // ask=问数(ask_data)，root=归因(root_cause_analysis)，forecast=预测(forecast)
      // 归因/预测模式（recommend_chat_mode=analysis/forecast）下后端额外返回语义画像
      // metrics/dimensions/entities，供前端像意图澄清一样拼句发送

      // 检测后端业务错误（success: false + err_msg），将错误信息透传给调用方
      if (res && res.success === false && res.err_msg) {
        return { ask: [], root: [], forecast: [], metrics: [], dimensions: [], entities: [], errMsg: res.err_msg }
      }

      const data = res?.data || res || {}
      return {
        ask: Array.isArray(data.ask_data) ? data.ask_data : [],
        root: Array.isArray(data.root_cause_analysis) ? data.root_cause_analysis : [],
        forecast: Array.isArray(data.forecast) ? data.forecast : [],
        metrics: Array.isArray(data.metrics) ? data.metrics : [],
        dimensions: Array.isArray(data.dimensions) ? data.dimensions : [],
        entities: Array.isArray(data.entities) ? data.entities : [],
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        message.error('获取推荐问题失败')
      }
      return { ask: [], root: [], forecast: [], metrics: [], dimensions: [], entities: [] }
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

  const handleSend = (value: string, meta?: { groupName?: string; semanticName?: string; semanticSchemaId?: number | string; semanticGroupId?: number | string; selectedExcel?: any }) => {
    if (!value.trim() || loading) return
    void handleCollect()
    // 新建会话时，Excel 信息通过 meta 透传（此时组件状态可能已被清空）
    const metaExcel = meta?.selectedExcel?.file_id ? meta.selectedExcel : null
    const messageContent = {
      question: value,
      file_id: metaExcel?.file_id || effectiveSelectedExcelRef.current?.file_id,
      file_name: metaExcel?.file_name || effectiveSelectedExcelRef.current?.file_name,
      reference_order: referenceDialog?.order,
      reference_context: referenceDialog?.context,
      _meta: meta,
    }

    getAnswer(messageContent)
    handleRemoveDialog()
  }

  // 编辑用户消息后重新发送：不修改原消息，直接以编辑后的文本在底部发起新一轮对话
  const handleEditResend = (newText: string, item: any) => {
    const text = (newText || '').trim()
    if (!text || loading) return
    const parsed = parseMessageContent(item?.context)
    const selectedExcel = (parsed && typeof parsed === 'object' && parsed.file_id && parsed.file_name)
      ? { file_id: parsed.file_id, file_name: parsed.file_name }
      : undefined
    // 实时对话优先用 human 消息携带的语义元信息；
    // 历史对话的 human 不携带，从同轮答案（view/ai）内容中回填
    const round = item?.roundIndex ?? item?.order
    const roundMessages = convContent.filter((m: any) => {
      const r = m?.roundIndex ?? m?.order
      return r !== undefined && r === round
    })
    const fromHistory = extractSemanticMetaFromMessages(roundMessages)
    handleSend(text, {
      groupName: item?._groupName || fromHistory.groupName || '',
      semanticName: item?._semanticName || fromHistory.semanticName || '',
      semanticSchemaId: item?._semanticSchemaId ?? fromHistory.semanticId ?? props.semanticId ?? null,
      semanticGroupId: item?._semanticGroupId ?? fromHistory.groupId ?? null,
      selectedExcel,
    })
  }

  // 重新生成：以该轮相同的问题重新发起一轮对话（追加到底部）。
  // 相邻且问题相同的轮次会在展示层合并为多版本块，默认展示最新版本，从而实现
  // “原答案隐藏 / 新答案显示 / 可切换”的千问式效果。
  const regenerateRound = (item: any) => {
    if (loading) return
    const round = item?.roundIndex ?? item?.order
    if (round === undefined || round === null) return
    const roundMessages = convContent.filter((m: any) => {
      const r = m?.roundIndex ?? m?.order
      return r !== undefined && r === round
    })
    const humanMsg = roundMessages.find((m: any) => m?.role === 'human')
    if (!humanMsg) return
    const parsed = parseMessageContent(humanMsg.context)
    const question = (parsed && typeof parsed === 'object' && parsed.question)
      ? String(parsed.question)
      : (typeof humanMsg.context === 'string' ? humanMsg.context : '')
    if (!question.trim()) return
    const selectedExcel = (parsed && typeof parsed === 'object' && parsed.file_id && parsed.file_name)
      ? { file_id: parsed.file_id, file_name: parsed.file_name }
      : undefined
    // 语义元信息：优先 human 携带的，其次从同轮答案内容回填
    const fromHistory = extractSemanticMetaFromMessages(roundMessages)
    handleSend(question, {
      groupName: humanMsg?._groupName || fromHistory.groupName || '',
      semanticName: humanMsg?._semanticName || fromHistory.semanticName || '',
      semanticSchemaId: humanMsg?._semanticSchemaId ?? fromHistory.semanticId ?? props.semanticId ?? null,
      semanticGroupId: humanMsg?._semanticGroupId ?? fromHistory.groupId ?? null,
      selectedExcel,
    })
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
      generationGuardRef.current.invalidate()
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

      const userInfo = parseStoredUserInfo(localStorage.getItem('SOY-REACT_userInfo'))

      const [, res] = await Promise.all([
        download(),
        fetchOperate({
          ...conv,
          type: 3,
          name: conv.biz_name || 'AI智能助手',
          operator: userInfo.userName || '未知用户'
        })
      ])

      message.destroy()

      if (!isApiSuccess(res)) {
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

  const handleShareEmail = async () => {
    setConfirmShareLoading(true)
    const roundIndexs = sharingList.map((item: any) => item.order).join(',')
    try {
      const values = await shareEmailForm.validateFields()
      // 三 tab 调度值→旧分享邮件接口参数（type/executeFrequency/executeTime/weekendTargetDay/monthlyTargetDay），
      // 另附 scheduleMode + 结构化 scheduleConf 供后端后续升级完整调度语义
      const { deadline, execDate, execTime, interval, minutes, points, scheduleMode, unit, weekDay, ...restValues } = values
      const scheduleValues = { deadline, execDate, execTime, interval, minutes, points, scheduleMode, unit, weekDay }
      const data: Record<string, any> = {
        convUid: conv.conv_uid,
        sessionId: conv.chat_id,
        spaceId: conv.space_id,
        extra: {},
        chatName: conv.biz_name,
        roundIndexs,
        ...restValues,
        ...toShareEmailScheduleParams(scheduleValues),
        scheduleMode,
        scheduleConf: buildScheduleConf(scheduleMode, scheduleValues),
      }
      const result = await runApiSuccessFlow(
        () => fetchShareEmail(data),
        () => {
          message.success('分享成功')
          setIsSharing(false)
          setConfirmShareVisible(false)
          shareEmailForm.resetFields()
          setShareStep(1)
        }
      )
      if (!result.success) {
        message.error(result.message || '分享失败，请重试')
        return
      }
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.message || '分享失败，请重试')
    } finally {
      setConfirmShareLoading(false)
    }
  }

  const openDebugPanel = (item: any) => {
    setCur(item)
    setDebugModalVisible(true)
    message.warning('模型调试数据通道尚未配置安全鉴权，已停止建立连接')
  }

  const closeDebugPanel = () => {
    setDebugModalVisible(false)
  }

  return {
    chatContainerRef,
    chatHeaderRef,
    convContent,
    convContent2d,
    convContent3d,
    exploreHistoryItems,
    reportHistoryRounds,
    historyLoaded,
    refreshHistory,
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
    handleEditResend,
    regenerateRound,
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
    onUpdateList,
    // 批量删除
    isDeleting,
    deletableRounds,
    deleteSelectedRounds,
    deleteLoading,
    enterDeleteMode,
    exitDeleteMode,
    toggleDeleteRound,
    toggleDeleteAll,
    confirmDelete
  }
}
