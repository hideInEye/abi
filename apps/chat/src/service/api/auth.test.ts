import { describe, expect, it, vi } from 'vitest'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('../request', () => ({ default: request }))

import { fetchLogout } from './auth'

describe('Chat auth API routes', () => {
  it('posts to the logout endpoint', () => {
    fetchLogout()

    expect(request).toHaveBeenCalledWith({ method: 'post', url: '/api/logout' })
  })
})
