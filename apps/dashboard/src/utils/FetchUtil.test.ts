import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('./auth.ts', () => ({getAuthorization: () => null, handleLoginExpired: vi.fn()}));

import FetchUtil, {isSuccessfulNativeResult} from './FetchUtil';

afterEach(() => vi.unstubAllGlobals());

describe('dashboard native request business gate', () => {
    it('accepts successful and unwrapped native results', () => {
        expect(isSuccessfulNativeResult({code: 200, data: []})).toBe(true);
        expect(isSuccessfulNativeResult({rows: []})).toBe(true);
        expect(isSuccessfulNativeResult('text')).toBe(true);
    });

    it('rejects HTTP-200 business failures before the next step', () => {
        expect(isSuccessfulNativeResult({code: 500, msg: 'failed'})).toBe(false);
        expect(isSuccessfulNativeResult({success: false})).toBe(false);
    });

    it('propagates AbortError so request resources can discard stale responses', async () => {
        const abort = new Error('aborted');
        abort.name = 'AbortError';
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
        const controller = new AbortController();
        controller.abort();

        await expect(FetchUtil.get('/dashboard/api/v1/project/pageList', {
            signal: controller.signal,
        })).rejects.toMatchObject({name: 'AbortError'});
    });
});
