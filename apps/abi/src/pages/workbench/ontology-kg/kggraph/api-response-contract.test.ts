import { describeStrictApiCallContract } from '../../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, './hooks/useOntologyGraph.ts', [
  { guard: /assertFlatRequestSuccess\(entityResult\)/, name: 'queryOntologyEntityList' },
  { guard: /assertFlatRequestSuccess\(relationResult\)/, name: 'queryOntologyRelationList' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryOntologyGraph' },
])
