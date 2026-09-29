function hasPackage(id: string, packageName: string): boolean {
  return id.replaceAll('\\', '/').includes(`/node_modules/${packageName}/`)
}

const platformPackages = [
  'axios',
  'axios-retry',
  'dayjs',
  'i18next',
  'is-retry-allowed',
  'json5',
  'nanoid',
  'nprogress',
  'qs',
  'react-i18next',
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
  'colord',
  'rc-dialog',
  'rc-field-form',
  'rc-input',
  'rc-motion',
  'rc-notification',
  'rc-resize-observer',
  'rc-textarea',
  'rc-tooltip',
  'rc-util',
  'resize-observer-polyfill',
  'stylis',
  'throttle-debounce',
]

/** Stable ABI runtimes only; route and feature dependencies stay under Rollup ownership. */
export function abiCandidateManualChunks(id: string): string | undefined {
  const normalizedId = id.replaceAll('\\', '/')
  if (normalizedId.includes('/packages/color/')) return 'vendor-ui-foundation'
  if (!id.includes('node_modules')) return undefined

  if (hasPackage(id, 'react') || hasPackage(id, 'react-dom') || hasPackage(id, 'scheduler')) {
    return 'vendor-react'
  }
  if (hasPackage(id, 'react-router') || hasPackage(id, 'react-router-dom') || hasPackage(id, 'history')) {
    return 'vendor-router'
  }
  if (
    hasPackage(id, '@reduxjs/toolkit')
    || hasPackage(id, 'react-redux')
    || hasPackage(id, 'redux')
    || hasPackage(id, 'redux-thunk')
    || hasPackage(id, 'zustand')
    || hasPackage(id, 'immer')
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
