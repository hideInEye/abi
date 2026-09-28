import type { MicroApp } from 'qiankun'

type DashboardApp = Pick<
  MicroApp,
  'bootstrapPromise' | 'getStatus' | 'loadPromise' | 'mountPromise' | 'unmount' | 'update'
>

export function createDashboardSessionManager() {
  let releasePrevious = () => Promise.resolve()

  return (container: HTMLElement, load: () => DashboardApp, onError: (error: unknown) => void) => {
    let disposed = false
    let disposal: Promise<void> | undefined
    let app: DashboardApp | undefined
    let updateVersion = 0
    const report = (error: unknown) => onError(error)
    let pending = releasePrevious()
      .then(async () => {
        if (disposed) return
        app = load()
        app.loadPromise.catch(report)
        app.bootstrapPromise.catch(report)
        await app.mountPromise
      })
      .catch(report)

    const dispose = () => {
      if (disposal) return disposal
      disposed = true
      // React 不会等待异步 cleanup；把自行创建的容器暂存到文档中，直到 qiankun 完成卸载。
      container.hidden = true
      container.ownerDocument.body.appendChild(container)
      disposal = pending
        .then(async () => {
          if (app?.getStatus() === 'MOUNTED') await app.unmount()
        })
        .catch(report)
        .finally(() => {
          app = undefined
          container.remove()
        })
      return disposal
    }
    releasePrevious = dispose

    return {
      dispose,
      update(props: Record<string, unknown>) {
        updateVersion += 1
        const version = updateVersion
        pending = pending
          .then(async () => {
            if (!disposed && version === updateVersion && app?.getStatus() === 'MOUNTED') {
              await app.update?.(props)
            }
          })
          .catch(report)
        return pending
      }
    }
  }
}

export const startDashboardSession = createDashboardSessionManager()
