import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

describe('global feedback context contract', () => {
  it('binds context-backed Antd APIs under the app holder', () => {
    const provider = source('./AppProvider.tsx')
    expect(provider).toContain('App.useApp()')
    expect(provider).toMatch(/<App\b[^>]*>[\s\S]*?<ContextHolder\s*\/>[\s\S]*?\{children\}[\s\S]*?<\/App>/)
    for (const api of ['message', 'modal', 'notification']) {
      expect(provider).toContain(`window.$${api} = ${api}`)
      expect(provider).not.toContain(`from 'antd/es/${api}'`)
    }
  })

  it('keeps the holder under the existing theme provider without suspending the router', () => {
    const app = source('../../App.tsx')
    expect(app).toMatch(/<AConfigProvider[\s\S]*?theme=\{antdTheme\}[\s\S]*?<AppProvider>/)
    const provider = source('./AppProvider.tsx')
    expect(provider).not.toContain('Suspense')
    expect(provider).not.toContain('import(')
  })
})
