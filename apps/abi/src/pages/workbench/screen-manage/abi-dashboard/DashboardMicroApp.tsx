import { useRoute } from '@sa/simple-router'
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
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
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
    setLoadState('loading')
    const session = startDashboardSession(
      container,
      async signal => {
        const { loadMicroApp } = await import('qiankun')
        // Give the browser a paint between evaluating qiankun and mounting the child app.
        await new Promise<void>(resolve => window.setTimeout(resolve, 0))
        if (signal.aborted) return undefined
        return loadMicroApp(
          {
            container,
            entry: import.meta.env.VITE_MICRO_ABI_DASHBOARD_ENTRY,
            name: 'abi-dashboard',
            props: latestProps.current
          },
          { sandbox: { experimentalStyleIsolation: true } }
        )
      },
      error => {
        console.error('[abi-dashboard] 微应用生命周期失败:', error)
        if (!cancelled) setLoadState('error')
      },
      () => {
        if (!cancelled) setLoadState('ready')
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
      <div className="relative h-full min-h-320px overflow-hidden">
        <div className="h-full" ref={slotRef} />
        {loadState !== 'ready' && (
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
        )}
      </div>
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
