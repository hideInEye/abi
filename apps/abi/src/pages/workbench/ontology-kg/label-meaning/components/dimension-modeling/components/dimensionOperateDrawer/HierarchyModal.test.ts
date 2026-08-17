import { describe, expect, it } from 'vitest'

import { buildCardsFromHierarchy, buildDimensionHierarchyPayload, getHierarchyBizNameDisplay } from './HierarchyModal'

describe('HierarchyModal payload', () => {
  it('builds grouped dimension hierarchy payload with returned hierarchyId', () => {
    const payload = buildDimensionHierarchyPayload(
      { id: 57 } as any,
      [
        {
          hierarchyId: 123,
          id: 'history-1',
          levels: [
            {
              displayName: '商品ID(SPU) (spu_id)',
              key: 'spu_id',
              levelName: '商品ID(SPU)',
              techId: 'spu_id'
            },
            {
              displayName: '品牌 (brand)',
              key: 'brand',
              levelName: '品牌',
              techId: 'brand'
            }
          ],
          title: '商品ID(SPU)层级'
        }
      ],
      138
    )

    expect(Array.isArray(payload)).toBe(false)
    expect(payload).toEqual({
      dimId: 57,
      groups: [
        {
          drillDirection: 'DOWN',
          hierarchyId: 123,
          hierarchyName: '商品ID(SPU)层级',
          isDefault: '0',
          levels: [
            {
              configJson: {
                fieldKey: 'spu_id',
                fieldName: '商品ID(SPU)',
                techId: 'spu_id'
              },
              levelName: '商品ID(SPU)',
              levelOrder: 1
            },
            {
              configJson: {
                fieldKey: 'brand',
                fieldName: '品牌',
                techId: 'brand'
              },
              levelName: '品牌',
              levelOrder: 2
            }
          ],
          status: '1'
        }
      ],
      spaceId: 138
    })
  })

  it('omits hierarchyId for newly created hierarchy groups', () => {
    const payload = buildDimensionHierarchyPayload(
      { id: 57 } as any,
      [
        {
          id: 'new-1',
          levels: [
            {
              displayName: '一级 (level_1)',
              key: 'level_1',
              levelName: '一级',
              techId: 'level_1'
            }
          ],
          title: '新增层级'
        }
      ],
      138
    )

    expect(payload?.groups[0]).not.toHaveProperty('hierarchyId')
  })

  it('keeps hierarchyId from loaded hierarchy items when saving again', () => {
    const cards = buildCardsFromHierarchy(
      [
        {
          configJson: {
            fieldKey: 'brand',
            fieldName: '品牌',
            techId: 'brand'
          },
          dimId: 57,
          drillDirection: 'DOWN',
          hierarchyId: 123,
          hierarchyName: '商品层级',
          isDefault: '0',
          levelName: '品牌',
          levelOrder: 1,
          spaceId: 138,
          status: '1'
        }
      ],
      new Map()
    )

    const payload = buildDimensionHierarchyPayload({ id: 57 } as any, cards, 138)

    expect(payload?.groups[0].hierarchyId).toBe(123)
  })

  it('displays mapped hierarchy names with the field name only', () => {
    expect(getHierarchyBizNameDisplay('优惠券表_#_优惠券名称')).toBe('优惠券名称')
    expect(getHierarchyBizNameDisplay('优惠券表_ # _优惠券名称')).toBe('优惠券名称')
  })

  it('normalizes mapped hierarchy field names when loading history items', () => {
    const cards = buildCardsFromHierarchy(
      [
        {
          configJson: {
            fieldKey: 'coupon_name',
            fieldName: '优惠券表_#_优惠券名称',
            techId: 'coupon_name'
          },
          dimId: 57,
          hierarchyName: '优惠券层级',
          levelName: '优惠券表_#_优惠券名称',
          levelOrder: 1,
          spaceId: 138
        }
      ],
      new Map()
    )

    expect(cards[0].levels[0].displayName).toBe('优惠券名称 (coupon_name)')
    expect(cards[0].levels[0].levelName).toBe('优惠券名称')
  })

  it('normalizes mapped hierarchy title names when loading history items', () => {
    const cards = buildCardsFromHierarchy(
      [
        {
          configJson: {
            fieldKey: 'coupon_name',
            fieldName: '优惠券表_#_优惠券名称',
            techId: 'coupon_name'
          },
          dimId: 57,
          hierarchyName: '优惠券表_#_优惠券名称层级',
          levelName: '优惠券表_#_优惠券名称',
          levelOrder: 1,
          spaceId: 138
        }
      ],
      new Map()
    )

    expect(cards[0].title).toBe('优惠券名称层级')
  })
})
