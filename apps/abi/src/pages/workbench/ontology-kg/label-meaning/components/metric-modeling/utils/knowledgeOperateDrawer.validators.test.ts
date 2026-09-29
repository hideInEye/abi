import type { FormInstance } from 'antd'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkOntologyName } from '@/service/api/ontology-name'

import type { KnowledgeFormValues } from '../types/metricModeling.types'

import { createKnowledgeOperateValidators, validateKnowledgeIndicatorName } from './knowledgeOperateDrawer.validators'

vi.mock('@/service/api/ontology-name', () => ({ checkOntologyName: vi.fn() }))
vi.mock('@/service/request/flat-result', () => import('../../../../../../../service/request/flat-result'))
vi.mock('./space', () => ({ getKnowledgeSpaceId: () => 82 }))

const checkName = vi.mocked(checkOntologyName)
const form = {
  getFieldValue: (name: string) => (name === 'mappedBizNameTableName' ? '订单表' : undefined)
} as FormInstance<KnowledgeFormValues>

describe('metric name and business definition validation', () => {
  beforeEach(() => {
    checkName.mockReset()
    checkName.mockResolvedValue({ data: false, error: null } as never)
  })

  it.each([
    ['', '请输入指标名称'],
    ['  ', '请输入指标名称'],
    ['12345', '指标名称不能为纯数字'],
    ['指标-金额', '指标名称仅支持中文、英文、数字、下划线'],
    ['a'.repeat(51), '请输入合法的指标名称（1-50字符）'],
    ['订单_#_金额', '指标名称不能包含_#_']
  ])('rejects invalid mapped metric name %s before requesting uniqueness', async (value, message) => {
    await expect(validateKnowledgeIndicatorName(value, { groupId: 'group-1' })).rejects.toThrow(message)
    expect(checkName).not.toHaveBeenCalled()
  })

  it('checks the indicator name, not the source field name, for a mapping', async () => {
    await expect(validateKnowledgeIndicatorName(' 实付金额_1 ', { groupId: 'group-1' })).resolves.toBeUndefined()
    expect(checkName).toHaveBeenCalledWith({
      groupId: 'group-1',
      name: '实付金额_1',
      nameType: 'bizName',
      objectType: 'indicator',
      spaceId: 82
    })
  })

  it('preserves the mapped table prefix and unchanged-name exemption when editing', async () => {
    const validators = createKnowledgeOperateValidators({
      form,
      groupId: 'group-1',
      initialBizName: '订单表_#_实付金额'
    })
    await expect(validators.validateIndicatorName(undefined, '实付金额')).resolves.toBeUndefined()
    expect(checkName).not.toHaveBeenCalled()
    await expect(validators.validateIndicatorName(undefined, '退款金额')).resolves.toBeUndefined()
    expect(checkName).toHaveBeenCalledWith(expect.objectContaining({ name: '订单表_#_退款金额' }))
  })

  it('waits for the name check response and rejects duplicates', async () => {
    let finish!: (value: never) => void
    checkName.mockReturnValue(
      new Promise(resolve => {
        finish = resolve
      })
    )
    const settled = vi.fn()
    const validation = validateKnowledgeIndicatorName('实付金额', { groupId: 'group-1' })
    const observed = validation.then(settled, settled)
    await Promise.resolve()
    expect(settled).not.toHaveBeenCalled()
    finish({ data: true, error: null } as never)
    await expect(validation).rejects.toThrow('指标名称已存在')
    await observed
  })

  it('rejects fulfilled failures and transport errors from the name check', async () => {
    checkName.mockResolvedValueOnce({ data: false, error: new Error('检查失败') } as never)
    await expect(validateKnowledgeIndicatorName('实付金额', { groupId: 'group-1' })).rejects.toThrow('检查失败')
    checkName.mockRejectedValueOnce(new Error('网络异常'))
    await expect(validateKnowledgeIndicatorName('实付金额', { groupId: 'group-1' })).rejects.toThrow('网络异常')
  })

  it('allows an empty optional business definition but still validates nonempty text', async () => {
    const { validateBusinessRemark } = createKnowledgeOperateValidators({ businessDefinitionRequired: false, form })
    await expect(validateBusinessRemark(undefined, undefined)).resolves.toBeUndefined()
    await expect(validateBusinessRemark(undefined, '  ')).resolves.toBeUndefined()
    await expect(validateBusinessRemark(undefined, '简短描述')).rejects.toThrow('10-500字')
    await expect(validateBusinessRemark(undefined, 'payment_amount')).rejects.toThrow('不能仅填写字段名')
    await expect(validateBusinessRemark(undefined, '用于统计订单最终实际支付的金额')).resolves.toBeUndefined()
  })

  it('keeps business definition required by default for other scenarios', async () => {
    const { validateBusinessRemark } = createKnowledgeOperateValidators({ form })
    await expect(validateBusinessRemark(undefined, '')).rejects.toThrow('10-500字')
  })
})
