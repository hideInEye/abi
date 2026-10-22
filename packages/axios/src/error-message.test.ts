import { describe, expect, it } from 'vitest'

import { resolveBackendErrorMessage } from './error-message'

const RAW_MYBATIS_MSG =
  "### Error querying database. Cause: java.sql.SQLSyntaxErrorException: Unknown column 'user_id' in 'field list' ### The error may exist in class path resource [mapper/system/TbiUserFavoriteMapper.xml] ### SQL: select user_id, favor_type, favor_id from tbi_user_favorite WHERE user_id = ? and favor_type = ? ### Cause: java.sql.SQLSyntaxErrorException: Unknown column 'user_id' in 'field list'; bad SQL grammar []"

describe('resolveBackendErrorMessage', () => {
  it('summarizes leaked raw exception text by the error enum value', () => {
    expect(resolveBackendErrorMessage({ code: 500, msg: RAW_MYBATIS_MSG })).toBe('服务器内部错误，请稍后再试')
    expect(resolveBackendErrorMessage({ code: 500, message: 'Caused by: java.lang.NullPointerException at com.x.y.Z(Z.java:1)' })).toBe('服务器内部错误，请稍后再试')
  })

  it('keeps safe summarized backend descriptions', () => {
    expect(resolveBackendErrorMessage({ code: 500, msg: '分组名称已存在' })).toBe('分组名称已存在')
    expect(resolveBackendErrorMessage({ code: 401, message: '登录已过期' })).toBe('登录已过期')
  })

  it('falls back to the enum description when the description is missing', () => {
    expect(resolveBackendErrorMessage({ code: 404 })).toBe('请求的资源不存在')
    expect(resolveBackendErrorMessage({ code: '503' })).toBe('服务不可用，请稍后再试')
    expect(resolveBackendErrorMessage({ code: 500, msg: '   ' })).toBe('服务器内部错误，请稍后再试')
  })

  it('falls back to the default or custom fallback for unknown enums', () => {
    expect(resolveBackendErrorMessage({ code: 40001, msg: RAW_MYBATIS_MSG })).toBe('请求失败，请稍后重试')
    expect(resolveBackendErrorMessage(null)).toBe('请求失败，请稍后重试')
    expect(resolveBackendErrorMessage({ code: 40001, msg: RAW_MYBATIS_MSG }, '收藏失败，请稍后再试')).toBe('收藏失败，请稍后再试')
  })

  it('treats over-long text as unsummarized exception output', () => {
    const longMsg = '操作失败'.repeat(60)
    expect(resolveBackendErrorMessage({ code: 500, msg: longMsg })).toBe('服务器内部错误，请稍后再试')
    expect(resolveBackendErrorMessage({ msg: longMsg })).toBe('请求失败，请稍后重试')
  })
})
