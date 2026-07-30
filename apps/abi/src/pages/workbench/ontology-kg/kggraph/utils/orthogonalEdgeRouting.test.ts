import { describe, expect, it } from 'vitest'

import type { OrthogonalEdgeRouteNode } from './orthogonalEdgeRouting'
import { MIN_TARGET_MARKER_CLEARANCE, computeOrthogonalEdgeRoute } from './orthogonalEdgeRouting'

const createNode = (id: string, x: number, y: number): OrthogonalEdgeRouteNode => ({
  height: 72,
  id,
  width: 172,
  x,
  y,
})

describe('computeOrthogonalEdgeRoute', () => {
  it('routes a forward edge through an orthogonal trunk', () => {
    const source = createNode('source', 0, 0)
    const target = createNode('target', 360, 120)
    const route = computeOrthogonalEdgeRoute(source, target, { sourceLayer: 0, targetLayer: 1 })

    expect(route.kind).toBe('forward')
    expect(route.sourceAnchor).toEqual({ x: 172, y: 36 })
    expect(route.targetAnchor.x).toBe(360 - MIN_TARGET_MARKER_CLEARANCE)
    expect(route.vertices).toHaveLength(2)
    expect(route.vertices[0].x).toBe(route.vertices[1].x)
  })

  it('keeps target markers away from the target node', () => {
    const target = createNode('target', 300, 0)
    const route = computeOrthogonalEdgeRoute(createNode('source', 0, 0), target, { sourceLayer: 0, targetLayer: 1 })

    expect(target.x - route.targetAnchor.x).toBeGreaterThanOrEqual(MIN_TARGET_MARKER_CLEARANCE)
  })

  it('uses a shared trunk for forward fan-out edges', () => {
    const source = createNode('source', 0, 0)
    const first = computeOrthogonalEdgeRoute(source, createNode('a', 360, 0), {
      sharedTrunkX: 260,
      sourceLayer: 0,
      targetLayer: 1,
    })
    const second = computeOrthogonalEdgeRoute(source, createNode('b', 360, 120), {
      sharedTrunkX: 260,
      sourceLayer: 0,
      targetLayer: 1,
    })

    expect(first.vertices[0].x).toBe(260)
    expect(second.vertices[0].x).toBe(260)
  })

  it('is independent of node input order for the same geometry', () => {
    const source = createNode('source', 0, 0)
    const target = createNode('target', 360, 120)

    expect(computeOrthogonalEdgeRoute(source, target, { sourceLayer: 0, targetLayer: 1 })).toEqual(computeOrthogonalEdgeRoute({ ...source }, { ...target }, { sourceLayer: 0, targetLayer: 1 }))
  })

  it('routes reverse edges outside the source side', () => {
    const route = computeOrthogonalEdgeRoute(createNode('source', 360, 0), createNode('target', 0, 120), {
      sourceLayer: 2,
      targetLayer: 1,
    })

    expect(route.kind).toBe('reverse')
    expect(route.sourceAnchor.x).toBe(360)
    expect(route.vertices[1].x).toBeGreaterThan(route.targetAnchor.x)
  })

  it('routes same-layer edges through a top loop', () => {
    const source = createNode('source', 0, 120)
    const target = createNode('target', 360, 120)
    const route = computeOrthogonalEdgeRoute(source, target, { sourceLayer: 1, targetLayer: 1 })

    expect(route.kind).toBe('same-layer')
    expect(route.vertices[1].y).toBeLessThan(source.y)
    expect(route.vertices[2].y).toBe(route.vertices[1].y)
  })

  it('routes self-loops around the node', () => {
    const node = createNode('node', 120, 120)
    const route = computeOrthogonalEdgeRoute(node, node)

    expect(route.kind).toBe('self-loop')
    expect(route.vertices).toHaveLength(4)
    expect(route.vertices[0].x).toBeGreaterThan(node.x + node.width)
    expect(route.vertices[1].y).toBeLessThan(node.y)
  })
})
