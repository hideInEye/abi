export type SvgIconAsset = { kind: 'markup'; markup: string }

const SVG_ROOT_PATTERN = /<svg\b([^>]*)>/i
const SVG_BOUNDARY_ATTRIBUTE_PATTERN = /\s(?:aria-hidden|focusable|height|width)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi

export function normalizeSvgIconMarkup(source: string): string {
  const svgStart = source.search(/<svg\b/i)
  if (svgStart < 0) return source

  const markup = source.slice(svgStart)
  return markup.replace(SVG_ROOT_PATTERN, (_match, attributes: string) => {
    const normalizedAttributes = attributes.replace(SVG_BOUNDARY_ATTRIBUTE_PATTERN, '')
    return `<svg${normalizedAttributes} aria-hidden="true" focusable="false" height="1em" width="1em">`
  })
}

const localIconModules = import.meta.glob<string>('../../../assets/svg-icon/*.svg', {
  import: 'default',
  query: '?raw'
})
const localIconLoaders = Object.fromEntries(
  Object.entries(localIconModules).map(([path, loader]) => [
    path
      .split('/')
      .pop()
      ?.replace(/\.svg$/, ''),
    loader
  ])
) as Record<string, () => Promise<string>>
const localIconPromises = new Map<string, Promise<SvgIconAsset>>()

export function loadSvgIconAsset(iconName: string): Promise<SvgIconAsset> {
  const resolvedName = localIconLoaders[iconName] ? iconName : 'no-icon'
  let promise = localIconPromises.get(resolvedName)
  if (!promise) {
    const loader = localIconLoaders[resolvedName]
    if (!loader) return Promise.resolve({ kind: 'markup', markup: '' })

    promise = loader().then(svg => ({
      kind: 'markup' as const,
      markup: normalizeSvgIconMarkup(svg)
    }))
    localIconPromises.set(resolvedName, promise)
  }
  return promise
}
