/**
 * 分享页 API-Key 鉴权上下文。
 *
 * 第三方在平台「API Key」页创建密钥对（apiKey + secretKey）后，通过接入配置
 * （<abi-assistant api-key secret-key> 标签属性 / React props）注入；SDK 在挂载时
 * 写入本模块，分享页所有请求（裸 fetch、SSE、axios）统一附加 x-api-key 与 secrectKey 头。
 *
 * 头名与后端约定一致（secrectKey 为后端拼写，保持原样）。
 */
let shareApiKey = ''
let shareSecretKey = ''

/** 写入分享页密钥对；仅在传入非空值时覆盖，缺省时保持空串（不附加密钥头） */
export function setShareApiKey(apiKey?: string, secretKey?: string): void {
  const ak = String(apiKey || '').trim()
  const sk = String(secretKey || '').trim()
  if (ak) shareApiKey = ak
  if (sk) shareSecretKey = sk
}

/** 返回 x-api-key / secrectKey 头；密钥由接入配置注入，未注入时为空不附加 */
export function shareApiKeyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  if (shareApiKey) headers['x-api-key'] = shareApiKey
  if (shareSecretKey) headers['secrectKey'] = shareSecretKey
  return headers
}
