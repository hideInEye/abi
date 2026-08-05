import { CheckOutlined, DownOutlined } from '@ant-design/icons'
import { Dropdown, message } from 'antd'
import type { MenuProps } from 'antd'
import React, { useState } from 'react'

import { SidebarCollapseButton } from '@/components/layout/SidebarCollapseButton'
import { updateApp } from '../../../../service/api/app'
import CreateModal from '../../../conversation-analysis/CreateModal'

export interface ModelOption {
  id: string | number
  key: string
  label: string
  desc: string
  /** 是否为默认模型（1 为默认） */
  isDefault?: number
  /** 是否支持关闭思考（1 为支持，0 为不支持） */
  isSupportThinking?: number | string
}

interface ChatHeaderProps {
  conv: any
  setConvContent: (data: any) => void
  onUpdateList: (data: any) => void
  setIsSharing: (data: any) => void
  onClose: () => void
  onModelChange?: (model: ModelOption) => void
  onEmbedModelFound?: (modelId: string | number) => void
  /** 外部传入的模型列表（父级加载一次） */
  modelOptions?: ModelOption[]
  /** 外部传入的当前选中模型 */
  currentModel?: ModelOption | null
}

const ChatHeader = React.forwardRef<any, ChatHeaderProps>((props, ref) => {
  const { conv, onUpdateList, onModelChange, modelOptions = [], currentModel } = props
  const [createModalVisible, setCreateModalVisible] = useState(false)

  const handleUpdateConv = async (data: any) => {
    try {
      const res = await updateApp(data)
      if (res?.success) {
        setCreateModalVisible(false)
        onUpdateList && onUpdateList(res?.data)
      }
    } finally {
    }
  }

  /** Model switcher menu items */
  const modelMenuItems: MenuProps['items'] = modelOptions.map((model) => {
    const isSelected = currentModel && String(currentModel.id) === String(model.id)
    return {
      key: String(model.id),
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', minWidth: 260 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{model.label}</span>
              {model.isDefault === 1 && (
                <span style={{ fontSize: 11, fontWeight: 500, color: '#5b7cf7', background: 'rgba(91, 124, 247, 0.10)', borderRadius: 999, padding: '1px 8px', lineHeight: '16px', whiteSpace: 'nowrap' }}>默认模型</span>
              )}
            </span>
            {model.desc && <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>{model.desc}</span>}
          </div>
          {isSelected && (
            <CheckOutlined style={{ color: '#5b7cf7', fontSize: 14, marginLeft: 12 }} />
          )}
        </div>
      ),
      style: isSelected ? { background: 'rgba(91, 124, 247, 0.06)' } : undefined,
      onClick: () => {
        onModelChange?.(model)
        message.info(`已切换到 ${model.label}`)
      },
    }
  })

  return (
    <>
      <header className="chat-header">
        <div className="chat-header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <SidebarCollapseButton />
          {/* Model Switcher */}
          {currentModel && (
            <Dropdown menu={{ items: modelMenuItems }} trigger={['click']} placement="bottomLeft">
              <button type="button" className="model-switcher-btn">
                <span className="model-dot" />
                <span className="model-name">{currentModel.label}</span>
                <DownOutlined className="model-arrow" />
              </button>
            </Dropdown>
          )}
        </div>
      </header>

      <CreateModal
        visible={createModalVisible}
        onClose={async (val: any) => {
          if (val) {
            await handleUpdateConv(val)
          } else {
            setCreateModalVisible(false)
          }
        }}
        isEdit={true}
        initialValues={{
          ...conv,
          title: conv?.title || 'AI智能助手',
          biz_name: conv?.biz_name || 'AI智能助手',
        }}
      />
    </>
  )
})

export default ChatHeader
