import { loadMicroApp } from 'qiankun'
import type { MicroApp } from 'qiankun'
import type { CSSProperties } from 'react'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'
import { useRoute } from '@sa/simple-router'
import { handleLoginExpired } from '@/utils/auth'
import { useAppSelector } from '@/hooks/business/useStore'
import { getSpaceId } from '@/store/slice/app'

const { VITE_BASE_URL } = import.meta.env

interface DashboardMicroAppProps {
  readonly className?: string
  readonly containerId: string
  readonly initialPath: string
  readonly style?: CSSProperties
}

function getDashboardHostBasePath() {
  return qiankunWindow.__POWERED_BY_QIANKUN__ ? '/studio/chatbi' : VITE_BASE_URL
}

export default function DashboardMicroApp(props: DashboardMicroAppProps) {
  const { className, containerId, initialPath, style } = props
  const route = useRoute()
  const routeTitle = typeof route.meta?.title === 'string' ? route.meta.title.trim() : ''
  const spaceId = useAppSelector(getSpaceId)
  const microAppRef = useRef<MicroApp | null>(null)

  // 初次挂载微应用
  useEffect(() => {
    const container = document.getElementById(containerId)
    if (!container) {
      return undefined
    }

    const microApp = loadMicroApp(
      {
        container: `#${containerId}`,
        entry: import.meta.env.VITE_MICRO_ABI_DASHBOARD_ENTRY,
        name: 'abi-dashboard',
        props: {
          hostBasePath: getDashboardHostBasePath(),
          initialPath,
          pageTitle: routeTitle || undefined,
          spaceId,
          onTokenExpired: () => {
            handleLoginExpired()
          }
        }
      },
      {
        sandbox: {
          experimentalStyleIsolation: true
        }
      }
    )
    microAppRef.current = microApp

    return () => {
      microApp.mountPromise.then(() => microApp.unmount())
      microAppRef.current = null
    }
  }, [containerId, initialPath])

  // routeTitle 变化时更新微应用 props
  useEffect(() => {
    if (microAppRef.current) {
      microAppRef.current.update?.({
        pageTitle: routeTitle || undefined
      })
    }
  }, [routeTitle])

  // spaceId 变化时通知微应用刷新
  useEffect(() => {
    if (microAppRef.current) {
      microAppRef.current.update?.({
        spaceId
      })
    }
  }, [spaceId])

  return (
    <div
      className={className}
      id={containerId}
      style={style}
    >
      数据大屏
    </div>
  )
}
