import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Alert, Checkbox } from 'antd'

import AiEle from '../AiEle'
import AnalysisForecastClarify from './AnalysisForecastClarify'
import CheckboxWrapCom from '../CheckboxWrapCom'
import HumanEle from '../HumanEle'
import MessageNavRail from './MessageNavRail'
import type { NavItem } from './MessageNavRail'
import OpeningsEle from '../OpeningsEle'
import ViewEle from '../ViewEle'
import SchemaFieldsModal from '../../conversation-analysis/SchemaFieldsModal'
import type { SchemaTable, SchemaField } from '../../conversation-analysis/SchemaFieldsModal'
import { fetchSemanticDetail } from '../../../service/api/semantic'
import { parseMessageContent } from '../../../utils'
import ReportMessageRow from '../report-mode/ReportMessageRow'
import { mergeConversationAndReportGroups } from '../report-mode/reportTimeline'
import type { ReportItem } from '../report-mode/types'

// 从消息内容（view 的 chart-view 或内嵌 JSON）中解析数据分组/语义元信息，
// 用于历史会话回填信息条（历史 human 消息不携带 _groupName/_semanticName）
const extractSemanticMeta = (messages: any[]) => {
  for (const msg of messages) {
    const ctx = msg?.context
    if (typeof ctx !== 'string') continue
    let json: any = null
    if (ctx.includes('<chart-view')) {
      const match = ctx.match(/<chart-view content="([\s\S]*?)"\s*\/>/)
      if (match) {
        try {
          json = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/NaN/g, 'null'))
        } catch { /* ignore */ }
      }
    } else if (ctx.includes('semantic_group_name') || ctx.includes('semantic_name')) {
      try {
        json = JSON.parse(ctx)
      } catch { /* ignore */ }
    }
    if (json && (json.semantic_group_name || json.semantic_name || json.semantic_id != null)) {
      return {
        groupName: json.semantic_group_name || '',
        semanticName: json.semantic_name || '',
        semanticId: json.semantic_id,
      }
    }
  }
  return { groupName: '', semanticName: '', semanticId: undefined as any }
}

type MessageListProps = {
  mode?: 'default' | 'share'
  conv: any
  convContent: any[]
  convContent2d?: any[][]
  convContent3d?: any[][][]
  sharingList?: any[]
  loading?: boolean
  isSharing?: boolean
  isStorage?: boolean
  isDone?: boolean
  isGettingData?: boolean
  checkAll?: boolean
  setSharingList?: Dispatch<SetStateAction<any[]>>
  setIsStorage?: (value: boolean) => void
  setConvContent?: Dispatch<SetStateAction<any[]>>
  getAnswer: (data: any) => void
  getRecommend: (data: any) => void
  getQueryRewrite: (data: any) => void
  onReferenceClick: (orderIndex: number) => void
  chatContainerRef?: RefObject<HTMLDivElement>
  containerClassName?: string
  virtualized?: boolean
  estimatedItemHeight?: number
  overscan?: number
  // 批量删除（Qwen 风格）
  isDeleting?: boolean
  deleteSelectedRounds?: number[]
  onEnterDeleteMode?: (item: any) => void
  onToggleDeleteRound?: (round: number, checked: boolean) => void
  // 编辑用户消息后重新发送
  onEditMessage?: (text: string, item: any) => void
  // 重新生成（以相同问题重新发起一轮）
  onRegenerate?: (item: any) => void
  reportItems?: ReportItem[]
  reportLoadError?: string
  onToggleReportThinking?: (reportId: string) => void
  onToggleReportTodo?: (reportId: string) => void
  onToggleReportTask?: (reportId: string, taskKey: string) => void
  onOpenReport?: (reportId: string) => void
}

const MessageList = ({
  mode = 'default',
  conv,
  convContent,
  convContent2d = [],
  convContent3d = [],
  sharingList = [],
  loading = false,
  isSharing = false,
  isStorage = false,
  isDone = false,
  isGettingData = false,
  checkAll = false,
  setSharingList,
  setIsStorage,
  setConvContent,
  getAnswer,
  getRecommend,
  getQueryRewrite,
  onReferenceClick,
  chatContainerRef,
  containerClassName,
  virtualized = false,
  estimatedItemHeight = 120,
  overscan = 6,
  isDeleting = false,
  deleteSelectedRounds = [],
  onEnterDeleteMode,
  onToggleDeleteRound,
  onEditMessage,
  onRegenerate,
  reportItems = [],
  reportLoadError,
  onToggleReportThinking,
  onToggleReportTodo,
  onToggleReportTask,
  onOpenReport,
}: MessageListProps) => {
  const containerRef = chatContainerRef ?? useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  // ── 查看语义 Modal 状态 ──
  const [semModalOpen, setSemModalOpen] = useState(false)
  const [semModalTables, setSemModalTables] = useState<SchemaTable[]>([])

  // ── 重新生成版本切换（千问式）──
  // 相邻且问题相同的轮次合并为一个多版本块，versionSel 记录用户手动选中的版本下标
  const [versionSel, setVersionSel] = useState<Record<string, number>>({})
  const prevVersionCountRef = useRef<Record<string, number>>({})

  // 解析 modelDetail 提取字段
  function parseFieldsFromModelDetail(modelDetailStr: string): SchemaField[] {
    try {
      const detail = typeof modelDetailStr === 'string' ? JSON.parse(modelDetailStr) : modelDetailStr
      const fields: SchemaField[] = []
      const addFields = (items: any[], semantic: SchemaField['semantic'], semLabel: string) => {
        (items || []).forEach(item => {
          fields.push({
            name: item.originName || item.fieldName || item.techName || '',
            type: item.fieldType || '',
            semantic,
            semLabel,
            description: item.fieldDesc || '',
            tableName: item.tableName || '',
            tableDesc: item.tdesc || item.rtableName || '',
            bizName: item.bizName || '',
            alias: item.alias || '',
          })
        })
      }
      addFields(detail.identifiers, 'pk', '主键')
      const dimensions = detail.dimensions || []
      addFields(dimensions.filter((d: any) => d.type === 'datetime'), 'date', '日期')
      addFields(dimensions.filter((d: any) => d.type !== 'datetime'), 'dim', '维度')
      addFields(detail.measures, 'metric', '指标')
      return fields
    } catch { return [] }
  }

  const openSchemaModal = (schemaId: number | string, bizName: string) => {
    const table: SchemaTable = {
      schemaId,
      bizName,
      fields: [],
      loading: true,
    }
    setSemModalTables([table])
    setSemModalOpen(true)
    fetchSemanticDetail(schemaId)
      .then((res: any) => {
        const detail = res?.data?.data || res?.data || res
        const modelDetail = detail?.modelDetail
        const fields = modelDetail ? parseFieldsFromModelDetail(modelDetail) : []
        setSemModalTables([{ ...table, fields, loading: false, description: detail?.description || detail?.remark || '' }])
      })
      .catch(() => setSemModalTables([{ ...table, loading: false }]))
  }

  const groupedData = useMemo(() => {
    const baseGroups3d = convContent3d.length
      ? convContent3d
      : (convContent2d.length
          ? convContent2d.map((group: any[]) => [group])
          : convContent.map((item: any) => [[item]]))

    if (mode === 'share') {
      const selectedOrders = new Set(sharingList.map((item: any) => item.order))
      return baseGroups3d
        .map((group: any[][]) => group
          .map((section: any[]) => section.filter((item: any) => selectedOrders.has(item.order)))
          .filter((section: any[]) => section.length > 0))
        .filter((group: any[][]) => group.length > 0)
    }

    // 普通和报告消息只在展示层合并，原普通会话状态保持原样。
    return mergeConversationAndReportGroups(baseGroups3d, reportItems)
  }, [mode, convContent, convContent2d, convContent3d, reportItems, sharingList])

  const flatData = useMemo(() => groupedData.flat(2), [groupedData])

  // 将“相邻 + 问题文本完全相同”的轮次合并为一个多版本条目
  // （分享模式不合并，仍逐轮展示）
  const mergedGroups = useMemo(() => {
    const getQuestion = (group: any[][]) => {
      const report = group.flat().find((it: any) => it?.role === 'report')?.report as ReportItem | undefined
      if (report) return report.question
      const human = group.flat().find((it: any) => it?.role === 'human')
      if (!human) return ''
      const parsed = parseMessageContent(human.context)
      if (parsed && typeof parsed === 'object' && parsed.question) return String(parsed.question)
      return typeof human.context === 'string' ? human.context : ''
    }
    const entries: { key: string; questionText: string; kind: 'conversation' | 'report'; versions: any[][][] }[] = []
    groupedData.forEach((group: any[][], i: number) => {
      const q = getQuestion(group).trim()
      const kind = group.flat().some((item: any) => item?.role === 'report') ? 'report' : 'conversation'
      const prev = entries[entries.length - 1]
      if (kind === 'conversation' && q && prev?.kind === 'conversation' && prev.questionText === q) {
        prev.versions.push(group)
      } else {
        entries.push({ key: `${kind}:${i}:${q}`, questionText: q, kind, versions: [group] })
      }
    })
    return entries
  }, [groupedData])

  // 右侧消息导航条数据：每个合并条目取其 human 消息的 order 与问题文本
  // 注意：order 必须与锚点 id `human-msg-${item.order}` 一致（可为数字或临时字符串 id）
  const navItems: NavItem[] = useMemo(() => {
    const list: NavItem[] = []
    for (const entry of mergedGroups) {
      const anchor = entry.versions[0]?.flat().find((it: any) => it?.role === 'human' || it?.role === 'report')
      const order = anchor?.order ?? anchor?.roundIndex
      if (order === undefined || order === null) continue
      const text = (entry.questionText || '').trim()
      if (!text) continue
      list.push({ order, text })
    }
    return list
  }, [mergedGroups])

  // 某个条目的版本数变化时（如重新生成完成）自动跳到最新版本
  useEffect(() => {
    const changedKeys: string[] = []
    const nextCounts: Record<string, number> = {}
    for (const e of mergedGroups) {
      nextCounts[e.key] = e.versions.length
      if (prevVersionCountRef.current[e.key] !== e.versions.length) changedKeys.push(e.key)
    }
    prevVersionCountRef.current = nextCounts
    if (changedKeys.length) {
      setVersionSel((sel) => {
        const updated = { ...sel }
        for (const e of mergedGroups) {
          if (changedKeys.includes(e.key)) updated[e.key] = e.versions.length - 1
        }
        return updated
      })
    }
  }, [mergedGroups])

  useLayoutEffect(() => {
    if (!virtualized) return
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerHeight(el.clientHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [virtualized, containerRef])

  // 测量滚动条宽度，注入 CSS 变量供输入框对齐
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const scrollbarWidth = el.offsetWidth - el.clientWidth
      document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef])

  const renderItem = (
    item: any,
    key: string | number,
    isLast = false,
    versionInfo?: { activeIndex: number; total: number; onChange: (i: number) => void },
    shareOrder?: number,
  ) => {
    if (item.role === 'report') {
      const report = item.report as ReportItem
      return (
        <ReportMessageRow
          key={key}
          report={report}
          onToggleThinking={() => onToggleReportThinking?.(report.id)}
          onToggleTodo={() => onToggleReportTodo?.(report.id)}
          onToggleTask={(taskKey) => onToggleReportTask?.(report.id, taskKey)}
          onOpenReport={() => onOpenReport?.(report.id)}
        />
      )
    }

    if (item.role === 'human') {
      const anchorId = `human-msg-${item.order}`
      const content = <HumanEle data={item} id={anchorId} onDelete={onEnterDeleteMode} onEditSubmit={onEditMessage} />
      if (mode === 'share') return <HumanEle key={key} data={item} id={anchorId} />
      return (
        <CheckboxWrapCom key={key} convContent={convContent} checkAll={checkAll} sharingList={sharingList} setSharingList={setSharingList!} isSharing={isSharing} data={item}>
          {content}
        </CheckboxWrapCom>
      )
    }

    if (item.role === 'ai') {
      if (mode === 'share') {
        return (
          <AiEle
            key={key}
            isSharing
            loading={loading}
            data={item}
            thinkTime={item.thinkTime}
            useSimpleStyle={item.useSimpleStyle}
            getAnswer={getAnswer}
          />
        )
      }

      return (
        <AiEle
          key={key}
          loading={loading}
          isStorage={isStorage}
          data={item}
          isDone={item.isDone}
          thinkTime={item.thinkTime}
          useSimpleStyle={item.useSimpleStyle}
          getAnswer={getAnswer}
          onMessageUpdate={() => {
            if (conv.conv_uid) {
              setIsStorage?.(true)
            }
          }}
        />
      )
    }

    if (item.role === 'view') {
      return (
        <ViewEle
          isReadyShare={mode === 'share' ? false : undefined}
          isSharing={isSharing}
          key={key}
          data={item}
          getAnswer={getAnswer}
          getRecommend={getRecommend}
          getQueryRewrite={getQueryRewrite}
          convUid={conv.conv_uid}
          chatId={conv.chat_id}
          spaceId={conv.space_id}
          agentId={conv.agent_id}
          onReferenceClick={onReferenceClick}
          conv={conv}
          isDone={isDone}
          isGettingData={isGettingData}
          setConvContent={setConvContent!}
          onDelete={onEnterDeleteMode}
          onRegenerate={onRegenerate}
          isLast={isLast}
          versionInfo={versionInfo}
          shareOrder={shareOrder}
          onMessageUpdate={() => {}}
        />
      )
    }

    if (item.role === 'first') {
      return <OpeningsEle key={key} data={item} getAnswer={getAnswer} />
    }

    // 归因/预测拼句模板：独立一条消息（像意图澄清），发送或关闭后从会话中移除，不入历史
    if (item.role === 'analysis_clarify') {
      if (mode === 'share') return null
      const removeSelf = () => setConvContent?.((state: any[]) =>
        state.filter((it: any) => !(it?.role === 'analysis_clarify' && it?.order === item.order)))
      return (
        <AnalysisForecastClarify
          key={key}
          mode={item.context?.mode}
          metrics={item.context?.metrics || []}
          dimensions={item.context?.dimensions || []}
          onSend={(question: string) => {
            removeSelf()
            getAnswer({ question, _meta: item._meta })
          }}
          onClose={removeSelf}
        />
      )
    }

    return null
  }

  const renderGroup = (
    group: any[][],
    index: number,
    opts?: {
      isLast?: boolean
      groupRounds?: number[]
      versionInfo?: { activeIndex: number; total: number; onChange: (i: number) => void }
      /* 分享预选用的轮次：多版本合并块中复选框挂在 v0 的 human 上，需用其 order */
      shareOrder?: number
    },
  ) => {
    const isLast = opts?.isLast ?? false
    const versionInfo = opts?.versionInfo
    const shareOrder = opts?.shareOrder
    const flatGroup = group.flat()
    const groupKey = flatGroup[0]?.order ?? flatGroup[0]?.id ?? index
    // 当前轮次（仅取数字 roundIndex/order，用于批量删除选择）
    let groupRound: number | undefined = undefined
    for (const it of flatGroup) {
      if (it?.role === 'first') continue
      const r = it?.roundIndex ?? it?.order
      if (typeof r === 'number') { groupRound = r; break }
    }
    // 合并多版本块的删除以整块（含全部版本轮次）为单位
    const deleteRounds = (opts?.groupRounds && opts.groupRounds.length)
      ? opts.groupRounds
      : (groupRound !== undefined ? [groupRound] : [])
    const showCheckbox = isDeleting && deleteRounds.length > 0
    const roundChecked = deleteRounds.length > 0 && deleteRounds.every((r) => deleteSelectedRounds.includes(r))
    const renderRoundCheckbox = () => (
      <Checkbox
        checked={roundChecked}
        onChange={(e) => deleteRounds.forEach((r) => onToggleDeleteRound?.(r, e.target.checked))}
      />
    )
    if (group.length === 1 && group[0]?.length === 1 && group[0][0]?.role === 'first') {
      return renderItem(group[0][0], `opening-${groupKey}`)
    }

    if (flatGroup.length === 1 && flatGroup[0]?.role === 'report') {
      return (
        <div key={`group-${groupKey}-${index}`} id={`human-msg-${groupKey}`} className="mb-5">
          {renderItem(flatGroup[0], `report-${groupKey}`)}
        </div>
      )
    }

    // 从 human 消息中提取元数据(分组/数据语义)
    const humanMsg = flatGroup.find((item: any) => item.role === 'human')
    // 历史会话的 human 消息不携带语义元信息，回退到 view 消息内容中解析
    const semanticFromView = extractSemanticMeta(flatGroup)
    const msgGroupName = humanMsg?._groupName || semanticFromView.groupName || ''
    const msgSemanticName = humanMsg?._semanticName || semanticFromView.semanticName || ''
    const msgSemanticSchemaId = humanMsg?._semanticSchemaId ?? semanticFromView.semanticId
    const showInfoBar = mode !== 'share' && (msgGroupName || msgSemanticName)

    return (
      <div key={`group-${groupKey}-${index}`} className="mb-5">
        {group.map((section: any[], sectionIndex: number) => {
          const sectionKey = `section-${groupKey}-${sectionIndex}`
          const sectionRoles = new Set(section.map((item: any) => item?.role))
          const isHumanSection = sectionRoles.size === 1 && sectionRoles.has('human')
          const hasBodyContent = section.some((item: any) => item.role !== 'human' && item.role !== 'first')

          if (isHumanSection) {
            return (
              <div key={`${sectionKey}-human`} className="relative">
                {showCheckbox && (
                  <div className="absolute -left-9 top-2 z-10">
                    {renderRoundCheckbox()}
                  </div>
                )}
                <div>
                  {section.map((item: any, itemIndex: number) => renderItem(item, `human-${groupKey}-${itemIndex}`))}
                </div>
              </div>
            )
          }

          if (hasBodyContent) {
            const bodyCard = (
              <div className="rounded-[1.25rem] border border-[#e9edf4] bg-white px-[0.875rem] pt-[0.75rem] shadow-[0_0.125rem_0.5rem_rgba(15,23,42,0.04)]">
                {/* 信息条：分组 + 数据语义 + 查看 */}
                {showInfoBar && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      // gap: 10,
                      padding: '8px 14px',
                      marginBottom: 8,
                      background: 'rgba(255,255,255,0.55)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: 12,
                      border: '1px solid rgba(130,140,200,0.12)',
                      fontSize: 12,
                      color: '#546074',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ color: '#1a2744', fontWeight: 500, fontSize: 13 }}>分组：</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(91,124,247,0.06))',
                        color: '#8b5cf6',
                        border: '1px solid rgba(139,92,246,0.18)',
                        boxShadow: '0 1px 4px rgba(139,92,246,0.08)',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: '#8b5cf6',
                          boxShadow: '0 0 6px rgba(139,92,246,0.5)',
                        }}
                      />
                      {msgGroupName || '无'}
                    </span>
                    <span style={{ color: '#1a2744', fontWeight: 500, fontSize: 13, marginLeft: '2em' }}>数据语义：</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, rgba(91,124,247,0.12), rgba(16,185,129,0.04))',
                        color: '#5b7cf7',
                        border: '1px solid rgba(91,124,247,0.18)',
                        boxShadow: '0 1px 4px rgba(91,124,247,0.08)',
                        cursor: msgSemanticSchemaId ? 'pointer' : 'default',
                        transition: 'opacity 0.15s',
                      }}
                      onClick={() => {
                        if (msgSemanticSchemaId) {
                          openSchemaModal(msgSemanticSchemaId, msgSemanticName)
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (msgSemanticSchemaId) {
                          (e.currentTarget as HTMLElement).style.opacity = '0.7'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (msgSemanticSchemaId) {
                          (e.currentTarget as HTMLElement).style.opacity = '1'
                        }
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: '#5b7cf7',
                          boxShadow: '0 0 6px rgba(91,124,247,0.5)',
                        }}
                      />
                      {msgSemanticName || '无'}
                    </span>
                  </div>
                )}
                {section.map((item: any, itemIndex: number) => renderItem(item, `body-${groupKey}-${itemIndex}`, isLast, versionInfo, shareOrder))}
              </div>
            )
            return (
              <div key={`${sectionKey}-body`} className="relative">
                {showCheckbox && (
                  <div className="absolute -left-9 top-3 z-10">
                    {renderRoundCheckbox()}
                  </div>
                )}
                {bodyCard}
              </div>
            )
          }

          return (
            <div key={`${sectionKey}-fallback`}>
              {section.map((item: any, itemIndex: number) => renderItem(item, `item-${groupKey}-${itemIndex}`))}
            </div>
          )
        })}
      </div>
    )
  }

  // 渲染一个合并条目：单版本直接渲染；多版本时取 v0 的问题 + 当前版本的答案，并在底部显示分页
  const renderMergedEntry = (entry: { key: string; questionText: string; kind: 'conversation' | 'report'; versions: any[][][] }, index: number) => {
    const isLast = index === mergedGroups.length - 1
    // 收集该条目全部版本的轮次（用于批量删除整块）
    const groupRounds: number[] = []
    entry.versions.forEach((g) => g.flat().forEach((it: any) => {
      if (it?.role === 'first') return
      const r = it?.roundIndex ?? it?.order
      if (typeof r === 'number' && !groupRounds.includes(r)) groupRounds.push(r)
    }))
    if (entry.versions.length <= 1) {
      return renderGroup(entry.versions[0], index, { isLast, groupRounds })
    }
    const total = entry.versions.length
    const activeIndex = Math.min(versionSel[entry.key] ?? total - 1, total - 1)
    const isHumanSection = (section: any[]) => {
      const roles = new Set(section.map((it: any) => it?.role))
      return roles.size === 1 && roles.has('human')
    }
    const humanSections = entry.versions[0].filter(isHumanSection)
    const bodySections = entry.versions[activeIndex].filter((s: any[]) => !isHumanSection(s))
    const displayGroup = [...humanSections, ...bodySections]
    // 分享预选需对齐复选框所在的 v0 human 轮次（当前版本的 order 与其不同）
    const shareOrder = humanSections.flat().find((it: any) => it?.role === 'human')?.order
    return renderGroup(displayGroup, index, {
      isLast,
      groupRounds,
      shareOrder,
      versionInfo: {
        activeIndex,
        total,
        onChange: (i: number) => setVersionSel((sel) => ({ ...sel, [entry.key]: i })),
      },
    })
  }

  if (mode === 'share') {
    return <>{groupedData.map((g: any[][], i: number) => renderGroup(g, i))}</>
  }

  if (!virtualized) {
    return (
      <div className="relative flex-1 min-h-0 w-full">
        <div
          ref={containerRef}
          className={containerClassName ?? 'absolute inset-0 overflow-y-auto overflow-x-hidden w-full scroll-smooth'}
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className="max-w-[53.75rem] w-full m-auto">
            {mergedGroups.map(renderMergedEntry)}
            {reportLoadError && <Alert className="mb-4" type="error" showIcon message={reportLoadError} />}
          </div>
          <SchemaFieldsModal open={semModalOpen} tables={semModalTables} onClose={() => setSemModalOpen(false)} />
        </div>
        <MessageNavRail items={navItems} containerRef={containerRef} />
      </div>
    )
  }

  const totalHeight = flatData.length * estimatedItemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - overscan)
  const endIndex = Math.min(flatData.length, Math.ceil((scrollTop + containerHeight) / estimatedItemHeight) + overscan)
  const offsetTop = startIndex * estimatedItemHeight
  const visibleItems = flatData.slice(startIndex, endIndex)

  return (
    <div
      ref={containerRef}
      className={containerClassName ?? 'overflow-y-auto overflow-x-hidden bg-white w-full flex-1 scroll-smooth'}
      style={{ scrollbarGutter: 'stable' }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
     <div className="max-w-[53.75rem] w-full m-auto p-4">
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetTop / 16}rem)` }}>{visibleItems.map((item, index) => renderItem(item, startIndex + index))}</div>
      </div>
      </div>
      <SchemaFieldsModal open={semModalOpen} tables={semModalTables} onClose={() => setSemModalOpen(false)} />
    </div>
  )
}

export default MessageList
