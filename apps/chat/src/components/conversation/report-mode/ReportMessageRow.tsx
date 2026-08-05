import { FileSearchOutlined } from '@ant-design/icons'
import { Alert, Tag } from 'antd'
import dayjs from 'dayjs'
import React from 'react'

import ReportFileCard from './ReportFileCard'
import ReportThinkingPanel from './ReportThinkingPanel'
import ReportTodoList from './ReportTodoList'
import { getReportPresentationStage } from './helpers'
import type { ReportItem } from './types'
import styles from './styles.module.css'

interface ReportMessageRowProps {
  report: ReportItem
  onToggleThinking: () => void
  onToggleTodo: () => void
  onToggleTask: (taskKey: string) => void
  onOpenReport: () => void
}

function getStatusMeta(status: ReportItem['status']) {
  switch (status) {
    case 'submitting':
      return { color: 'processing', text: '正在准备' }
    case 'waiting_stream':
      return { color: 'processing', text: '准备中' }
    case 'syncing_history':
      return { color: 'processing', text: '正在整理' }
    case 'thinking':
      return { color: 'processing', text: '思考中' }
    case 'running':
      return { color: 'blue', text: '执行中' }
    case 'completed':
      return { color: 'green', text: '已完成' }
    case 'failed':
      return { color: 'red', text: '失败' }
    default:
      return { color: 'default', text: status }
  }
}

const ReportMessageRow: React.FC<ReportMessageRowProps> = ({ report, onToggleThinking, onToggleTodo, onToggleTask, onOpenReport }) => {
  const statusMeta = getStatusMeta(report.status)
  const latestWarning = report.warnings[report.warnings.length - 1]
  const presentationStage = getReportPresentationStage(report)
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
              <Tag color={statusMeta.color}>{statusMeta.text}</Tag>
            </div>
            <div className={styles.answerMeta}>{dayjs(report.createdAt).format('HH:mm:ss')}</div>
          </div>

          <ReportThinkingPanel report={report} onToggle={onToggleThinking} />
          {presentationStage !== 'thinking' && <ReportTodoList report={report} onToggleTodo={onToggleTodo} onToggleTask={onToggleTask} />}

          {presentationStage === 'report' && report.final && <div className={styles.finalSummary}>{report.final.content}</div>}

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

          {presentationStage === 'report' && <ReportFileCard report={report} onOpen={onOpenReport} />}
        </div>
      </div>
    </article>
  )
}

export default ReportMessageRow
