import { DownOutlined } from '@ant-design/icons'
import { Dropdown, message } from 'antd'
import type { MenuProps } from 'antd'
import React, { useEffect, useState } from 'react'
import { updateApp } from '../../../../service/api/app'
import { fetchModelList } from '../../../../service/api/abi-system'
import { getSpaceId } from '../../../../utils'
import CreateModal from '../../../conversation-analysis/CreateModal'

export interface ModelOption {
  id: string | number
  key: string
  label: string
  desc: string
}

interface ChatHeaderProps {
  conv: any
  setConvContent: (data: any) => void
  onUpdateList: (data: any) => void
  setIsSharing: (data: any) => void
  onClose: () => void
  onModelChange?: (model: ModelOption) => void
}

/** 默认模型（接口未返回时兜底） */
const DEFAULT_MODEL: ModelOption = { id: '0', key: 'qwen3.7-max', label: 'Qwen3.7-Max', desc: '通义千问旗舰，多模态推理' }

const ChatHeader = React.forwardRef<any, ChatHeaderProps>((props, ref) => {
  const { conv, onUpdateList, onModelChange } = props
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([DEFAULT_MODEL])
  const [selectedModel, setSelectedModel] = useState<ModelOption>(DEFAULT_MODEL)

  // 获取大模型列表
  useEffect(() => {
    fetchModelList({ spaceId: conv?.space_id || getSpaceId() }).then((res: any) => {
      const list = res?.data?.data || res?.data || []
      if (Array.isArray(list) && list.length > 0) {
        const options: ModelOption[] = list.map((item: any) => ({
          id: item.modelId ?? item.id ?? item.llmId ?? '',
          key: item.modelName || item.model_name || item.llmModel || item.key || '',
          label: item.modelName || item.model_name || item.llmModel || item.label || '',
          desc: item.remark || item.description || item.desc || '',
        }))
        setModelOptions(options)
        setSelectedModel(options[0])
        onModelChange?.(options[0])
      }
    }).catch(() => {
      // 接口失败使用默认模型
    })
  }, [])

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
  const modelMenuItems: MenuProps['items'] = modelOptions.map((model) => ({
    key: String(model.id),
    label: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{model.label}</span>
        <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{model.desc}</span>
      </div>
    ),
    onClick: () => {
      setSelectedModel(model)
      onModelChange?.(model)
      message.info(`已切换到 ${model.label}`)
    },
  }))

  return (
    <>
      <header className="chat-header">
        <div className="chat-header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Model Switcher */}
          <Dropdown menu={{ items: modelMenuItems }} trigger={['click']} placement="bottomLeft">
            <button type="button" className="model-switcher-btn">
              <span className="model-dot" />
              <span className="model-name">{selectedModel.label}</span>
              <DownOutlined className="model-arrow" />
            </button>
          </Dropdown>
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
          title: conv.title || 'AI智能助手',
          biz_name: conv.biz_name || 'AI智能助手',
        }}
      />
    </>
  )
})

export default ChatHeader
