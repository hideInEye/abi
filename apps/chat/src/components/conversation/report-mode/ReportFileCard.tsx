import { FileMarkdownOutlined, FileTextOutlined } from '@ant-design/icons'
import { Button, Tag } from 'antd'
import React from 'react'

import { getReportTitle } from './helpers'
import type { ReportItem } from './types'
import styles from './styles.module.css'

interface ReportFileCardProps {
  report: ReportItem
  onOpen: () => void
}

const ReportFileCard: React.FC<ReportFileCardProps> = ({ report, onOpen }) => {
  // 报告候选在生成中可以实时预览；文件卡只在 done 确认完成后出现。
  if (report.status !== 'completed' || !report.reportCandidate) return null

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
      <Button type="primary" style={{ marginTop: 12 }} onClick={onOpen}>查看报告</Button>
    </div>
  )
}

export default ReportFileCard
