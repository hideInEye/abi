/**
 * 聊天引导模型映射：纯函数模块，勿引入运行时 @ 别名，便于 vitest 以相对路径直测。
 */

export interface BootstrapModelOption {
  desc: string
  id: string | number
  isDefault?: number | string
  isSupportThinking?: number | string
  /** 是否支持图片输入（多模态：1 为支持，0 为不支持） */
  isMultimodal?: number | string
  key: string
  label: string
}

export interface BootstrapModels {
  currentModel: BootstrapModelOption | null
  embedModelId: string | number
  options: BootstrapModelOption[]
}

export function normalizeModels(response: any): BootstrapModels {
  const rows = response?.data?.data || response?.data || []
  const list = Array.isArray(rows) ? rows : []
  const embedModel = list.find((item: any) => item.modelKey === 'bge-large')
  const options = list
    .filter((item: any) => String(item.status) === '1' && String(item.modelType) === '1')
    .map((item: any): BootstrapModelOption => ({
      id: item.modelId ?? item.id ?? item.llmId ?? '',
      key: item.modelKey || item.model_name || item.key || '',
      label: item.modelName || item.model_name || item.llmModel || item.label || '',
      desc: item.remark || item.description || item.desc || '',
      isDefault: item.isDefault,
      isSupportThinking: item.isSupportThinking,
      isMultimodal: item.isMultimodal,
    }))
  return {
    options,
    currentModel: options.find(option => option.isDefault === 1) || options[0] || null,
    embedModelId: embedModel?.modelId ?? embedModel?.id ?? embedModel?.llmId ?? '',
  }
}
