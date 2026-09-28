import { useRoute } from '@sa/simple-router'
import { Alert, Button } from 'antd'
import { loadMicroApp } from 'qiankun'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

import { useAppSelector } from '@/hooks/business/useStore'
import { getSpaceId } from '@/store/slice/app'
import { handleLoginExpired } from '@/utils/auth'

import { startDashboardSession } from './dashboardSession'

const { VITE_BASE_URL } = import.meta.env
const IDLE_RELEASE_DELAY = 5 * 60 * 1000

interface DashboardMicroAppProps {
  readonly className?: string
  readonly containerId: string
  readonly initialPath: string
  readonly style?: CSSProperties
}

type DashboardPage = DashboardMicroAppProps & { pageTitle?: string }
const DashboardHostContext = createContext<((page: DashboardPage) => () => void) | null>(null)

export function DashboardMicroAppHost({ children }: { readonly children: ReactNode }) {
  const [page, setPage] = useState<DashboardPage>()
  const [active, setActive] = useState(false)
  const activate = useCallback((nextPage: DashboardPage) => {
    setPage(nextPage)
    setActive(true)
    return () => setActive(false)
  }, [])

  useEffect(() => {
    if (active || !page) return undefined
    const timer = window.setTimeout(() => setPage(undefined), IDLE_RELEASE_DELAY)
    return () => window.clearTimeout(timer)
  }, [active, page])

  return (
    <DashboardHostContext.Provider value={activate}>
      {children}
      {page && (
        <DashboardInstance
          active={active}
          page={page}
        />
      )}
    </DashboardHostContext.Provider>
  )
}

function DashboardInstance({ active, page }: { readonly active: boolean; readonly page: DashboardPage }) {
  const spaceId = useAppSelector(getSpaceId)
  const slotRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<ReturnType<typeof startDashboardSession>>()
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const latestProps = useRef({})
  latestProps.current = {
    hostBasePath: qiankunWindow.__POWERED_BY_QIANKUN__ ? '/studio/chatbi' : VITE_BASE_URL,
    initialPath: page.initialPath,
    onTokenExpired: () => handleLoginExpired(),
    pageTitle: page.pageTitle,
    spaceId
  }

  useLayoutEffect(() => {
    const slot = slotRef.current
    if (!slot) return undefined
    const container = document.createElement('div')
    container.className = 'h-full'
    slot.appendChild(container)
    let cancelled = false
    setFailed(false)
    const session = startDashboardSession(
      container,
      () =>
        loadMicroApp(
          {
            container,
            entry: import.meta.env.VITE_MICRO_ABI_DASHBOARD_ENTRY,
            name: 'abi-dashboard',
            props: latestProps.current
          },
          { sandbox: { experimentalStyleIsolation: true } }
        ),
      error => {
        console.error('[abi-dashboard] 微应用生命周期失败:', error)
        if (!cancelled) setFailed(true)
      }
    )
    sessionRef.current = session

    return () => {
      cancelled = true
      sessionRef.current = undefined
      session.dispose()
    }
  }, [attempt])

  useEffect(() => {
    sessionRef.current?.update(latestProps.current)
  }, [attempt, page.initialPath, page.pageTitle, spaceId])

  return (
    <div
      className={page.className}
      hidden={!active}
      id={page.containerId}
      style={page.style}
    >
      {failed && (
        <Alert
          action={<Button onClick={() => setAttempt(value => value + 1)}>重试</Button>}
          message="数据大屏加载失败"
          type="error"
        />
      )}
      <div
        className="h-full"
        ref={slotRef}
      />
    </div>
  )
}

export default function DashboardMicroApp({ className, containerId, initialPath, style }: DashboardMicroAppProps) {
  const activate = useContext(DashboardHostContext)
  const route = useRoute()
  const pageTitle = typeof route.meta?.title === 'string' ? route.meta.title.trim() || undefined : undefined

  useLayoutEffect(
    () => activate?.({ className, containerId, initialPath, pageTitle, style }),
    [activate, className, containerId, initialPath, pageTitle, style]
  )

  return activate ? null : (
    <DashboardInstance
      active
      page={{ className, containerId, initialPath, pageTitle, style }}
    />
  )
}
