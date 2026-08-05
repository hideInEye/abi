import { describe, expect, it } from 'vitest'

import { hasSelectedConversationData } from './sendValidation'

describe('chat input send data validation', () => {
  it('没有选择数据语义或 Excel 时禁止发送', () => {
    expect(hasSelectedConversationData(null, null)).toBe(false)
    expect(hasSelectedConversationData({}, {})).toBe(false)
  })

  it('选择数据语义后允许发送', () => {
    expect(hasSelectedConversationData({ schemaId: 1001 }, null)).toBe(true)
  })

  it('上传 Excel 后允许发送', () => {
    expect(hasSelectedConversationData(null, { file_id: 'file-001' })).toBe(true)
  })
})
