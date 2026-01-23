import { CloseOutlined } from '@ant-design/icons'
import { message, Modal, Space, Tooltip } from 'antd'
import React, { useImperativeHandle, useState, useEffect } from 'react'
import SvgIcon from '../../../../components/SvgIcon'
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

const ChatHeader = React.forwardRef<chatHeaderRefMethod, ChatHeaderProps>((props, ref) => {
  const { conv, setConvContent, onUpdateList, setIsSharing, onClose } = props
  const [historyVisible, setHistoryVisible] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [isStarred, setIsStarred] = useState(false)
  const [saveVisible, setSaveVisible] = useState(false)

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

  // 处理历史记录
  const handleHistory = () => {
    setHistoryVisible(true)
  }

  // 历史记录点击
  const handleHistoryClick = (orderIndex: number) => {
    setHistoryVisible(false)

    const anchorId = `human-msg-${orderIndex}`
    const targetElement = document.getElementById(anchorId)

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    } else {
      message.warning('对话数据暂未加载')
    }
  }

  // 处理编辑对话
  const handleEdit = () => {
    setCreateModalVisible(true)
  }

  // 处理清空对话
  const handleClearChat = () => {
    Modal.confirm({
      title: '确认清空对话',
      content: '是否确认清空当前对话？清空后无法恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (conv.conv_uid) {
            await clearConvHistory({
              conv_uid: conv.conv_uid,
            })
          }
          setConvContent([])
          message.success('对话已清空')
        } catch (error) {
          message.error('清空对话失败')
        }
      },
    })
  }

  // 处理创建/编辑对话完成
  const handleUpdateConv = async (data: any) => {
    try {
      const res = await updateApp(data)
      if (res?.success) {
        // message.success('更新成功');
        setCreateModalVisible(false)
        onUpdateList && onUpdateList(res?.data)
      }
    } finally {
    }
  }

  // 处理收藏功能
  const handleStar = async () => {
    const res: any = await fetchOperateNew({
      chatId: conv.chat_id,
    })
    if (res.code !== 200) {
      message.error(res.message || '收藏失败，请稍后再试')
      return
    }
    handleIsFavorite()
    message.success(res.msg)
  }

  const handleIsFavorite = async () => {
    const res: any = await fetchIsFavorite({
      chatId: conv.chat_id,
    })

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

  // 处理分享功能
  const handleShare = () => {
    // setShareModalVisible(true);
    setIsSharing(true)
  }

  return (
    <>
      <header className="flex items-center justify-between border-b-2 border-[#F0F0F0] bg-[#F9F9F9] pt-11 pl-[2.3125rem] pr-[3.375rem] pb-[1.5625rem] sticky top-0 z-10">
        <Space size={12}>
          <div className="text-[#333333] text-base leading-[1.375rem] font-semibold">{conv.biz_name || 'AI智能助手'}</div>
          {/* <Tooltip title="编辑对话">
            <SvgIcon localIcon="edit" className="w-5 h-[1.375rem] cursor-pointer" onClick={handleEdit} />
          </Tooltip> */}
        </Space>
        <Space className="" size={24}>
          <Tooltip title="历史记录">
            <span className="cursor-pointer" onClick={handleHistory}>
              <SvgIcon localIcon="history" className="w-5 h-5" />
            </span>
          </Tooltip>
          {/* <Tooltip title="清空对话">
            <span className="cursor-pointer text-xs text-[#8a8a8a] hover:text-[#2E6CF6]" onClick={handleClearChat}>
              <SvgIcon localIcon="delete3" className="w-4 h-4" />
            </span>
          </Tooltip> */}

          <Tooltip title={isStarred ? '取消收藏' : '收藏对话'}>
            <span className="cursor-pointer" onClick={handleStar}>
              <SvgIcon localIcon={isStarred ? 'rstar' : 'star'} className="w-[1.6875rem] h-5" />
            </span>
          </Tooltip>
          {/* 隐藏另存对话按钮 */}
          {/* <Tooltip title="复制对话">
            <span className="cursor-pointer text-[#8a8a8a] hover:text-[#2E6CF6]" onClick={() => setSaveVisible(true)}>
              <SvgIcon localIcon="copy" className="w-[1.375rem] h-[1.375rem]" />
            </span>
          </Tooltip> */}
          {/* 暂时隐藏分享按钮 */}
          <Tooltip title="分享对话">
            <span className="cursor-pointer" onClick={handleShare}>
              <SvgIcon localIcon="share" className="w-[1.625rem] h-6" />
            </span>
          </Tooltip>
          {/* <span
            className="text-xs w-3 h-5"
            onClick={onClose}
          >
            <CloseOutlined className="w-5 h-5" />
          </span> */}
        </Space>
      </header>
      {/* 添加抽屉和模态框组件 */}
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
