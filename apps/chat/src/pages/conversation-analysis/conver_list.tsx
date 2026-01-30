import { DoubleRightOutlined, MoreOutlined, SearchOutlined } from '@ant-design/icons'
import { Dropdown, Input, message, Modal, Popover, Space } from 'antd'
import dayjs from 'dayjs'
import React, { useCallback, useState } from 'react'
import SvgIcon from '../../components/SvgIcon'
import left_online from '@/assets/svg-icon/left_online.svg'
import right_online from '@/assets/svg-icon/right_online.svg'
import { MenuProps } from 'antd'
import { clearConvHistory, fetchConvList } from '../../service/api/conv'
import { CHAT_MODE } from '../../constant'
import {  formatTimeDiff, getSpaceId } from '../../utils'
import SaveDrawer from '../conversation/SaveDrawer'
interface converListProps {
  appList: any[]
  handleSetCurApp: (item: any) => void
  handleDeleteApp: (item: any) => void
  setHideRight: (hideRight: boolean) => void
  setShowAllConversations: (showAllConversations: boolean) => void
  handleEdit: (key: string) => void
  handleClearConvHistory: () => void
  onUpdateList: (data: any) => void
  setFold: (fold: boolean) => void
  fold: boolean
}

const ConverList: React.FC<converListProps> = React.memo((props: any) => {
  const { appList, handleSetCurApp, handleDeleteApp, setHideRight, setShowAllConversations, handleEdit, handleClearConvHistory, onUpdateList, setFold, fold } = props
  const [saveVisible, setSaveVisible] = useState(false)
  const [saveData, setSaveData] = useState<any>({})
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null)
  const dropdownMenu: MenuProps['items'] = [
    {
      key: 'edit',
      label: (
        <Space>
          <SvgIcon localIcon="drown_edit" className="w-5 h-[1.375rem] cursor-pointer" />
          编辑
        </Space>
      ),
    },
    // {
    //   key: 'rename',
    //   label: (
    //     <Space>
    //       <SvgIcon localIcon="drown_rename" className="w-5 h-[1.375rem] cursor-pointer" onClick={handleEdit} />
    //       重命名
    //     </Space>
    //   ),
    //   onClick: ({ domEvent }) => {
    //     domEvent.stopPropagation()
    //     domEvent.preventDefault()
    //     handleEdit()
    //   },
    // },
    {
      key: 'save',
      label: (
        <Space>
          <SvgIcon localIcon="drown_save" className="w-5 h-[1.375rem] cursor-pointer" />
          另存
        </Space>
      ),
    },
    {
      key: 'clear',
      label: (
        <Space>
          <SvgIcon localIcon="drown_clear" className="w-5 h-[1.375rem] cursor-pointer" />
          清空
        </Space>
      ),
    },
    {
      key: 'delete',
      label: (
        <Space>
          <SvgIcon localIcon="drown_delete" className="w-5 h-[1.375rem] cursor-pointer" />
          删除
        </Space>
      ),
    },
  ]

  const handleClear = (item: any) => {
    Modal.confirm({
      title: '确认清空对话',
      content: '是否确认清空当前对话？清空后无法恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await fetchConvList({
            chat_id: item.chat_id,
            chat_mode: CHAT_MODE,
            space_id: getSpaceId(),
          })
          if (res.data?.length) {
            const [first] = res.data
            const result: any = await clearConvHistory({
              conv_uid: first.conv_uid,
            })
            if (result.success) {
              handleClearConvHistory()
              message.success('对话已清空')
            }
          }
        } catch (error) {
          message.error('清空对话失败')
        }
      },
    })
  }

  const handleSave = async (item: any) => {
    const res = await fetchConvList({
      chat_id: item.chat_id,
      chat_mode: CHAT_MODE,
      space_id: getSpaceId(),
    })
    if (res.data?.length) {
      const [first] = res.data
      setSaveData({ ...item, ...first })
      setSaveVisible(true)
    }
  }

  const handleMenuClick = (e: any, item: any) => {
    e?.domEvent?.stopPropagation()
    e?.domEvent?.preventDefault()
    switch (e.key) {
      case 'edit':
        handleEdit('edit', item)
        break
      case 'rename':
        handleEdit('rename')
        break
      case 'save':
        handleSave(item)
        break
      case 'clear':
        handleClear(item)
        break
      case 'delete':
        handleDeleteApp(item)
        break
    }
  }

  const saveDrawerClose = (refresh?: boolean, payload?: any) => {
    if (refresh) {
      onUpdateList && onUpdateList(payload)
    }
    setSaveVisible(false)
  }

  return (
    <div className={`relative flex flex-col border-r py-[1.875rem] h-[100vh] transition-all duration-300 ease-in-out ${fold ? 'w-0' : 'w-[12.5rem]'}`}>
      <header className="mb-2 w-full flex items-center px-3.5">
        {!fold && (
          <Space>
            <Input placeholder="搜索" prefix={<SearchOutlined className="text-base" />} />
            <SvgIcon localIcon="chat_add" className="text-[1.5625rem] cursor-pointer" onClick={() => handleEdit('create')} />
          </Space>
        )}
      </header>
      <span
        className={`absolute transition-all duration-300 ease-in-out top-1/2 -translate-y-1/2 z-10 cursor-pointer select-none ${fold ? 'right-[-2.5rem]' : 'right-[-0.75rem]'}`}
        onClick={() => {
          setFold(!fold)
        }}
        title={fold ? '展开菜单' : '收起菜单'}
      >
        <img src={!fold ? left_online : right_online} className="w-[1.5625rem] h-[1.5625rem]" />
      </span>
      <ul
        className={`flex-1 overflow-y-auto transition-opacity duration-300 ease-in-out ${fold ? 'opacity-0' : 'opacity-100'}`}
        style={{ display: fold ? 'none' : 'block', transitionDelay: fold ? '0ms' : '150ms' }}
      >
        {appList.map((item: any) => (
          <li
            className={` py-4 hover:bg-[#EEEDED] rounded  cursor-pointer leading-[1.0625rem] ${selectedChatId === item.chat_id ? 'bg-[#EEEDED]' : ''}`}
            key={item.chat_id}
            onClick={() => {
              handleSetCurApp(item)
              setSelectedChatId(item.chat_id)
            }} // 移除datasourceCache参数
          >
            <div className="px-[1.375rem] group flex items-center justify-between">
              <div className="flex items-start flex-col">
                <Popover content={item.biz_name}>
                  <span className="text-[#333333] leading-[1.375rem] w-[8rem] overflow-hidden text-ellipsis whitespace-nowrap">{item.biz_name}</span>
                </Popover>
                <sub className="text-[#666666] leading-[1.25rem]">{formatTimeDiff(item.create_time)}</sub>
              </div>
              <Dropdown
                menu={{
                  items: dropdownMenu,
                  onClick: (e) => {
                    handleMenuClick(e, item)
                  },
                }}
              >
                <span className="invisible px-2 text-xs group-hover:visible" onClick={(e) => e.preventDefault()}>
                  <MoreOutlined />
                </span>
              </Dropdown>
            </div>
          </li>
        ))}
      </ul>
      <div
        className={`mt-auto pt-2 pr-6 transition-opacity duration-300 ease-in-out ${fold ? 'opacity-0' : 'opacity-100'}`}
        style={{ display: fold ? 'none' : 'block', transitionDelay: fold ? '0ms' : '150ms' }}
      >
        <div
          className="block text-[#666666] text-base cursor-pointer text-right"
          onClick={() => {
            setHideRight(false)
            setShowAllConversations(true)
          }}
        >
          更多
          <DoubleRightOutlined className="ml-2" />
        </div>
      </div>
      <SaveDrawer open={saveVisible} onClose={(refresh?: boolean, payload?: any) => saveDrawerClose(refresh, payload)} conv={saveData} />
    </div>
  )
})

export default ConverList
