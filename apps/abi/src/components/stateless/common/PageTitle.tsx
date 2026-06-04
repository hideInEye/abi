import { useRoute } from '@sa/simple-router'
import type { CSSProperties, FC } from 'react'

interface Props {
  readonly fallback?: string
  readonly style?: CSSProperties
}

const PageTitle: FC<Props> = ({ fallback = '', style }) => {
  const route = useRoute()
  const title = (typeof route.meta?.title === 'string' ? route.meta.title.trim() : '') || fallback

  if (!title) {
    return null
  }

  return <h1 style={style}>{title}</h1>
}

export default PageTitle
