import { DownloadOutlined, FileMarkdownOutlined, FileTextOutlined } from '@ant-design/icons'
import { Button, Tag } from 'antd'
import React from 'react'

import { canRevealReport, getReportDownloadDescriptor, getReportTitle } from './helpers'
import type { ReportItem } from './types'
import styles from './styles.module.css'

interface ReportFileCardProps {
  report: ReportItem
  onOpen: () => void
}

const ReportFileCard: React.FC<ReportFileCardProps> = ({ report, onOpen }) => {
  // 候选内容可以提前到达，但文件卡只能在整体完成且所有 ToDo 结束后出现。
  if (!canRevealReport(report) || !report.reportCandidate) return null

  const { format } = report.reportCandidate
  const title = getReportTitle(report.reportCandidate)

  const handleDownload = () => {
    if (!report.reportCandidate) return

    const { fileName, mimeType } = getReportDownloadDescriptor(report.reportCandidate)
    const url = URL.createObjectURL(new Blob([report.reportCandidate.content], { type: mimeType }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.fileCard}>
      <div className={styles.fileCardContent}>
        <Tag className={styles.fileTypeTag} color={format === 'html' ? 'blue' : 'purple'}>{format.toUpperCase()}</Tag>
        <div className={styles.fileInfo}>
          <div className={styles.fileTitle}>
            {format === 'markdown' ? <FileMarkdownOutlined style={{ marginRight: 8 }} /> : <FileTextOutlined style={{ marginRight: 8 }} />}
            {title}
          </div>
          <div className={styles.fileDesc}>报告已生成，可在右侧只读窗口查看。</div>
        </div>
      </div>
      <div className={styles.fileActions}>
        <Button type="primary" onClick={onOpen}>
          查看报告
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleDownload}>
          下载文件
        </Button>
      </div>
    </div>
  )
}

export default ReportFileCard
