import { describe, expect, it } from 'vitest'

import {
  buildMappedBizName,
  buildMappedTechName,
  getMappedBizNameDisplay,
  getMappedBizNameParts,
  getMappedTechNameDisplay,
  isOntologyNameCheckPassed,
  restoreMappedBizName,
  restoreMappedTechName,
  validateCustomBizNameText,
  validateCustomTechNameText
} from './ontologyName'

describe('ontologyName', () => {
  it('splits mapped business and technical names for display', () => {
    expect(getMappedBizNameDisplay('交易明细表_#收货城市')).toBe('收货城市')
    expect(getMappedBizNameDisplay('交易明细表_#_收货城市')).toBe('收货城市')
    expect(getMappedBizNameDisplay('交易明细表_ # _收货城市')).toBe('收货城市')
    expect(getMappedTechNameDisplay('trade_detail.receive_city')).toBe('receive_city')
    expect(getMappedBizNameParts('交易明细表_#_收货城市').tableName).toBe('交易明细表')
  })

  it('builds and restores mapped names', () => {
    expect(buildMappedBizName('交易明细表', '收货城市')).toBe('交易明细表_#_收货城市')
    expect(buildMappedTechName('trade_detail', 'receive_city')).toBe('trade_detail.receive_city')
    expect(restoreMappedBizName('收货城市2', '交易明细表')).toBe('交易明细表_#_收货城市2')
    expect(restoreMappedTechName('receive_city2', 'trade_detail')).toBe('trade_detail.receive_city2')
  })

  it('validates custom form names without mapping separators or invalid underscores', () => {
    expect(validateCustomBizNameText('交易明细表_#收货城市', '中文名')).toBe('中文名不能包含_#_')
    expect(validateCustomBizNameText('交易明细表_#_收货城市', '中文名')).toBe('中文名不能包含_#_')
    expect(validateCustomBizNameText('交易明细表_ # _收货城市', '中文名')).toBe('中文名不能包含_#_')
    expect(validateCustomTechNameText('receive_city', '英文名')).toBe('')
    expect(validateCustomTechNameText('_receive_city', '英文名')).toContain('仅支持字母')
    expect(validateCustomTechNameText('receive__city', '英文名')).toContain('仅支持字母')
    expect(validateCustomTechNameText('receive_city1', '英文名')).toContain('仅支持字母')
  })

  it('normalizes checkName response shapes', () => {
    expect(isOntologyNameCheckPassed({ response: { data: { data: false } } })).toBe(true)
    expect(isOntologyNameCheckPassed({ response: { data: { data: true } } })).toBe(false)
    expect(isOntologyNameCheckPassed({ data: true, response: { data: { data: false } } })).toBe(true)
    expect(isOntologyNameCheckPassed({ data: { available: false } })).toBe(false)
    expect(isOntologyNameCheckPassed({ data: { exists: true } })).toBe(false)
    expect(isOntologyNameCheckPassed({ response: { data: { success: true } } })).toBe(true)
  })
})
