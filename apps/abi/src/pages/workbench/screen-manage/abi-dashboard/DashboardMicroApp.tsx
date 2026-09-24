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
  const [attempt, setAttempt] = useState(0)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')

  // 初次挂载微应用
  useEffect(() => {
    setLoadState('loading')
    let cancelled = false
    let launchTimer = 0
    let activeMicroApp: MicroApp | null = null
    const handleLifecycleError = (error: unknown) => {
      if (!cancelled) {
        console.error('[abi-dashboard] 微应用加载失败:', error)
        setLoadState('error')
      }
    }

    // Qiankun runtime is only needed on this route. A new task between runtime
    // evaluation and launch prevents both costs from forming one long task.
    void import('qiankun').then(({ loadMicroApp }) => {
      if (cancelled) return
      launchTimer = window.setTimeout(() => {
        if (cancelled || !document.getElementById(containerId)) return
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
        activeMicroApp = microApp
        microAppRef.current = microApp

        // 路由快速切换时容器会先于微应用加载完成被移除，qiankun 各生命周期 promise 会同时 reject，
        // 统一兜底避免 Uncaught (in promise)；仅在组件仍存活时输出真实加载错误
        microApp.loadPromise.catch(handleLifecycleError)
        microApp.bootstrapPromise.catch(handleLifecycleError)
        microApp.mountPromise.then(() => {
          if (!cancelled) setLoadState('ready')
        }).catch(handleLifecycleError)
      }, 0)
    }).catch(handleLifecycleError)

    return () => {
      cancelled = true
      window.clearTimeout(launchTimer)
      microAppRef.current = null
      const microApp = activeMicroApp
      if (microApp) {
        microApp.mountPromise
          .then(() => microApp.unmount())
          .catch(() => {
            // 加载被路由切换打断（容器已移除），无需卸载
          })
      }
    }
  }, [attempt, containerId, initialPath])

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
      style={style}
    >
      <div className="relative h-full min-h-320px overflow-hidden">
        <div className="h-full" id={containerId} />
        {loadState !== 'ready' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-16px bg-#f4f6fb" role={loadState === 'error' ? 'alert' : 'status'}>
            {loadState === 'loading' ? (
              <>
                <div className="h-48px w-48px animate-spin rounded-full border-4 border-#dce4f5 border-t-primary" />
                <strong className="text-16px text-#4b5563">正在加载数据大屏...</strong>
              </>
            ) : (
              <>
                <strong className="text-18px text-#374151">数据大屏加载失败</strong>
                <button className="rounded-8px border-0 bg-primary px-18px py-10px text-white" type="button" onClick={() => setAttempt(value => value + 1)}>
                  重新加载
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
