import { buildMappedBizName, buildMappedTechName } from '../../../utils/ontologyName'
import type {
  AggregationCode,
  AtomicMappingPayload,
  KnowledgeTechField
} from '../types/metricModeling.types'

import { toLegacyProjectionFunc } from './aggregation'

export interface AtomicMappingFieldInput {
  aggregationMethods: AggregationCode[]
  alias: string
  bizName: string
  description: string
  englishName: string
  fieldType: string
  raw: KnowledgeTechField
  tableBizName: string
  tableTechName: string
}

export interface AtomicMappingMetricInput extends AtomicMappingFieldInput {
  dataType: string
  indicatorName: string
}

export function getDuplicateAtomicMappingName(fields: Pick<AtomicMappingMetricInput, 'indicatorName'>[]) {
  const names = new Set<string>()
  for (const field of fields) {
    const name = field.indicatorName.trim()
    if (names.has(name)) return name
    names.add(name)
  }
  return undefined
}

interface AtomicMappingContext {
  groupId?: string
  relSchemaId: number | string
  semanticsGroupId?: number | string
  spaceId: number
}

export function buildAtomicMappingPayload(
  fields: AtomicMappingMetricInput[],
  context: AtomicMappingContext
): AtomicMappingPayload[] {
  return fields.map(item => {
    const projectionFunc = toLegacyProjectionFunc(item.aggregationMethods[0])
    return {
      ...context,
      bizName: item.indicatorName.trim(),
      dataType: item.dataType,
      projectionFunc,
      techId: [
        {
          ...item.raw,
          agg: {
            data: item.aggregationMethods,
            type: 'simple'
          },
          alias: item.alias,
          bizName: buildMappedBizName(item.tableBizName, item.bizName),
          description: item.description,
          englishName: item.englishName,
          fieldType: item.fieldType,
          projectionFunc,
          techId: String(item.raw?.techId || ''),
          techName: buildMappedTechName(item.tableTechName, item.englishName)
        }
      ]
    }
  })
}
