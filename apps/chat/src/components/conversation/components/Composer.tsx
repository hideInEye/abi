import FileTag from '../../../components/FileTag'
import ChatInput from './chat-input'
import SharingModal from '../SharingModal'
import React from 'react'

type ComposerProps = {
  conv: any
  convContent: any[]
  loading: boolean
  isSharing: boolean
  checkAll: boolean
  sharingList: any[]
  confirmVisible: boolean
  setCheckAll: (value: boolean) => void
  setIsSharing: (value: boolean) => void
  onConfirmShare: (type: string) => void
  onSend: (value: string) => void
  onStop: () => void
  setSelectedExcel: (value: any) => void
  deepThinkEnabled: boolean
  uploadFileEnabled: boolean
  onToggleDeepThink: () => void
  onToggleUploadFile: () => void
  selectedExcel: any
  referenceDialog: any
  onRemoveExcel: () => void
  onRemoveDialog: () => void
}

const Composer = ({
  conv,
  convContent,
  loading,
  isSharing,
  checkAll,
  sharingList,
  confirmVisible,
  setCheckAll,
  setIsSharing,
  onConfirmShare,
  onSend,
  onStop,
  setSelectedExcel,
  deepThinkEnabled,
  uploadFileEnabled,
  onToggleDeepThink,
  onToggleUploadFile,
  selectedExcel,
  referenceDialog,
  onRemoveExcel,
  onRemoveDialog
}: ComposerProps) => {
  return (
    <div className="composer-wrap">
      {isSharing ? (
        <SharingModal
          handleConfirmShare={onConfirmShare}
          convContent={convContent}
          checkAll={checkAll}
          setCheckAll={setCheckAll}
          setIsSharing={setIsSharing}
          sharingList={sharingList}
          confirmVisible={confirmVisible}
        />
      ) : (
        <div className="w-[53.75rem] m-auto">
          <div className="mb-2">
            {selectedExcel.file_id && (
              <FileTag fileId={selectedExcel.file_id} fileName={selectedExcel.file_name} onClose={onRemoveExcel} />
            )}
            {referenceDialog.order && (
              <FileTag
                fileId={referenceDialog.order}
                fileName={referenceDialog.context}
                prefixText="#Dialog"
                showDownloadIcon={false}
                showFileIcon={false}
                onClose={onRemoveDialog}
              />
            )}
          </div>

          <ChatInput
            conv={conv}
            loading={loading}
            onSend={onSend}
            onStop={onStop}
            setSelectedExcel={setSelectedExcel}
            deepThinkEnabled={deepThinkEnabled}
            uploadFileEnabled={uploadFileEnabled}
            onToggleDeepThink={onToggleDeepThink}
            onToggleUploadFile={onToggleUploadFile}
          />
        </div>
      )}

      {/* AI Footer Disclaimer */}
      <div className="chat-footer">
        内容由 AI 生成，请注意甄别
      </div>
    </div>
  )
}

export default Composer
