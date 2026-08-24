import type { RuleLayer } from '../rule-expression'
import { normalizeRuleLayers } from '../rule-expression'

export function parseTagExpression(exp?: string): RuleLayer[] {
  if (!exp) {
    return normalizeRuleLayers([])
  }
  try {
    return normalizeRuleLayers(JSON.parse(decodeURIComponent(exp)))
  } catch {
    return normalizeRuleLayers([])
  }
}

export function serializeTagExpression(value: RuleLayer[]): string {
  const payload = normalizeRuleLayers(value, false).map(layer => ({
    binName: layer.name.trim(),
    groups: layer.groups.map((group, groupIndex) => ({
      conditions: group.conditions.map((condition, conditionIndex) => ({
        ...(conditionIndex > 0 ? { logicWithPrevious: condition.logicWithPrevious || 'AND' } : {}),
        metric: condition.fieldId,
        operator: condition.operator,
        ...(!['IS NULL', 'IS NOT NULL'].includes(condition.operator) ? { value: condition.value } : {})
      })),
      ...(groupIndex > 0 ? { logicWithPrevious: group.logicWithPrevious || 'AND' } : {}),
      name: group.name.trim()
    }))
  }))

  return encodeURIComponent(JSON.stringify(payload))
}
