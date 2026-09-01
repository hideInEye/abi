import { describeStrictApiCallContract } from '../../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, './hooks/useEntityManagement.ts', [
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryOntologyLabels' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryOntologyEntityList' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'updateOntologyEntity' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'createOntologyEntity' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'deleteOntologyEntity' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'deleteOntologyEntityBatch' },
])

describeStrictApiCallContract(import.meta.url, './hooks/useEntityAttributeManagement.ts', [
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'getOntologyEntity' },
  { guard: /if \(error \|\| data !== true\)/, name: 'saveOntologyEntityAttributes' },
])

describeStrictApiCallContract(import.meta.url, './hooks/useAttributeGroups.ts', [{ guard: /assertFlatRequestSuccess\(response\)/, name: 'tableSemanticsGroupList' }])

describeStrictApiCallContract(import.meta.url, './hooks/useAttributeAssets.ts', [
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryTag' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryDimensionList' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryKnowledgeIndicators' },
])
