export interface ChatWindowParams {
  chatId?: number | string;
  spaceId?: number | string;
}

export type ChatOpenResult = 'new-window' | 'blocked';

const CHAT_HOST_ROUTE = '/chat-ui';

function trimRightSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function trimLeftSlash(value: string) {
  return value.replace(/^\/+/, '');
}

function getChatHostRouteUrl() {
  const baseUrl = `${import.meta.env.VITE_BASE_URL || '/'}`.trim();

  // 支持绝对地址/协议相对地址作为 base
  if (/^https?:\/\//.test(baseUrl) || baseUrl.startsWith('//')) {
    const normalized = baseUrl.startsWith('//')
      ? `${window.location.protocol}${baseUrl}`
      : baseUrl;
    return `${trimRightSlash(normalized)}${CHAT_HOST_ROUTE}`;
  }

  if (baseUrl === '/' || baseUrl === '') {
    return CHAT_HOST_ROUTE;
  }

  return `/${trimLeftSlash(trimRightSlash(baseUrl))}${CHAT_HOST_ROUTE}`;
}

export function getChatStandaloneUrl(params?: ChatWindowParams) {
  const hashSearch = new URLSearchParams();

  const conversationId =
    params?.chatId !== undefined && params?.chatId !== null && `${params.chatId}` !== ''
      ? String(params.chatId)
      : '';

  if (params?.spaceId !== undefined && params?.spaceId !== null && `${params.spaceId}` !== '') {
    hashSearch.set('spaceId', String(params.spaceId));
  }

  const hashPath = conversationId
    ? `/chat/conversation/${encodeURIComponent(conversationId)}`
    : '/chat/';
  const hashQuery = hashSearch.toString();

  return `${getChatHostRouteUrl()}#${hashPath}${hashQuery ? `?${hashQuery}` : ''}`;
}

export function openChatConversationWindow(params?: ChatWindowParams): ChatOpenResult {
  const url = getChatStandaloneUrl(params);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (win) {
    return 'new-window';
  }
  return 'blocked';
}
