import { describe, expect, it } from 'vitest'

import { chatCandidateManualChunks } from './manualChunks'

describe('Chat candidate vendor chunks', () => {
  it('isolates stable shell, state, platform, and UI foundation runtimes', () => {
    expect(chatCandidateManualChunks('/repo/node_modules/react-dom/client.js')).toBe('vendor-react')
    expect(chatCandidateManualChunks('/repo/node_modules/@tanstack/react-router/dist/index.js')).toBe('vendor-router')
    expect(chatCandidateManualChunks('/repo/node_modules/@tanstack/router-core/dist/index.js')).toBe('vendor-router')
    expect(chatCandidateManualChunks('/repo/node_modules/react-redux/dist/index.js')).toBe('vendor-state')
    expect(chatCandidateManualChunks('/repo/node_modules/axios/lib/index.js')).toBe('vendor-platform')
    expect(chatCandidateManualChunks('/repo/packages/auth/src/index.ts')).toBe('vendor-platform')
    expect(chatCandidateManualChunks('/repo/node_modules/rc-field-form/es/index.js')).toBe('vendor-ui-foundation')
  })

  it('leaves the optional React DOM server renderer with its Explore feature', () => {
    expect(chatCandidateManualChunks('/repo/node_modules/react-dom/server.browser.js')).toBeUndefined()
    expect(
      chatCandidateManualChunks('/repo/node_modules/react-dom/cjs/react-dom-server.browser.production.min.js'),
    ).toBeUndefined()
  })

  it('does not promote conversation features into a common vendor', () => {
    for (const packageName of ['antd', 'rc-picker', 'echarts', 'react-syntax-highlighter', 'react-quill', 'recordrtc']) {
      expect(chatCandidateManualChunks(`/repo/node_modules/${packageName}/index.js`)).toBeUndefined()
    }
  })
})
