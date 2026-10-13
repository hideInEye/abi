import { readdirSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { getLocalIcons } from './icon'

describe('local icon catalog', () => {
  it('includes every existing SVG without reducing the selector options', () => {
    const names = readdirSync(new URL('../assets/svg-icon/', import.meta.url))
      .filter(name => name.endsWith('.svg'))
      .map(name => name.slice(0, -4))
    expect(getLocalIcons().sort()).toEqual(names.sort())
  })

  it('returns a fresh catalog so consumers cannot remove other selectors’ options', () => {
    const names = getLocalIcons()
    const first = names.shift()
    expect(getLocalIcons()).toContain(first)
  })
})
