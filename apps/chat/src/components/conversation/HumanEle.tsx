import React from 'react'
import FileTag from '../../components/FileTag'
import { parseMessageContent } from '../../utils'

interface HumanEleProps {
  data: {
    context: string
    file?: {
      file_id: string | number
      file_name: string
    }
  }
  id?: string
}

const HumanEle: React.FC<HumanEleProps> = ({ data, id }) => {
  const contextData = parseMessageContent(data?.context)
  const displayContent = typeof contextData === 'object' && contextData?.question ? contextData.question : contextData

  return (
    <div className="my-4 w-full flex justify-end">
      <div className="max-w-[80%] mr-2 break-words">
        {/* User message bubble - subtle brand background for better contrast */}
        <div
          id={id}
          className="msg-bubble-human"
          style={{
            background: 'linear-gradient(135deg, rgba(91,124,247,0.06), rgba(112,145,250,0.08))',
            border: '1px solid rgba(91,124,247,0.18)',
            color: 'var(--ink)',
            padding: '12px 16px',
            borderRadius: '16px 16px 4px 16px',
            boxShadow: '0 2px 8px rgba(91,124,247,0.08)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <span style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</span>
        </div>

        {/* File tag */}
        {typeof contextData === 'object' && contextData?.file_id && contextData?.file_name && (
          <FileTag
            fileId={contextData.file_id}
            fileName={contextData.file_name}
            showCloseIcon={false}
            showDownloadIcon={true}
            backgroundColor="rgba(255,255,255,0.5)"
            textColor="var(--ink-2)"
            style={{
              display: 'block',
              marginTop: '4px',
              marginLeft: '0',
              width: 'fit-content',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-xs)',
            }}
          />
        )}

        {/* Reference dialog tag */}
        {typeof contextData === 'object' && contextData?.reference_order && contextData?.reference_context && (
          <FileTag
            fileId={contextData.reference_order}
            fileName={contextData.reference_context}
            prefixText="#Dialog"
            showDownloadIcon={false}
            showFileIcon={false}
            showCloseIcon={false}
            backgroundColor="rgba(255,255,255,0.5)"
            textColor="var(--ink-2)"
            style={{
              display: 'block',
              marginTop: '4px',
              marginLeft: '0',
              width: 'fit-content',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-xs)',
            }}
          />
        )}
      </div>
    </div>
  )
}

export default HumanEle
