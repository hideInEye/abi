import { Button, Checkbox, Form, Modal, notification, Segmented } from 'antd'
import React, { useEffect, useImperativeHandle, useState } from 'react'
import { flushSync } from 'react-dom'
import dayjs from 'dayjs'

import type { ReportSourceVersionFields } from '@/service/api/report'

import ChatHeader from './components/chat-header'
import type { ModelOption } from './components/chat-header'
import DebugPanel from './components/DebugPanel'
import MessageList from './components/MessageList'
import ShareEmailSetting from './components/share-email-setting'
import SharingModal from './SharingModal'
import { useConversationController, type ConversationProps } from './hooks/useConversationController'
import { useExploreConversation } from './exploration-mode/useExploreConversation'
import type { ExploreSendOptions } from './exploration-mode/types'
import ExplorePreviewPane from './exploration-mode/ExplorePreviewPane'
import { useExplorePreviewPresence } from './exploration-mode/useExplorePreviewPresence'
import ReportPreviewPane from './report-mode/ReportPreviewPane'
import { useReportConversation } from './report-mode/useReportConversation'
import { useReportPreviewPresence } from './report-mode/useReportPreviewPresence'
import reportStyles from './report-mode/styles.module.css'

export interface ConversationHandle {
  setConvContent: (content: any[]) => void
  handleSend: (value: string, meta?: { groupName?: string; semanticName?: string; semanticSchemaId?: number | string; semanticGroupId?: number | string; selectedExcel?: { file_id: string | number; file_name: string } }) => void
  handleExploreSend: (value: string, schemaId: string | number, options?: ExploreSendOptions) => void
  handleReportSend: (value: string, reportSources?: ReportSourceVersionFields) => void
  stopGenerating: () => void
  stopExploreGenerating: () => void
  stopReportGenerating: () => void
  loading: boolean
  exploreLoading: boolean
  reportLoading: boolean
}

const Conversation = React.forwardRef<ConversationHandle, ConversationProps>((props, ref) => {
  const { conv, onLoadingChange, modelOptions, currentModel, onModelChange, deepThinkEnabled } = props
  const [selectedModel, setSelectedModel] = useState<string>(currentModel?.label || '')
  const [selectedModelId, setSelectedModelId] = useState<string | number>(currentModel?.id || '')
  const [embedModelId, setEmbedModelId] = useState<string | number>(props.embedModelId || '')
  const controller = useConversationController({ ...props, selectedModel, selectedModelId, embedModelId, deepThinkEnabled })
  const [notificationApi, notificationContextHolder] = notification.useNotification()
  const handleReportCompleted = React.useCallback(() => {
    notificationApi.success({
      message: '报告生成完成',
      description: '报告已经生成完成，可以点击报告文件查看。',
      duration: 3,
      placement: 'topRight',
    })
  }, [notificationApi])
  const reportController = useReportConversation({
    conv,
    spaceId: props.spaceId,
    schemaId: props.semanticId,
    groupId: props.semanticGroupId,
    currentModelId: selectedModelId,
    embedModelId,
    historyRounds: controller.reportHistoryRounds,
    historyLoaded: controller.historyLoaded,
    onRefreshHistory: controller.refreshHistory,
    onReportCompleted: handleReportCompleted,
  })
  const exploreController = useExploreConversation({
    conv,
    spaceId: props.spaceId,
    currentModelId: selectedModelId,
    embedModelId,
  })
  const reportPreview = useReportPreviewPresence(reportController.activeReport)

  const {
    chatContainerRef,
    chatHeaderRef,
    convContent,
    convContent2d,
    convContent3d,
    exploreHistoryItems,
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
    handleSend,
    handleEditResend,
    regenerateRound,
    stopGenerating,
    loading,
    isStorage,
    doneStatus,
    isGettingData,
    getAnswer,
    getRecommend,
    getQueryRewrite,
    getReference,
    closeDebugPanel,
    debugModalVisible,
    cur,
    loadingRoundIndex,
    sharingRef,
    onClose,
    onUpdateList,
    // 批量删除
    isDeleting,
    deleteSelectedRounds,
    deleteCheckAll,
    deleteLoading,
    enterDeleteMode,
    exitDeleteMode,
    toggleDeleteRound,
    toggleDeleteAll,
    confirmDelete,
  } = controller

  // 探索结果全高工作室侧栏：与报告侧栏互斥，共用同一套分屏动画壳。
  const exploreItemsAll = React.useMemo(
    () => [...exploreHistoryItems, ...exploreController.items],
    [exploreHistoryItems, exploreController.items],
  )
  const [activeExploreId, setActiveExploreId] = useState<string>()
  const activeExplore = React.useMemo(
    () => exploreItemsAll.find((item) => item.id === activeExploreId),
    [exploreItemsAll, activeExploreId],
  )
  const explorePreview = useExplorePreviewPresence(activeExplore)
  const exploreStatusRef = React.useRef<Map<string, string>>(new Map())
  const openExplore = React.useCallback((exploreId: string) => {
    reportController.closeReport()
    setActiveExploreId(exploreId)
  }, [reportController])
  const closeExplore = React.useCallback(() => setActiveExploreId(undefined), [])
  const openReport = React.useCallback((reportId: string) => {
    setActiveExploreId(undefined)
    reportController.openReport(reportId)
  }, [reportController])

  // 探索运行中只在卡片内展示当前步骤结果；从 running 结束为 completed 后再自动打开右侧全部结果。
  useEffect(() => {
    const nextStatuses = new Map<string, string>()
    exploreController.items.forEach((item) => {
      const previous = exploreStatusRef.current.get(item.id)
      const hasResult = Boolean(item.finalContent) || Boolean(item.summary) || item.steps.some((step) => step.outputs.length > 0)
      if (previous === 'running' && item.status === 'completed' && hasResult) {
        openExplore(item.id)
      }
      nextStatuses.set(item.id, item.status)
    })
    exploreStatusRef.current = nextStatuses
  }, [exploreController.items, openExplore])

  const handleReportSend = React.useCallback(
    (value: string, reportSources?: ReportSourceVersionFields) => {
      reportController.handleSend(value, reportSources)

      // 只在用户提交本轮报告问题时定位一次；后续流式事件不会再次驱动滚动。
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const container = chatContainerRef.current
          if (!container) return
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
        })
      })
    },
    [chatContainerRef, reportController.handleSend],
  )

  // 探索发送后同样定位一次到当前执行问题，与报告模式发送行为保持一致。
  const handleExploreSend = React.useCallback(
    (value: string, schemaId: string | number, options?: ExploreSendOptions) => {
      exploreController.handleSend(value, schemaId, options)

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const container = chatContainerRef.current
          if (!container) return
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
        })
      })
    },
    [chatContainerRef, exploreController.handleSend],
  )

  // 暴露给父级调用
  useImperativeHandle(
    ref,
    () => ({
      setConvContent,
      handleSend,
      handleExploreSend,
      handleReportSend,
      stopGenerating,
      stopExploreGenerating: exploreController.stopGenerating,
      stopReportGenerating: reportController.stopGenerating,
      loading,
      exploreLoading: exploreController.loading,
      reportLoading: reportController.loading,
    }),
    [setConvContent, handleSend, handleExploreSend, exploreController.loading, exploreController.stopGenerating, handleReportSend, reportController.loading, reportController.stopGenerating, stopGenerating, loading],
  )

  // 通知父级 loading 变化
  useEffect(() => {
    onLoadingChange?.(loading)
  }, [loading, onLoadingChange])

  useEffect(() => {
    props.onReportLoadingChange?.(reportController.loading)
  }, [props.onReportLoadingChange, reportController.loading])

  useEffect(() => {
    props.onExploreLoadingChange?.(exploreController.loading)
  }, [props.onExploreLoadingChange, exploreController.loading])

  useEffect(() => {
    // 以预览容器的实际挂载状态通知父级，确保关闭动画播放期间输入区不会提前恢复。
    props.onReportPreviewChange?.(reportPreview.mounted)
  }, [props.onReportPreviewChange, reportPreview.mounted])

  useEffect(() => {
    // 探索右侧工作室打开时，父级输入框需要收进左侧对话区域，而不是继续横跨全宽。
    props.onExplorePreviewChange?.(explorePreview.mounted)
  }, [props.onExplorePreviewChange, explorePreview.mounted])

  // 同步父级传入的 currentModel
  useEffect(() => {
    if (currentModel) {
      setSelectedModel(currentModel.label)
      setSelectedModelId(currentModel.id)
    }
  }, [currentModel])  

  // 同步父级传入的 embedModelId
  useEffect(() => {
    if (props.embedModelId) {
      setEmbedModelId(props.embedModelId)
    }
  }, [props.embedModelId])

  // 进入分享模式：来自 AI 回答「...」菜单「分享对话」派发的信号，默认勾选发起分享的当前轮次
  useEffect(() => {
    const chatId = conv?.chat_id
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail
      if (detail?.chatId && String(detail.chatId) === String(chatId)) {
        if (detail.order !== undefined && detail.order !== null) {
          // 只预填 human 项，与手动勾选行为一致（避免同轮 view 项导致邮件分享 roundIndexs 重复）
          setSharingList(convContent.filter((item: any) => item.role === 'human' && String(item.order) === String(detail.order)))
        }
        setIsSharing(true)
      }
    }
    window.addEventListener('start-share-conversation', handler)
    return () => window.removeEventListener('start-share-conversation', handler)
  }, [conv?.chat_id, convContent, setIsSharing, setSharingList])

  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-col overflow-hidden" style={{ background: 'transparent' }}>
      {notificationContextHolder}
      <ChatHeader
        conv={conv}
        ref={chatHeaderRef}
        setConvContent={setConvContent}
        onUpdateList={onUpdateList}
        setIsSharing={setIsSharing}
        onClose={onClose}
        modelOptions={modelOptions}
        currentModel={currentModel}
        onModelChange={(model: ModelOption) => {
          setSelectedModel(model.label)
          setSelectedModelId(model.id)
          onModelChange?.(model)
        }}
        onEmbedModelFound={(id) => setEmbedModelId(id)}
      />

      {reportPreview.mounted && (
        <div className={reportStyles.mobileSwitch}>
          <Segmented
            block
            value={reportController.mobileView}
            options={[
              { label: '对话', value: 'conversation' },
              { label: '报告', value: 'report' },
            ]}
            onChange={(value) => reportController.setMobileView(value as 'conversation' | 'report')}
          />
        </div>
      )}

      <div className={`${reportStyles.body} ${reportPreview.visible || explorePreview.visible ? reportStyles.bodySplit : ''}`}>
        <div className={`${reportStyles.conversationPane} ${reportPreview.mounted && reportController.mobileView === 'report' ? reportStyles.mobileHidden : ''}`}>
          <MessageList
            conv={conv}
            convContent={convContent}
            convContent2d={convContent2d}
            convContent3d={convContent3d}
            loading={loading}
            isSharing={isSharing}
            isStorage={isStorage}
            isDone={doneStatus}
            isGettingData={isGettingData}
            checkAll={checkAll}
            sharingList={sharingList}
            setSharingList={setSharingList}
            setIsStorage={controller.setIsStorage}
            setConvContent={setConvContent}
            getAnswer={getAnswer}
            getRecommend={getRecommend}
            getQueryRewrite={getQueryRewrite}
            onReferenceClick={getReference}
            chatContainerRef={chatContainerRef}
            isDeleting={isDeleting}
            deleteSelectedRounds={deleteSelectedRounds}
            onEnterDeleteMode={enterDeleteMode}
            onToggleDeleteRound={toggleDeleteRound}
            onEditMessage={handleEditResend}
            onRegenerate={regenerateRound}
            reportItems={reportController.reports}
            explorationItems={exploreItemsAll}
            reportLoadError={reportController.loadError}
            onToggleReportThinking={reportController.toggleThinking}
            onToggleReportTodo={reportController.toggleTodo}
            onToggleReportTask={reportController.toggleTaskExecution}
            onOpenReport={openReport}
            onOpenExplore={openExplore}
            onCloseExplore={closeExplore}
            activeExploreId={activeExploreId}
            hideMessageNavRail={reportPreview.mounted || explorePreview.mounted}
          />
        </div>

        {reportPreview.renderedReport && (
          <div
            className={`${reportStyles.reportPaneWrap} ${reportPreview.visible ? reportStyles.reportPaneWrapOpen : ''} ${reportController.mobileView === 'conversation' ? reportStyles.mobileHidden : ''}`}
            data-transition-phase={reportPreview.phase}
          >
            <ReportPreviewPane report={reportPreview.renderedReport} animate={reportController.animateReportPreview} onClose={reportController.closeReport} />
          </div>
        )}

        {explorePreview.renderedItem && !reportPreview.mounted && (
          <div
            className={`${reportStyles.reportPaneWrap} ${explorePreview.visible ? reportStyles.reportPaneWrapOpen : ''}`}
            data-transition-phase={explorePreview.phase}
          >
            <ExplorePreviewPane item={explorePreview.renderedItem} onClose={closeExplore} />
          </div>
        )}
      </div>

      {/* 批量删除底部操作栏（Qwen 风格，与下方输入框对齐） */}
      {isDeleting && (
        <div style={{ paddingRight: 'var(--scrollbar-width, 17px)' }}>
          <div className="max-w-[53.75rem] w-full m-auto flex items-center justify-between px-4 py-3 border-t border-[#e9edf4] bg-white">
            <Checkbox checked={deleteCheckAll} onChange={(e) => toggleDeleteAll(e.target.checked)}>
              全选
            </Checkbox>
            <div className="flex items-center gap-2">
              <Button onClick={exitDeleteMode}>取消</Button>
              <Button type="primary" danger loading={deleteLoading} disabled={deleteSelectedRounds.length === 0} onClick={confirmDelete}>
                删除{deleteSelectedRounds.length > 0 ? `（${deleteSelectedRounds.length}）` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 分享底部操作栏（全选 / 邮件分享 / 生成快照 / 取消），与批量删除风格保持一致 */}
      {isSharing && (
        <div style={{ paddingRight: 'var(--scrollbar-width, 17px)' }}>
          <div className="max-w-[53.75rem] w-full m-auto px-4 py-2 border-t border-[#e9edf4] bg-white">
            <SharingModal
              handleConfirmShare={(type) => {
                setConfirmShareType(type)
                setConfirmShareVisible(true)
              }}
              convContent={convContent}
              checkAll={checkAll}
              setCheckAll={setCheckAll}
              setIsSharing={setIsSharing}
              sharingList={sharingList}
              confirmVisible={confirmShareVisible}
            />
          </div>
        </div>
      )}

      <Modal
        width="60%"
        title={confirmShareType === 'email' ? '邮件发送' : '生成快照'}
        open={confirmShareVisible}
        onCancel={handleConfirmCancel}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleConfirmCancel}>取消</Button>
            {confirmShareType === 'email' && (
              <>
                {shareStep === 1 && (
                  <Button
                    type="primary"
                    style={{
                      outline: 'none',
                    }}
                    onClick={() => {
                      setShareStep(2)
                    }}
                  >
                    下一步
                  </Button>
                )}
                {shareStep === 2 && (
                  <Button
                    type="primary"
                    loading={confirmShareLoading}
                    disabled={confirmShareLoading}
                    style={{
                      outline: 'none',
                    }}
                    onClick={() => {
                      handleShareEmail()
                    }}
                  >
                    确定
                  </Button>
                )}
              </>
            )}
            {confirmShareType === 'snapshot' && (
              <Button
                type="primary"
                style={{
                  outline: 'none',
                }}
                loading={confirmShareLoading}
                disabled={confirmShareLoading}
                onClick={async () => {
                  flushSync(() => setConfirmShareLoading(true))
                  await new Promise((resolve) => {
                    requestAnimationFrame(() => requestAnimationFrame(resolve))
                  })
                  handleShareOk()
                }}
              >
                确定
              </Button>
            )}
          </div>
        }
      >
        <Form form={shareEmailForm} layout="vertical" wrapperCol={{ span: 20 }} initialValues={{ emailTitle: `${conv.biz_name}报告-${dayjs().format('YYYY.MM.DD')}` }}>
          {confirmShareType === 'email' && shareStep === 2 && <ShareEmailSetting form={shareEmailForm} />}
        </Form>
        {(confirmShareType === 'snapshot' || (confirmShareType === 'email' && shareStep === 1)) && (
          <div className="h-[60vh] overflow-y-scroll">
            <div ref={sharingRef}>
              <MessageList
                mode="share"
                conv={conv}
                convContent={convContent}
                convContent2d={convContent2d}
                convContent3d={convContent3d}
                sharingList={sharingList}
                loading={loading}
                isSharing={true}
                getAnswer={getAnswer}
                getRecommend={getRecommend}
                getQueryRewrite={getQueryRewrite}
                onReferenceClick={getReference}
              />
            </div>
          </div>
        )}
      </Modal>

      <DebugPanel open={debugModalVisible} thinkTime={cur?.thinkTime} convUid={conv?.conv_uid} roundIndex={cur?.roundIndex || loadingRoundIndex} onClose={closeDebugPanel} />
    </div>
  )
})

export default Conversation
