import { useCallback, useReducer } from 'react'

import { createInitialSemanticListState, formatSemanticRuleTime, semanticListReducer } from './semantic-list-model'
import type { SemanticRuleDraft } from './types'

const getSystemTime = () => new Date()

export function useSemanticListDemo(now: () => Date = getSystemTime) {
  const [state, dispatch] = useReducer(semanticListReducer, undefined, createInitialSemanticListState)

  const createRule = useCallback(
    async (draft: SemanticRuleDraft) => {
      await Promise.resolve()
      dispatch({ draft, now: formatSemanticRuleTime(now()), type: 'create' })
    },
    [now]
  )

  const updateRule = useCallback(
    async (id: number, draft: SemanticRuleDraft) => {
      await Promise.resolve()
      dispatch({ draft, id, now: formatSemanticRuleTime(now()), type: 'update' })
    },
    [now]
  )

  const setRuleStatus = useCallback(
    async (ids: number[], enabled: boolean) => {
      await Promise.resolve()
      dispatch({ enabled, ids, now: formatSemanticRuleTime(now()), type: 'set-status' })
    },
    [now]
  )

  const deleteRules = useCallback(async (ids: number[]) => {
    await Promise.resolve()
    dispatch({ ids, type: 'delete' })
  }, [])

  return { createRule, deleteRules, setRuleStatus, state, updateRule }
}
