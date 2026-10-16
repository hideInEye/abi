import type { ExploreItem, ExploreStreamEvent, ExploreTask } from './types'

export function createReplayItem(): ExploreItem {
  return { id: 'explore-replay', question: '分析本年度销售额和订单量情况', sortOrder: 1, status: 'running', tasks: [], steps: [], createdAt: 0 }
}

const tasks: ExploreTask[] = [
  { todo_id: 'todo-sql', content: '生成销售额和订单量查询语句', status: 'in_progress' },
  { todo_id: 'todo-data', content: '执行查询获取销售数据', status: 'pending' },
  { todo_id: 'todo-summary', content: '分析数据并生成结论', status: 'pending' },
]

const summary = '### 结论\n全年销售额为 **120,000 元**，订单总量为 **80 单**。\n\n### 关键依据\n- 查询已返回年度汇总数据。\n- 平均客单价为 **1,500 元**。\n\n### 后续分析\n可继续按月份、品类和渠道分析。'

function thought(round: number, text: string): ExploreStreamEvent[] {
  return [
    { type: 'plan.thought.chunk', round, thinking_delta: `正在分析第 ${round} 轮任务。` },
    { type: 'plan.thought.chunk', round, thinking_delta: '结合已有结果确定下一步。' },
    { type: 'plan.thought.chunk', round, delta: text.slice(0, 5) },
    { type: 'plan.thought.chunk', round, delta: text.slice(5) },
  ]
}

function plan(version: number, active: number): ExploreStreamEvent {
  return { type: 'plan.update', version, tasks: tasks.map((task, index) => ({ ...task, status: index < active ? 'completed' : index === active ? 'in_progress' : 'pending' })) }
}

function step(index: number, action: string, text: string, content: string, input = '{}'): ExploreStreamEvent[] {
  const id = `step-${index + 1}`
  const todo_id = tasks[index].todo_id
  return [
    { type: 'step.start', id, todo_id, step: index + 1, title: action },
    { type: 'step.meta', id, todo_id, title: action, thought: text, action, action_input: input },
    { type: 'step.chunk', id, todo_id, output_type: index === 0 ? 'text' : 'markdown', content },
    { type: 'step.done', id, todo_id, status: 'done' },
  ]
}

/** 保留用户样例事件顺序，业务数值与标识已替换。 */
export function createExploreReplay(): ExploreStreamEvent[] {
  return [
    ...thought(1, '先规划任务步骤，再生成查询语句。'),
    { type: 'plan.thought', thought: '先规划任务步骤，再生成查询语句。', reasoning: '' },
    plan(1, 0),
    ...thought(2, '调用技能生成年度汇总查询。'),
    ...step(0, 'execute_skill_script_file', '调用技能生成年度汇总查询。', 'SELECT SUM(amount) AS 销售额, COUNT(*) AS 订单量 FROM sales;', '{"skill_name":"sql-generator","args":{"question":"查询年度销售额"}}'),
    ...thought(3, '查询语句已生成，接下来获取数据。'),
    { type: 'plan.thought', thought: '查询语句已生成，接下来获取数据。', reasoning: '' },
    plan(2, 1),
    ...thought(4, '执行查询获取年度销售数据。'),
    ...step(1, 'sql_query', '执行查询获取年度销售数据。\nSummarizes Step ID: \nPrevious Result Summary: 查询语句已就绪。', '| 销售额 | 订单量 |\n| --- | --- |\n| 120000 | 80 |', '{"sql":"SELECT SUM(amount), COUNT(*) FROM sales"}'),
    ...thought(5, '已获取销售汇总，准备进行分析。'),
    { type: 'plan.thought', thought: '已获取销售汇总，准备进行分析。', reasoning: '' },
    plan(3, 2),
    ...thought(6, '基于查询结果生成总结。'),
    ...step(2, 'generate_summary', '基于查询结果生成总结。\nSummarizes Step ID: step-2\nPrevious Result Summary: 销售额为 120000，订单量为 80。', summary),
    ...thought(7, '所有分析已完成，准备输出结论。'),
    { type: 'plan.thought', thought: '所有分析已完成，准备输出结论。', reasoning: '' },
    plan(4, 3),
    ...thought(8, '所有任务已完成。'),
    { type: 'final', content: '年度销售额 120000 元，订单量 80 单。', finish_reason: 'completed' },
    { type: 'summary', content: summary },
    { type: 'done', finish_reason: 'completed' },
  ]
}
