import { describe, expect, it, vi } from 'vitest'

import { getChatBootstrapKeys } from './chatBootstrapKeys'
import { RequestResource } from './requestResource'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

describe('ChatBootstrap resource scenarios', () => {
  it('shares one group request between sidebar consumers', async () => {
    const resource = new RequestResource<string[]>()
    const key = getChatBootstrapKeys({ spaceId: 11, userName: 'tester' }).groups
    const loader = vi.fn(async () => ['group-a'])

    const [groupsForNavigation, groupsForMoveMenu] = await Promise.all([
      resource.load(key, loader),
      resource.load(key, loader),
    ])

    expect(loader).toHaveBeenCalledTimes(1)
    expect(groupsForNavigation).toEqual(['group-a'])
    expect(groupsForMoveMenu).toEqual(['group-a'])
  })

  it('keeps only the C snapshot after a rapid A to B to C switch', async () => {
    const resource = new RequestResource<string[]>()
    const identityA = { spaceId: 1, userName: 'tester' }
    const identityB = { spaceId: 2, userName: 'tester' }
    const identityC = { spaceId: 3, userName: 'tester' }
    const requestA = deferred<string[]>()
    const requestB = deferred<string[]>()
    const requestC = deferred<string[]>()
    const keyA = getChatBootstrapKeys(identityA).conversations
    const keyB = getChatBootstrapKeys(identityB).conversations
    const keyC = getChatBootstrapKeys(identityC).conversations

    const promiseA = resource.load(keyA, () => requestA.promise).catch(error => error)
    resource.abort(keyA)
    const promiseB = resource.load(keyB, () => requestB.promise).catch(error => error)
    resource.abort(keyB)
    const promiseC = resource.load(keyC, () => requestC.promise)

    requestC.resolve(['space-c'])
    await promiseC
    requestB.resolve(['space-b'])
    requestA.resolve(['space-a'])
    const [resultA, resultB] = await Promise.all([promiseA, promiseB])

    expect(resource.getSnapshot(keyC)).toMatchObject({ status: 'success', data: ['space-c'] })
    expect(resource.getSnapshot(keyA).data).toBeUndefined()
    expect(resource.getSnapshot(keyB).data).toBeUndefined()
    expect(resultA).toMatchObject({ name: 'AbortError' })
    expect(resultB).toMatchObject({ name: 'AbortError' })
  })
})
