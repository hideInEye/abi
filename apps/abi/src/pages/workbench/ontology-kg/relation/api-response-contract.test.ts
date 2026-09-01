import { describeStrictApiCallContract } from '../../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, './hooks/useRelationManagement.ts', [
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryOntologyEntityList' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryOntologyRelationList' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'updateOntologyRelation' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'createOntologyRelation' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'deleteOntologyRelation' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'deleteOntologyRelationBatch' },
])
