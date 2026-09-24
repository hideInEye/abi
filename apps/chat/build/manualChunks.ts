function hasPackage(id: string, packageName: string): boolean {
  return id.replaceAll('\\', '/').includes(`/node_modules/${packageName}/`)
}

const platformPackages = [
  '@babel/runtime',
  'axios',
  'dayjs',
  'nanoid',
  'qs',
]

const uiFoundationPackages = [
  '@ant-design/colors',
  '@ant-design/cssinjs',
  '@ant-design/cssinjs-utils',
  '@ant-design/fast-color',
  '@ctrl/tinycolor',
  '@emotion/hash',
  '@emotion/unitless',
  '@rc-component/async-validator',
  '@rc-component/portal',
  '@rc-component/trigger',
  'classnames',
  'colord',
  'rc-collapse',
  'rc-dialog',
  'rc-field-form',
  'rc-input',
  'rc-motion',
  'rc-notification',
  'rc-overflow',
  'rc-resize-observer',
  'rc-textarea',
  'rc-tooltip',
  'rc-util',
  'react-is',
  'resize-observer-polyfill',
  'stylis',
  'throttle-debounce',
]

/** Chat's shared SPA shell runtimes; conversation capabilities remain feature chunks. */
export function chatCandidateManualChunks(id: string): string | undefined {
  const normalizedId = id.replaceAll('\\', '/')
  if (
    normalizedId.includes('/packages/auth/')
    || normalizedId.includes('/packages/axios/')
    || normalizedId.includes('/packages/utils/src/nanoid.ts')
  ) {
    return 'vendor-platform'
  }
  if (!id.includes('node_modules')) return undefined

  const isReactDomServerRuntime = normalizedId.includes('/react-dom/server')
    || normalizedId.includes('/react-dom/cjs/react-dom-server')

  // Server rendering is only used by the deferred Explore preview. Keeping it
  // out of the SPA runtime chunk prevents that optional renderer reaching share.
  if (isReactDomServerRuntime) return undefined

  if (
    hasPackage(id, 'react')
    || hasPackage(id, 'react-dom')
    || hasPackage(id, 'scheduler')
    || hasPackage(id, 'use-sync-external-store')
  ) {
    return 'vendor-react'
  }
  if (
    hasPackage(id, '@tanstack/react-router')
    || hasPackage(id, '@tanstack/router-core')
    || hasPackage(id, '@tanstack/history')
    || hasPackage(id, '@tanstack/store')
  ) {
    return 'vendor-router'
  }
  if (
    hasPackage(id, '@reduxjs/toolkit')
    || hasPackage(id, 'immer')
    || hasPackage(id, 'react-redux')
    || hasPackage(id, 'redux')
    || hasPackage(id, 'redux-persist')
    || hasPackage(id, 'redux-thunk')
    || hasPackage(id, 'zustand')
  ) {
    return 'vendor-state'
  }
  if (platformPackages.some(packageName => hasPackage(id, packageName))) {
    return 'vendor-platform'
  }
  if (uiFoundationPackages.some(packageName => hasPackage(id, packageName))) {
    return 'vendor-ui-foundation'
  }
  return undefined
}
