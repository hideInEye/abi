import { useRoute } from '@sa/simple-router'
import type { CSSProperties, FC } from 'react'

interface Props {
  readonly fallback?: string
  readonly style?: CSSProperties
}

const baseStyle: CSSProperties = {
  color: '#333333',
  // fontFamily: 'PingFangSC, PingFang SC',
  fontSize: '1.125rem',
  fontWeight: 600
}

const PageTitle: FC<Props> = ({ fallback = '', style }) => {
  const route = useRoute()
  const title = (typeof route.meta?.title === 'string' ? route.meta.title.trim() : '') || fallback

  if (!title) {
    return null
  }

  return <h1 style={{ ...baseStyle, ...style }}>{title}</h1>
}

export default PageTitle
