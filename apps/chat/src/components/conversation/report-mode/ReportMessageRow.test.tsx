import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ReportMessageRow from './ReportMessageRow'
import { createInitialReportStreamState } from './reportStreamReducer'
import type { ReportItem } from './types'

function createReport(overrides: Partial<ReportItem> = {}): ReportItem {
  return {
    ...createInitialReportStreamState(),
    id: 'report-1',
    question: '生成订单报告',
    sortOrder: 1,
    createdAt: 1,
    source: 'history',
    ...overrides,
  }
}

describe('ReportMessageRow', () => {
  it('在报告回答标题右侧展示统一格式的完成耗时', () => {
    const markup = renderToStaticMarkup(
      <ReportMessageRow
        report={createReport({
          status: 'completed',
          durationSeconds: 125,
        })}
        onToggleThinking={() => undefined}
        onToggleTodo={() => undefined}
        onToggleTask={() => undefined}
        onOpenReport={() => undefined}
      />,
    )

    expect(markup).toContain('耗时2分5秒')
  })

  it('无最终报告时保留真实 final_content，但不展示报告文件卡', () => {
    const task = { content: '生成报告', status: 'cancelled' as const }
    const markup = renderToStaticMarkup(
      <ReportMessageRow
        report={createReport({
          status: 'failed',
          thinkingCompleted: true,
          currentPlan: { entryId: 'history:1:plan', tasks: [task] },
          tasks: [task],
          final: { entryId: 'history:1:final', content: '大模型对话生成错误!(Connection error.)' },
          error: { code: 'report_content_missing', message: '未收到报告文件' },
        })}
        onToggleThinking={() => undefined}
        onToggleTodo={() => undefined}
        onToggleTask={() => undefined}
        onOpenReport={() => undefined}
      />,
    )

    expect(markup).toContain('大模型对话生成错误!(Connection error.)')
    expect(markup).not.toContain('查看报告')
    expect(markup).not.toContain('下载报告')
  })
})
