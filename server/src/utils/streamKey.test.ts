import { describe, expect, it } from 'vitest'

import { assertAllowedReportStreamKey, parseReportStreamQuery, resolveLastId } from './streamKey.js'

describe('report stream query', () => {
  it('accepts the complete stream key returned by the report service', () => {
    expect(
      parseReportStreamQuery(
        {
          stream_key: 'report:bdbd546c-29c0-11f1-a433-0242c0a87002:1',
          last_id: '1730000000000-0',
        },
        'report',
      ),
    ).toEqual({
      streamKey: 'report:bdbd546c-29c0-11f1-a433-0242c0a87002:1',
      lastId: '1730000000000-0',
    })
  })

  it('supports a configured multi-part prefix and ignores its trailing colon', () => {
    expect(assertAllowedReportStreamKey('tabi:report:conv-A:1', 'tabi:report:')).toBe('tabi:report:conv-A:1')
  })

  it('rejects arbitrary Redis keys outside the configured prefix boundary', () => {
    expect(() => assertAllowedReportStreamKey('other:conv-A:1', 'report')).toThrow('stream_key')
    expect(() => assertAllowedReportStreamKey('report-evil:conv-A:1', 'report')).toThrow('stream_key')
    expect(() => assertAllowedReportStreamKey('report:', 'report')).toThrow('stream_key')
  })

  it('rejects missing keys, whitespace, arrays, and invalid last ids', () => {
    expect(() => parseReportStreamQuery({}, 'report')).toThrow('stream_key')
    expect(() => parseReportStreamQuery({ stream_key: ['report:conv-A:1'] }, 'report')).toThrow('stream_key')
    expect(() => parseReportStreamQuery({ stream_key: 'report:conv A:1' }, 'report')).toThrow('whitespace')
    expect(() => parseReportStreamQuery({ stream_key: 'report:conv-A:1', last_id: '$' }, 'report')).toThrow('last_id')
    expect(() => parseReportStreamQuery({ stream_key: 'report:conv-A:1', last_id: ['1-0'] }, 'report')).toThrow('last_id')
  })

  it('defaults missing last id to 0-0', () => {
    expect(resolveLastId()).toBe('0-0')
    expect(resolveLastId('1-0')).toBe('1-0')
  })
})
