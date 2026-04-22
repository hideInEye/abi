import { List, Typography } from 'antd'

import type { TopicItem } from '@/types/layout'
import { formatTopicUpdateTime } from '@/utils/layout'

type HistoryTopicsPanelProps = {
  loading: boolean
  topics: TopicItem[]
  activeConversationId: string
  onSelectTopic: (chatId: string) => void
}

function getCardClassName(isActive: boolean): string {
  const baseClass = 'mb-3 cursor-pointer rounded-xl border bg-white px-5 py-4 transition-all duration-200 ease-out'
  if (isActive) {
    return `${baseClass} border-[#8fb2ff] shadow-[0_8px_20px_rgba(59,130,246,0.12)]`
  }

  return `${baseClass} border-[#e8ebef] hover:border-[#c7d2fe] hover:shadow-[0_6px_16px_rgba(51,102,255,0.08)]`
}

export function HistoryTopicsPanel({
  loading,
  topics,
  activeConversationId,
  onSelectTopic,
}: HistoryTopicsPanelProps) {
  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="h-[68px] border-b border-[#eceef2] bg-white px-6 flex items-center">
        <Typography.Text className="text-[28px] font-bold text-[#111827]">历史话题</Typography.Text>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-6 py-5">
        <div className="mx-auto w-full max-w-[1120px]">
          <List
            loading={loading}
            dataSource={topics}
            locale={{ emptyText: '暂无历史话题' }}
            renderItem={(item) => {
              const isActive = item.chatId === activeConversationId

              return (
                <List.Item className={getCardClassName(isActive)} onClick={() => onSelectTopic(item.chatId)}>
                  <List.Item.Meta
                    title={
                      <Typography.Text strong={isActive} className="text-[20px] text-[#1f2937]">
                        {item.title}
                      </Typography.Text>
                    }
                    description={<Typography.Text className="text-[15px] text-[#6b7280]">{formatTopicUpdateTime(item.updateTime)}</Typography.Text>}
                  />
                </List.Item>
              )
            }}
          />
        </div>
      </div>
    </div>
  )
}
