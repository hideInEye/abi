import { describe, expect, it } from 'vitest'

import {
  DEFAULT_THEME_CONFIG,
  chartStyleFromConfig,
  mergeThemeOverride,
  normalizeThemeConfig,
  normalizeThemeId,
  presetToThemeConfig,
  resolveFullConfig,
  themeConfigToStyle,
} from './theme'

describe('normalizeThemeId', () => {
  it('保留合法预设标识', () => {
    expect(normalizeThemeId('dark')).toBe('dark')
    expect(normalizeThemeId('light')).toBe('light')
    expect(normalizeThemeId('blue')).toBe('blue')
  })

  it('非法/缺省值回退蓝色系', () => {
    expect(normalizeThemeId('neo')).toBe('blue')
    expect(normalizeThemeId(undefined)).toBe('blue')
    expect(normalizeThemeId(null)).toBe('blue')
  })
})

describe('normalizeThemeConfig', () => {
  it('非对象输入返回 undefined', () => {
    expect(normalizeThemeConfig(null)).toBeUndefined()
    expect(normalizeThemeConfig('dark')).toBeUndefined()
    expect(normalizeThemeConfig(123)).toBeUndefined()
  })

  it('剔除非法字段，仅保留合法且有值的字段', () => {
    const raw = {
      background: { type: 'gradient', color: '#fff', color2: '', angle: 'x' },
      titleBar: { bg: '#000', text: 42 },
      font: { size: 15, weight: 'bold' },
      chart: { palette: ['#111', '', '#222'], fontSize: 'big' },
    }
    expect(normalizeThemeConfig(raw)).toEqual({
      background: { type: 'gradient', color: '#fff' },
      titleBar: { bg: '#000' },
      font: { size: 15 },
      chart: { palette: ['#111', '#222'] },
    })
  })

  it('无任何有效字段时返回 undefined', () => {
    expect(normalizeThemeConfig({ background: {}, font: { size: NaN } })).toBeUndefined()
    expect(normalizeThemeConfig({})).toBeUndefined()
  })

  it('过滤空配色板后不产出 chart 段', () => {
    expect(normalizeThemeConfig({ chart: { palette: ['', ''] } })).toBeUndefined()
  })
})

describe('mergeThemeOverride', () => {
  it('后者覆盖前者的同名字段', () => {
    const merged = mergeThemeOverride({ font: { size: 14, color: '#000' } }, { font: { color: '#fff' } })
    expect(merged.font).toEqual({ size: 14, color: '#fff' })
  })

  it('配色板整体替换而非逐项合并', () => {
    const merged = mergeThemeOverride({ chart: { palette: ['#a', '#b', '#c'] } }, { chart: { palette: ['#x'] } })
    expect(merged.chart?.palette).toEqual(['#x'])
  })

  it('忽略 null/undefined 分片', () => {
    expect(mergeThemeOverride(null, undefined, { titleBar: { bg: '#fff' } })).toEqual({ titleBar: { bg: '#fff' } })
  })
})

describe('presetToThemeConfig', () => {
  it('返回深拷贝，改动不污染常量表', () => {
    const cfg = presetToThemeConfig('blue')
    cfg.chart.palette.push('#zzz')
    cfg.font.size = 99
    expect(presetToThemeConfig('blue').chart.palette).toEqual(DEFAULT_THEME_CONFIG.chart.palette)
    expect(presetToThemeConfig('blue').font.size).toBe(14)
  })

  it('dark 预设基准字色为亮色', () => {
    expect(presetToThemeConfig('dark').font.color).toBe('#e8ecf5')
  })
})

describe('resolveFullConfig', () => {
  it('以预设为基准叠加 override 得到完整配置', () => {
    const full = resolveFullConfig('blue', { font: { size: 16 }, background: { type: 'gradient' } })
    expect(full.font.size).toBe(16)
    expect(full.background.type).toBe('gradient')
    // 未覆盖字段沿用预设基准
    expect(full.font.color).toBe(DEFAULT_THEME_CONFIG.font.color)
    expect(full.chart.palette).toEqual(DEFAULT_THEME_CONFIG.chart.palette)
  })

  it('无 override 时等于预设基准', () => {
    expect(resolveFullConfig('light')).toEqual(presetToThemeConfig('light'))
  })
})

describe('themeConfigToStyle', () => {
  it('空/缺省配置产出空对象（blue 零覆盖）', () => {
    expect(themeConfigToStyle(null)).toEqual({})
    expect(themeConfigToStyle(undefined)).toEqual({})
    expect(themeConfigToStyle({})).toEqual({})
  })

  it('纯色背景只产出底色并清空渐变图', () => {
    expect(themeConfigToStyle({ background: { type: 'solid', color: '#f00' } })).toEqual({
      '--cw-body-bg': '#f00',
      '--cw-body-bg-image': 'none',
    })
  })

  it('渐变背景产出 linear-gradient 与兜底底色', () => {
    const style = themeConfigToStyle({ background: { type: 'gradient', color: '#f00', color2: '#00f', angle: 90 } }) as Record<string, string>
    expect(style['--cw-body-bg-image']).toBe('linear-gradient(90deg, #f00, #00f)')
    expect(style['--cw-body-bg']).toBe('#f00')
  })

  it('渐变缺角度时回退 135deg', () => {
    const style = themeConfigToStyle({ background: { type: 'gradient', color: '#f00', color2: '#00f' } }) as Record<string, string>
    expect(style['--cw-body-bg-image']).toBe('linear-gradient(135deg, #f00, #00f)')
  })

  it('标题栏/字体映射到对应 CSS 变量', () => {
    const style = themeConfigToStyle({
      titleBar: { bg: '#111', text: '#eee' },
      font: { family: 'Arial', color: '#222', weight: 600, size: 16 },
    }) as Record<string, string>
    expect(style['--cw-header-bg']).toBe('#111')
    expect(style['--cw-header-text']).toBe('#eee')
    expect(style['--cw-font-family']).toBe('Arial')
    expect(style['--cw-text']).toBe('#222')
    expect(style['--cw-font-weight']).toBe('600')
    expect(style['--cw-font-scale']).toBe(String(16 / 14))
  })

  it('字号为 0 或非法时不产出缩放因子', () => {
    expect(themeConfigToStyle({ font: { size: 0 } })).toEqual({})
  })
})

describe('chartStyleFromConfig', () => {
  it('配色板拼接为逗号分隔串', () => {
    const style = chartStyleFromConfig({ chart: { palette: ['#a', '#b'], textColor: '#ccc', fontFamily: 'Arial', fontSize: 13 } })
    expect(style.color).toBe('#a,#b')
    expect(style.textColor).toBe('#ccc')
    expect(style.font).toBe('Arial')
    expect(style.fontSize).toBe(13)
  })

  it('缺省/空配置回退默认图表样式', () => {
    const style = chartStyleFromConfig(null)
    expect(style.color).toBe(DEFAULT_THEME_CONFIG.chart.palette.join(','))
    expect(style.font).toBe(DEFAULT_THEME_CONFIG.chart.fontFamily)
    expect(style.fontSize).toBe(DEFAULT_THEME_CONFIG.chart.fontSize)
    expect(style.textColor).toBe(DEFAULT_THEME_CONFIG.chart.textColor)
  })

  it('空配色板回退默认配色', () => {
    expect(chartStyleFromConfig({ chart: { palette: [] } }).color).toBe(DEFAULT_THEME_CONFIG.chart.palette.join(','))
  })
})
