import { FileMarkdownOutlined, FileTextOutlined } from '@ant-design/icons'
import { Button, Tag } from 'antd'
import React from 'react'

import { canRevealReport, getReportTitle } from './helpers'
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

  return (
    <div className={styles.fileCard}>
      <div className={styles.fileCardTop}>
        <div className={styles.fileInfo}>
          <div className={styles.fileTitle}>
            {format === 'markdown' ? <FileMarkdownOutlined style={{ marginRight: 8 }} /> : <FileTextOutlined style={{ marginRight: 8 }} />}
            {title}
          </div>
          <div className={styles.fileDesc}>报告已生成，可在右侧只读窗口查看。</div>
        </div>
        <Tag color={format === 'html' ? 'blue' : 'purple'}>{format.toUpperCase()}</Tag>
      </div>
      <Button type="primary" style={{ marginTop: 12 }} onClick={onOpen}>
        查看报告
      </Button>
    </div>
  )
}

export default ReportFileCard
