import { describe, expect, it } from 'vitest'

import { normalizeModels } from './chatBootstrapModels'

const buildRow = (overrides: Record<string, unknown> = {}) => ({
  modelId: 1,
  modelKey: 'gpt-4o',
  modelName: 'GPT-4o',
  status: '1',
  modelType: '1',
  ...overrides,
})

describe('normalizeModels', () => {
  it('透传 isMultimodal（1 / 0 / "1"）', () => {
    const result = normalizeModels({
      data: {
        data: [
          buildRow({ modelId: 1, isMultimodal: 1 }),
          buildRow({ modelId: 2, isMultimodal: 0 }),
          buildRow({ modelId: 3, isMultimodal: '1' }),
        ],
      },
    })
    expect(result.options.map(option => option.isMultimodal)).toEqual([1, 0, '1'])
  })

  it('字段缺失时 isMultimodal 为 undefined', () => {
    const result = normalizeModels({ data: { data: [buildRow()] } })
    expect(result.options[0].isMultimodal).toBeUndefined()
  })

  it('沿用既有过滤与默认模型规则', () => {
    const result = normalizeModels({
      data: {
        data: [
          buildRow({ modelId: 1, isMultimodal: 1 }),
          buildRow({ modelId: 2, status: '0', isMultimodal: 1 }),
          buildRow({ modelId: 3, modelType: '2', isMultimodal: 1 }),
          buildRow({ modelId: 4, isMultimodal: 0, isDefault: 1 }),
        ],
      },
    })
    expect(result.options.map(option => option.id)).toEqual([1, 4])
    expect(result.currentModel?.id).toBe(4)
  })

  it('bge-large 作为嵌入模型提取 embedModelId（不受过滤影响）', () => {
    const result = normalizeModels({
      data: { data: [buildRow({ modelId: 9, modelKey: 'bge-large', status: '0' })] },
    })
    expect(result.embedModelId).toBe(9)
    expect(result.options).toEqual([])
  })

  it('兼容 data.data 与 data 两种响应形状，空响应返回空结果', () => {
    const nested = normalizeModels({ data: { data: [buildRow({ modelId: 5 })] } })
    const flat = normalizeModels({ data: [buildRow({ modelId: 5 })] })
    expect(nested.options[0].id).toBe(5)
    expect(flat.options[0].id).toBe(5)

    const empty = normalizeModels(null)
    expect(empty.options).toEqual([])
    expect(empty.currentModel).toBeNull()
    expect(empty.embedModelId).toBe('')
  })
})
