import {AxiosError} from 'axios'
import type {AxiosResponse, CreateAxiosDefaults, InternalAxiosRequestConfig} from 'axios'
import {describe, expect, it, vi} from 'vitest'

import {createFlatRequest} from './index'

type RequestSignal = NonNullable<InternalAxiosRequestConfig['signal']>

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return {config, data, headers: {}, status: 200, statusText: 'OK'}
}

describe('request cancellation lifecycle', () => {
  it('does not abort a controller after a successful request has settled', async () => {
    let signal: RequestSignal | undefined
    const request = createFlatRequest({adapter: async config => {
      signal = config.signal
      return response(config, {code: 200, data: true})
    }}, {
      isBackendSuccess: () => true,
      transformBackendResponse: result => result.data,
    })

    await request({url: '/success'})
    request.cancelAllRequest()

    expect(signal?.aborted).toBe(false)
  })

  it('cleans terminal network and business failures', async () => {
    const signals: RequestSignal[] = []
    const onError = vi.fn()
    const networkRequest = createFlatRequest({adapter: async config => {
      if (config.signal) signals.push(config.signal)
      throw new Error('offline')
    }}, {onError})
    await networkRequest({url: '/network-failure'})
    networkRequest.cancelAllRequest()

    const businessRequest = createFlatRequest({adapter: async config => {
      if (config.signal) signals.push(config.signal)
      return response(config, {code: 500})
    }}, {
      isBackendSuccess: () => false,
      onError,
    })
    await businessRequest({url: '/business-failure'})
    businessRequest.cancelAllRequest()

    expect(signals.every(signal => !signal.aborted)).toBe(true)
  })

  it('keeps a retried request cancellable until its final attempt settles', async () => {
    let attempts = 0
    let secondSignal: RequestSignal | undefined
    let markSecondAttemptStarted: (() => void) | undefined
    const secondAttemptStarted = new Promise<void>(resolve => {
      markSecondAttemptStarted = resolve
    })
    const request = createFlatRequest({
      retries: 1,
      retryDelay: () => 0,
      adapter: async config => {
        attempts += 1
        if (attempts === 1) throw new AxiosError('offline', 'ERR_NETWORK', config)
        secondSignal = config.signal
        markSecondAttemptStarted?.()
        return new Promise((_, reject) => {
          config.signal?.addEventListener?.('abort', () => reject(new AxiosError('canceled', 'ERR_CANCELED', config)))
        })
      },
    } as CreateAxiosDefaults)

    const pending = request({method: 'GET', url: '/retry'})
    await secondAttemptStarted
    request.cancelAllRequest()
    await pending

    expect(attempts).toBe(2)
    expect(secondSignal?.aborted).toBe(true)
  })
})
