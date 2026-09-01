import { describeStrictApiCallContract } from '../../../../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, './hooks/useKnowledgeExtraction.ts', [
  { guard: /assertFlatRequestSuccess\(res\)/, name: 'queryKnowledgeIndicators' },
  { guard: /isApiSuccess\(res\)/, name: 'queryKnowledgeIndicatorDetail' },
  { guard: /isApiSuccess\(res\)/, name: 'deleteKnowledgeIndicator' },
  { guard: /isApiSuccess\(res\)/, name: 'deleteKnowledgeIndicatorBatch' },
  { guard: /isApiSuccess\(res\)/, name: 'editKnowledgeIndicator' },
  { guard: /isApiSuccess\(res\)/, name: 'addKnowledgeIndicator' },
  { guard: /isApiSuccess\(res\)/, name: 'syncAtomicIndicators' },
])

describeStrictApiCallContract(import.meta.url, './hooks/useKnowledgeDimensions.ts', [
  { guard: /assertFlatRequestSuccess\(groupResult\)/, name: 'tableSemanticsGroupList' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryDimensionList' },
])

describeStrictApiCallContract(import.meta.url, './components/KnowledgeAtomicMappingDrawer.tsx', [
  { guard: /assertFlatRequestSuccess\(res\)/, name: 'queryKnowledgeIndicators' },
  { guard: /assertFlatRequestSuccess\(res\)/, name: 'queryTableSemanticsDetail' },
])

describeStrictApiCallContract(import.meta.url, './components/KnowledgeOperateDrawer.tsx', [
  { guard: /assertFlatRequestSuccess\(res\)/, name: 'queryKnowledgeIndicators' },
  { guard: /assertFlatRequestSuccess\(detailResult\)/, name: 'queryKnowledgeIndicatorDetail' },
  { guard: /assertFlatRequestSuccess\(schemaResult\)/, name: 'queryTableSemanticsDetail' },
])

describeStrictApiCallContract(import.meta.url, './utils/knowledgeOperateDrawer.validators.ts', [{ guard: /assertFlatRequestSuccess\(res/, name: 'checkOntologyName' }])
