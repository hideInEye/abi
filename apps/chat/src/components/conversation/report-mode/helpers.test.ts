import { describe, expect, it } from 'vitest'

import { getCompletedTaskCount, getCurrentTaskTitle, getReportTitle, getTaskKey } from './helpers'

describe('report-mode UI helpers', () => {
  it('只把 completed 计入完成数量', () => {
    const tasks = [
      { content: '读取数据', status: 'completed' as const },
      { content: '生成报告', status: 'in_progress' as const },
      { content: '旧任务', status: 'cancelled' as const },
    ]

    expect(getCompletedTaskCount(tasks)).toBe(1)
    expect(getCurrentTaskTitle(tasks)).toBe('生成报告')
  })

  it('用 plan entry 和任务下标生成稳定展开 key', () => {
    expect(getTaskKey('1730000000000-0', 2)).toBe('1730000000000-0:2')
  })

  it('从 HTML 或 Markdown 中提取报告标题', () => {
    expect(getReportTitle({ format: 'html', content: '<html><head><title>销售报告</title></head></html>' })).toBe('销售报告')
    expect(getReportTitle({ format: 'markdown', content: '# 趋势分析\n内容' })).toBe('趋势分析')
  })
})
