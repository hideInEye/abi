import { FileSearchOutlined } from '@ant-design/icons'
import { Alert, Tag } from 'antd'
import dayjs from 'dayjs'
import React from 'react'

import ReportFileCard from './ReportFileCard'
import ReportThinkingPanel from './ReportThinkingPanel'
import ReportTodoList from './ReportTodoList'
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
      return { color: 'processing', text: '正在提交' }
    case 'waiting_stream':
      return { color: 'processing', text: '等待执行' }
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
          <ReportTodoList report={report} onToggleTodo={onToggleTodo} onToggleTask={onToggleTask} />

          {report.final && <div className={styles.finalSummary}>{report.final.content}</div>}

          {report.storageWarning && (
            <div className={styles.inlineAlert}>
              <Alert type="warning" showIcon message="本地恢复记录保存失败" description={report.storageWarning} />
            </div>
          )}

          {latestWarning && !report.error && (
            <div className={styles.inlineAlert}>
              <Alert type="warning" showIcon message="报告事件提示" description={latestWarning} />
            </div>
          )}

          {report.error && (
            <div className={styles.inlineAlert}>
              <Alert type="error" showIcon message={report.error.message} description={report.error.code} />
            </div>
          )}

          <ReportFileCard report={report} onOpen={onOpenReport} />
        </div>
      </div>
    </article>
  )
}

export default ReportMessageRow
