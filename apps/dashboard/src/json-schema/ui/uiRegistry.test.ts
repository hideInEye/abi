import {describe, expect, it} from 'vitest';

import UIMap, {isAsyncUIRegistryEntry} from './index';

describe('UI registry loading boundaries', () => {
    it('keeps ordinary controls synchronous', () => {
        const entry = UIMap.get('input');
        expect(entry).toBeDefined();
        expect(isAsyncUIRegistryEntry(entry!)).toBe(false);
    });

    it('registers the code editor through an async loader', async () => {
        const entry = UIMap.get('code-editor');
        expect(entry).toBeDefined();
        expect(isAsyncUIRegistryEntry(entry!)).toBe(true);

        if (!entry || !isAsyncUIRegistryEntry(entry)) return;
        const module = await entry.loader();
        expect(module.default).toBeTypeOf('function');
    });
});
