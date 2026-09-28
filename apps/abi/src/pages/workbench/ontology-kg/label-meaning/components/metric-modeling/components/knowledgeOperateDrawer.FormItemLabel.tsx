import { QuestionCircleOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import React from 'react'

interface Props {
  readonly helpText: React.ReactNode
  readonly title: React.ReactNode
}

export const KnowledgeFormItemLabel: React.FC<Props> = ({ helpText, title }) => (
  <span className="inline-flex items-center gap-1">
    <span>{title}</span>
    <Tooltip title={helpText}>
      <QuestionCircleOutlined
        aria-label="查看字段说明"
        className="cursor-help text-[#8fa0b5]"
        tabIndex={0}
      />
    </Tooltip>
  </span>
)
