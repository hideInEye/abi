import { ClearOutlined, ClockCircleOutlined, CopyOutlined, DeleteOutlined, EditOutlined, MoreOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Dropdown, List, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { Input } from 'antd'

import type { TopicItem } from '@/types/layout'
import { formatTopicUpdateTime } from '@/utils/layout'

type HistoryTopicsPanelProps = {
  loading: boolean
  topics: TopicItem[]
  activeConversationId: string
  searchKeyword: string
  onSearchChange: (value: string) => void
  onSelectTopic: (chatId: string) => void
  onEditTopic: (chatId: string) => void
  onSaveTopic: (chatId: string) => void
  onClearTopic: (chatId: string) => void
  onDeleteTopic?: (chatId: string) => void
}

function getCardClassName(isActive: boolean): string {
  const baseClass = 'w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-all duration-200 ease-out'
  if (isActive) {
    return `${baseClass} border-[#5b7cf7] bg-gradient-to-r from-[#f0f4ff] to-[#f8f9ff] shadow-[0_8px_24px_rgba(91,124,247,0.15)]`
  }

  return `${baseClass} border-[#e8ebef] bg-white hover:border-[#5b7cf7] hover:shadow-[0_6px_20px_rgba(91,124,247,0.1)] hover:bg-[#fafbff]`
}

export function HistoryTopicsPanel({
  loading,
  topics,
  activeConversationId,
  searchKeyword,
  onSearchChange,
  onSelectTopic,
  onEditTopic,
  onSaveTopic,
  onClearTopic,
  onDeleteTopic,
}: HistoryTopicsPanelProps) {
  const buildMenu = (chatId: string): MenuProps => ({
    items: [
      {
        key: 'edit',
        label: (
          <span className="flex items-center gap-2">
            <EditOutlined />
            编辑
          </span>
        ),
      },
      {
        key: 'save',
        label: (
          <span className="flex items-center gap-2">
            <CopyOutlined />
            另存
          </span>
        ),
      },
      {
        key: 'clear',
        label: (
          <span className="flex items-center gap-2">
            <ClearOutlined />
            清空
          </span>
        ),
      },
      {
        key: 'delete',
        label: (
          <span className="flex items-center gap-2">
            <DeleteOutlined />
            删除
          </span>
        ),
        danger: true,
      },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      if (key === 'edit') return onEditTopic(chatId)
      if (key === 'save') return onSaveTopic(chatId)
      if (key === 'clear') return onClearTopic(chatId)
      if (key === 'delete') {
        onDeleteTopic?.(chatId)
      }
    },
  })

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="h-[64px] border-b border-[#eceef2] bg-white px-5 flex items-center justify-between">
        <Typography.Text className="text-[22px] font-bold text-[#111827]">历史话题</Typography.Text>
      </div>

      <div className="px-6 pt-3">
        <Input
          allowClear
          placeholder="搜索"
          prefix={<SearchOutlined className="text-[#9ca3af]" />}
          value={searchKeyword}
          onChange={(event) => onSearchChange(event.target.value)}
          className="!h-10 !max-w-[360px] !rounded-[10px]"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
        <div className="mx-auto w-full max-w-[920px]">
          <List
            loading={loading}
            dataSource={topics}
            locale={{ emptyText: '暂无历史话题' }}
            renderItem={(item) => {
              const isActive = item.chatId === activeConversationId

              return (
                <List.Item className="!mb-3 !border-0 !p-0">
                  <div role="button" tabIndex={0} className={getCardClassName(isActive)} onClick={() => onSelectTopic(item.chatId)} onKeyDown={(event) => event.key === 'Enter' && onSelectTopic(item.chatId)}>
                    <div className="w-full flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Typography.Text strong={isActive} className="block truncate text-[16px] text-[#111827]">
                          {item.title}
                        </Typography.Text>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#6b7280]">
                          <ClockCircleOutlined />
                          <Typography.Text className="!text-[13px] !text-[#6b7280]">{formatTopicUpdateTime(item.updateTime)}</Typography.Text>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 text-[15px] text-[#a1a1aa]">
                        <Dropdown menu={buildMenu(item.chatId)} trigger={['click']} placement="bottomRight">
                          <Button
                            type="text"
                            icon={<MoreOutlined />}
                            className="!h-7 !w-7 !rounded-full !p-0 !text-[#9ca3af] hover:!text-[#4b5563]"
                            onClick={(event) => event.stopPropagation()}
                          />
                        </Dropdown>
                      </div>
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />
        </div>
      </div>
    </div>
  )
}
