import { BulbOutlined, DownOutlined, LoadingOutlined } from '@ant-design/icons'
import React from 'react'

import { getPublicStepLines, isVisibleReportStep } from './helpers'
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
  if (report.currentPlan) return '分析完成'

  const latestStepId = report.thinkingStepIds[report.thinkingStepIds.length - 1]
  const latestStep = latestStepId ? report.stepsById[latestStepId] : undefined
  if (latestStep) return latestStep.title || latestStep.actionIntention || '正在分析问题'

  return '正在分析问题'
}

const ReportThinkingPanel: React.FC<ReportThinkingPanelProps> = ({ report, onToggle }) => {
  const thinkingSteps = report.thinkingStepIds
    .map((stepId) => report.stepsById[stepId])
    .filter(Boolean)
    .filter(isVisibleReportStep)

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
          {thinkingSteps.length === 0 ? (
            <div className={styles.thinkingPlaceholder}>
              <LoadingOutlined />
              <span>{getThinkingSummary(report)}</span>
            </div>
          ) : (
            <div className={styles.thinkingList}>
              {thinkingSteps.map((step) => (
                <div key={step.id} className={styles.thinkingItem}>
                  <div className={styles.thinkingItemTitle}>{step.title || step.action || `执行步骤 ${step.ordinal || ''}`}</div>
                  {getPublicStepLines(step).map((line, index) => (
                    <div key={`${step.id}-${index}`} className={styles.thinkingItemContent}>
                      {line}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default ReportThinkingPanel
