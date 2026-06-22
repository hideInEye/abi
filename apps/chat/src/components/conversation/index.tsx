import { Button, Form, Modal } from 'antd'
import React from 'react'
import { flushSync } from 'react-dom'
import dayjs from 'dayjs'

import ChatHeader from './components/chat-header'
import Composer from './components/Composer'
import DebugPanel from './components/DebugPanel'
import MessageList from './components/MessageList'
import ShareEmailSetting from './components/share-email-setting'
import { useConversationController, type ConversationProps } from './hooks/useConversationController'

const Conversation = React.forwardRef<{ setConvContent: (content: any[]) => void }, ConversationProps>((props, ref) => {
  const { conv } = props
  const controller = useConversationController(props, ref)

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
    selectedExcel,
    setSelectedExcel,
    referenceDialog,
    handleRemoveExcel,
    handleRemoveDialog,
    deepThinkEnabled,
    setDeepThinkEnabled,
    uploadFileEnabled,
    setUploadFileEnabled,
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

  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-col overflow-hidden" style={{ background: 'transparent' }}>
      <ChatHeader
        conv={conv}
        ref={chatHeaderRef}
        setConvContent={setConvContent}
        onUpdateList={onUpdateList}
        setIsSharing={setIsSharing}
        onClose={onClose}
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

      <Composer
        conv={conv}
        convContent={convContent}
        loading={loading}
        isSharing={isSharing}
        checkAll={checkAll}
        sharingList={sharingList}
        confirmVisible={confirmShareVisible}
        setCheckAll={setCheckAll}
        setIsSharing={setIsSharing}
        onConfirmShare={(type) => {
          setConfirmShareType(type)
          setConfirmShareVisible(true)
        }}
        onSend={handleSend}
        onStop={stopGenerating}
        setSelectedExcel={setSelectedExcel}
        deepThinkEnabled={deepThinkEnabled}
        uploadFileEnabled={uploadFileEnabled}
        onToggleDeepThink={() => setDeepThinkEnabled(!deepThinkEnabled)}
        onToggleUploadFile={() => setUploadFileEnabled(!uploadFileEnabled)}
        selectedExcel={selectedExcel}
        referenceDialog={referenceDialog}
        onRemoveExcel={handleRemoveExcel}
        onRemoveDialog={handleRemoveDialog}
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
