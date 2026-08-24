export type DefinitionState = 'generated' | 'idle' | 'manual' | 'stale'

export function getDefinitionStateAfterExpressionChange(state: DefinitionState): DefinitionState {
  return state === 'generated' || state === 'manual' ? 'stale' : state
}

export function getDefinitionStateAfterManualChange(state: DefinitionState): DefinitionState {
  return state === 'stale' ? 'stale' : 'manual'
}

export function shouldConfirmDefinitionOverwrite(currentDefinition: unknown, lastGeneratedSql: string): boolean {
  const current = String(currentDefinition || '')
  return Boolean(current.trim()) && current !== lastGeneratedSql
}
