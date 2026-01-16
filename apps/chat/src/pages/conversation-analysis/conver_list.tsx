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
    <div className={`relative flex flex-col border-r py-[30px] h-full transition-all duration-300 ease-in-out ${fold ? 'w-[0px]' : 'w-[200px]'}`}>
      <header className="mb-2 w-full flex items-center px-[14px]">
        {!fold && (
          <Space>
            <Input prefix={<SearchOutlined style={{ fontSize: '16px' }} />} />
            <SvgIcon localIcon="chat_add" className="text-[25px] cursor-pointer" onClick={() => setVisible(true)} />
          </Space>
        )}
      </header>
      <span
        style={{ right: !fold ? '-12px' : '-40px' }}
        className={`absolute transition-all duration-300 ease-in-out top-1/2 -translate-y-1/2 z-10 cursor-pointer select-none`}
        onClick={() => setFold(!fold)}
        title={fold ? '展开菜单' : '收起菜单'}
      >
        <img src={!fold ? left_online : right_online} className="w-[25px] h-[25px]" />
      </span>
      <ul
        className={`flex-1 overflow-y-auto transition-opacity duration-300 ease-in-out ${fold ? 'opacity-0' : 'opacity-100'}`}
        style={{ display: fold ? 'none' : 'block', transitionDelay: fold ? '0ms' : '150ms' }}
      >
        {appList.map((item: any) => (
          <li
            className={` py-4 hover:bg-[#EEEDED] rounded  cursor-pointer leading-[17px] ${curApp.chat_id === item.chat_id ? 'bg-[#EEEDED]' : ''}`}
            key={item.chat_id}
            onClick={() => handleSetCurApp(item)} // 移除datasourceCache参数
          >
            <div className="px-[22px] group flex items-center justify-between">
              <div className="flex items-start flex-col">
                <span className="text-[#333333] leading-[22px]">{item.biz_name}</span>
                <sub className="text-[#666666] leading-[20px]">{item.create_time ? dayjs(item.create_time).format('YYYY-MM-DD HH:mm:ss') : '-'}</sub>
              </div>
              <span
                className="invisible px-2 text-[12px] group-hover:visible"
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
        className={`mt-auto pt-2 pr-[24px] transition-opacity duration-300 ease-in-out ${fold ? 'opacity-0' : 'opacity-100'}`}
        style={{ display: fold ? 'none' : 'block', transitionDelay: fold ? '0ms' : '150ms' }}
      >
        <div
          className="block text-[#666666] text-[16px] cursor-pointer text-right"
          onClick={() => {
            setHideRight(false)
            setShowAllConversations(true)
          }}
        >
          更多
          <DoubleRightOutlined className="ml-[8px]" />
        </div>
      </div>
    </div>
  )
}

export default ConverList
