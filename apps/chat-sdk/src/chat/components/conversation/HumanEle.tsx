import React, { useState } from 'react'
import { Button, Input, Tooltip } from 'antd'
import { CopyOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import FileTag from '../../components/FileTag'
import { parseMessageContent } from '../../utils'
import { showWidgetToast } from '../chat-widget/widgetToast'

interface HumanEleProps {
  data: {
    context: string
    file?: {
      file_id: string | number
      file_name: string
    }
  }
  id?: string
  /** 编辑当前用户消息后重新发送（直接在底部发起新一轮对话） */
  onEditSubmit?: (text: string, data: any) => void
  /** 删除当前用户消息（进入批量删除选择模式） */
  onDelete?: (data: any) => void
}

interface ActionButtonProps {
  title: string
  icon: React.ReactNode
  onClick: () => void
}

const ActionButton: React.FC<ActionButtonProps> = ({ title, icon, onClick }) => {
  const [hover, setHover] = useState(false)
  return (
    <Tooltip title={title}>
      <button
        type="button"
        aria-label={title}
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          padding: 0,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 15,
          lineHeight: 1,
          color: hover ? 'var(--ink)' : 'var(--ink-2)',
          background: hover ? 'rgba(91,124,247,0.10)' : 'transparent',
          transition: 'color 0.15s, background 0.15s',
        }}
      >
        {icon}
      </button>
    </Tooltip>
  )
}

const HumanEle: React.FC<HumanEleProps> = ({ data, id, onEditSubmit, onDelete }) => {
  const contextData = parseMessageContent(data?.context)
  const displayContent = typeof contextData === 'object' && contextData?.question ? contextData.question : contextData
  const [hovered, setHovered] = useState(false)

  const plainText = typeof displayContent === 'string' ? displayContent : String(displayContent ?? '')

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(plainText)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText)
      showWidgetToast('success', '已复制')
    } catch {
      showWidgetToast('error', '复制失败')
    }
  }

  const openEditor = () => {
    setEditValue(plainText)
    setEditing(true)
  }
  const cancelEdit = () => {
    setEditing(false)
    setEditValue(plainText)
  }
  const submitEdit = () => {
    const text = editValue.trim()
    if (!text) return
    onEditSubmit?.(text, data)
    setEditing(false)
  }

  // 编辑模式：展开内联编辑框，修改完点“发送”直接在底部发起新对话
  if (editing) {
    return (
      <div className="my-4 w-full flex justify-end">
        <div className="w-full max-w-[760px] mr-2">
          <div
            style={{
              border: '1px solid rgba(91,124,247,0.55)',
              borderRadius: 16,
              padding: 12,
              background: '#fff',
              boxShadow: '0 2px 12px rgba(91,124,247,0.12)',
            }}
          >
            <Input.TextArea
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 10 }}
              bordered={false}
              style={{ fontSize: 13, lineHeight: 1.6, padding: 0, resize: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Button size="small" onClick={cancelEdit}>取消</Button>
              <Button size="small" type="primary" disabled={!editValue.trim()} onClick={submitEdit}>发送</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="my-4 w-full flex justify-end"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="max-w-[80%] mr-2 break-words flex flex-col items-end">
        {/* User message bubble - subtle brand background for better contrast */}
        <div
          id={id}
          className="msg-bubble-human"
          style={{
            background: 'var(--cw-bubble-bg, linear-gradient(135deg, rgba(91,124,247,0.06), rgba(112,145,250,0.08)))',
            border: '1px solid var(--cw-bubble-border, rgba(91,124,247,0.18))',
            color: 'var(--cw-bubble-text, var(--cw-text, var(--ink)))',
            padding: '12px 16px',
            borderRadius: '16px 16px 4px 16px',
            boxShadow: '0 2px 8px rgba(91,124,247,0.08)',
            fontSize: 'calc(13px * var(--cw-font-scale, 1))',
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

        {/* Hover action bar: 编辑 / 复制 / 删除 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            marginTop: 4,
            opacity: hovered ? 1 : 0,
            visibility: hovered ? 'visible' : 'hidden',
            transition: 'opacity 0.15s ease',
          }}
        >
          <ActionButton title="编辑" icon={<EditOutlined />} onClick={openEditor} />
          <ActionButton title="复制" icon={<CopyOutlined />} onClick={handleCopy} />
          <ActionButton title="删除" icon={<DeleteOutlined />} onClick={() => onDelete?.(data)} />
        </div>
      </div>
    </div>
  )
}

export default HumanEle
