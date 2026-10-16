import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { warning } = vi.hoisted(() => ({ warning: vi.fn() }));

vi.mock('antd/es/message', () => ({ default: { warning } }));

import { authManager, handleLoginExpired } from './auth';

function createEnvironment(pathname = '/chat-ui/', search = '', hash = '#/chat') {
  const values = new Map([
    ['SOY-REACT_token', 'expired-token'],
    ['SOY-REACT_userInfo', '{"userName":"user-a"}'],
    ['unrelated', 'keep']
  ]);
  const environment = {
    localStorage: {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      removeItem: vi.fn((key: string) => values.delete(key))
    },
    location: { pathname, search, hash, href: '' }
  };

  vi.stubGlobal('window', environment);
  return { environment, values };
}

describe('Chat expired login destination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    warning.mockClear();
    authManager.resetUnauthorizedState();
  });

  afterEach(() => {
    authManager.resetUnauthorizedState();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    ['/chat-ui/', '', '#/chat'],
    ['/chat-ui/', '', '#/chat/conversation/123'],
    ['/chat-ui/', '?spaceId=138', '#/chat/conversation/123?mode=report']
  ])('returns to ABI home after expiry at %s%s%s', async (pathname, search, hash) => {
    const { environment, values } = createEnvironment(pathname, search, hash);

    await expect(handleLoginExpired()).resolves.toBe(true);
    await vi.advanceTimersByTimeAsync(1799);
    await vi.dynamicImportSettled();

    expect(warning).toHaveBeenCalledWith({
      content: '登录已过期，即将前往登录页 …',
      duration: 1.8,
      key: 'chat-login-expired'
    });
    expect(environment.location.href).toBe('');
    expect(values.get('SOY-REACT_token')).toBe('expired-token');

    await vi.advanceTimersByTimeAsync(1);

    expect(environment.location.href).toBe('/login?redirect=%2Fhome');
    expect(values.has('SOY-REACT_token')).toBe(false);
    expect(values.has('SOY-REACT_userInfo')).toBe(false);
    expect(values.get('unrelated')).toBe('keep');
  });

  it('preserves a custom expiration notice', async () => {
    createEnvironment();

    await handleLoginExpired('请重新登录');
    await vi.dynamicImportSettled();

    expect(warning).toHaveBeenCalledWith(expect.objectContaining({ content: '请重新登录' }));
  });

  it('handles concurrent expired responses only once', async () => {
    const { environment } = createEnvironment();

    const results = await Promise.all([handleLoginExpired(), handleLoginExpired()]);
    await vi.advanceTimersByTimeAsync(1800);
    await vi.dynamicImportSettled();

    expect(results).toEqual([true, false]);
    expect(warning).toHaveBeenCalledTimes(1);
    expect(environment.localStorage.removeItem.mock.calls.filter(([key]) => key === 'SOY-REACT_token')).toHaveLength(1);
    expect(environment.location.href).toBe('/login?redirect=%2Fhome');
  });

  it('keeps the host expiration handler immediate and skips the standalone redirect and notice', async () => {
    const { environment } = createEnvironment();
    const onTokenExpired = vi.fn();
    vi.stubGlobal('window', { ...environment, onTokenExpired });

    await handleLoginExpired();

    expect(onTokenExpired).toHaveBeenCalledTimes(1);
    expect(environment.localStorage.removeItem).toHaveBeenCalledWith('SOY-REACT_token');
    expect(environment.location.href).toBe('');
    expect(warning).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a pending expiration redirect when a new login session is synchronized', async () => {
    const { environment, values } = createEnvironment();

    await handleLoginExpired();
    authManager.resetUnauthorizedState();
    values.set('SOY-REACT_token', 'new-session-token');
    await vi.advanceTimersByTimeAsync(1800);
    await vi.dynamicImportSettled();

    expect(environment.location.href).toBe('');
    expect(environment.localStorage.removeItem).not.toHaveBeenCalled();
    expect(values.get('SOY-REACT_token')).toBe('new-session-token');
  });
});
