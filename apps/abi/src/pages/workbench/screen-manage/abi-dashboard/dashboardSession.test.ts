import { describe, expect, it, vi } from 'vitest'

import { createDashboardSessionManager } from './dashboardSession'

function deferred() {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, reject, resolve }
}

function createContainer() {
  return {
    hidden: false,
    ownerDocument: { body: { appendChild: vi.fn() } },
    remove: vi.fn()
  } as unknown as HTMLElement
}

function createApp(mountPromise = Promise.resolve()) {
  return {
    bootstrapPromise: Promise.resolve(null),
    getStatus: vi.fn<() => 'MOUNTED' | 'SKIP_BECAUSE_BROKEN'>(() => 'MOUNTED'),
    loadPromise: Promise.resolve(null),
    mountPromise: mountPromise.then(() => null),
    unmount: vi.fn(async () => null),
    update: vi.fn(async (_props: Record<string, unknown>) => null)
  }
}

describe('Dashboard session lifecycle', () => {
  it('waits for the lazy runtime and child mount before reporting ready', async () => {
    const runtime = deferred()
    const mount = deferred()
    const app = createApp(mount.promise)
    const onReady = vi.fn()
    const session = createDashboardSessionManager()(
      createContainer(),
      async () => { await runtime.promise; return app },
      vi.fn(),
      onReady
    )
    const updated = session.update({ initialPath: '/projects' })
    expect(onReady).not.toHaveBeenCalled()
    runtime.resolve()
    await Promise.resolve()
    expect(onReady).not.toHaveBeenCalled()
    mount.resolve()
    await updated
    expect(onReady).toHaveBeenCalledOnce()
    expect(app.update).toHaveBeenCalledWith({ initialPath: '/projects' })
    await session.dispose()
  })

  it('cancels an abandoned lazy load before creating the micro app', async () => {
    const runtime = deferred()
    const loadMicroApp = vi.fn(() => createApp())
    const onReady = vi.fn()
    const container = createContainer()
    let signal: AbortSignal | undefined
    const session = createDashboardSessionManager()(
      container,
      async nextSignal => {
        signal = nextSignal
        await runtime.promise
        return nextSignal.aborted ? undefined : loadMicroApp()
      },
      vi.fn(),
      onReady
    )
    await vi.waitFor(() => expect(signal).toBeDefined())
    const disposal = session.dispose()
    expect(signal?.aborted).toBe(true)
    runtime.resolve()
    await disposal
    expect(loadMicroApp).not.toHaveBeenCalled()
    expect(onReady).not.toHaveBeenCalled()
    expect(container.remove).toHaveBeenCalledOnce()
  })

  it('reports a lazy runtime failure and allows the next session to load', async () => {
    const start = createDashboardSessionManager()
    const error = new Error('chunk unavailable')
    const onError = vi.fn()
    const container = createContainer()
    const first = start(container, async () => { throw error }, onError)
    await first.update({})
    expect(onError).toHaveBeenCalledWith(error)
    const onReady = vi.fn()
    const second = start(createContainer(), () => createApp(), vi.fn(), onReady)
    await second.update({})
    expect(container.remove).toHaveBeenCalledOnce()
    expect(onReady).toHaveBeenCalledOnce()
    await second.dispose()
  })

  it('waits for mounting and applies only the latest pending host props', async () => {
    const start = createDashboardSessionManager()
    const mount = deferred()
    const app = createApp(mount.promise)
    const session = start(createContainer(), () => app, vi.fn())
    const first = session.update({ initialPath: '/my-screen', spaceId: 1 })
    const last = session.update({ initialPath: '/projects', pageTitle: '大屏管理', spaceId: 2 })
    await Promise.resolve()
    expect(app.update).not.toHaveBeenCalled()
    mount.resolve()
    await Promise.all([first, last])
    expect(app.update).toHaveBeenCalledOnce()
    expect(app.update).toHaveBeenCalledWith({ initialPath: '/projects', pageTitle: '大屏管理', spaceId: 2 })
    await session.dispose()
  })

  it('keeps the container until pending mount and unmount both finish', async () => {
    const mount = deferred()
    const unmount = deferred()
    const app = createApp(mount.promise)
    app.unmount.mockImplementation(() => unmount.promise.then(() => null))
    const container = createContainer()
    const session = createDashboardSessionManager()(container, () => app, vi.fn())
    await Promise.resolve()
    const disposal = session.dispose()
    expect(session.dispose()).toBe(disposal)
    expect(container.hidden).toBe(true)
    expect(container.ownerDocument.body.appendChild).toHaveBeenCalledWith(container)
    expect(app.unmount).not.toHaveBeenCalled()
    expect(container.remove).not.toHaveBeenCalled()
    mount.resolve()
    await vi.waitFor(() => expect(app.unmount).toHaveBeenCalledOnce())
    expect(container.remove).not.toHaveBeenCalled()
    unmount.resolve()
    await disposal
    expect(container.remove).toHaveBeenCalledOnce()
  })

  it('serializes old teardown and new loading, skipping an already abandoned successor', async () => {
    const start = createDashboardSessionManager()
    const unmount = deferred()
    const app = createApp()
    app.unmount.mockImplementation(() => unmount.promise.then(() => null))
    const first = start(createContainer(), () => app, vi.fn())
    await first.update({})
    const skippedLoad = vi.fn(() => createApp())
    const second = start(createContainer(), skippedLoad, vi.fn())
    const nextLoad = vi.fn(() => createApp())
    const third = start(createContainer(), nextLoad, vi.fn())
    await vi.waitFor(() => expect(app.unmount).toHaveBeenCalledOnce())
    expect(skippedLoad).not.toHaveBeenCalled()
    expect(nextLoad).not.toHaveBeenCalled()
    unmount.resolve()
    await third.update({ initialPath: '/my-screen' })
    expect(skippedLoad).not.toHaveBeenCalled()
    expect(nextLoad).toHaveBeenCalledOnce()
    await Promise.all([first.dispose(), second.dispose(), third.dispose()])
  })

  it('waits for an in-flight update before teardown', async () => {
    const updating = deferred()
    const app = createApp()
    app.update.mockImplementation(() => updating.promise.then(() => null))
    const session = createDashboardSessionManager()(createContainer(), () => app, vi.fn())
    const update = session.update({ spaceId: 2 })
    await vi.waitFor(() => expect(app.update).toHaveBeenCalledOnce())
    const disposal = session.dispose()
    expect(app.unmount).not.toHaveBeenCalled()
    updating.resolve()
    await Promise.all([update, disposal])
    expect(app.unmount).toHaveBeenCalledOnce()
  })

  it('reports failed mounting and still releases the container', async () => {
    const mount = deferred()
    const app = createApp(mount.promise)
    app.getStatus.mockReturnValue('SKIP_BECAUSE_BROKEN')
    const container = createContainer()
    const onError = vi.fn()
    const session = createDashboardSessionManager()(container, () => app, onError)
    const error = new Error('mount failed')
    await Promise.resolve()
    mount.reject(error)
    await session.update({})
    await session.dispose()
    expect(onError).toHaveBeenCalledWith(error)
    expect(app.update).not.toHaveBeenCalled()
    expect(app.unmount).not.toHaveBeenCalled()
    expect(container.remove).toHaveBeenCalledOnce()
  })

  it('reports unmount failure without blocking the next instance', async () => {
    const start = createDashboardSessionManager()
    const app = createApp()
    const error = new Error('unmount failed')
    app.unmount.mockRejectedValue(error)
    const container = createContainer()
    const onError = vi.fn()
    const first = start(container, () => app, onError)
    await first.update({})
    const nextLoad = vi.fn(() => createApp())
    const second = start(createContainer(), nextLoad, vi.fn())
    await second.update({})
    expect(onError).toHaveBeenCalledWith(error)
    expect(container.remove).toHaveBeenCalledOnce()
    expect(nextLoad).toHaveBeenCalledOnce()
    await second.dispose()
  })
})
