import { FileSearchOutlined } from '@ant-design/icons'
import { Alert } from 'antd'
import React from 'react'

import ReportFileCard from './ReportFileCard'
import ReportThinkingPanel from './ReportThinkingPanel'
import ReportTodoList from './ReportTodoList'
import { formatReportDuration, getReportPresentationStage, shouldShowReportEstimate } from './helpers'
import type { ReportItem } from './types'
import styles from './styles.module.css'

interface ReportMessageRowProps {
  report: ReportItem
  onToggleThinking: () => void
  onToggleTodo: () => void
  onToggleTask: (taskKey: string) => void
  onOpenReport: () => void
  onThinkingTypewriterComplete?: () => void
}

type ReportStatusTone = 'active' | 'success' | 'danger' | 'neutral'

function getStatusMeta(status: ReportItem['status']) {
  switch (status) {
    case 'submitting':
      return { tone: 'active' as const, text: '正在准备' }
    case 'waiting_stream':
      return { tone: 'active' as const, text: '准备中' }
    case 'syncing_history':
      return { tone: 'active' as const, text: '正在整理' }
    case 'thinking':
      return { tone: 'active' as const, text: '思考中' }
    case 'running':
      return { tone: 'active' as const, text: '执行中' }
    case 'completed':
      return { tone: 'success' as const, text: '已完成' }
    case 'failed':
      return { tone: 'danger' as const, text: '失败' }
    default:
      return { tone: 'neutral' as const, text: status }
  }
}

const STATUS_TONE_CLASS_NAMES: Record<ReportStatusTone, string> = {
  active: styles.reportStatusActive,
  success: styles.reportStatusSuccess,
  danger: styles.reportStatusDanger,
  neutral: styles.reportStatusNeutral,
}

const ReportMessageRow: React.FC<ReportMessageRowProps> = ({ report, onToggleThinking, onToggleTodo, onToggleTask, onOpenReport, onThinkingTypewriterComplete }) => {
  const statusMeta = getStatusMeta(report.status)
  const latestWarning = report.warnings[report.warnings.length - 1]
  const presentationStage = getReportPresentationStage(report)
  const durationText = formatReportDuration(report.durationSeconds)
  const showEstimate = shouldShowReportEstimate(report.status)
  const showFinalSummary = Boolean(report.final) && (presentationStage === 'report' || report.status === 'failed')
  const warningDescription = report.status === 'syncing_history' ? '报告已经生成，正在整理到当前会话中。' : report.status === 'completed' ? undefined : '生成过程出现短暂波动，系统正在自动恢复。'

  return (
    <article className={styles.messageRow}>
      <div className={styles.questionWrap}>
        <div className={styles.questionBubble}>{report.question}</div>
      </div>

      <div className={styles.answerWrap}>
        <div className={styles.answerCard}>
          <div className={styles.answerHeader}>
            <div className={styles.answerTitle}>
              <FileSearchOutlined />
              报告生成
              <span
                className={`${styles.reportStatusBadge} ${STATUS_TONE_CLASS_NAMES[statusMeta.tone]}`}
                data-status={report.status}
              >
                <span className={styles.reportStatusDot} aria-hidden="true" />
                {statusMeta.text}
              </span>
            </div>
            {durationText && <div className={styles.answerMeta}>{durationText}</div>}
          </div>

          <ReportThinkingPanel report={report} onToggle={onToggleThinking} onTypewriterComplete={onThinkingTypewriterComplete} />
          {presentationStage !== 'thinking' && <ReportTodoList report={report} onToggleTodo={onToggleTodo} onToggleTask={onToggleTask} />}

          {showFinalSummary && report.final && <div className={styles.finalSummary}>{report.final.content}</div>}

          {report.storageWarning && (
            <div className={styles.inlineAlert}>
              <Alert type="warning" showIcon message="暂时无法保存恢复进度" description="当前报告仍会继续生成，但刷新页面后可能需要重新进入会话查看。" />
            </div>
          )}

          {latestWarning && warningDescription && !report.error && (
            <div className={styles.inlineAlert}>
              <Alert type="warning" showIcon message="生成提示" description={warningDescription} />
            </div>
          )}

          {report.error && (
            <div className={styles.inlineAlert}>
              <Alert type="error" showIcon message={report.error.message} />
            </div>
          )}

          {showEstimate && (
            <div className={styles.estimateNotice}>
              报告预计将在 <strong>5-10 分钟左右</strong> 完成。生成期间，你无需停留在当前页面，可以继续提问或处理其他事情，<strong>研究任务会持续进行</strong>。报告完成后，我会第一时间通知你。
            </div>
          )}

          {presentationStage === 'report' && <ReportFileCard report={report} onOpen={onOpenReport} />}
        </div>
      </div>
    </article>
  )
}

export default ReportMessageRow
