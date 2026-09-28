export interface DeleteRoundGroups {
  message: number[]
  report: number[]
}

export interface DeleteRoundItem {
  roundIndex: number[]
  source: 'message' | 'report'
}

export function normalizeDeleteRounds(rounds: number[]): number[] {
  return Array.from(new Set(rounds.filter((round) => Number.isSafeInteger(round) && round >= 0)))
}

export function groupDeleteRoundsBySource(selectedRounds: number[], reportRounds: number[]): DeleteRoundGroups {
  const normalizedSelectedRounds = normalizeDeleteRounds(selectedRounds)
  const reportRoundSet = new Set(normalizeDeleteRounds(reportRounds))

  return normalizedSelectedRounds.reduce<DeleteRoundGroups>(
    (groups, round) => {
      groups[reportRoundSet.has(round) ? 'report' : 'message'].push(round)
      return groups
    },
    { message: [], report: [] },
  )
}

export function buildDeleteRoundItems(selectedRounds: number[], reportRounds: number[]): DeleteRoundItem[] {
  const groupedRounds = groupDeleteRoundsBySource(selectedRounds, reportRounds)

  return (['message', 'report'] as const)
    .filter((source) => groupedRounds[source].length > 0)
    .map((source) => ({ roundIndex: groupedRounds[source], source }))
}
