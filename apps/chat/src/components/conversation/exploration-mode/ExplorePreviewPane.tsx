import { CheckCircleOutlined, CloseCircleOutlined, CompassOutlined, InboxOutlined, ToolOutlined } from '@ant-design/icons'
import { Button, Empty, Tag } from 'antd'
import React from 'react'

import ExploreRichText from './ExploreRichText'
import type { ExploreItem, ExploreStep, ExploreStepOutput } from './types'
import styles from './styles.module.css'

interface ExplorePreviewPaneProps {
  item: ExploreItem
  onClose: () => void
}

/** 参考产品图绘制的双栏收起图标；路径使用 currentColor 以复用按钮交互色。 */
const CollapseIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" width={20} height={20} fill="none" aria-hidden="true" focusable="false">
    <path d="M11.5 3.5v5h5M8.5 16.5v-5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function getStatusTag(status: ExploreItem['status']) {
  switch (status) {
    case 'running':
      return { color: 'processing', text: '执行中' }
    case 'completed':
      return { color: 'green', text: '已完成' }
    case 'failed':
      return { color: 'red', text: '失败' }
    case 'cancelled':
      return { color: 'default', text: '已取消' }
    default:
      return { color: 'default', text: status }
  }
}

function renderOutput(output: ExploreStepOutput, index: number) {
  const content = output.content
  if (output.outputType === 'image' && typeof content === 'string') {
    return <img key={index} src={content} alt="步骤输出" className={styles.mediaImage} />
  }
  if ((output.outputType === 'pdf' || output.outputType === 'word') && typeof content === 'string') {
    return (
      <a key={index} href={content} target="_blank" rel="noreferrer" className={styles.fileLink}>
        打开{output.outputType === 'pdf' ? ' PDF' : ' Word'} 文件
      </a>
    )
  }
  if (output.outputType === 'json' || (typeof content === 'object' && content !== null)) {
    return <ExploreRichText key={index} text={`\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n`} />
  }
  return <ExploreRichText key={index} text={String(content ?? '')} />
}

const StepResult: React.FC<{ step: ExploreStep }> = ({ step }) => {
  if (step.outputs.length === 0) return null
  return (
    <div className={styles.stepResult}>
      <div className={styles.stepResultHead}>
        <ToolOutlined />
        <span>{step.title || step.action || `步骤 ${step.step ?? ''}`}</span>
        {step.status === 'failed' && <Tag color="red">失败</Tag>}
        {step.status === 'cancelled' && <Tag>已取消</Tag>}
      </div>
      <div className={styles.stepResultBody}>{step.outputs.map(renderOutput)}</div>
    </div>
  )
}

/** 探索结果全高工作室：展示分步骤执行数据、最终结论与执行摘要。 */
const ExplorePreviewPane: React.FC<ExplorePreviewPaneProps> = ({ item, onClose }) => {
  const statusTag = getStatusTag(item.status)
  const resultSteps = item.steps.filter((step) => step.outputs.length > 0)
  const hasResult = Boolean(item.finalContent) || resultSteps.length > 0 || Boolean(item.summary)

  return (
    <aside className={styles.pane}>
      <div className={styles.paneHeader}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.paneTitle}>
            <CompassOutlined />
            <span className={styles.paneTitleText}>{item.question || '探索结果'}</span>
          </div>
          <div className={styles.paneMeta}>
            <Tag color={statusTag.color}>{statusTag.text}</Tag>
            {item.finishReason === 'success' && <Tag icon={<CheckCircleOutlined />} color="green">成功</Tag>}
          </div>
        </div>
        <Button
          type="text"
          className={styles.paneCloseButton}
          icon={<CollapseIcon />}
          title="收起结果"
          aria-label="收起结果"
          onClick={onClose}
        />
      </div>

      <div className={styles.paneBody}>
        {!hasResult ? (
          <Empty className={styles.paneEmpty} image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无执行结果" />
        ) : (
          <>
            {resultSteps.length > 0 && (
              <div className={styles.paneSection}>
                <div className={styles.paneSectionTitle}>
                  <InboxOutlined /> 分步骤执行数据
                </div>
                {resultSteps.map((step) => (
                  <StepResult key={step.id} step={step} />
                ))}
              </div>
            )}

            {item.finalContent && (
              <div className={styles.paneSection}>
                <div className={styles.paneSectionTitle}>
                  <CheckCircleOutlined /> 最终结论
                </div>
                <div className={styles.finalBlock}>
                  <ExploreRichText text={item.finalContent} />
                </div>
              </div>
            )}

            {item.summary && (
              <div className={styles.paneSection}>
                <div className={styles.paneSectionTitle}>执行摘要</div>
                <div className={styles.summaryBlock}>
                  <ExploreRichText text={item.summary} />
                </div>
              </div>
            )}
          </>
        )}

        {item.error && (
          <div className={styles.paneSection}>
            <div className={styles.summaryBlock}>
              <CloseCircleOutlined style={{ color: 'var(--danger, #ef4444)', marginRight: 6 }} />
              {item.error.message}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default ExplorePreviewPane
