/** 系统级错误枚举值与归纳描述：后端异常细节只应留在服务器日志，前端按枚举值硬编码展示 */
const BACKEND_ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数有误，请检查后重试',
  403: '无权访问该资源',
  404: '请求的资源不存在',
  408: '请求超时，请稍后重试',
  500: '服务器内部错误，请稍后再试',
  502: '网关服务异常，请稍后再试',
  503: '服务不可用，请稍后再试',
  504: '网关超时，请稍后再试',
}

/** 原始异常文本特征：MyBatis/Java 堆栈/SQL 报错等只允许打印在服务器日志，泄漏到响应体时不得上屏 */
const RAW_EXCEPTION_PATTERN = /###|Exception|Caused by|stackTrace|SQL syntax|java\.sql|\bat (java|com|org|net)\./i

/** 归纳描述长度上限：超过即视为未归纳的异常原文，回退枚举文案 */
const MAX_SUMMARY_LENGTH = 200

export interface BackendErrorLike {
  code?: unknown
  msg?: unknown
  message?: unknown
}

/**
 * 统一解析展示用报错文案：优先后端归纳描述（msg/message）；
 * 描述缺失、命中原始异常特征或超长时，按错误枚举值（业务码或 HTTP 状态码）回退前端归纳文案
 */
export function resolveBackendErrorMessage(data: BackendErrorLike | null | undefined, fallback = '请求失败，请稍后重试'): string {
  const msg = typeof data?.msg === 'string' && data.msg.trim() ? data.msg.trim() : typeof data?.message === 'string' ? data.message.trim() : ''
  if (msg && msg.length <= MAX_SUMMARY_LENGTH && !RAW_EXCEPTION_PATTERN.test(msg)) return msg

  const code = Number(data?.code)
  const mapped = Number.isNaN(code) ? undefined : BACKEND_ERROR_MESSAGES[code]
  return mapped || fallback
}
