import type { ApiRuleTemplates, RuleFieldOption, RuleLayer, RuleTemplateFieldMeta } from '../rule-expression'
import { buildApiRuleTemplates, normalizeRuleLayers, parseApiRuleTemplates } from '../rule-expression'

function parseStoredExpression(exp: unknown): unknown {
  if (!exp) {
    return undefined
  }
  if (typeof exp !== 'string') {
    return exp
  }

  const candidates = [exp]
  try {
    const decoded = decodeURIComponent(exp)
    if (decoded !== exp) candidates.unshift(decoded)
  } catch {
    // Historical values may contain a literal percent sign and still be valid JSON.
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // Try the next compatible storage form.
    }
  }
  return undefined
}

export function parseTagExpression(exp?: unknown): RuleLayer[] {
  const storedExpression = parseStoredExpression(exp)
  return parseApiRuleTemplates(storedExpression) || normalizeRuleLayers(storedExpression)
}

export function serializeTagExpression(value: RuleLayer[], fields: readonly RuleFieldOption[]): ApiRuleTemplates {
  const fieldMetaMap = fields.reduce<Record<string, RuleTemplateFieldMeta>>((acc, field) => {
    acc[field.id] = {
      field: field.sourceName,
      fieldName: field.label,
      value: field.id
    }
    return acc
  }, {})

  return buildApiRuleTemplates(value, fieldMetaMap) || { layers: [] }
}
