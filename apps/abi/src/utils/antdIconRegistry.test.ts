import { PassThrough } from 'node:stream'

import { createElement } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { defaultOutlinedIcon, getOutlinedIcon } from './antdIconRegistry'

function renderIcon(iconName: string): Promise<string> {
  const Icon = getOutlinedIcon(iconName)
  if (!Icon) throw new Error(`Missing icon: ${iconName}`)

  return new Promise((resolve, reject) => {
    const output = new PassThrough()
    let markup = ''
    output.on('data', chunk => {
      markup += chunk.toString()
    })
    output.on('end', () => resolve(markup))
    output.on('error', reject)
    const stream = renderToPipeableStream(createElement(Icon, { className: 'menu-icon', style: { fontSize: 18 } }), {
      onAllReady() {
        stream.pipe(output)
      },
      onError: reject
    })
  })
}

describe('menu Ant Design icons', () => {
  it.each([
    ['CodeSandboxOutlined', 'code-sandbox'],
    ['ProfileOutlined', 'profile'],
    ['AppstoreAddOutlined', 'appstore-add'],
    ['InboxOutlined', 'inbox']
  ])('renders the configured %s icon without changing its presentation props', async (name, label) => {
    const markup = await renderIcon(name)
    expect(markup).toContain(`aria-label="${label}"`)
    expect(markup).toContain('menu-icon')
    expect(markup).toContain('font-size:18px')
    expect(markup).toContain('<path')
  })

  it('supports other selector icons and keeps component identities stable', () => {
    for (const name of ['ApartmentOutlined', 'DropboxOutlined', 'ScheduleOutlined', 'RocketOutlined']) {
      expect(getOutlinedIcon(name)).toBeDefined()
      expect(getOutlinedIcon(name)).toBe(getOutlinedIcon(name))
    }
    expect(getOutlinedIcon('QuestionCircleOutlined')).toBe(defaultOutlinedIcon)
  })

  it.each([undefined, '', 'mdi:inbox-outline', 'menu-app-workshop', 'UnknownOutlined', 'toString'])(
    'does not classify %s as an Ant Design icon',
    name => {
      expect(getOutlinedIcon(name)).toBeUndefined()
    }
  )
})
