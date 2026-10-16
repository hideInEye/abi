import { CheckCircleOutlined, CloseCircleOutlined, CompassOutlined, FileTextOutlined, StepBackwardOutlined, StepForwardOutlined } from '@ant-design/icons'
import { Button, Dropdown, Empty } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { getToolLabel } from './v2/displayModel'

import { EXPORT_MENU_ITEMS, downloadExploreExport, isStructuredOutput, type ExploreExportFormat } from './exploreExport'
import ExploreRichText from './ExploreRichText'
import type { ExploreItem, ExploreStep, ExploreStepOutput } from './types'
import styles from './styles.module.css'

export interface ExplorePreviewScreen {
  key: string
  kind: 'step' | 'final'
  title: string
  stepId?: string
}

/** 每个有结构化结果的步骤一屏，最终结论与摘要合并为最后一屏。 */
export function buildPreviewScreens(item: ExploreItem): ExplorePreviewScreen[] {
  const screens: ExplorePreviewScreen[] = item.steps
    .filter((step) => step.outputs.some(isStructuredOutput))
    .map((step) => ({ key: `step:${step.id}`, kind: 'step', stepId: step.id, title: getToolLabel(step) }))
  if (item.finalContent || item.summary) screens.push({ key: 'final', kind: 'final', title: '最终结论' })
  return screens
}

function resolveScreenIndex(stepId: string | undefined, screens: ExplorePreviewScreen[]): number | 'latest' {
  const position = stepId ? screens.findIndex((screen) => screen.stepId === stepId) : -1
  return position >= 0 ? position : 'latest'
}

interface ExplorePreviewPaneProps {
  item: ExploreItem
  onClose: () => void
  /** 分屏动画期间冻结的面板宽度（px）：使内部布局不随壳宽逐帧变化，动画结束后为 undefined 恢复自适应。 */
  frozenWidth?: number
  /** 外部定位到的步骤；undefined 表示跟随最新屏。 */
  activeStepId?: string
  /** 工具栏切换屏时回传当前屏绑定的步骤，供左侧过程定位。 */
  onScreenChange?: (stepId: string | undefined) => void
}

/** 参考产品图绘制的双栏收起图标；路径使用 currentColor 以复用按钮交互色。 */
export const CollapseIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" width={20} height={20} fill="none" aria-hidden="true" focusable="false">
    <path d="M11.5 3.5v5h5M8.5 16.5v-5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function getStatusTag(status: ExploreItem['status']) {
  switch (status) {
    case 'running':
      return { cls: styles.statusTagRunning, text: '执行中' }
    case 'completed':
      return { cls: styles.statusTagCompleted, text: '已完成' }
    case 'failed':
      return { cls: styles.statusTagFailed, text: '失败' }
    case 'cancelled':
      return { cls: styles.statusTagCancelled, text: '已取消' }
    default:
      return { cls: styles.statusTagCancelled, text: status }
  }
}

function renderStructuredOutput(output: ExploreStepOutput, index: number) {
  const content = output.content
  if (output.outputType === 'image' && typeof content === 'string') {
    return <img key={index} src={content} alt="步骤输出" className={styles.mediaImage} />
  }
  if ((output.outputType === 'pdf' || output.outputType === 'word') && typeof content === 'string') {
    return (
      <a key={index} href={content} target="_blank" rel="noreferrer" className={styles.fileLink}>
        打开{output.outputType === 'pdf' ? ' PDF' : ' Word'} 文件
      </a>
    )
  }
  if (output.outputType === 'json' || (typeof content === 'object' && content !== null)) {
    return <ExploreRichText key={index} text={`\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n`} />
  }
  if (typeof content === 'string') {
    return <ExploreRichText key={index} text={content} tablesOnly />
  }
  return null
}

/** 分栏只展示结构化数据，不展示技能名称与执行过程信息。 */
const StepResult: React.FC<{ step: ExploreStep }> = ({ step }) => {
  const structuredOutputs = step.outputs.filter(isStructuredOutput)
  if (structuredOutputs.length === 0) return null
  return (
    <div className={styles.stepResult}>
      <div className={styles.stepResultBody}>{structuredOutputs.map(renderStructuredOutput)}</div>
    </div>
  )
}

/** 探索结果全高工作室：按步骤分屏展示执行数据，工具栏左右切换并联动左侧过程定位。 */
const ExplorePreviewPane: React.FC<ExplorePreviewPaneProps> = ({ item, onClose, frozenWidth, activeStepId, onScreenChange }) => {
  const statusTag = getStatusTag(item.status)
  const screens = useMemo(() => buildPreviewScreens(item), [item])
  const [index, setIndex] = useState<number | 'latest'>(() => resolveScreenIndex(activeStepId, screens))
  useEffect(() => {
    setIndex(resolveScreenIndex(activeStepId, screens))
  }, [activeStepId, screens])
  const current = Math.min(index === 'latest' ? screens.length - 1 : index, Math.max(0, screens.length - 1))
  const screen = screens[current]
  const currentStep = screen?.kind === 'step' ? item.steps.find((step) => step.id === screen.stepId) : undefined
  const screenChangeRef = useRef(onScreenChange)
  screenChangeRef.current = onScreenChange
  useEffect(() => {
    screenChangeRef.current?.(screens[current]?.stepId)
  }, [current, screens])
  const hasResult = screens.length > 0
  const running = item.status === 'running'

  return (
    <aside className={styles.pane} style={frozenWidth ? { width: frozenWidth } : undefined}>
      <div className={styles.paneHeader}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.paneTitle}>
            <CompassOutlined />
            <span className={styles.paneTitleText}>工作室</span>
            {running && <span className={styles.statusDot} />}
          </div>
          <div className={styles.paneMeta}>
            <span className={`${styles.statusTag} ${statusTag.cls}`}>{statusTag.text}</span>
            {item.finishReason === 'success' && <span className={`${styles.statusTag} ${styles.statusTagSuccess}`}><CheckCircleOutlined /> 成功</span>}
            <span className={styles.paneQuestion} title={item.question}>{item.question}</span>
          </div>
        </div>
        <div className={styles.paneHeaderActions}>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            disabled={!hasResult}
            menu={{
              items: EXPORT_MENU_ITEMS,
              onClick: ({ key }) => downloadExploreExport(item, key as ExploreExportFormat),
            }}
          >
            <Button
              type="text"
              className={styles.paneCloseButton}
              icon={<FileTextOutlined />}
              title="保存为文档"
              aria-label="保存为文档"
              aria-haspopup="menu"
              disabled={!hasResult}
            />
          </Dropdown>
          <Button
            type="text"
            className={styles.paneCloseButton}
            icon={<CollapseIcon />}
            title="收起结果"
            aria-label="收起结果"
            onClick={onClose}
          />
        </div>
      </div>

      <div className={styles.paneBody}>
        {!hasResult ? (
          <Empty className={styles.paneEmpty} image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无执行结果" />
        ) : (
          <>
            {currentStep && <StepResult step={currentStep} />}

            {screen?.kind === 'final' && item.finalContent && (
              <div className={styles.paneSection}>
                <div className={styles.paneSectionTitle}>
                  <CheckCircleOutlined /> 最终结论
                </div>
                <div className={styles.finalBlock}>
                  <ExploreRichText text={item.finalContent} />
                </div>
              </div>
            )}

            {screen?.kind === 'final' && item.summary && (
              <div className={styles.paneSection}>
                <div className={styles.paneSectionTitle}>执行摘要</div>
                <div className={styles.summaryBlock}>
                  <ExploreRichText text={item.summary} />
                </div>
              </div>
            )}
          </>
        )}

        {item.error && (
          <div className={styles.paneSection}>
            <div className={styles.summaryBlock}>
              <CloseCircleOutlined style={{ color: 'var(--danger, #ef4444)', marginRight: 6 }} />
              {item.error.message}
            </div>
          </div>
        )}
      </div>

      {hasResult && (
        <div className={styles.paneToolbar}>
          <div className={styles.paneStepNav}>
            <button type="button" className={styles.paneToolbarButton} aria-label="上一步" disabled={current <= 0}
              onClick={() => setIndex(current - 1)}>
              <StepBackwardOutlined />
            </button>
            <button type="button" className={styles.paneToolbarButton} aria-label="下一步" disabled={current >= screens.length - 1}
              onClick={() => setIndex(current + 1 >= screens.length - 1 ? 'latest' : current + 1)}>
              <StepForwardOutlined />
            </button>
          </div>
          {/* 步骤条：轨道按屏数等分，填充到当前屏，圆点标记进度头，每段可点击直接跳到对应结果 */}
          <div className={styles.paneStepTrack} role="group" aria-label="结果步骤进度">
            {screens.map((entry, position) => (
              <button
                key={entry.key}
                type="button"
                className={`${styles.paneStepSegment} ${position < current ? styles.paneStepSegmentDone : ''} ${position === current ? styles.paneStepSegmentCurrent : ''}`}
                aria-label={`第 ${position + 1} 屏，共 ${screens.length} 屏：${entry.title}`}
                aria-current={position === current ? 'step' : undefined}
                onClick={() => setIndex(position >= screens.length - 1 ? 'latest' : position)}
              />
            ))}
            <span
              className={styles.paneStepThumb}
              style={{ left: `${((current + 1) / screens.length) * 100}%` }}
              aria-hidden="true"
            />
          </div>
          <span className={styles.paneToolbarTitle} title={screen?.title}>{screen?.title}</span>
          {running && current < screens.length - 1 && (
            <button type="button" className={styles.paneJumpLatest} onClick={() => setIndex('latest')}>跳到最新</button>
          )}
          <span className={styles.paneToolbarIndicator}>{current + 1} / {screens.length}</span>
        </div>
      )}
    </aside>
  )
}

export default ExplorePreviewPane
