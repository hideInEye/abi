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

    // 路由快速切换时容器会先于微应用加载完成被移除，qiankun 各生命周期 promise 会同时 reject，
    // 统一兜底避免 Uncaught (in promise)；仅在组件仍存活时输出真实加载错误
    let cancelled = false
    const handleLifecycleError = (error: unknown) => {
      if (!cancelled) {
        console.error('[abi-dashboard] 微应用加载失败:', error)
      }
    }
    microApp.loadPromise.catch(handleLifecycleError)
    microApp.bootstrapPromise.catch(handleLifecycleError)
    microApp.mountPromise.catch(handleLifecycleError)

    return () => {
      cancelled = true
      microAppRef.current = null
      microApp.mountPromise
        .then(() => microApp.unmount())
        .catch(() => {
          // 加载被路由切换打断（容器已移除），无需卸载
        })
    }
  }, [containerId, initialPath])

  // routeTitle 变化时更新微应用 props
  useEffect(() => {
    const microApp = microAppRef.current
    if (microApp && microApp.getStatus() === 'MOUNTED') {
      microApp.update?.({
        pageTitle: routeTitle || undefined
      })
    }
  }, [routeTitle])

  // spaceId 变化时通知微应用刷新
  useEffect(() => {
    const microApp = microAppRef.current
    if (microApp && microApp.getStatus() === 'MOUNTED') {
      microApp.update?.({
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
