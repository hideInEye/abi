import { describe, expect, it } from 'vitest'

import { getVisiblePaginationItems } from './pagination'

describe('getVisiblePaginationItems', () => {
  it('renders all pages when total pages do not exceed the visible limit', () => {
    expect(getVisiblePaginationItems(1, 1)).toEqual([1])
    expect(getVisiblePaginationItems(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('keeps leading pages visible near the beginning', () => {
    expect(getVisiblePaginationItems(2, 10)).toEqual([1, 2, 3, 4, 'ellipsis', 10])
  })

  it('keeps trailing pages visible near the end', () => {
    expect(getVisiblePaginationItems(9, 10)).toEqual([1, 'ellipsis', 7, 8, 9, 10])
  })

  it('keeps the current page centered for middle ranges', () => {
    expect(getVisiblePaginationItems(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
  })

  it('clamps invalid current and total pages to a stable visual range', () => {
    expect(getVisiblePaginationItems(0, 0)).toEqual([1])
    expect(getVisiblePaginationItems(20, 10)).toEqual([1, 'ellipsis', 7, 8, 9, 10])
  })
})
