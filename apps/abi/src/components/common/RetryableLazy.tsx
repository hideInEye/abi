import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { Component, Suspense, createElement, lazy, useMemo, useState } from 'react'

type LazyModule<Props extends object> = { default: ComponentType<Props> }

interface LazyLoadBoundaryProps {
  children: ReactNode
  onError: (error: unknown) => void
  onRetry: () => void
}

interface LazyLoadBoundaryState {
  error: unknown
}

class LazyLoadBoundary extends Component<LazyLoadBoundaryProps, LazyLoadBoundaryState> {
  state: LazyLoadBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): LazyLoadBoundaryState {
    return { error }
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-96px min-w-160px flex flex-col items-center justify-center gap-8px rounded-8px bg-#f6f8fc px-16px py-12px text-14px text-#64748b" role="alert">
        <span>功能模块加载失败</span>
        <button className="rounded-6px border border-#cbd5e1 bg-white px-12px py-6px text-#475569" type="button" onClick={this.props.onRetry}>
          重新加载
        </button>
      </div>
    )
  }
}

interface RetryableLazyProps<Props extends object> {
  loader: () => Promise<LazyModule<Props>>
  componentProps: Props
  fallback: ReactNode
}

function getRetryableModuleUrl(error: unknown): string | null {
  if (typeof window === 'undefined') return null
  const detail = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error)
  const candidates = detail.match(/https?:\/\/[^\s"'()]+\.js(?:\?[^\s"'()]*)?/g) ?? []

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate, window.location.href)
      if (url.origin === window.location.origin && url.pathname.endsWith('.js')) return url.href
    } catch {
      // Ignore malformed error details and fall back to the original loader.
    }
  }
  return null
}

async function loadRetryModule<Props extends object>(moduleUrl: string, attempt: number): Promise<LazyModule<Props>> {
  const url = new URL(moduleUrl)
  url.searchParams.set('__lazy_retry', String(attempt))
  const module = await import(/* @vite-ignore */ url.href) as Record<string, unknown>
  if (module.default) return module as LazyModule<Props>

  const exports = Object.entries(module).filter(([name]) => name !== '__esModule')
  const namedMatch = exports.find(([name]) => decodeURIComponent(url.pathname).includes(name))
  const component = namedMatch?.[1] ?? (exports.length === 1 ? exports[0][1] : null)
  if (!component) throw new Error('重试模块没有可解析的组件导出')
  return { default: component as ComponentType<Props> }
}

export function RetryableLazy<Props extends object>({ loader, componentProps, fallback }: RetryableLazyProps<Props>) {
  const [attempt, setAttempt] = useState(0)
  const [retryModuleUrl, setRetryModuleUrl] = useState<string | null>(null)
  const activeLoader = useMemo(
    () => attempt > 0 && retryModuleUrl
      ? () => loadRetryModule<Props>(retryModuleUrl, attempt)
      : loader,
    [attempt, loader, retryModuleUrl],
  )
  const LazyComponent = useMemo(() => lazy(activeLoader), [activeLoader])

  return (
    <LazyLoadBoundary
      key={attempt}
      onError={error => setRetryModuleUrl(getRetryableModuleUrl(error))}
      onRetry={() => setAttempt(value => value + 1)}
    >
      <Suspense fallback={fallback}>
        {createElement(LazyComponent as ComponentType<any>, componentProps)}
      </Suspense>
    </LazyLoadBoundary>
  )
}

interface LazyFeatureFallbackProps {
  label?: string
  style?: CSSProperties
}

export function LazyFeatureFallback({ label = '正在加载…', style }: LazyFeatureFallbackProps) {
  return (
    <div
      aria-busy="true"
      className="min-h-96px min-w-160px flex items-center justify-center rounded-8px bg-#f6f8fc px-16px text-14px text-#64748b"
      role="status"
      style={style}
    >
      {label}
    </div>
  )
}
