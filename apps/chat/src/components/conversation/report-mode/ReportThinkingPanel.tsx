import { BulbOutlined, DownOutlined, LoadingOutlined } from '@ant-design/icons'
import React from 'react'

import type { ReportItem } from './types'
import styles from './styles.module.css'

interface ReportThinkingPanelProps {
  report: ReportItem
  onToggle: () => void
}

function getThinkingSummary(report: ReportItem) {
  if (report.status === 'submitting') return '正在理解你的问题'
  if (report.status === 'waiting_stream') return '正在分析问题'
  if (report.status === 'syncing_history') return '正在整理报告结果'
  if (report.thinkingCompleted) return '分析完成'
  if (report.thinkingPlan) return '正在制定任务计划'

  return '正在分析问题'
}

const ReportThinkingPanel: React.FC<ReportThinkingPanelProps> = ({ report, onToggle }) => {
  const thinkingPlanContent = report.thinkingPlan?.content

  return (
    <section className={styles.panel}>
      <button type="button" className={styles.panelHeader} onClick={onToggle}>
        <span className={styles.panelTitle}>
          <BulbOutlined />
          思考
        </span>
        <span className={styles.panelSummary}>{getThinkingSummary(report)}</span>
        <DownOutlined style={{ transform: report.thinkingOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>

      {report.thinkingOpen && (
        <div className={styles.panelBody}>
          {thinkingPlanContent ? (
            <div className={styles.thinkingPlanContent}>{thinkingPlanContent}</div>
          ) : (
            <div className={styles.thinkingPlaceholder}>
              <LoadingOutlined />
              <span>{getThinkingSummary(report)}</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default ReportThinkingPanel
