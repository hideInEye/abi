import { DownOutlined, HistoryOutlined, ShareAltOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { Dropdown, message, Modal, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import React, { useImperativeHandle, useState, useEffect, useCallback } from 'react'
import { fetchIsFavorite, fetchOperateNew } from '../../../../service/api/abi-system'
import { updateApp } from '../../../../service/api/app'
import { clearConvHistory } from '../../../../service/api/conv'
import CreateModal from '../../../conversation-analysis/CreateModal'
import HistoryDrawer from '../../HistoryDrawer'
import SaveDrawer from '../../SaveDrawer'
import { chatHeaderRefMethod } from '../../../../types'

interface ChatHeaderProps {
  conv: any
  setConvContent: (data: any) => void
  onUpdateList: (data: any) => void
  setIsSharing: (data: any) => void
  onClose: () => void
}

/** Available models */
const MODEL_OPTIONS = [
  { key: 'qwen3.7-max', label: 'Qwen3.7-Max', desc: '通义千问旗舰，多模态推理' },
  { key: 'claude-sonnet-4', label: 'Claude-Sonnet-4', desc: 'Anthropic 高性能推理模型' },
  { key: 'deepseek-r1', label: 'DeepSeek-R1', desc: '深度思考链式推理' },
]

const ChatHeader = React.forwardRef<chatHeaderRefMethod, ChatHeaderProps>((props, ref) => {
  const { conv, setConvContent, onUpdateList, setIsSharing, onClose } = props
  const [historyVisible, setHistoryVisible] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [isStarred, setIsStarred] = useState(false)
  const [saveVisible, setSaveVisible] = useState(false)
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0])

  // 当对话改变时，重新获取收藏状态
  useEffect(() => {
    if (conv.chat_id) {
      handleIsFavorite()
    }
  }, [conv.chat_id])

  useImperativeHandle(ref, () => {
    return {
      handleIsFavorite,
    }
  }, [])

  const handleHistory = () => {
    setHistoryVisible(true)
  }

  const handleHistoryClick = (orderIndex: number) => {
    setHistoryVisible(false)
    const anchorId = `human-msg-${orderIndex}`
    const targetElement = document.getElementById(anchorId)
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      message.warning('对话数据暂未加载')
    }
  }

  const handleEdit = () => {
    setCreateModalVisible(true)
  }

  const handleClearChat = () => {
    Modal.confirm({
      title: '确认清空对话',
      content: '是否确认清空当前对话？清空后无法恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (conv.conv_uid) {
            await clearConvHistory({ conv_uid: conv.conv_uid })
          }
          setConvContent([])
          message.success('对话已清空')
        } catch (error) {
          message.error('清空对话失败')
        }
      },
    })
  }

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

  const handleStar = async () => {
    const res: any = await fetchOperateNew({ chatId: conv.chat_id })
    if (res.code !== 200) {
      message.error(res.message || '收藏失败，请稍后再试')
      return
    }
    handleIsFavorite()
    message.success(res.msg)
  }

  const handleIsFavorite = async () => {
    const res: any = await fetchIsFavorite({ chatId: conv.chat_id })
    if (res.code !== 200) {
      // message.error(res.msg);
    } else {
      const isCollect = res.data.favoriteStatus === 1
      setIsStarred(isCollect)
    }
  }

  const saveDrawerClose = (refresh?: boolean, payload?: any) => {
    if (refresh) {
      onUpdateList && onUpdateList(payload)
    }
    setSaveVisible(false)
  }

  const handleShare = () => {
    setIsSharing(true)
  }

  /** Model switcher menu items */
  const modelMenuItems: MenuProps['items'] = MODEL_OPTIONS.map((model) => ({
    key: model.key,
    label: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{model.label}</span>
        <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{model.desc}</span>
      </div>
    ),
    onClick: () => {
      setSelectedModel(model)
      message.info(`已切换到 ${model.label}`)
    },
  }))

  return (
    <>
      <header className="chat-header">
        <div className="chat-header-left">
          {/* Model Switcher */}
          <Dropdown menu={{ items: modelMenuItems }} trigger={['click']} placement="bottomLeft">
            <button type="button" className="model-switcher-btn">
              <span className="model-dot" />
              <span className="model-name">{selectedModel.label}</span>
              <DownOutlined className="model-arrow" />
            </button>
          </Dropdown>
        </div>
        <div className="chat-header-right">
          <Tooltip title="历史记录">
            <button type="button" className="header-icon-btn" onClick={handleHistory}>
              <HistoryOutlined />
            </button>
          </Tooltip>

          <Tooltip title={isStarred ? '取消收藏' : '收藏对话'}>
            <button type="button" className={`header-icon-btn ${isStarred ? 'starred' : ''}`} onClick={handleStar}>
              {isStarred ? <StarFilled /> : <StarOutlined />}
            </button>
          </Tooltip>

          <Tooltip title="分享对话">
            <button type="button" className="header-icon-btn" onClick={handleShare}>
              <ShareAltOutlined />
            </button>
          </Tooltip>
        </div>
      </header>

      <HistoryDrawer open={historyVisible} onClose={() => setHistoryVisible(false)} onHistoryClick={handleHistoryClick} currentConv={conv} />

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
      <SaveDrawer open={saveVisible} onClose={(refresh?: boolean, payload?: any) => saveDrawerClose(refresh, payload)} conv={conv} />
    </>
  )
})

export default ChatHeader
