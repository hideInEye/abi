import { describe, expect, it } from 'vitest'

import { normalizeSvgIconMarkup } from './SvgIconAssets'

describe('normalizeSvgIconMarkup', () => {
  it('strips XML and DOCTYPE preambles and constrains fixed-size SVG roots', () => {
    const source =
      '<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg viewBox="0 0 1024 1024" width="200" height="200"><path /></svg>'

    const result = normalizeSvgIconMarkup(source)

    expect(result).toMatch(/^<svg\b/)
    expect(result).toContain('viewBox="0 0 1024 1024"')
    expect(result).toContain('height="1em"')
    expect(result).toContain('width="1em"')
    expect(result).not.toContain('height="200"')
    expect(result).not.toContain('width="200"')
  })

  it('replaces existing boundary attributes without duplicating accessibility attributes', () => {
    const result = normalizeSvgIconMarkup(
      '<svg aria-hidden="false" focusable="true" width=128 height=\'128\' viewBox="0 0 128 128"></svg>'
    )

    expect(result.match(/aria-hidden=/g)).toHaveLength(1)
    expect(result.match(/focusable=/g)).toHaveLength(1)
    expect(result.match(/height=/g)).toHaveLength(1)
    expect(result.match(/width=/g)).toHaveLength(1)
    expect(result).toContain('viewBox="0 0 128 128"')
  })

  it('leaves non-SVG input unchanged', () => {
    expect(normalizeSvgIconMarkup('not an svg')).toBe('not an svg')
  })
})
