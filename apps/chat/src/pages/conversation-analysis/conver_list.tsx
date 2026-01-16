import { CloseOutlined, DoubleLeftOutlined, DoubleRightOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Input, Space } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import SvgIcon from '../../components/SvgIcon'
import left_online from '@/assets/svg-icon/left_online.svg'
import right_online from '@/assets/svg-icon/right_online.svg'

interface converListProps {
  setVisible: (visible: boolean) => void
  appList: any[]
  handleSetCurApp: (item: any) => void
  handleDeleteApp: (item: any) => void
  setHideRight: (hideRight: boolean) => void
  setShowAllConversations: (showAllConversations: boolean) => void
  curApp: any
}

const ConverList: React.FC<converListProps> = (props: any) => {
  const { setVisible, appList, handleSetCurApp, handleDeleteApp, setHideRight, setShowAllConversations, curApp } = props
  const [fold, setFold] = useState(false)

  return (
    <div className={`relative flex flex-col border-r py-[1.875rem] h-full transition-all duration-300 ease-in-out ${fold ? 'w-0' : 'w-[12.5rem]'}`}>
      <header className="mb-2 w-full flex items-center px-3.5">
        {!fold && (
          <Space>
            <Input prefix={<SearchOutlined className="text-base" />} />
            <SvgIcon localIcon="chat_add" className="text-[1.5625rem] cursor-pointer" onClick={() => setVisible(true)} />
          </Space>
        )}
      </header>
      <span
        className={`absolute transition-all duration-300 ease-in-out top-1/2 -translate-y-1/2 z-10 cursor-pointer select-none ${fold ? 'right-[-2.5rem]' : 'right-[-0.75rem]'}`}
        onClick={() => setFold(!fold)}
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
            className={` py-4 hover:bg-[#EEEDED] rounded  cursor-pointer leading-[1.0625rem] ${curApp.chat_id === item.chat_id ? 'bg-[#EEEDED]' : ''}`}
            key={item.chat_id}
            onClick={() => handleSetCurApp(item)} // 移除datasourceCache参数
          >
            <div className="px-[1.375rem] group flex items-center justify-between">
              <div className="flex items-start flex-col">
                <span className="text-[#333333] leading-[1.375rem]">{item.biz_name}</span>
                <sub className="text-[#666666] leading-[1.25rem]">{item.create_time ? dayjs(item.create_time).format('YYYY-MM-DD HH:mm:ss') : '-'}</sub>
              </div>
              <span
                className="invisible px-2 text-xs group-hover:visible"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteApp(item)
                }}
              >
                <CloseOutlined />
              </span>
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
    </div>
  )
}

export default ConverList
