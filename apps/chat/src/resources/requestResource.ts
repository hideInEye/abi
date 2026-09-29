export type RequestResourceStatus = 'idle' | 'loading' | 'success' | 'error'

export interface RequestResourceSnapshot<T> {
  data?: T
  error?: Error
  status: RequestResourceStatus
  updatedAt?: number
}

interface CacheEntry<T> {
  data: T
  updatedAt: number
}

interface InflightEntry<T> {
  controller: AbortController
  promise: Promise<T>
  version: number
}

interface LoadOptions {
  force?: boolean
  maxAgeMs?: number
}

type KeyMatcher = string | ((key: string) => boolean)
type RequestLoader<T> = (signal: AbortSignal) => Promise<T>

const idleSnapshot = Object.freeze({ status: 'idle' as const })

function normalizeForKey(value: unknown, seen: WeakSet<object>): unknown {
  if (value === undefined) return '__undefined__'
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date) return value.toISOString()
  if (seen.has(value)) throw new TypeError('请求 key 参数不能包含循环引用')

  seen.add(value)
  if (Array.isArray(value)) {
    const normalized = value.map((item) => normalizeForKey(item, seen))
    seen.delete(value)
    return normalized
  }

  const normalized = Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = normalizeForKey((value as Record<string, unknown>)[key], seen)
      return result
    }, {})
  seen.delete(value)
  return normalized
}

export function createStableRequestKey(scope: string, params: unknown): string {
  return `${scope}:${JSON.stringify(normalizeForKey(params, new WeakSet()))}`
}

function abortError(): Error {
  const error = new Error('请求已取消')
  error.name = 'AbortError'
  return error
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function matches(matcher: KeyMatcher, key: string): boolean {
  return typeof matcher === 'string' ? matcher === key : matcher(key)
}

export class RequestResource<T> {
  private readonly cache = new Map<string, CacheEntry<T>>()
  private readonly inflight = new Map<string, InflightEntry<T>>()
  private readonly listeners = new Set<() => void>()
  private readonly snapshots = new Map<string, RequestResourceSnapshot<T>>()
  private readonly versions = new Map<string, number>()

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (key: string): RequestResourceSnapshot<T> => {
    return this.snapshots.get(key) ?? idleSnapshot
  }

  peek(key: string): T | undefined {
    return this.cache.get(key)?.data
  }

  load(key: string, loader: RequestLoader<T>, options: LoadOptions = {}): Promise<T> {
    const maxAgeMs = options.maxAgeMs ?? 30_000
    const cached = this.cache.get(key)
    if (!options.force && cached && Date.now() - cached.updatedAt <= maxAgeMs) {
      return Promise.resolve(cached.data)
    }

    const active = this.inflight.get(key)
    if (active) return active.promise

    const version = (this.versions.get(key) ?? 0) + 1
    this.versions.set(key, version)
    const controller = new AbortController()
    this.setSnapshot(key, {
      data: cached?.data,
      status: 'loading',
      updatedAt: cached?.updatedAt,
    })

    const promise = loader(controller.signal)
      .then((data) => {
        if (controller.signal.aborted || this.versions.get(key) !== version) {
          throw abortError()
        }
        const updatedAt = Date.now()
        this.cache.set(key, { data, updatedAt })
        this.setSnapshot(key, { data, status: 'success', updatedAt })
        return data
      })
      .catch((error: unknown) => {
        const isCurrent = this.versions.get(key) === version
        if (isCurrent && (controller.signal.aborted || toError(error).name === 'AbortError')) {
          const currentCache = this.cache.get(key)
          this.setSnapshot(
            key,
            currentCache
              ? { data: currentCache.data, status: 'success', updatedAt: currentCache.updatedAt }
              : idleSnapshot,
          )
        } else if (isCurrent) {
          this.setSnapshot(key, {
            data: cached?.data,
            error: toError(error),
            status: 'error',
            updatedAt: cached?.updatedAt,
          })
        }
        throw error
      })
      .finally(() => {
        if (this.inflight.get(key)?.version === version) this.inflight.delete(key)
      })

    this.inflight.set(key, { controller, promise, version })
    return promise
  }

  update(key: string, data: T): void {
    const updatedAt = Date.now()
    this.cache.set(key, { data, updatedAt })
    this.setSnapshot(key, { data, status: 'success', updatedAt })
  }

  abort(matcher: KeyMatcher): void {
    for (const key of this.allKeys()) {
      if (!matches(matcher, key)) continue
      this.versions.set(key, (this.versions.get(key) ?? 0) + 1)
      this.inflight.get(key)?.controller.abort()
      this.inflight.delete(key)
      const cached = this.cache.get(key)
      this.setSnapshot(
        key,
        cached
          ? { data: cached.data, status: 'success', updatedAt: cached.updatedAt }
          : idleSnapshot,
      )
    }
  }

  invalidate(matcher: KeyMatcher): void {
    for (const key of this.allKeys()) {
      if (!matches(matcher, key)) continue
      this.versions.set(key, (this.versions.get(key) ?? 0) + 1)
      this.inflight.get(key)?.controller.abort()
      this.inflight.delete(key)
      this.cache.delete(key)
      this.snapshots.delete(key)
    }
    this.emit()
  }

  clear(): void {
    this.invalidate(() => true)
  }

  private allKeys(): Set<string> {
    return new Set([
      ...this.cache.keys(),
      ...this.inflight.keys(),
      ...this.snapshots.keys(),
    ])
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener())
  }

  private setSnapshot(key: string, snapshot: RequestResourceSnapshot<T>): void {
    this.snapshots.set(key, snapshot)
    this.emit()
  }
}

