import { apiRequest } from '../request'

const ONTOLOGY_API_PREFIX = '/api/abi-ontology/api/v1/ontology'

export interface CheckOntologyNameParams {
  groupId: number | string
  name: string
  nameType: 'bizName' | 'techName'
  objectType: 'dimension' | 'indicator'
  spaceId: number
}

export function checkOntologyName(params: CheckOntologyNameParams) {
  return apiRequest({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_API_PREFIX}/checkName`
  })
}
