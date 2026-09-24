import {beforeEach, describe, expect, it, vi} from 'vitest';

import {registerAppCleanup, runRegisteredAppCleanup} from './appCleanup';

describe('dashboard app cleanup registry', () => {
    beforeEach(() => runRegisteredAppCleanup());

    it('does nothing before a designer runtime registers cleanup', () => {
        expect(() => runRegisteredAppCleanup()).not.toThrow();
    });

    it('runs a registered cleanup only once across component and app unmounts', () => {
        const cleanup = vi.fn();
        const componentCleanup = registerAppCleanup(cleanup);
        componentCleanup();
        runRegisteredAppCleanup();
        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('cleans the previous runtime before replacing its registration', () => {
        const first = vi.fn();
        const second = vi.fn();
        registerAppCleanup(first);
        registerAppCleanup(second);
        expect(first).toHaveBeenCalledTimes(1);
        runRegisteredAppCleanup();
        expect(second).toHaveBeenCalledTimes(1);
    });
});
