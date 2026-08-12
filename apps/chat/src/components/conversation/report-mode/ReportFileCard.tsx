import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import React from 'react'

import { canRevealReport, getReportDownloadOptions, getReportTitle } from './helpers'
import type { ReportDownloadOption } from './helpers'
import type { ReportItem } from './types'
import styles from './styles.module.css'

interface ReportFileCardProps {
  report: ReportItem
  onOpen: () => void
}

const ReportAssetIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7.5 3.75h6.7l4.3 4.3v11.2a1.5 1.5 0 0 1-1.5 1.5H7.5A1.5 1.5 0 0 1 6 19.25v-14a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M14 3.9v4.6h4.45M9 12h6M9 15.5h6" />
  </svg>
)

const PreviewIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.6 12s3.1-5 8.4-5 8.4 5 8.4 5-3.1 5-8.4 5-8.4-5-8.4-5Z" />
    <circle cx="12" cy="12" r="2.35" />
  </svg>
)

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 4.25v10.1m-3.5-3.2 3.5 3.5 3.5-3.5M5 18.25v1.5h14v-1.5" />
  </svg>
)

function downloadReport(option: ReportDownloadOption) {
  const anchor = document.createElement('a')
  anchor.style.display = 'none'
  anchor.download = option.fileName

  if (option.kind === 'url' && option.url) {
    anchor.href = option.url
    // 跨域地址可能忽略 download 属性；新窗口兜底可避免报告链接替换当前会话页面。
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    return
  }

  if (option.kind === 'content' && option.content !== undefined) {
    const url = URL.createObjectURL(new Blob([option.content], { type: option.mimeType }))
    anchor.href = url
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }
}

const ReportFileCard: React.FC<ReportFileCardProps> = ({ report, onOpen }) => {
  // 报告正文或附件可以提前到达，但资产卡只能在整体完成且所有 ToDo 结束后出现。
  if (!canRevealReport(report)) return null

  const downloadOptions = getReportDownloadOptions(report.reportCandidate, report.reportAttachments)
  if (downloadOptions.length === 0) return null

  const title = getReportTitle(report.reportCandidate)
  const formats = downloadOptions.map((option) => option.label)
  const menuItems: MenuProps['items'] = downloadOptions.map((option) => ({
    key: option.key,
    label: `${option.label} 文件`,
  }))
  const description = report.reportCandidate
    ? downloadOptions.length > 1
      ? '报告已生成，可在线预览并下载所需格式。'
      : '报告已生成，可在线预览或下载。'
    : '报告已生成，可选择已有格式下载查看。'

  return (
    <div className={styles.fileCard}>
      <div className={styles.fileCardContent}>
        <span className={styles.fileAssetIcon}>
          <ReportAssetIcon />
        </span>
        <div className={styles.fileInfo}>
          <div className={styles.fileFormatList} aria-label={`可用格式：${formats.join('、')}`}>
            {formats.map((format) => (
              <span key={format} className={styles.fileTypeTag}>{format}</span>
            ))}
          </div>
          <div className={styles.fileTitle}>{title}</div>
          <div className={styles.fileDesc}>{description}</div>
        </div>
      </div>
      <div className={styles.fileActions}>
        {report.reportCandidate && (
          <button type="button" className={`${styles.fileActionButton} ${styles.fileActionPrimary}`} title="查看报告" aria-label="查看报告" onClick={onOpen}>
            <PreviewIcon />
          </button>
        )}
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: menuItems,
            onClick: ({ key }) => {
              const option = downloadOptions.find((item) => item.key === key)
              if (option) downloadReport(option)
            },
          }}
        >
          <button type="button" className={styles.fileActionButton} title="下载报告" aria-label="下载报告" aria-haspopup="menu">
            <DownloadIcon />
          </button>
        </Dropdown>
      </div>
    </div>
  )
}

export default ReportFileCard
