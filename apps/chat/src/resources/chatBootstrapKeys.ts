import { createStableRequestKey } from './requestResource'

export interface ChatBootstrapIdentity {
  spaceId: number
  userName: string
}

export interface ChatBootstrapKeys {
  conversations: string
  groups: string
  models: string
  semantic: string
}

export function getChatBootstrapKeys(identity: ChatBootstrapIdentity): ChatBootstrapKeys {
  const params = { spaceId: identity.spaceId, userName: identity.userName }
  return {
    conversations: createStableRequestKey('chat-conversations', params),
    groups: createStableRequestKey('chat-groups', params),
    models: createStableRequestKey('chat-models', params),
    semantic: createStableRequestKey('chat-semantic', params),
  }
}
