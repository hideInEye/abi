import { describe, expect, it, vi } from 'vitest'

import { loadMenuSources } from './menuSources'

describe('loadMenuSources', () => {
  it('starts system and space menu requests before waiting for either result', async () => {
    let resolveSystem!: (value: { data: string[] }) => void
    let resolveSpace!: (value: { data: string[] }) => void
    const system = new Promise<{ data: string[] }>(resolve => { resolveSystem = resolve })
    const space = new Promise<{ data: string[] }>(resolve => { resolveSpace = resolve })
    const loadSystem = vi.fn(() => system)
    const loadSpace = vi.fn(() => space)

    const result = loadMenuSources(loadSystem, loadSpace)
    expect(loadSystem).toHaveBeenCalledOnce()
    expect(loadSpace).toHaveBeenCalledOnce()

    resolveSpace({ data: ['space'] })
    resolveSystem({ data: ['system'] })
    await expect(result).resolves.toEqual({
      systemMenu: { data: ['system'] },
      spaceMenu: { data: ['space'] },
    })
  })

  it('keeps a successful system menu when the optional space menu fails', async () => {
    const error = new Error('space failed')
    await expect(loadMenuSources(
      async () => ({ data: ['system'] }),
      async () => { throw error },
    )).resolves.toEqual({
      systemMenu: { data: ['system'] },
      spaceMenu: { data: null, error },
    })
  })
})
