import { Suspense, lazy, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

import type { SvgIconAsset } from './SvgIconAssets'

const IconifyIcon = lazy(async () => {
  const { Icon } = await import('@iconify/react')
  return { default: Icon }
})

/**
 * Props
 *
 * - Support iconify and local svg icon
 * - If icon and localIcon are passed at the same time, localIcon will be rendered first
 */
interface Props {
  readonly className?: string
  /** Iconify icon name */
  readonly icon?: string
  /** Local svg icon name */
  readonly localIcon?: string
  readonly style?: CSSProperties
}

const defaultLocalIcon = 'no-icon'
const SvgIcon = ({ className, icon, localIcon, style }: Props) => {
  const iconName = localIcon || defaultLocalIcon
  const shouldRenderLocalIcon = Boolean(localIcon || !icon)
  const [localAsset, setLocalAsset] = useState<SvgIconAsset | null>(null)

  useEffect(() => {
    if (!shouldRenderLocalIcon) return undefined
    let active = true
    setLocalAsset(null)
    import('./SvgIconAssets')
      .then(module => module.loadSvgIconAsset(iconName))
      .then(asset => {
        if (active) setLocalAsset(asset)
      })
    return () => {
      active = false
    }
  }, [iconName, shouldRenderLocalIcon])

  /** If localIcon is passed, render localIcon first */
  return localIcon || !icon ? (
    <span
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={localAsset?.kind === 'markup' ? { __html: localAsset.markup } : undefined}
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        height: '1em',
        lineHeight: 1,
        overflow: 'hidden',
        width: '1em',
        ...style
      }}
    />
  ) : (
    <Suspense
      fallback={
        <span
          aria-hidden="true"
          className={className}
          style={{ display: 'inline-block', height: '1em', width: '1em', ...style }}
        />
      }
    >
      <IconifyIcon
        className={className}
        icon={icon}
        style={style}
      />
    </Suspense>
  )
}

export default SvgIcon
