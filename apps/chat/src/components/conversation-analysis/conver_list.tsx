import { MoreOutlined, SearchOutlined } from '@ant-design/icons'
import { Dropdown, Empty, Flex, Input, Popover, Space } from 'antd'
import React, { useEffect, useImperativeHandle, useState } from 'react'
import SvgIcon from '../../components/SvgIcon'
import left_online from '@/assets/svg-icon/left_online.svg'
import right_online from '@/assets/svg-icon/right_online.svg'
import { MenuProps } from 'antd'
import { formatTimeDiff } from '../../utils/date'

export interface ConverListProps {
  appList: any[]
  handleSetCurApp: (item: any) => void
  handleDeleteApp: (item: any) => void
  handleEdit: (key: string, item?: any) => void
  setFold: (fold: boolean) => void
  fold: boolean
}

const ConverList = React.forwardRef((props: ConverListProps, ref) => {
  const { appList, handleSetCurApp, handleDeleteApp, handleEdit, setFold, fold } = props
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('analysis')
  useImperativeHandle(ref, () => ({
    setSelectedChatId,
  }))
  useEffect(() => {
    if (!appList?.length) {
      setSelectedChatId(null)
      return
    }
    const lastChatId = localStorage.getItem('chatId')
    const target = (lastChatId && appList.find((item) => String(item.chat_id) === String(lastChatId))) || appList[0]
    setSelectedChatId(target?.chat_id || null)
  }, [appList])

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

  const handleMenuClick = (e: any, item: any) => {
    e?.domEvent?.stopPropagation()
    e?.domEvent?.preventDefault()
    switch (e.key) {
      case 'edit':
        handleEdit('edit', item)
        break
      case 'delete':
        handleDeleteApp(item)
        break
    }
  }

  return (
    <div className={`relative flex flex-col py-[1.5rem] h-[100vh] transition-all duration-300 ease-in-out ${fold ? 'w-[0.7rem]' : 'w-[12.5rem]'}`} style={{ borderRight: '1px solid var(--border)', background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(12px)' }}>
      <header className="mb-2 w-full flex items-center pl-3.5">
        {!fold && (
          <Flex justify="space-around" align="center">
            <Input placeholder="搜索" prefix={<SearchOutlined className="text-base" />} />
            <SvgIcon localIcon="chat_add" style={{ margin: '0 1rem' }} className="text-[1.5625rem]  cursor-pointer" onClick={() => handleEdit('create')} />
          </Flex>
        )}
      </header>
      
      {/* 分组选择器 */}
      {!fold && (
        <div className="px-3 mb-3">
          {GROUPS.map((group) => (
            <div
              key={group.id}
              className={`px-3 py-2 rounded cursor-pointer mb-1 transition-all ${
                selectedGroup === group.id 
                  ? 'bg-[#5b7cf7] text-white' 
                  : 'hover:bg-[#EEEDED] text-[#333]'
              }`}
              onClick={() => setSelectedGroup(group.id)}
            >
              {group.name}
            </div>
          ))}
        </div>
      )}
      
      <span
        className={`absolute transition-all duration-300 ease-in-out top-1/2 -translate-y-1/2 z-10 cursor-pointer select-none ${fold ? 'right-[-0.9375rem]' : 'right-[-0.75rem]'}`}
        onClick={() => {
          setFold(!fold)
        }}
        title={fold ? '展开菜单' : '收起菜单'}
      >
        <img src={!fold ? left_online : right_online} className="w-[1.5625rem] h-[1.5625rem]" />
      </span>
      {(appList && appList.length > 0 && (
        <ul
          className={`flex-1 overflow-y-auto transition-opacity duration-300 ease-in-out ${fold ? 'opacity-0' : 'opacity-100'}`}
          style={{ display: fold ? 'none' : 'block', transitionDelay: fold ? '0ms' : '150ms' }}
        >
          {appList.map((item: any) => (
            <li
              className={` py-4 hover:bg-[#EEEDED] rounded  cursor-pointer relative leading-[1.0625rem] ${selectedChatId === item.chat_id ? 'bg-[#EEEDED]' : ''}`}
              key={item.chat_id}
              onClick={() => {
                handleSetCurApp(item)
                setSelectedChatId(item.chat_id)
                localStorage.setItem('chatId', String(item.chat_id))
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
                  trigger={['click']}
                  menu={{
                    items: dropdownMenu,
                    onClick: (e) => {
                      handleMenuClick(e, item)
                    },
                  }}
                >
                  <span
                    className="px-2 py-2 text-xs absolute right-3"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <MoreOutlined />
                  </span>
                </Dropdown>
              </div>
            </li>
          ))}
        </ul>
      )) ||
        (!fold && (
          <div className="flex items-center justify-center h-[100%]">
            <Empty description="暂无数据" />
          </div>
        ))}
    </div>
  )
})

export default ConverList
