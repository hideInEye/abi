import { describe, expect, it } from 'vitest'

import { dashboardCandidateManualChunks } from './manualChunks'

describe('Dashboard candidate vendor chunks', () => {
  it('isolates the stable renderer, router, and MobX runtimes', () => {
    expect(dashboardCandidateManualChunks('/repo/node_modules/react/index.js')).toBe('vendor-react')
    expect(dashboardCandidateManualChunks('/repo/node_modules/react-router-dom/dist/index.js')).toBe('vendor-router')
    expect(dashboardCandidateManualChunks('/repo/node_modules/mobx-react-lite/dist/index.js')).toBe('vendor-state')
  })

  it('keeps designer and visualization dependencies asynchronous', () => {
    for (const packageName of ['antd', '@antv/g2plot', 'monaco-editor', 'react-moveable', 'pixi.js']) {
      expect(dashboardCandidateManualChunks(`/repo/node_modules/${packageName}/index.js`)).toBeUndefined()
    }
  })
})
