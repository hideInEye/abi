function hasPackage(id: string, packageName: string): boolean {
  return id.replaceAll('\\', '/').includes(`/node_modules/${packageName}/`)
}

/** Dashboard shell runtimes shared by management and read-only rendering routes. */
export function dashboardCandidateManualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined

  if (hasPackage(id, 'react') || hasPackage(id, 'react-dom') || hasPackage(id, 'scheduler')) {
    return 'vendor-react'
  }
  if (hasPackage(id, 'react-router') || hasPackage(id, 'react-router-dom') || hasPackage(id, 'history')) {
    return 'vendor-router'
  }
  if (hasPackage(id, 'mobx') || hasPackage(id, 'mobx-react') || hasPackage(id, 'mobx-react-lite')) {
    return 'vendor-state'
  }
  return undefined
}
