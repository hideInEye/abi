import { setTimeout as delay } from 'node:timers/promises'

import { config } from '../src/config.js'
import { connectRedisClient, createRedisClient, disconnectRedisClient } from '../src/services/redis.js'
import { assertAllowedReportStreamKey } from '../src/utils/streamKey.js'

/** Mock 脚本只负责写入 JSON 字符串；这些结构不会被 Node server 解析。 */
type MockReportEvent = {
  type: string
  [key: string]: unknown
}

/** 极简 CLI 参数解析，避免为本地联调额外引入命令行依赖。 */
function parseArgs(argv: string[]) {
  const result: Record<string, string> = {}

  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      continue
    }

    const [key, ...valueParts] = arg.slice(2).split('=')
    result[key] = valueParts.join('=')
  }

  return result
}

const args = parseArgs(process.argv.slice(2))
const streamKey = args.stream_key
const delayMs = Number(args.delay_ms || 500)

if (!streamKey) {
  console.error('Usage: pnpm --filter report-stream-server mock:report -- --stream_key=report:<conv_id>:<round>')
  process.exit(1)
}

if (!Number.isFinite(delayMs) || delayMs < 0) {
  console.error('delay_ms must be a non-negative number')
  process.exit(1)
}

// Mock 同样执行前缀校验，防止本地测试误写到非报告业务 key。
assertAllowedReportStreamKey(streamKey, config.reportStreamPrefix)

/**
 * 模拟真实链路：顶部思考 -> 计划 -> 每个 ToDo 的执行记录 -> HTML 报告 -> done。
 * 特意让 meta/chunk/done 只携带 id，帮助前端验证不能依赖 step 作为时序或关联依据。
 */
const events: MockReportEvent[] = [
  {
    type: 'question',
    content: '分析 Walmart 销售数据并生成网页报告',
  },
  {
    type: 'step.start',
    step: 1,
    id: 'step-1',
    title: '思考中',
  },
  {
    type: 'step.start',
    step: 0,
    id: 'step-1',
    title: '加载销售分析 Skill',
    detail: 'load_skill',
  },
  {
    type: 'step.meta',
    id: 'step-1',
    action: 'load_skill',
    action_intention: '读取分析规则和输出规范',
  },
  {
    type: 'step.chunk',
    id: 'step-1',
    output_type: 'text',
    content: '销售分析 Skill 已加载',
  },
  {
    type: 'step.done',
    id: 'step-1',
    status: 'done',
  },
  {
    type: 'plan.update',
    version: 1,
    tasks: [
      { content: '加载并检查销售数据', status: 'in_progress', priority: 'high' },
      { content: '分析销售趋势', status: 'pending', priority: 'high' },
      { content: '生成 HTML 报告', status: 'pending', priority: 'high' },
    ],
  },
  {
    type: 'step.start',
    step: 2,
    id: 'step-2',
    title: '检查销售数据',
    detail: 'code_interpreter',
  },
  {
    type: 'step.meta',
    id: 'step-2',
    action: 'code_interpreter',
    action_intention: '读取字段并完成基础清洗',
  },
  {
    type: 'step.chunk',
    id: 'step-2',
    output_type: 'text',
    content: '已读取 6,435 条销售记录',
  },
  {
    type: 'step.done',
    id: 'step-2',
    status: 'done',
  },
  {
    type: 'plan.update',
    version: 2,
    tasks: [
      { content: '加载并检查销售数据', status: 'completed', priority: 'high' },
      { content: '分析销售趋势', status: 'in_progress', priority: 'high' },
      { content: '生成 HTML 报告', status: 'pending', priority: 'high' },
    ],
  },
  {
    type: 'step.start',
    step: 3,
    id: 'step-3',
    title: '分析销售趋势',
    detail: 'code_interpreter',
  },
  {
    type: 'step.chunk',
    id: 'step-3',
    output_type: 'text',
    content: '已完成门店、节假日和周度趋势分析',
  },
  {
    type: 'step.done',
    id: 'step-3',
    status: 'done',
  },
  {
    type: 'plan.update',
    version: 3,
    tasks: [
      { content: '加载并检查销售数据', status: 'completed', priority: 'high' },
      { content: '分析销售趋势', status: 'completed', priority: 'high' },
      { content: '生成 HTML 报告', status: 'in_progress', priority: 'high' },
    ],
  },
  {
    type: 'step.start',
    step: 4,
    id: 'step-4',
    title: '生成 HTML 报告',
    detail: 'html_interpreter',
  },
  {
    type: 'step.chunk',
    id: 'step-4',
    output_type: 'html',
    content: '<!doctype html><html><head><meta charset="utf-8"><title>销售分析报告</title></head><body><h1>Walmart 销售分析报告</h1><p>报告 Mock 内容</p></body></html>',
  },
  {
    type: 'step.done',
    id: 'step-4',
    status: 'done',
  },
  {
    type: 'plan.update',
    source: 'complete',
    version: 4,
    tasks: [
      { content: '加载并检查销售数据', status: 'completed', priority: 'high' },
      { content: '分析销售趋势', status: 'completed', priority: 'high' },
      { content: '生成 HTML 报告', status: 'completed', priority: 'high' },
    ],
  },
  {
    type: 'final',
    content: '销售分析报告已生成',
  },
  {
    type: 'done',
  },
]

async function main() {
  const client = createRedisClient(config.redisUrl, {
    password: config.redisPassword,
    database: config.redisDb,
  })

  await connectRedisClient(client)

  try {
    for (const event of events) {
      const id = await client.xAdd(
        streamKey,
        '*',
        {
          data: JSON.stringify(event),
        },
        {
          // 近似裁剪用于限制本地联调数据量，不影响事件写入顺序。
          TRIM: {
            strategy: 'MAXLEN',
            strategyModifier: '~',
            threshold: config.reportStreamMaxLen,
          },
        },
      )

      console.log(`[mock-report-stream] wrote ${event.type} ${id}`)
      await delay(delayMs)
    }
  } finally {
    await disconnectRedisClient(client)
  }
}

main().catch(error => {
  console.error('[mock-report-stream] failed', error)
  process.exit(1)
})
