import { describe, expect, it } from 'vitest'

import type { HierarchicalLayoutEdge, HierarchicalLayoutNode, HierarchicalLayoutPoint } from './hierarchicalLayout'
import { computeHierarchicalLayout } from './hierarchicalLayout'

const layoutOptions = {
  componentGapX: 80,
  componentGapY: 50,
  componentPadding: 10,
  layerGap: 60,
  maxRowWidth: 1000,
  nodeGap: 20,
  nodeHeight: 40,
  nodeWidth: 100,
}

const createNode = (id: string): HierarchicalLayoutNode => ({
  entityName: id.toUpperCase(),
  id,
})

const createEdge = (id: string, startEntityId: string, endEntityId: string): HierarchicalLayoutEdge => ({
  endEntityId,
  id,
  relation: 'relates',
  startEntityId,
})

const serializePositions = (positions: Map<string, HierarchicalLayoutPoint>): Array<[string, HierarchicalLayoutPoint]> =>
  Array.from(positions.entries()).sort(([leftId], [rightId]) => leftId.localeCompare(rightId))

const expectNoOverlappingPositions = (positions: Map<string, HierarchicalLayoutPoint>): void => {
  const values = Array.from(positions.values())
  const uniqueValues = new Set(values.map((position) => `${position.x},${position.y}`))
  expect(uniqueValues.size).toBe(values.length)
}

describe('computeHierarchicalLayout', () => {
  it('creates one stable position per node', () => {
    const result = computeHierarchicalLayout([createNode('a'), createNode('b'), createNode('c')], [createEdge('e1', 'a', 'b')], layoutOptions)

    expect(result.positions.size).toBe(3)
    expectNoOverlappingPositions(result.positions)
  })

  it('is independent of input order', () => {
    const first = computeHierarchicalLayout([createNode('a'), createNode('b'), createNode('c'), createNode('d')], [createEdge('e1', 'a', 'c'), createEdge('e2', 'b', 'd')], layoutOptions)
    const second = computeHierarchicalLayout([createNode('d'), createNode('c'), createNode('b'), createNode('a')], [createEdge('e2', 'b', 'd'), createEdge('e1', 'a', 'c')], layoutOptions)

    expect(serializePositions(second.positions)).toEqual(serializePositions(first.positions))
  })

  it('places a directed chain from left to right', () => {
    const result = computeHierarchicalLayout([createNode('a'), createNode('b'), createNode('c')], [createEdge('e1', 'a', 'b'), createEdge('e2', 'b', 'c')], layoutOptions)

    expect(result.layers.get('a')).toBe(0)
    expect(result.layers.get('b')).toBe(1)
    expect(result.layers.get('c')).toBe(2)
    expect(result.positions.get('a')?.x).toBeLessThan(result.positions.get('b')?.x ?? 0)
    expect(result.positions.get('b')?.x).toBeLessThan(result.positions.get('c')?.x ?? 0)
  })

  it('centers a convergence target between its sources', () => {
    const result = computeHierarchicalLayout([createNode('a'), createNode('b'), createNode('c')], [createEdge('e1', 'a', 'c'), createEdge('e2', 'b', 'c')], layoutOptions)

    const sourceYValues = [result.positions.get('a')?.y ?? 0, result.positions.get('b')?.y ?? 0].sort((left, right) => left - right)
    const targetY = result.positions.get('c')?.y ?? 0

    expect(targetY).toBeGreaterThan(sourceYValues[0])
    expect(targetY).toBeLessThan(sourceYValues[1])
  })

  it('keeps fork targets on the same layer without overlap', () => {
    const result = computeHierarchicalLayout([createNode('a'), createNode('b'), createNode('c')], [createEdge('e1', 'a', 'b'), createEdge('e2', 'a', 'c')], layoutOptions)

    expect(result.layers.get('b')).toBe(result.layers.get('c'))
    expect(result.positions.get('b')?.x).toBe(result.positions.get('c')?.x)
    expect(result.positions.get('b')?.y).not.toBe(result.positions.get('c')?.y)
  })

  it('packs disconnected components and wraps rows when width is constrained', () => {
    const result = computeHierarchicalLayout([createNode('a'), createNode('b'), createNode('c')], [], { ...layoutOptions, maxRowWidth: 250 })

    expect(result.positions.get('a')?.x).toBe(10)
    expect(result.positions.get('b')?.x).toBe(10)
    expect(result.positions.get('b')?.y).toBeGreaterThan(result.positions.get('a')?.y ?? 0)
  })

  it('handles cycles deterministically on a single layer', () => {
    const first = computeHierarchicalLayout([createNode('a'), createNode('b')], [createEdge('e1', 'a', 'b'), createEdge('e2', 'b', 'a')], layoutOptions)
    const second = computeHierarchicalLayout([createNode('b'), createNode('a')], [createEdge('e2', 'b', 'a'), createEdge('e1', 'a', 'b')], layoutOptions)

    expect(first.layers.get('a')).toBe(0)
    expect(first.layers.get('b')).toBe(0)
    expect(serializePositions(second.positions)).toEqual(serializePositions(first.positions))
  })

  it('ignores self-loops for layering', () => {
    const result = computeHierarchicalLayout([createNode('a')], [createEdge('e1', 'a', 'a')], layoutOptions)

    expect(result.layers.get('a')).toBe(0)
    expect(result.positions.get('a')).toEqual({ x: 10, y: 10 })
  })

  it('ignores edges with missing endpoints', () => {
    const result = computeHierarchicalLayout([createNode('a'), createNode('b')], [createEdge('dirty', 'a', 'missing')], layoutOptions)

    expect(result.positions.has('missing')).toBe(false)
    expect(result.positions.size).toBe(2)
  })

  it('keeps node rectangles separated', () => {
    const result = computeHierarchicalLayout(
      ['a', 'b', 'c', 'd', 'e', 'f'].map(createNode),
      [createEdge('e1', 'a', 'c'), createEdge('e2', 'b', 'c'), createEdge('e3', 'c', 'd'), createEdge('e4', 'd', 'e'), createEdge('e5', 'd', 'f')],
      layoutOptions,
    )

    const rects = Array.from(result.positions.entries()).map(([id, position]) => ({
      bottom: position.y + layoutOptions.nodeHeight,
      id,
      left: position.x,
      right: position.x + layoutOptions.nodeWidth,
      top: position.y,
    }))

    rects.forEach((rect, index) => {
      rects.slice(index + 1).forEach((other) => {
        const separated = rect.right <= other.left || other.right <= rect.left || rect.bottom <= other.top || other.bottom <= rect.top
        expect(separated, `${rect.id} overlaps ${other.id}`).toBe(true)
      })
    })
  })
})
