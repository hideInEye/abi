import { Button, Form, Modal } from 'antd'
import React, { useEffect, useImperativeHandle, useState } from 'react'
import { flushSync } from 'react-dom'
import dayjs from 'dayjs'

import ChatHeader from './components/chat-header'
import type { ModelOption } from './components/chat-header'
import DebugPanel from './components/DebugPanel'
import MessageList from './components/MessageList'
import ShareEmailSetting from './components/share-email-setting'
import { useConversationController, type ConversationProps } from './hooks/useConversationController'

export interface ConversationHandle {
  setConvContent: (content: any[]) => void
  handleSend: (value: string, meta?: { groupName?: string; semanticName?: string; semanticSchemaId?: number | string }) => void
  stopGenerating: () => void
  loading: boolean
}

const Conversation = React.forwardRef<ConversationHandle, ConversationProps>((props, ref) => {
  const { conv, onLoadingChange, modelOptions, currentModel, onModelChange } = props
  const [selectedModel, setSelectedModel] = useState<string>(currentModel?.label || '')
  const [selectedModelId, setSelectedModelId] = useState<string | number>(currentModel?.id || '')
  const [embedModelId, setEmbedModelId] = useState<string | number>(props.embedModelId || '')
  const controller = useConversationController({ ...props, selectedModel, selectedModelId, embedModelId })

  const {
    chatContainerRef,
    chatHeaderRef,
    convContent,
    convContent2d,
    convContent3d,
    setConvContent,
    checkAll,
    isSharing,
    setIsSharing,
    sharingList,
    setSharingList,
    confirmShareType,
    confirmShareVisible,
    confirmShareLoading,
    setConfirmShareLoading,
    shareStep,
    setShareStep,
    shareEmailForm,
    handleConfirmCancel,
    handleShareOk,
    handleShareEmail,
    handleSend,
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
    onUpdateList
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
      />


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
