/**
 * Node 服务只关心 Redis Stream 的传输结构，不声明或解析报告业务事件。
 * data 中的 JSON 协议完全由前端 Hook 负责解释。
 */
export type RedisStreamEntry = {
  id: string
  message: Record<string, string | Buffer | null | undefined>
}
