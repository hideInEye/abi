import type { RefObject } from 'react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import AiEle from '../AiEle'
import CheckboxWrapCom from '../CheckboxWrapCom'
import HumanEle from '../HumanEle'
import OpeningsEle from '../OpeningsEle'
import ViewEle from '../ViewEle'
import SchemaFieldsModal from '../../conversation-analysis/SchemaFieldsModal'
import type { SchemaTable, SchemaField } from '../../conversation-analysis/SchemaFieldsModal'
import { fetchSemanticDetail } from '../../../service/api/semantic'

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
  setSharingList?: (value: any[]) => void
  setIsStorage?: (value: boolean) => void
  setConvContent?: (value: any) => void
  getAnswer: (data: any) => void
  getRecommend: (data: any) => void
  getQueryRewrite: (data: any) => void
  onReferenceClick: (orderIndex: number) => void
  chatContainerRef?: RefObject<HTMLDivElement>
  containerClassName?: string
  virtualized?: boolean
  estimatedItemHeight?: number
  overscan?: number
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
}: MessageListProps) => {
  const containerRef = chatContainerRef ?? useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  // ── 查看语义 Modal 状态 ──
  const [semModalOpen, setSemModalOpen] = useState(false)
  const [semModalTables, setSemModalTables] = useState<SchemaTable[]>([])

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
    return baseGroups3d
  }, [mode, convContent, convContent2d, convContent3d, sharingList])

  const flatData = useMemo(() => groupedData.flat(2), [groupedData])

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

  const renderItem = (item: any, key: string | number) => {
    if (item.role === 'human') {
      const anchorId = `human-msg-${item.order}`
      const content = <HumanEle data={item} id={anchorId} />
      if (mode === 'share') return <HumanEle key={key} data={item} id={anchorId} />
      return (
        <CheckboxWrapCom key={key} convContent={convContent} checkAll={checkAll} setSharingList={setSharingList!} isSharing={isSharing} data={item}>
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
          setConvContent={setConvContent}
          onMessageUpdate={() => {}}
        />
      )
    }

    if (item.role === 'first') {
      return <OpeningsEle key={key} data={item} getAnswer={getAnswer} />
    }

    return null
  }

  const renderGroup = (group: any[][], index: number) => {
    const flatGroup = group.flat()
    const groupKey = flatGroup[0]?.order ?? flatGroup[0]?.id ?? index
    if (group.length === 1 && group[0]?.length === 1 && group[0][0]?.role === 'first') {
      return renderItem(group[0][0], `opening-${groupKey}`)
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
              <div key={`${sectionKey}-human`}>
                {section.map((item: any, itemIndex: number) => renderItem(item, `human-${groupKey}-${itemIndex}`))}
              </div>
            )
          }

          if (hasBodyContent) {
            return (
              <div key={`${sectionKey}-body`} className="rounded-[1.25rem] border border-[#e9edf4] bg-white px-[0.875rem] py-[0.75rem] shadow-[0_0.125rem_0.5rem_rgba(15,23,42,0.04)]">
                {/* 信息条：分组 + 数据语义 + 查看 */}
                {showInfoBar && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
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
                    <span style={{ color: '#1a2744', fontWeight: 500, fontSize: 12 }}>分组</span>
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
                    <span style={{ color: '#1a2744', fontWeight: 500, fontSize: 12 }}>数据语义</span>
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
                {section.map((item: any, itemIndex: number) => renderItem(item, `body-${groupKey}-${itemIndex}`))}
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

  if (mode === 'share') {
    return <>{groupedData.map(renderGroup)}</>
  }

  if (!virtualized) {
    return (
      <div
        ref={containerRef}
        className={containerClassName ?? 'overflow-y-auto overflow-x-hidden w-full flex-1 scroll-smooth'}
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="max-w-[53.75rem] w-full m-auto">
          {groupedData.map(renderGroup)}
        </div>
        <SchemaFieldsModal open={semModalOpen} tables={semModalTables} onClose={() => setSemModalOpen(false)} />
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
