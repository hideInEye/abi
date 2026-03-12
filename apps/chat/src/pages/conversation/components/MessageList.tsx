import type { RefObject } from 'react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import AiEle from '../AiEle'
import CheckboxWrapCom from '../CheckboxWrapCom'
import HumanEle from '../HumanEle'
import OpeningsEle from '../OpeningsEle'
import ViewEle from '../ViewEle'

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
      <div ref={containerRef} className={containerClassName ?? 'overflow-y-auto w-full flex-1 scroll-smooth'}>
        <div className="w-[53.75rem] m-auto">
          {groupedData.map(renderGroup)}
        </div>
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
      className={containerClassName ?? 'overflow-y-auto bg-white w-full flex-1 scroll-smooth'}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
     <div className="w-[53.75rem] m-auto p-4">
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetTop / 16}rem)` }}>{visibleItems.map((item, index) => renderItem(item, startIndex + index))}</div>
      </div>
      </div>
    </div>
  )
}

export default MessageList
