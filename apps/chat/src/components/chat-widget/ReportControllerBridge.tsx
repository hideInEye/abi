import { useEffect } from 'react'

import { buildReportSourceVersionFields } from '../conversation/components/chat-input/reportSourceSelection'
import { useReportConversation } from '../conversation/report-mode/useReportConversation'
import type { ReportHistoryRoundGroup, ReportItem } from '../conversation/report-mode/types'
import type { AssistantBoundMcp, AssistantBoundSkill } from '../../pages/chat/workshop/-assistantResources'

export interface ReportControllerHandle {
  handleSend: (
    question: string,
    skills: readonly AssistantBoundSkill[],
    selectedSkillIds: ReadonlySet<string>,
    mcps: readonly AssistantBoundMcp[],
    selectedMcpIds: ReadonlySet<string>,
  ) => void
  stopGenerating: () => void
  toggleThinking: (reportId: string) => void
  completeThinkingTypewriter: (reportId: string) => void
  toggleTodo: (reportId: string) => void
  toggleTaskExecution: (reportId: string, taskKey: string) => void
  openReport: (reportId: string) => void
  closeReport: () => void
}

export interface ReportControllerSnapshot {
  reports: ReportItem[]
  activeReport?: ReportItem
  animateReportPreview: boolean
  loading: boolean
}

interface ReportControllerBridgeProps {
  conv?: Record<string, unknown>
  spaceId: number
  schemaId?: string | number
  currentModelId: string | number
  embedModelId: string | number
  authorization?: string | null
  controllerRef: { current: ReportControllerHandle | null }
  onSnapshot: (snapshot: ReportControllerSnapshot) => void
}

const EMPTY_REPORT_HISTORY: ReportHistoryRoundGroup[] = []

/** 报告协议、恢复状态与 IndexedDB 仅在用户首次进入报告模式后挂载。 */
export default function ReportControllerBridge({
  conv,
  spaceId,
  schemaId,
  currentModelId,
  embedModelId,
  authorization,
  controllerRef,
  onSnapshot,
}: ReportControllerBridgeProps) {
  const controller = useReportConversation({
    conv,
    spaceId,
    schemaId,
    currentModelId,
    embedModelId,
    historyLoaded: true,
    historyRounds: EMPTY_REPORT_HISTORY,
    authorization,
  })

  useEffect(() => {
    const handle: ReportControllerHandle = {
      handleSend(question, skills, selectedSkillIds, mcps, selectedMcpIds) {
        controller.handleSend(question, buildReportSourceVersionFields({
          skills,
          selectedSkillIds,
          mcps,
          selectedMcpIds,
        }))
      },
      stopGenerating: controller.stopGenerating,
      toggleThinking: controller.toggleThinking,
      completeThinkingTypewriter: controller.completeThinkingTypewriter,
      toggleTodo: controller.toggleTodo,
      toggleTaskExecution: controller.toggleTaskExecution,
      openReport: controller.openReport,
      closeReport: controller.closeReport,
    }
    controllerRef.current = handle

    return () => {
      if (controllerRef.current === handle) controllerRef.current = null
    }
  }, [
    controller.closeReport,
    controller.completeThinkingTypewriter,
    controller.handleSend,
    controller.openReport,
    controller.stopGenerating,
    controller.toggleTaskExecution,
    controller.toggleThinking,
    controller.toggleTodo,
    controllerRef,
  ])

  useEffect(() => {
    onSnapshot({
      reports: controller.reports,
      activeReport: controller.activeReport,
      animateReportPreview: controller.animateReportPreview,
      loading: controller.loading,
    })
  }, [
    controller.activeReport,
    controller.animateReportPreview,
    controller.loading,
    controller.reports,
    onSnapshot,
  ])

  return null
}
