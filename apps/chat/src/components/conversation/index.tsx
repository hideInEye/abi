import { Button, Checkbox, Form, Modal } from 'antd'
import React, { useEffect, useImperativeHandle, useState } from 'react'
import { flushSync } from 'react-dom'
import dayjs from 'dayjs'

import ChatHeader from './components/chat-header'
import type { ModelOption } from './components/chat-header'
import DebugPanel from './components/DebugPanel'
import MessageList from './components/MessageList'
import ShareEmailSetting from './components/share-email-setting'
import SharingModal from './SharingModal'
import { useConversationController, type ConversationProps } from './hooks/useConversationController'

export interface ConversationHandle {
  setConvContent: (content: any[]) => void
  handleSend: (value: string, meta?: { groupName?: string; semanticName?: string; semanticSchemaId?: number | string; selectedExcel?: { file_id: string | number; file_name: string } }) => void
  stopGenerating: () => void
  loading: boolean
}

const Conversation = React.forwardRef<ConversationHandle, ConversationProps>((props, ref) => {
  const { conv, onLoadingChange, modelOptions, currentModel, onModelChange, deepThinkEnabled } = props
  const [selectedModel, setSelectedModel] = useState<string>(currentModel?.label || '')
  const [selectedModelId, setSelectedModelId] = useState<string | number>(currentModel?.id || '')
  const [embedModelId, setEmbedModelId] = useState<string | number>(props.embedModelId || '')
  const controller = useConversationController({ ...props, selectedModel, selectedModelId, embedModelId, deepThinkEnabled })

  const {
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
    confirmDelete
  } = controller

  // 暴露给父级调用
  useImperativeHandle(ref, () => ({
    setConvContent,
    handleSend,
    stopGenerating,
    loading
  }), [setConvContent, handleSend, stopGenerating, loading])

  // 通知父级 loading 变化
  useEffect(() => {
    onLoadingChange?.(loading)
  }, [loading, onLoadingChange])

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

  // 进入分享模式：来自 AI 回答「...」菜单「分享对话」派发的信号
  useEffect(() => {
    const chatId = conv?.chat_id
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail
      if (detail?.chatId && String(detail.chatId) === String(chatId)) {
        setIsSharing(true)
      }
    }
    window.addEventListener('start-share-conversation', handler)
    return () => window.removeEventListener('start-share-conversation', handler)
  }, [conv?.chat_id, setIsSharing])

  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-col overflow-hidden" style={{ background: 'transparent' }}>
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
      />

      {/* 批量删除底部操作栏（Qwen 风格，与下方输入框对齐） */}
      {isDeleting && (
        <div style={{ paddingRight: 'var(--scrollbar-width, 17px)' }}>
          <div className="max-w-[53.75rem] w-full m-auto flex items-center justify-between px-4 py-3 border-t border-[#e9edf4] bg-white">
            <Checkbox
              checked={deleteCheckAll}
              onChange={(e) => toggleDeleteAll(e.target.checked)}
            >
              全选
            </Checkbox>
            <div className="flex items-center gap-2">
              <Button onClick={exitDeleteMode}>取消</Button>
              <Button
                type="primary"
                danger
                loading={deleteLoading}
                disabled={deleteSelectedRounds.length === 0}
                onClick={confirmDelete}
              >
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
                      outline: 'none'
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
                      outline: 'none'
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
                  outline: 'none'
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

      <DebugPanel
        open={debugModalVisible}
        thinkTime={cur?.thinkTime}
        convUid={conv?.conv_uid}
        roundIndex={cur?.roundIndex || loadingRoundIndex}
        onClose={closeDebugPanel}
      />
    </div>
  )
})

export default Conversation
