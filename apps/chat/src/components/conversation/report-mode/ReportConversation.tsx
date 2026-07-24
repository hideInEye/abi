import { FileSearchOutlined } from '@ant-design/icons'
import { Alert, Segmented } from 'antd'
import React, { useEffect, useImperativeHandle } from 'react'

import ChatHeader from '../components/chat-header'
import type { ModelOption } from '../components/chat-header'

import ReportMessageRow from './ReportMessageRow'
import ReportPreviewPane from './ReportPreviewPane'
import { useReportConversation } from './useReportConversation'
import styles from './styles.module.css'

export interface ReportConversationHandle {
  handleSend: (value: string) => void
  stopGenerating: () => void
  loading: boolean
}

interface ReportConversationProps {
  conv?: any
  fold?: boolean
  spaceId?: number
  onClose?: () => void
  onUpdateList?: (data: any) => void
  onLoadingChange?: (loading: boolean) => void
  onReportPreviewChange?: (open: boolean) => void
  modelOptions?: ModelOption[]
  currentModel?: ModelOption | null
  embedModelId?: string | number
  sessionGroupId?: string
  onModelChange?: (model: ModelOption) => void
}

const ReportConversation = React.forwardRef<ReportConversationHandle, ReportConversationProps>((props, ref) => {
  // 报告模式有独立 controller：普通 Conversation 不知道 Redis Stream，也不会被报告状态污染。
  const controller = useReportConversation({
    conv: props.conv,
    spaceId: props.spaceId,
    currentModelId: props.currentModel?.id,
    embedModelId: props.embedModelId,
    sessionGroupId: props.sessionGroupId,
  })

  const {
    reports,
    activeReport,
    mobileView,
    loading,
    loadError,
    handleSend,
    stopGenerating,
    toggleThinking,
    toggleTodo,
    toggleTaskExecution,
    openReport,
    closeReport,
    setMobileView,
  } = controller

  useImperativeHandle(ref, () => ({
    handleSend,
    stopGenerating,
    loading,
  }), [handleSend, loading, stopGenerating])

  useEffect(() => {
    props.onLoadingChange?.(loading)
  }, [loading, props.onLoadingChange])

  useEffect(() => {
    props.onReportPreviewChange?.(Boolean(activeReport))
  }, [activeReport, props.onReportPreviewChange])

  return (
    <div className={styles.shell}>
      <ChatHeader
        conv={props.conv || {}}
        setConvContent={() => {}}
        onUpdateList={props.onUpdateList || (() => {})}
        setIsSharing={() => {}}
        onClose={props.onClose || (() => {})}
        modelOptions={props.modelOptions}
        currentModel={props.currentModel}
        onModelChange={props.onModelChange}
        onEmbedModelFound={() => {}}
      />

      {activeReport && (
        // 窄屏时不强制左右并排，用 Segmented 保留“对话/报告”的单屏切换体验。
        <div className={styles.mobileSwitch}>
          <Segmented
            block
            value={mobileView}
            options={[
              { label: '对话', value: 'conversation' },
              { label: '报告', value: 'report' },
            ]}
            onChange={(value) => setMobileView(value as 'conversation' | 'report')}
          />
        </div>
      )}

      <div className={`${styles.body} ${activeReport ? styles.bodySplit : ''}`}>
        <div className={`${styles.conversationPane} ${activeReport && mobileView === 'report' ? styles.mobileHidden : ''}`}>
          <div className={styles.messageScroll}>
            <div className={styles.messageInner}>
              {reports.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>
                    <FileSearchOutlined />
                  </span>
                  <div className={styles.emptyTitle}>报告模式已开启</div>
                  <div className={styles.emptyDesc}>
                    发送问题后会提交异步报告任务，并通过 Redis Stream 实时展示思考、ToDo 和最终报告文件。
                  </div>
                </div>
              ) : (
                reports.map((report) => (
                  <ReportMessageRow
                    key={report.id}
                    report={report}
                    onToggleThinking={() => toggleThinking(report.id)}
                    onToggleTodo={() => toggleTodo(report.id)}
                    onToggleTask={(taskKey) => toggleTaskExecution(report.id, taskKey)}
                    onOpenReport={() => openReport(report.id)}
                  />
                ))
              )}
              {loadError && <Alert className={styles.loadAlert} type="error" showIcon message={loadError} />}
            </div>
          </div>
        </div>

        {activeReport && (
          // 桌面端报告预览是右侧双栏，不使用 Drawer/遮罩/独立路由。
          <div className={mobileView === 'conversation' ? styles.mobileHidden : styles.reportPaneWrap}>
            <ReportPreviewPane report={activeReport} onClose={closeReport} />
          </div>
        )}
      </div>
    </div>
  )
})

ReportConversation.displayName = 'ReportConversation'

export default ReportConversation
