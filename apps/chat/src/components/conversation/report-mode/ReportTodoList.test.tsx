import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ReportTodoList from './ReportTodoList'
import { createInitialReportStreamState } from './reportStreamReducer'
import type { ReportItem } from './types'

describe('ReportTodoList', () => {
  it('在执行子步骤之后展示对应 Todo 的阶段总结', () => {
    const report: ReportItem = {
      ...createInitialReportStreamState(),
      id: 'report-1',
      question: '生成订单分析报告',
      sortOrder: 1,
      createdAt: 1,
      source: 'task',
      status: 'running',
      thinkingCompleted: true,
      todoOpen: true,
      expandedTaskKeys: ['plan-1:0'],
      tasks: [{ content: '查询订单数据', status: 'in_progress' }],
      currentPlan: {
        entryId: 'plan-1',
        tasks: [{ content: '查询订单数据', status: 'in_progress' }],
      },
      stepsById: {
        'tool-step': {
          id: 'tool-step',
          title: 'execute_skill_script_file',
          actionIntention: '执行订单查询',
          status: 'done',
          chunks: [],
          firstEntryId: '2-0',
          lastEntryId: '3-0',
          entryIds: ['2-0', '3-0'],
          scope: 'todo',
          executionGroupKey: 'plan-1:0',
        },
        'todo-marker': {
          id: 'todo-marker',
          title: 'TODO::init:0/1',
          action: 'todowrite',
          status: 'done',
          chunks: [],
          firstEntryId: '4-0',
          lastEntryId: '5-0',
          entryIds: ['4-0', '5-0'],
          scope: 'todo',
          executionGroupKey: 'plan-1:0',
        },
      },
      stepOrder: ['tool-step', 'todo-marker'],
      executionGroups: [{ key: 'plan-1:0', planEntryId: 'plan-1', taskIndex: 0, taskContent: '查询订单数据', stepIds: ['tool-step', 'todo-marker'] }],
      todoSummaries: [{ entryId: '6-0', stepId: 'todo-marker', taskIndex: 0, taskContent: '查询订单数据', content: '查询已完成，数据可以用于后续分析。' }],
    }

    const html = renderToStaticMarkup(<ReportTodoList report={report} onToggleTodo={() => undefined} onToggleTask={() => undefined} />)

    expect(html).toContain('execute_skill_script_file')
    expect(html).not.toContain('TODO::init:0/1')
    expect(html).toContain('阶段总结')
    expect(html).toContain('查询已完成，数据可以用于后续分析。')
    expect(html.indexOf('execute_skill_script_file')).toBeLessThan(html.indexOf('阶段总结'))
  })

  it('普通 Todo 的执行步骤会展示 Skill 返回的 Markdown 说明', () => {
    const report: ReportItem = {
      ...createInitialReportStreamState(),
      id: 'report-skill-markdown',
      question: '分析订单数据',
      sortOrder: 1,
      createdAt: 1,
      source: 'history',
      status: 'failed',
      thinkingCompleted: true,
      todoOpen: true,
      expandedTaskKeys: ['plan-1:0'],
      tasks: [{ content: '加载 sql-generator 技能，获取技能说明', status: 'cancelled' }],
      currentPlan: {
        entryId: 'plan-1',
        tasks: [{ content: '加载 sql-generator 技能，获取技能说明', status: 'cancelled' }],
      },
      stepsById: {
        'step-3': {
          id: 'step-3',
          title: 'load_skill',
          action: 'load_skill',
          actionIntention: '加载 sql-generator 技能',
          status: 'done',
          chunks: [
            { entryId: '3-0:0', outputType: 'text', content: 'Skill: sql-generator' },
            { entryId: '3-0:1', outputType: 'text', content: 'sql-generator Skill has already been loaded.' },
            { entryId: '3-0:2', outputType: 'text', content: '---' },
            { entryId: '3-0:3', outputType: 'markdown', content: '# SQL 生成技能\n\n支持快速模式与完整模式。' },
          ],
          firstEntryId: '3-0',
          lastEntryId: '3-0',
          entryIds: ['3-0'],
          scope: 'todo',
          executionGroupKey: 'plan-1:0',
        },
      },
      stepOrder: ['step-3'],
      executionGroups: [{ key: 'plan-1:0', planEntryId: 'plan-1', taskIndex: 0, taskContent: '加载 sql-generator 技能，获取技能说明', stepIds: ['step-3'] }],
    }

    const html = renderToStaticMarkup(<ReportTodoList report={report} onToggleTodo={() => undefined} onToggleTask={() => undefined} />)

    expect(html).toContain('Skill: sql-generator')
    expect(html).toContain('sql-generator Skill has already been loaded.')
    expect(html).toContain('<hr')
    expect(html).toContain('SQL 生成技能')
    expect(html).toContain('支持快速模式与完整模式。')
  })

  it('同一步骤分片工具结果只展示拼接完成后的公开图片和文本', () => {
    const imageUrl = 'http://192.168.1.195:9000/messageimg/monthly_order_count_trend.png?X-Amz-Credential=test&X-Amz-Signature=complete'
    const payload = `${JSON.stringify({
      chunks: [
        { output_type: 'image', content: imageUrl, title: '月度订单数量趋势' },
        { output_type: 'text', content: '图表已生成：柱状图；选择原因：用户指定图表类型。' },
        { output_type: 'text', content: `已生成的图片URL：${imageUrl}`, emit_to_client: false },
      ],
      chart: { image_url: imageUrl },
    })}\n\n⚠️ Reminder: update todo list`
    const firstBreak = Math.floor(payload.length / 3)
    const secondBreak = Math.floor((payload.length * 2) / 3)
    const report: ReportItem = {
      ...createInitialReportStreamState(),
      id: 'report-split-tool-result',
      question: '生成月度订单图表',
      sortOrder: 1,
      createdAt: 1,
      source: 'task',
      status: 'running',
      thinkingCompleted: true,
      todoOpen: true,
      expandedTaskKeys: ['plan-1:0'],
      tasks: [{ content: '生成月度订单数量图表', status: 'in_progress' }],
      currentPlan: {
        entryId: 'plan-1',
        tasks: [{ content: '生成月度订单数量图表', status: 'in_progress' }],
      },
      stepsById: {
        'step-8': {
          id: 'step-8',
          title: 'generate_chart_image',
          actionIntention: '生成订单数量月度趋势图',
          status: 'done',
          chunks: [
            { entryId: '3-0', outputType: 'report_payload', content: payload.slice(0, firstBreak) },
            { entryId: '4-0', outputType: 'report_payload', content: payload.slice(firstBreak, secondBreak) },
            { entryId: '5-0', outputType: 'report_payload', content: payload.slice(secondBreak) },
          ],
          firstEntryId: '2-0',
          lastEntryId: '5-0',
          entryIds: ['2-0', '3-0', '4-0', '5-0'],
          scope: 'todo',
          executionGroupKey: 'plan-1:0',
        },
      },
      stepOrder: ['step-8'],
      executionGroups: [{ key: 'plan-1:0', planEntryId: 'plan-1', taskIndex: 0, taskContent: '生成月度订单数量图表', stepIds: ['step-8'] }],
    }

    const html = renderToStaticMarkup(<ReportTodoList report={report} onToggleTodo={() => undefined} onToggleTask={() => undefined} />)

    expect(html).toContain('<img')
    expect(html).toContain('alt="月度订单数量趋势"')
    expect(html).toContain('monthly_order_count_trend.png')
    expect(html).toContain('图表已生成：柱状图；选择原因：用户指定图表类型。')
    expect(html).not.toContain('{&quot;chunks&quot;')
    expect(html).not.toContain('已生成的图片URL')
    expect(html).not.toContain('Reminder')
  })

  it('报告生成 Todo 不在执行步骤中重复展示最终报告正文', () => {
    const report: ReportItem = {
      ...createInitialReportStreamState(),
      id: 'report-final-artifact',
      question: '生成订单报告',
      sortOrder: 1,
      createdAt: 1,
      source: 'history',
      status: 'completed',
      thinkingCompleted: true,
      todoOpen: true,
      expandedTaskKeys: ['plan-1:0'],
      tasks: [{ content: '生成最终 Markdown 报告', status: 'completed' }],
      currentPlan: {
        entryId: 'plan-1',
        tasks: [{ content: '生成最终 Markdown 报告', status: 'completed' }],
      },
      stepsById: {
        'step-report': {
          id: 'step-report',
          title: '生成报告文件',
          actionIntention: '整理最终结论',
          status: 'done',
          chunks: [
            { entryId: '4-0', outputType: 'text', content: '报告内容整理完成' },
            { entryId: '5-0', outputType: 'markdown', content: '# 不应在执行步骤重复出现的报告正文' },
          ],
          firstEntryId: '4-0',
          lastEntryId: '5-0',
          entryIds: ['4-0', '5-0'],
          scope: 'todo',
          executionGroupKey: 'plan-1:0',
        },
      },
      stepOrder: ['step-report'],
      executionGroups: [{ key: 'plan-1:0', planEntryId: 'plan-1', taskIndex: 0, taskContent: '生成最终 Markdown 报告', stepIds: ['step-report'] }],
      reportCandidate: { entryId: '5-0', stepId: 'step-report', format: 'markdown', content: '# 不应在执行步骤重复出现的报告正文' },
    }

    const html = renderToStaticMarkup(<ReportTodoList report={report} onToggleTodo={() => undefined} onToggleTask={() => undefined} />)

    expect(html).toContain('报告内容整理完成')
    expect(html).not.toContain('不应在执行步骤重复出现的报告正文')
  })

  it('将执行步骤 outputs 中的 GFM Markdown 表格渲染为表格元素', () => {
    const report: ReportItem = {
      ...createInitialReportStreamState(),
      id: 'report-markdown-table',
      question: '查询订单总金额',
      sortOrder: 1,
      createdAt: 1,
      source: 'history',
      status: 'completed',
      thinkingCompleted: true,
      todoOpen: true,
      expandedTaskKeys: ['plan-1:0'],
      tasks: [{ content: '执行 SQL 查询获取订单数据', status: 'completed' }],
      currentPlan: {
        entryId: 'plan-1',
        tasks: [{ content: '执行 SQL 查询获取订单数据', status: 'completed' }],
      },
      stepsById: {
        'step-6': {
          id: 'step-6',
          title: 'sql_query',
          action: 'sql_query',
          actionIntention: '执行 SQL 查询订单总金额',
          status: 'done',
          chunks: [
            {
              entryId: '6-0',
              outputType: 'markdown',
              content: '| 订单总金额 |\n| --- |\n| 18418447.91 |',
            },
          ],
          firstEntryId: '6-0',
          lastEntryId: '6-0',
          entryIds: ['6-0'],
          scope: 'todo',
          executionGroupKey: 'plan-1:0',
        },
      },
      stepOrder: ['step-6'],
      executionGroups: [{ key: 'plan-1:0', planEntryId: 'plan-1', taskIndex: 0, taskContent: '执行 SQL 查询获取订单数据', stepIds: ['step-6'] }],
    }

    const html = renderToStaticMarkup(<ReportTodoList report={report} onToggleTodo={() => undefined} onToggleTask={() => undefined} />)

    expect(html).toContain('<table>')
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
    expect(html).toContain('<th>订单总金额</th>')
    expect(html).toContain('<td>18418447.91</td>')
    expect(html).not.toContain('<p>| 订单总金额 |')
  })

  it('用无边框语义色块展示状态，并将等待执行图标和文案置灰', () => {
    const report: ReportItem = {
      ...createInitialReportStreamState(),
      id: 'report-status-tags',
      question: '生成报告',
      sortOrder: 1,
      createdAt: 1,
      source: 'task',
      status: 'running',
      thinkingCompleted: true,
      todoOpen: true,
      tasks: [
        { content: '等待执行的任务', status: 'pending' },
        { content: '正在执行的任务', status: 'in_progress' },
        { content: '已经完成的任务', status: 'completed' },
        { content: '执行失败的任务', status: 'failed' as ReportItem['tasks'][number]['status'] },
        { content: '已经取消的任务', status: 'cancelled' },
      ],
      currentPlan: {
        entryId: 'plan-status',
        tasks: [
          { content: '等待执行的任务', status: 'pending' },
          { content: '正在执行的任务', status: 'in_progress' },
          { content: '已经完成的任务', status: 'completed' },
          { content: '执行失败的任务', status: 'failed' as ReportItem['tasks'][number]['status'] },
          { content: '已经取消的任务', status: 'cancelled' },
        ],
      },
    }

    const html = renderToStaticMarkup(<ReportTodoList report={report} onToggleTodo={() => undefined} onToggleTask={() => undefined} />)

    expect(html).toMatch(/class="[^"]*todoStatusPending[^"]*" data-status="pending"/)
    expect(html).toMatch(/class="[^"]*todoStateTag[^"]*todoStatusPending[^"]*" data-status="pending">等待执行/)
    expect(html).toMatch(/class="[^"]*todoStateTag[^"]*todoStatusRunning[^"]*" data-status="in_progress">执行中/)
    expect(html).toMatch(/class="[^"]*todoStateTag[^"]*todoStatusDone[^"]*" data-status="completed">已完成/)
    expect(html).toMatch(/class="[^"]*todoStateTag[^"]*todoStatusFailed[^"]*" data-status="failed">失败/)
    expect(html).toMatch(/class="[^"]*todoStateTag[^"]*todoStatusSkipped[^"]*" data-status="cancelled">已取消/)
    expect(html).not.toContain('ant-tag')
  })

  it('仅在 Todo 总面板收起时显示当前步骤与调用技能', () => {
    const report: ReportItem = {
      ...createInitialReportStreamState(),
      id: 'report-collapsed-activity',
      question: '生成报告',
      sortOrder: 1,
      createdAt: 1,
      source: 'task',
      status: 'running',
      thinkingCompleted: true,
      todoOpen: false,
      tasks: [{ content: '生成订单查询 SQL', status: 'in_progress' }],
      currentPlan: {
        entryId: 'plan-activity',
        tasks: [{ content: '生成订单查询 SQL', status: 'in_progress' }],
      },
      stepsById: {
        'step-activity': {
          id: 'step-activity',
          title: 'execute_skill_script_file',
          action: 'execute_skill_script_file',
          actionIntention: '生成订单查询 SQL',
          status: 'in_progress',
          chunks: [{ entryId: '3-0', outputType: 'text', content: 'Skill: sql-generator' }],
          firstEntryId: '2-0',
          lastEntryId: '3-0',
          entryIds: ['2-0', '3-0'],
          scope: 'todo',
          executionGroupKey: 'plan-activity:0',
        },
      },
      stepOrder: ['step-activity'],
      executionGroups: [{ key: 'plan-activity:0', planEntryId: 'plan-activity', taskIndex: 0, taskContent: '生成订单查询 SQL', stepIds: ['step-activity'] }],
    }

    const collapsed = renderToStaticMarkup(<ReportTodoList report={report} onToggleTodo={() => undefined} onToggleTask={() => undefined} />)
    const expanded = renderToStaticMarkup(<ReportTodoList report={{ ...report, todoOpen: true }} onToggleTodo={() => undefined} onToggleTask={() => undefined} />)

    expect(collapsed).toContain('当前正在执行 生成订单查询 SQL 步骤，调用 sql-generator 技能')
    expect(collapsed).toContain('aria-live="polite"')
    expect(expanded).not.toContain('当前正在执行 生成订单查询 SQL 步骤，调用 sql-generator 技能')
  })
})
