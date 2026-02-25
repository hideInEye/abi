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
  setCur: (value: any) => void
  onOpenDebug: (item: any) => void
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
  setCur,
  onOpenDebug,
  chatContainerRef,
  containerClassName,
  virtualized = false,
  estimatedItemHeight = 120,
  overscan = 6,
}: MessageListProps) => {
  const containerRef = chatContainerRef ?? useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  const data = useMemo(() => {
    if (mode === 'share') {
      const selectedOrders = new Set(sharingList.map((item: any) => item.order))
      return convContent.filter((item: any) => selectedOrders.has(item.order))
    }
    return convContent
  }, [mode, convContent, sharingList])

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

  const renderItem = (item: any, index: number) => {
    if (item.role === 'human') {
      const anchorId = `human-msg-${item.order}`
      const content = <HumanEle data={item} id={anchorId} />
      if (mode === 'share') return <HumanEle key={index} data={item} id={anchorId} />
      return (
        <CheckboxWrapCom key={index} convContent={convContent} checkAll={checkAll} setSharingList={setSharingList!} isSharing={isSharing} data={item}>
          {content}
        </CheckboxWrapCom>
      )
    }

    if (item.role === 'ai') {
      if (mode === 'share') {
        return (
          <AiEle
            key={index}
            isSharing
            loading={loading}
            data={item}
            thinkTime={item.thinkTime}
            useSimpleStyle={item.useSimpleStyle}
            setCur={setCur}
            setDebugModalVisible={() => onOpenDebug(item)}
            getAnswer={getAnswer}
          />
        )
      }

      return (
        <AiEle
          key={index}
          loading={loading}
          isStorage={isStorage}
          data={item}
          isDone={item.isDone}
          thinkTime={item.thinkTime}
          useSimpleStyle={item.useSimpleStyle}
          setCur={setCur}
          setDebugModalVisible={() => onOpenDebug(item)}
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
          key={index}
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
      return <OpeningsEle key={index} data={item} getAnswer={getAnswer} />
    }

    return null
  }

  if (mode === 'share') {
    return <>{data.map(renderItem)}</>
  }

  if (!virtualized) {
    return (
      <div ref={containerRef} className={containerClassName ?? 'overflow-y-auto bg-white w-[53.75rem] m-auto flex-1 scroll-smooth h-[calc(100vh-15.625rem)]'}>
        {data.map(renderItem)}
      </div>
    )
  }

  const totalHeight = data.length * estimatedItemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - overscan)
  const endIndex = Math.min(data.length, Math.ceil((scrollTop + containerHeight) / estimatedItemHeight) + overscan)
  const offsetTop = startIndex * estimatedItemHeight
  const visibleItems = data.slice(startIndex, endIndex)

  return (
    <div
      ref={containerRef}
      className={containerClassName ?? 'overflow-y-auto bg-white p-4 w-[53.75rem] flex-1 scroll-smooth h-[calc(100vh-15.625rem)]'}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetTop}px)` }}>{visibleItems.map((item, index) => renderItem(item, startIndex + index))}</div>
      </div>
    </div>
  )
}

export default MessageList
