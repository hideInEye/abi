interface FlatResult<T> {
  data: T | null
  error?: unknown
  response?: { data?: { rows?: unknown[] } }
}

export function readRequiredFlatData<T>(result: FlatResult<T>, fallbackMessage: string): T {
  if (result.error || result.data === null || result.data === undefined) {
    throw result.error || new Error(fallbackMessage)
  }
  return result.data
}

export function readSpaceRows(result: FlatResult<unknown>): unknown[] | null {
  if (result.error) return null
  if (Array.isArray(result.data)) return result.data
  const responseRows = result.response?.data?.rows
  return Array.isArray(responseRows) ? responseRows : []
}

export function mergeHomeSpaceData(homeData: Record<string, any>, rows: unknown[] | null) {
  const normalizedRows = rows?.map(item => ({...(item as object), type: 'space'}))
  return {
    ...homeData,
    spaceList: normalizedRows?.length ? normalizedRows : homeData.spaceList || [],
  }
}
