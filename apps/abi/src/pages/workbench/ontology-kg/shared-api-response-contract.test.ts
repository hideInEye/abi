import { describeStrictApiCallContract } from '../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, '../../../components/tableSemantics.tsx', [
  { guard: /isFlatRequestSuccess\(res\)/, name: 'schemalist' },
  { guard: /isFlatRequestSuccess\(res\)/, name: 'tableSemanticsGroupList' },
])

describeStrictApiCallContract(import.meta.url, '../../../components/stateful/group/useGroupManagement.ts', [
  { guard: /isFlatRequestSuccess\(res\)/, name: 'tableSemanticsGroupList' },
  { guard: /isFlatRequestSuccess\(res\)/, name: 'addTableSemanticsGroup' },
  { guard: /isFlatRequestSuccess\(res\)/, name: 'editTableSemanticsGroup' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'deleteTableSemanticsGroup' },
])
