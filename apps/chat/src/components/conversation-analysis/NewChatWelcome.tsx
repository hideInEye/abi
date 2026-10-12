import { BarChartOutlined, FileSearchOutlined, FundOutlined, LineChartOutlined } from '@ant-design/icons'
import React from 'react'

const examples = [
  {
    key: 'sales',
    icon: <BarChartOutlined />,
    title: '沃尔玛销售数据分析',
    desc: '分析沃尔玛近一年的销售数据，识别趋势、异常和增长机会',
    color: 'blue',
  },
  {
    key: 'profile',
    icon: <FileSearchOutlined />,
    title: '数据库画像与分析报告',
    desc: '基于用户行为数据，生成用户画像与分析报告',
    color: 'green',
  },
  {
    key: 'finance',
    icon: <FundOutlined />,
    title: '金融财报深度分析',
    desc: '解读上市公司年度财报，进行深度财务分析',
    color: 'purple',
  },
  {
    key: 'predict',
    icon: <LineChartOutlined />,
    title: '电商销售预测分析',
    desc: '基于历史数据预测未来三个月的销售趋势与走向',
    color: 'orange',
  },
]

interface NewChatWelcomeProps {
  onExampleClick?: (text: string) => void
  /** 自定义标题（默认 TrustABI · 芯智） */
  title?: string
  /** 自定义副标题文案（默认平台介绍；助手会话传开场引导） */
  subtitle?: string
  /** 隐藏推荐示例卡片（助手会话欢迎页只展示开场引导文案） */
  hideExamples?: boolean
}

const NewChatWelcome: React.FC<NewChatWelcomeProps> = ({ onExampleClick, title, subtitle, hideExamples }) => {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
      {/* Main content */}
      <div className="welcome-view flex-1 min-h-0 overflow-y-auto">
        <div className="welcome-title">{title ?? 'TrustABI · 芯智'}</div>
        <p className="welcome-subtitle">
          {subtitle ?? '您的全能数据智能专家。从智能问数到归因预测，再到一键生成报告，芯智助您高效挖掘数据价值，精准获取商业洞察。'}
        </p>

        {!hideExamples && (
          <>
            <div className="welcome-section-title">推荐示例</div>
            <div className="welcome-cases-grid">
              {examples.map((item) => (
                <div
                  key={item.key}
                  className={`welcome-case-card ${item.color}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onExampleClick?.(item.title)}
                >
                  <div className="case-icon">{item.icon}</div>
                  <div className="case-content">
                    <div className="case-title">{item.title}</div>
                    <div className="case-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default NewChatWelcome
