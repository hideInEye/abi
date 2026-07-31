export const TARGET_MARKER_WIDTH = 14
export const TARGET_MARKER_HEIGHT = 10
export const TARGET_MARKER_NODE_GAP = 2
export const MIN_TARGET_MARKER_CLEARANCE = TARGET_MARKER_WIDTH + TARGET_MARKER_NODE_GAP

export interface OrthogonalEdgeRouteNode {
  height: number
  id: string
  width: number
  x: number
  y: number
}

export interface OrthogonalEdgeRoutePoint {
  x: number
  y: number
}

export type OrthogonalEdgeRouteKind = 'forward' | 'reverse' | 'same-layer' | 'self-loop'

export interface OrthogonalEdgeRouteOptions {
  edgeIndex?: number
  minSegmentLength?: number
  sharedTrunkX?: number
  sourceLayer?: number
  targetLayer?: number
}

export interface OrthogonalEdgeRoute {
  kind: OrthogonalEdgeRouteKind
  sourceAnchor: OrthogonalEdgeRoutePoint
  targetAnchor: OrthogonalEdgeRoutePoint
  vertices: OrthogonalEdgeRoutePoint[]
}

const DEFAULT_MIN_SEGMENT_LENGTH = 44
const EDGE_LANE_GAP = 16
const SAME_LAYER_LOOP_GAP = 46
const SELF_LOOP_WIDTH = 58
const SELF_LOOP_HEIGHT = 54

const getCenterY = (node: OrthogonalEdgeRouteNode): number => node.y + node.height / 2

const getCenterX = (node: OrthogonalEdgeRouteNode): number => node.x + node.width / 2

const getLaneOffset = (edgeIndex = 0): number => edgeIndex * EDGE_LANE_GAP

const isForwardRoute = (source: OrthogonalEdgeRouteNode, target: OrthogonalEdgeRouteNode, sourceLayer: number | undefined, targetLayer: number | undefined): boolean => {
  if (sourceLayer !== undefined && targetLayer !== undefined && sourceLayer !== targetLayer) return sourceLayer < targetLayer
  return getCenterX(source) <= getCenterX(target)
}

export function computeOrthogonalEdgeRoute(source: OrthogonalEdgeRouteNode, target: OrthogonalEdgeRouteNode, options: OrthogonalEdgeRouteOptions = {}): OrthogonalEdgeRoute {
  const minSegmentLength = options.minSegmentLength ?? DEFAULT_MIN_SEGMENT_LENGTH
  const sourceCenterY = getCenterY(source)
  const targetCenterY = getCenterY(target)
  const laneOffset = getLaneOffset(options.edgeIndex)

  if (source.id === target.id) {
    const sourceAnchor = { x: source.x + source.width, y: source.y + source.height * 0.35 }
    const targetAnchor = { x: source.x + source.width + MIN_TARGET_MARKER_CLEARANCE, y: source.y + source.height * 0.65 }
    const loopRight = source.x + source.width + SELF_LOOP_WIDTH + laneOffset
    const loopTop = source.y - SELF_LOOP_HEIGHT - laneOffset

    return {
      kind: 'self-loop',
      sourceAnchor,
      targetAnchor,
      vertices: [
        { x: loopRight, y: sourceAnchor.y },
        { x: loopRight, y: loopTop },
        { x: targetAnchor.x, y: loopTop },
        { x: targetAnchor.x, y: targetAnchor.y },
      ],
    }
  }

  const sameLayer = options.sourceLayer !== undefined && options.targetLayer !== undefined && options.sourceLayer === options.targetLayer
  const forward = isForwardRoute(source, target, options.sourceLayer, options.targetLayer)

  if (sameLayer) {
    const sourceAnchor = forward ? { x: source.x + source.width, y: sourceCenterY } : { x: source.x, y: sourceCenterY }
    const targetAnchor = forward ? { x: target.x - MIN_TARGET_MARKER_CLEARANCE, y: targetCenterY } : { x: target.x + target.width + MIN_TARGET_MARKER_CLEARANCE, y: targetCenterY }
    const loopY = Math.min(source.y, target.y) - SAME_LAYER_LOOP_GAP - laneOffset

    return {
      kind: 'same-layer',
      sourceAnchor,
      targetAnchor,
      vertices: [
        { x: sourceAnchor.x + (forward ? minSegmentLength : -minSegmentLength), y: sourceAnchor.y },
        { x: sourceAnchor.x + (forward ? minSegmentLength : -minSegmentLength), y: loopY },
        { x: targetAnchor.x + (forward ? -minSegmentLength : minSegmentLength), y: loopY },
        { x: targetAnchor.x + (forward ? -minSegmentLength : minSegmentLength), y: targetAnchor.y },
      ],
    }
  }

  if (forward) {
    const sourceAnchor = { x: source.x + source.width, y: sourceCenterY }
    const targetAnchor = { x: target.x - MIN_TARGET_MARKER_CLEARANCE, y: targetCenterY }
    const trunkX = options.sharedTrunkX ?? source.x + source.width + minSegmentLength + laneOffset

    return {
      kind: 'forward',
      sourceAnchor,
      targetAnchor,
      vertices: [
        { x: trunkX, y: sourceAnchor.y },
        { x: trunkX, y: targetAnchor.y },
      ],
    }
  }

  const sourceAnchor = { x: source.x, y: sourceCenterY }
  const targetAnchor = { x: target.x + target.width + MIN_TARGET_MARKER_CLEARANCE, y: targetCenterY }
  const trunkX = Math.max(sourceAnchor.x, targetAnchor.x) + minSegmentLength + laneOffset

  return {
    kind: 'reverse',
    sourceAnchor,
    targetAnchor,
    vertices: [
      { x: trunkX, y: sourceAnchor.y },
      { x: trunkX, y: targetAnchor.y },
    ],
  }
}
