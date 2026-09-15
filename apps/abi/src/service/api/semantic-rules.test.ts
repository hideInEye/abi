import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  SemanticRuleCreateParams,
  SemanticRuleListParams,
  SemanticRuleStatusUpdateParams,
  SemanticRuleUpdateParams
} from '../../pages/component/data/semantic-list/types'

import { queryDictionaryDataByType } from './dictionary'
import {
  batchDeleteSemanticRules,
  createSemanticRule,
  deleteSemanticRule,
  getSemanticRuleDetail,
  querySemanticRuleList,
  updateSemanticRule,
  updateSemanticRuleStatus
} from './semantic-rules'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('../request', () => ({ apiRequest }))

const listParams: SemanticRuleListParams = {
  pageNum: 2,
  pageSize: 20,
  ruleCodeOrName: '扫描',
  spaceId: 1001,
  status: '1'
}

const createParams: SemanticRuleCreateParams = {
  bizType: '高危操作',
  extConditions: '{}',
  listType: 'BLACKLIST',
  matchMethod: 'REGEX',
  matchPattern: '(?i)select\\s+\\*',
  matchTarget: 'SQL_TEXT',
  priority: 100,
  remark: '',
  ruleName: '禁止全表扫描',
  spaceId: 1001,
  status: '1',
  visibility: 'PUBLIC'
}

describe('semantic rule API routes', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('queries the server-paginated list with GET params', () => {
    querySemanticRuleList(listParams)

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      params: listParams,
      url: '/api/copilot/v1/semanticRules/list'
    })
  })

  it('posts the confirmed create payload', () => {
    createSemanticRule(createParams)

    expect(apiRequest).toHaveBeenCalledWith({
      data: createParams,
      method: 'post',
      url: '/api/copilot/v1/semanticRules'
    })
  })

  it('puts the confirmed update payload', () => {
    const updateParams: SemanticRuleUpdateParams = { ...createParams, ruleId: '9007199254740993', status: '0' }
    updateSemanticRule(updateParams)

    expect(apiRequest).toHaveBeenCalledWith({
      data: updateParams,
      method: 'put',
      url: '/api/copilot/v1/semanticRules'
    })
  })

  it('uses the shared status endpoint for one or many Long IDs', () => {
    const statusParams: SemanticRuleStatusUpdateParams = {
      ruleIds: ['9007199254740993', 2],
      status: '1'
    }
    updateSemanticRuleStatus(statusParams)

    expect(apiRequest).toHaveBeenCalledWith({
      data: statusParams,
      method: 'put',
      url: '/api/copilot/v1/semanticRules/status'
    })
  })

  it('gets and deletes an encoded Long ID through the path', () => {
    getSemanticRuleDetail('rule/9007199254740993')
    deleteSemanticRule('rule/9007199254740993')

    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      method: 'get',
      url: '/api/copilot/v1/semanticRules/rule%2F9007199254740993'
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      method: 'delete',
      url: '/api/copilot/v1/semanticRules/rule%2F9007199254740993'
    })
  })

  it('sends the Long ID array as the DELETE batch request body', () => {
    const ruleIds = ['9007199254740993', 2]
    batchDeleteSemanticRules(ruleIds)

    expect(apiRequest).toHaveBeenCalledWith({
      data: ruleIds,
      method: 'delete',
      url: '/api/copilot/v1/semanticRules/batch'
    })
  })

  it('loads dictionary options from the confirmed type route', () => {
    queryDictionaryDataByType('semantic_match_target')

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      url: '/api/system/dict/data/type/semantic_match_target'
    })
  })
})
