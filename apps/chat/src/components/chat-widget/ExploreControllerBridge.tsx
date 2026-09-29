import { useEffect } from 'react'

import { useExploreConversation } from '../conversation/exploration-mode/useExploreConversation'
import type { ExploreItem, ExploreSendOptions } from '../conversation/exploration-mode/types'

export interface ExploreControllerHandle {
  handleSend: (question: string, schemaId: string | number, options?: ExploreSendOptions) => Promise<void>
  stopGenerating: () => void
}

export interface ExploreControllerSnapshot {
  items: ExploreItem[]
  loading: boolean
}

interface ExploreControllerBridgeProps {
  conv?: Record<string, unknown>
  spaceId: number
  currentModelId: string | number
  embedModelId: string | number
  authorization?: string | null
  controllerRef: { current: ExploreControllerHandle | null }
  onSnapshot: (snapshot: ExploreControllerSnapshot) => void
}

/**
 * 探索控制器的按需挂载边界。
 * ChatWidget 首屏只需要交互模式；用户首次切换到探索模式后才加载探索协议与状态机。
 */
export default function ExploreControllerBridge({
  conv,
  spaceId,
  currentModelId,
  embedModelId,
  authorization,
  controllerRef,
  onSnapshot,
}: ExploreControllerBridgeProps) {
  const controller = useExploreConversation({
    conv,
    spaceId,
    currentModelId,
    embedModelId,
    authorization,
  })

  useEffect(() => {
    const handle: ExploreControllerHandle = {
      handleSend: controller.handleSend,
      stopGenerating: controller.stopGenerating,
    }
    controllerRef.current = handle

    return () => {
      if (controllerRef.current === handle) controllerRef.current = null
    }
  }, [controller.handleSend, controller.stopGenerating, controllerRef])

  useEffect(() => {
    onSnapshot({ items: controller.items, loading: controller.loading })
  }, [controller.items, controller.loading, onSnapshot])

  return null
}
