export interface LoadCurrentMcpItemsOptions<Response, Item> {
  isCurrent: () => boolean
  isSuccess: (response: Response) => boolean
  request: () => Promise<Response>
  selectItems: (response: Response) => unknown
}

export async function loadCurrentMcpItems<Response, Item>({ isCurrent, isSuccess, request, selectItems }: LoadCurrentMcpItemsOptions<Response, Item>): Promise<Item[] | null> {
  try {
    const response = await request()
    if (!isCurrent() || !isSuccess(response)) return null
    const items = selectItems(response)
    return Array.isArray(items) ? items : []
  } catch {
    return null
  }
}

interface McpResponseEnvelope {
  code?: unknown
  data?: { code?: unknown } | unknown
}

export function isSuccessfulMcpResponse(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false
  const envelope = response as McpResponseEnvelope
  const nestedCode = envelope.data && typeof envelope.data === 'object' ? (envelope.data as { code?: unknown }).code : undefined
  const code = envelope.code ?? nestedCode
  if (code == null || code === '') return true
  return String(code) === '0' || String(code) === '200'
}

export function buildMcpGroupQuery(spaceId?: number, fallbackSpaceId?: number) {
  return {
    groupType: 'mcp',
    pageNum: 1,
    pageSize: 100,
    spaceId: spaceId ?? fallbackSpaceId,
  }
}

export function shouldReloadMcpOnSpaceChange(previousSpaceId: number | undefined, currentSpaceId: number | undefined, wasLoaded: boolean, hasAssistantMcps: boolean): boolean {
  return String(previousSpaceId ?? '') !== String(currentSpaceId ?? '') && wasLoaded && !hasAssistantMcps
}
