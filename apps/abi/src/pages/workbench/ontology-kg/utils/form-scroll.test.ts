import { describe, expect, it } from 'vitest'

import { getFirstErrorFieldName } from './form-scroll'

describe('form-scroll', () => {
  it('returns the first array name from antd validation errors', () => {
    expect(
      getFirstErrorFieldName({
        errorFields: [
          { name: ['semanticSchemaId'] },
          { name: ['bizName'] },
        ],
      })
    ).toEqual(['semanticSchemaId'])
  })

  it('returns a string name from antd validation errors', () => {
    expect(
      getFirstErrorFieldName({
        errorFields: [
          { name: 'bizName' },
        ],
      })
    ).toBe('bizName')
  })

  it('returns undefined when validation error has no field name', () => {
    expect(getFirstErrorFieldName({ errorFields: [] })).toBeUndefined()
    expect(getFirstErrorFieldName(new Error('network error'))).toBeUndefined()
  })
})
