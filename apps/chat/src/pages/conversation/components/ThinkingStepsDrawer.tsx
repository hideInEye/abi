import React from 'react'
import { Drawer, Empty } from 'antd'
import ReactMarkdown from 'react-markdown'

type StepItem = {
  id?: string | number
  name: string
  content: string
}

type ThinkingStepsDrawerProps = {
  open: boolean
  onClose: () => void
  steps?: StepItem[]
  thinkNodes?: StepItem[]
  fallbackContent?: string
  thinkTime?: number
}

const ThinkingStepsDrawer: React.FC<ThinkingStepsDrawerProps> = ({
  open,
  onClose,
  steps = [],
  thinkNodes = [],
  fallbackContent,
  thinkTime
}) => {
  const sourceSteps = steps.length ? steps : thinkNodes

  const normalizedSteps = sourceSteps.length
    ? sourceSteps.map((node, index) => ({
        id: node.id ?? `think-step-${index}`,
        title: node.name || `深度思考 ${index + 1}`,
        content: node.content || '',
      }))
    : (fallbackContent
        ? [{
            id: 'think-step-fallback',
            title: '深度思考',
            content: fallbackContent,
          }]
        : [])

  return (
    <Drawer
      title={
        <div className="flex items-center gap-[0.75rem]">
          <span className="text-[1rem] font-semibold text-[#222a38]">历史步骤</span>
          {thinkTime ? <span className="text-[0.8125rem] text-[#8a95a8]">思考了{thinkTime}秒</span> : null}
        </div>
      }
      placement="right"
      width="35rem"
      open={open}
      onClose={onClose}
      maskClosable
      destroyOnClose
    >
      {normalizedSteps.length === 0 ? (
        <Empty description="暂无思考步骤" />
      ) : (
        <div className="pr-[0.25rem]">
          {normalizedSteps.map((step, index) => {
            const isLast = index === normalizedSteps.length - 1

            return (
              <div key={step.id} className={`relative pl-[2.25rem] ${isLast ? '' : 'pb-[1.25rem]'}`}>
                {!isLast ? <span className="absolute left-[0.75rem] top-[1.5rem] bottom-0 w-[0.0625rem] bg-[#e8edf6]" /> : null}
                <span className="absolute left-0 top-0 inline-flex h-[1.5rem] w-[1.5rem] items-center justify-center rounded-full border border-[#cfd7e8] bg-[#f7f9fe] text-[0.75rem] font-semibold text-[#3f68cc]">
                  {index + 1}
                </span>
                <div className="text-[0.9375rem] font-semibold leading-[1.5] text-[#2d3442]">{step.title}</div>
                <div className="mt-[0.5rem] text-[0.875rem] leading-[1.75] text-[#546074]">
                  <ReactMarkdown>{step.content}</ReactMarkdown>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Drawer>
  )
}

export default ThinkingStepsDrawer
