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
})
