import {describe, expect, it, vi} from 'vitest';

vi.mock('./auth.ts', () => ({getAuthorization: () => null, handleLoginExpired: vi.fn()}));

import {isSuccessfulNativeResult} from './FetchUtil';

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
});
