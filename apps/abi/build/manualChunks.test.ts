import { describe, expect, it } from 'vitest'

import { abiCandidateManualChunks } from './manualChunks'

describe('ABI candidate vendor chunks', () => {
  it('keeps stable runtime families in explicit vendors', () => {
    expect(abiCandidateManualChunks('/repo/node_modules/.pnpm/react@18/node_modules/react/index.js')).toBe('vendor-react')
    expect(abiCandidateManualChunks('/repo/node_modules/react-router-dom/dist/index.js')).toBe('vendor-router')
    expect(abiCandidateManualChunks('/repo/node_modules/@reduxjs/toolkit/dist/index.js')).toBe('vendor-state')
    expect(abiCandidateManualChunks('/repo/node_modules/i18next/dist/index.js')).toBe('vendor-platform')
    expect(abiCandidateManualChunks('/repo/node_modules/axios/lib/index.js')).toBe('vendor-platform')
    expect(abiCandidateManualChunks('/repo/node_modules/rc-field-form/es/index.js')).toBe('vendor-ui-foundation')
    expect(abiCandidateManualChunks('/repo/packages/color/src/index.ts')).toBe('vendor-ui-foundation')
  })

  it('leaves optional UI and feature packages to route-level splitting', () => {
    for (const packageName of ['antd', 'rc-picker', 'rc-select', '@antv/g6', 'monaco-editor', 'quill', 'html2canvas']) {
      expect(abiCandidateManualChunks(`/repo/node_modules/${packageName}/index.js`)).toBeUndefined()
    }
  })
})
