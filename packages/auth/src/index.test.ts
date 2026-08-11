import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthManager } from './index';

let stateKeyIndex = 0;

function createTestAuthManager({ redirectToLogin = vi.fn() }: { redirectToLogin?: ReturnType<typeof vi.fn> } = {}) {
  stateKeyIndex += 1;

  const clearAuth = vi.fn();
  const notify = vi.fn();
  const manager = createAuthManager({
    clearAuth,
    defaultRedirectDelay: 100,
    getCurrentPath: () => '/workbench/data-preparation/data-collection',
    getToken: () => 'token',
    notify,
    redirectToLogin,
    stateKey: `__AUTH_TEST_STATE_${stateKeyIndex}__`
  });

  return { clearAuth, manager, notify, redirectToLogin };
}

describe('createAuthManager unauthorized flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles concurrent unauthorized responses only once', async () => {
    const { clearAuth, manager, notify, redirectToLogin } = createTestAuthManager();

    await expect(manager.handleUnauthorized()).resolves.toBe(true);
    await expect(manager.handleUnauthorized()).resolves.toBe(false);

    expect(notify).toHaveBeenCalledTimes(1);
    expect(redirectToLogin).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);

    expect(clearAuth).toHaveBeenCalledTimes(1);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
    expect(redirectToLogin).toHaveBeenCalledWith({
      preserveRedirect: true,
      reason: 'unauthorized',
      redirectPath: '/workbench/data-preparation/data-collection'
    });
  });

  it('allows a later unauthorized response to retry after redirect failure', async () => {
    const redirectToLogin = vi.fn().mockRejectedValueOnce(new Error('navigation failed')).mockResolvedValue(undefined);
    const { manager, notify } = createTestAuthManager({ redirectToLogin });

    await expect(manager.handleUnauthorized()).resolves.toBe(true);
    await vi.advanceTimersByTimeAsync(100);

    await expect(manager.handleUnauthorized()).resolves.toBe(true);
    await vi.advanceTimersByTimeAsync(100);

    expect(notify).toHaveBeenCalledTimes(2);
    expect(redirectToLogin).toHaveBeenCalledTimes(2);
  });
});
