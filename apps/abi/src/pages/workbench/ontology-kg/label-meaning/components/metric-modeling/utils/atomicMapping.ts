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
    // 语义来源仍使用 description；映射接口只接收 fieldDesc，避免透传旧描述键。
    const sourceField = { ...item.raw }
    delete sourceField.description
    return {
      ...context,
      projectionFunc,
      techId: [
        {
          ...sourceField,
          agg: {
            data: item.aggregationMethods,
            type: 'simple'
          },
          alias: item.alias,
          bizName: buildMappedBizName(item.tableBizName, item.bizName),
          dataType: item.dataType,
          englishName: item.englishName,
          fieldDesc: item.description,
          fieldType: item.fieldType,
          projectionFunc,
          techId: String(item.raw?.techId || ''),
          techName: buildMappedTechName(item.tableTechName, item.englishName)
        }
      ]
    }
  })
}
