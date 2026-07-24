import { CloseOutlined, FileTextOutlined } from '@ant-design/icons'
import { Button, Empty, Tag } from 'antd'
import React from 'react'
import ReactMarkdown from 'react-markdown'

import { getReportTitle } from './helpers'
import type { ReportItem } from './types'
import styles from './styles.module.css'

interface ReportPreviewPaneProps {
  report: ReportItem
  onClose: () => void
}

const ReportPreviewPane: React.FC<ReportPreviewPaneProps> = ({ report, onClose }) => {
  const candidate = report.reportCandidate
  const title = getReportTitle(candidate)

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
            <Tag color={report.status === 'completed' ? 'green' : 'processing'}>{report.status === 'completed' ? '已完成' : '实时生成中'}</Tag>
          </div>
        </div>
        <Button icon={<CloseOutlined />} onClick={onClose}>关闭</Button>
      </div>

      <div className={styles.previewBody}>
        {!candidate ? (
          <Empty className={styles.previewEmpty} image={Empty.PRESENTED_IMAGE_SIMPLE} description="报告内容尚未可用" />
        ) : candidate.format === 'html' ? (
          // 只开放脚本执行，不开放同源、顶层跳转、弹窗或表单，隔离报告与宿主登录状态。
          <iframe
            key={candidate.entryId}
            title={title}
            className={styles.htmlFrame}
            srcDoc={candidate.content}
            sandbox="allow-scripts"
          />
        ) : (
          <div className={styles.markdownDoc}>
            <ReactMarkdown
              components={{
                a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>,
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
