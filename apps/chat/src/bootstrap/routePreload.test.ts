import { describe, expect, it } from 'vitest'

import { resolveInitialChatRoute } from './routePreload'

describe('resolveInitialChatRoute', () => {
  it.each([
    ['#/chat/task/new', 'chat-task'],
    ['#/chat/conversation/123', 'chat-task'],
    ['#/chat/group/8', 'chat-group'],
    ['#/chat/skill', 'chat-skill'],
    ['#/chat/workshop?tab=mine', 'chat-workshop'],
    ['#/assistant-share-page/code', 'assistant-share'],
    ['#/dashboard_share_page/code', 'dashboard-share'],
    ['#/unknown', null],
  ])('maps %s to %s', (hash, expected) => {
    expect(resolveInitialChatRoute(hash)).toBe(expected)
  })
})
