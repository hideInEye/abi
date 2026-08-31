import { CheckCircleOutlined, CloseCircleOutlined, CompassOutlined, InboxOutlined } from '@ant-design/icons'
import { Button, Empty } from 'antd'
import React from 'react'

import { isStructuredOutput } from './exploreExport'
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

// 暂不支持下载，屏蔽导出菜单（恢复时需同步恢复顶部 DownloadOutlined/Dropdown/MenuProps 与 exploreExport 相关导入）
// const EXPORT_MENU_ITEMS: MenuProps['items'] = [
//   { key: 'word', label: 'Word 文件' },
//   { key: 'pdf', label: 'PDF 文件（打印另存）' },
//   { key: 'html', label: 'HTML 文件' },
// ]

function getStatusTag(status: ExploreItem['status']) {
  switch (status) {
    case 'running':
      return { cls: styles.statusTagRunning, text: '执行中' }
    case 'completed':
      return { cls: styles.statusTagCompleted, text: '已完成' }
    case 'failed':
      return { cls: styles.statusTagFailed, text: '失败' }
    case 'cancelled':
      return { cls: styles.statusTagCancelled, text: '已取消' }
    default:
      return { cls: styles.statusTagCancelled, text: status }
  }
}

function renderStructuredOutput(output: ExploreStepOutput, index: number) {
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
  if (typeof content === 'string') {
    return <ExploreRichText key={index} text={content} tablesOnly />
  }
  return null
}

/** 分栏只展示结构化数据，不展示技能名称与执行过程信息。 */
const StepResult: React.FC<{ step: ExploreStep }> = ({ step }) => {
  const structuredOutputs = step.outputs.filter(isStructuredOutput)
  if (structuredOutputs.length === 0) return null
  return (
    <div className={styles.stepResult}>
      <div className={styles.stepResultBody}>{structuredOutputs.map(renderStructuredOutput)}</div>
    </div>
  )
}

/** 探索结果全高工作室：展示分步骤执行数据、最终结论与执行摘要。 */
const ExplorePreviewPane: React.FC<ExplorePreviewPaneProps> = ({ item, onClose }) => {
  const statusTag = getStatusTag(item.status)
  const resultSteps = item.steps.filter((step) => step.outputs.some(isStructuredOutput))
  const hasResult = Boolean(item.finalContent) || resultSteps.length > 0 || Boolean(item.summary)
  const running = item.status === 'running'

  return (
    <aside className={styles.pane}>
      <div className={styles.paneHeader}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.paneTitle}>
            <CompassOutlined />
            <span className={styles.paneTitleText}>工作室</span>
            {running && <span className={styles.statusDot} />}
          </div>
          <div className={styles.paneMeta}>
            <span className={`${styles.statusTag} ${statusTag.cls}`}>{statusTag.text}</span>
            {item.finishReason === 'success' && <span className={`${styles.statusTag} ${styles.statusTagSuccess}`}><CheckCircleOutlined /> 成功</span>}
            <span className={styles.paneQuestion} title={item.question}>{item.question}</span>
          </div>
        </div>
        <div className={styles.paneHeaderActions}>
          {/* 暂不支持下载，屏蔽下载按钮
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            disabled={!hasResult}
            menu={{
              items: EXPORT_MENU_ITEMS,
              onClick: ({ key }) => downloadExploreExport(item, key as ExploreExportFormat),
            }}
          >
            <Button
              type="text"
              className={styles.paneCloseButton}
              icon={<DownloadOutlined />}
              title="下载结果"
              aria-label="下载结果"
              aria-haspopup="menu"
              disabled={!hasResult}
            />
          </Dropdown>
          */}
          <Button
            type="text"
            className={styles.paneCloseButton}
            icon={<CollapseIcon />}
            title="收起结果"
            aria-label="收起结果"
            onClick={onClose}
          />
        </div>
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
