import { describe, expect, it } from 'vitest'

import { extractUniqueIds } from './knowledgeOperateDrawer.utils'

describe('extractUniqueIds', () => {
  it('extracts unique string and numeric metric ids from expression tokens', () => {
    expect(extractUniqueIds('CEIL(##226##) + ##atomic_order_id## + ##226##')).toEqual(['226', 'atomic_order_id'])
  })
})
