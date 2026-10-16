import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authSlice, login, syncAuthFromStorage } from './index';

const mocks = vi.hoisted(() => ({
  fetchLogin: vi.fn(),
  fetchGetUserInfo: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  message: vi.fn(),
  resetTheme: vi.fn(() => ({ type: 'theme/resetTheme' }))
}));

vi.mock('@/service/api/platform', () => ({ fetchLogin: mocks.fetchLogin, fetchGetUserInfo: mocks.fetchGetUserInfo }));
vi.mock('@/utils/storage', () => ({ localStg: { get: mocks.get, set: mocks.set, remove: mocks.remove } }));
vi.mock('@/utils/jsencrypt', () => ({ encrypt: () => 'encrypted-password' }));
vi.mock('../route', () => ({ resetRouteStore: vi.fn() }));
vi.mock('../tab', () => ({ clearTabs: vi.fn() }));
vi.mock('../app', () => ({ setSpaceHidden: vi.fn() }));
vi.mock('../theme', () => ({ resetTheme: mocks.resetTheme }));
vi.mock('antd', () => ({ message: { error: mocks.message } }));

const user = { userId: '1', userName: 'demo', roles: [{ status: '0' }], buttons: [] };
const params = { username: 'demo', password: 'test-password' };
function createStore() {
  return configureStore({ reducer: { auth: authSlice.reducer } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockReturnValue(null);
  mocks.fetchLogin.mockResolvedValue({ data: { access_token: 'test-token' }, error: null });
  mocks.fetchGetUserInfo.mockResolvedValue({ error: null, response: { data: { user } } });
});
afterEach(() => vi.unstubAllGlobals());

describe('login theme reset', () => {
  it('resets only after login and user information requests complete successfully', async () => {
    let completeUserInfo!: (value: unknown) => void;
    mocks.fetchGetUserInfo.mockReturnValue(new Promise(resolve => { completeUserInfo = resolve; }));
    const store = createStore();
    const pending = store.dispatch(login(params));
    await vi.waitFor(() => expect(mocks.fetchGetUserInfo).toHaveBeenCalledOnce());
    expect(mocks.resetTheme).not.toHaveBeenCalled();

    completeUserInfo({ error: null, response: { data: { user } } });
    const result = await pending;
    expect(result.payload).toEqual({ token: 'test-token', userInfo: user });
    expect(mocks.resetTheme).toHaveBeenCalledOnce();
    expect(store.getState().auth.token).toBe('test-token');
  });

  it.each(['login-error', 'user-info-error', 'no-role', 'rejected-request'])('does not reset the theme on %s', async failure => {
    if (failure === 'login-error') mocks.fetchLogin.mockResolvedValue({ error: new Error('failed') });
    if (failure === 'user-info-error') mocks.fetchGetUserInfo.mockResolvedValue({ error: new Error('failed') });
    if (failure === 'no-role') mocks.fetchGetUserInfo.mockResolvedValue({ error: null, response: { data: { user: { ...user, roles: [] } } } });
    if (failure === 'rejected-request') mocks.fetchLogin.mockRejectedValue(new Error('network failed'));
    const result = await createStore().dispatch(login(params));
    expect(result.payload).toBe(false);
    expect(mocks.resetTheme).not.toHaveBeenCalled();
    if (failure === 'login-error' || failure === 'rejected-request') expect(mocks.fetchGetUserInfo).not.toHaveBeenCalled();
  });

  it('also resets when restoring a valid login session from another tab', () => {
    mocks.get.mockImplementation(key => key === 'token' ? 'shared-token' : key === 'userInfo' ? user : null);
    const dispatch = vi.fn();
    syncAuthFromStorage()(dispatch, vi.fn(), undefined);
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'theme/resetTheme' });
    expect(mocks.resetTheme).toHaveBeenCalledOnce();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('does not reset a theme when no authenticated session can be restored', () => {
    syncAuthFromStorage()(vi.fn(), vi.fn(), undefined);
    expect(mocks.resetTheme).not.toHaveBeenCalled();
  });

  it('updates the user without resetting theme or clearing storage for a remote session notification', () => {
    mocks.get.mockImplementation(key => key === 'token' ? 'shared-token' : key === 'userInfo' ? user : null);
    const dispatch = vi.fn();
    syncAuthFromStorage({ resetTheme: false })(dispatch, vi.fn(), undefined);
    expect(dispatch).toHaveBeenCalledWith({ type: 'auth/setAuthState', payload: { token: 'shared-token', userInfo: user } });
    expect(mocks.resetTheme).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
