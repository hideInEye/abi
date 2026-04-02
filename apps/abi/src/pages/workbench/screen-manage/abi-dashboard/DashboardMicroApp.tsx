import { loadMicroApp } from 'qiankun'
import type { CSSProperties } from 'react'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'
import { store } from '@/store'
import { resetStore } from '@/store/slice/auth'

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

  useEffect(() => {
    const container = document.getElementById(containerId)
    if (!container) {
      return undefined
    }

    const microApp = loadMicroApp({
      container: `#${containerId}`,
      entry: import.meta.env.VITE_MICRO_ABI_DASHBOARD_ENTRY,
      name: 'abi-dashboard',
      props: {
        hostBasePath: getDashboardHostBasePath(),
        initialPath,
        onTokenExpired: () => {
          store.dispatch(resetStore())
        }
      }
    })

    return () => {
      microApp.mountPromise.then(() => microApp.unmount())
    }
  }, [containerId, initialPath])

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
