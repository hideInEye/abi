import { afterEach, describe, expect, it, vi } from 'vitest';

import { themeSettings } from '../theme/settings';
import { setupLoading } from './loading';

vi.mock('@/locales', () => ({ $t: () => '加载中' }));

afterEach(() => vi.unstubAllGlobals());

describe('loading theme source', () => {
  it('renders the configured theme colour without consulting browser storage', () => {
    const root = { innerHTML: '' };
    const getItem = vi.fn(() => '#ff0000');
    vi.stubGlobal('document', { getElementById: () => root });
    vi.stubGlobal('window', { localStorage: { getItem }, sessionStorage: { getItem } });
    vi.stubGlobal('localStorage', { getItem });
    setupLoading();
    const rgb = themeSettings.themeColor.slice(1).match(/.{2}/g)!.map(value => Number.parseInt(value, 16)).join(' ');
    expect(root.innerHTML).toContain(`--primary-color: ${rgb}`);
    expect(root.innerHTML).not.toContain('--primary-color: 255 0 0');
    expect(getItem).not.toHaveBeenCalled();
  });
});
