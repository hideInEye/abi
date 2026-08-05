import { CloseOutlined, FileTextOutlined } from '@ant-design/icons'
import { Button, Empty, Tag } from 'antd'
import React from 'react'
import ReactMarkdown from 'react-markdown'

import { canRevealReport, getReportTitle } from './helpers'
import { createTypewriterHtmlDocument } from './htmlTypewriter'
import type { ReportItem } from './types'
import styles from './styles.module.css'

interface ReportPreviewPaneProps {
  report: ReportItem
  /** 仅实时任务首次自动打开时为 true；手动重开和历史报告直接显示完整正文。 */
  animate?: boolean
  onClose: () => void
}

const ReportPreviewPane: React.FC<ReportPreviewPaneProps> = ({ report, animate = false, onClose }) => {
  // 即使调用方状态短暂不同步，也不允许在最终阶段前渲染报告正文。
  const candidate = canRevealReport(report) ? report.reportCandidate : undefined
  const title = getReportTitle(candidate)
  const htmlDocument = React.useMemo(() => {
    if (candidate?.format !== 'html') return undefined
    return animate ? createTypewriterHtmlDocument(candidate.content) : candidate.content
  }, [animate, candidate?.content, candidate?.format])

  return (
    <aside className={styles.reportPane}>
      <div className={styles.previewHeader}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.previewTitle}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            {title}
          </div>
          <div className={styles.previewMeta}>
            {candidate && <Tag color={candidate.format === 'html' ? 'blue' : 'purple'}>{candidate.format.toUpperCase()}</Tag>}
            {candidate && <Tag color="green">已完成</Tag>}
          </div>
        </div>
        <Button icon={<CloseOutlined />} onClick={onClose}>
          关闭
        </Button>
      </div>

      <div className={`${styles.previewBody} ${candidate?.format === 'html' ? styles.previewBodyHtml : styles.previewBodyScrollable}`}>
        {!candidate ? (
          <Empty className={styles.previewEmpty} image={Empty.PRESENTED_IMAGE_SIMPLE} description="报告内容尚未可用" />
        ) : candidate.format === 'html' ? (
          // 完整 HTML 只加载一次；打字机在沙箱内部修改可见文本节点，不按动画帧刷新 srcDoc。
          <iframe key={`${candidate.entryId}:${animate ? 'typing' : 'static'}`} title={title} className={styles.htmlFrame} srcDoc={htmlDocument} sandbox="allow-scripts" />
        ) : (
          <div className={styles.markdownDoc}>
            <ReactMarkdown
              components={{
                a: ({ children, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {candidate.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </aside>
  )
}

export default ReportPreviewPane
