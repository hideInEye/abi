import { describe, expect, it } from 'vitest'

import type { OntologyEntityAttribute } from '../../shared-network-types'
import { getEntityAttributeIdentity, isSameEntityAttribute, makeAttributes, makeEntityAttributeSaveItems } from './entity'

describe('entity attribute utils', () => {
  it('keeps source ids when building entity attributes', () => {
    expect(
      makeAttributes(
        [
          {
            attributeCode: 'city_code',
            attributeName: '城市',
            dimId: 'dim-1001',
            id: 'dim-1001',
          },
        ],
        'dimension',
      ),
    ).toMatchObject([
      {
        attributeCode: 'city_code',
        attributeId: 'dim-1001',
        attributeName: '城市',
        attributeType: 'dimension',
        dimId: 'dim-1001',
      },
    ])

    expect(
      makeAttributes(
        [
          {
            attributeCode: 'gmv',
            attributeName: '成交额',
            id: 'ind-2001',
            indId: 'ind-2001',
          },
        ],
        'indicator',
      )[0],
    ).toMatchObject({ attributeType: 'indicator', indId: 'ind-2001' })

    expect(
      makeAttributes(
        [
          {
            attributeCode: 'vip',
            attributeName: '会员',
            id: 'tag-3001',
            tagId: 'tag-3001',
          },
        ],
        'label',
      )[0],
    ).toMatchObject({ attributeType: 'label', tagId: 'tag-3001' })
  })

  it('uses source id plus attribute type as the duplicate identity', () => {
    const dimension: OntologyEntityAttribute = {
      attributeCode: 'city_code',
      attributeName: '城市',
      attributeType: 'dimension',
      dimId: 'same-source-id',
    }
    const renamedDimension: OntologyEntityAttribute = {
      attributeCode: 'city_alias',
      attributeName: '城市别名',
      attributeType: 'dimension',
      dimId: 'same-source-id',
    }
    const indicator: OntologyEntityAttribute = {
      attributeCode: 'same-source-id',
      attributeName: '指标',
      attributeType: 'indicator',
      indId: 'same-source-id',
    }

    expect(getEntityAttributeIdentity(dimension)).toBe('dimension:same-source-id')
    expect(isSameEntityAttribute(dimension, renamedDimension)).toBe(true)
    expect(isSameEntityAttribute(dimension, indicator)).toBe(false)
  })

  it('falls back to attribute code for legacy detail rows without source ids', () => {
    expect(
      getEntityAttributeIdentity({
        attributeCode: 'legacy_code',
        attributeName: '旧字段',
        attributeType: 'dimension',
      }),
    ).toBe('dimension:legacy_code')
  })

  it('adds attributeId to the save payload from the type-specific source id', () => {
    expect(
      makeEntityAttributeSaveItems([
        {
          attributeCode: 'city_code',
          attributeName: '城市',
          attributeType: 'dimension',
          dataType: 'varchar',
          dimId: 'dim-1001',
        },
      ]),
    ).toEqual([
      {
        attributeCode: 'city_code',
        attributeId: 'dim-1001',
        attributeName: '城市',
        attributeType: 'dimension',
        dataType: 0,
      },
    ])

    expect(
      makeEntityAttributeSaveItems([
        {
          attributeCode: 'gmv',
          attributeName: '成交额',
          attributeType: 'indicator',
          indId: 'ind-2001',
        },
        {
          attributeCode: 'vip',
          attributeName: '会员',
          attributeType: 'label',
          tagId: 'tag-3001',
        },
      ]),
    ).toMatchObject([
      { attributeId: 'ind-2001', attributeType: 'indicator' },
      { attributeId: 'tag-3001', attributeType: 'label' },
    ])
  })
})
