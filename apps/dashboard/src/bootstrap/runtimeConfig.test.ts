import {describe, expect, it} from 'vitest';

import {
    applyDashboardRuntimeConfig,
    getApiTarget,
    getDashboardConfigPath,
    loadDashboardRuntimeConfig,
} from './runtimeConfig';

function response(body: string, status = 200): Response {
    return new Response(body, {status});
}

describe('dashboard runtime config', () => {
    it('keeps the existing development path and derives the production path from BASE_URL', () => {
        expect(getDashboardConfigPath('development', '/dashboard-ui/')).toBe('http://localhost:5174/config.json');
        expect(getDashboardConfigPath('production', '/dashboard-ui/')).toBe('/dashboard-ui/config.json');
    });

    it('loads and normalizes the API target', async () => {
        const result = await loadDashboardRuntimeConfig({
            fetchImpl: async () => response('{"VITE_API_TARGET":"https://api.example.com/"}'),
            path: '/config.json',
        });
        applyDashboardRuntimeConfig(result.config);
        expect(result.source).toBe('remote');
        expect(getApiTarget()).toBe('https://api.example.com');
    });

    it('falls back to relative requests only when config.json is absent', async () => {
        const result = await loadDashboardRuntimeConfig({fetchImpl: async () => response('', 404)});
        applyDashboardRuntimeConfig(result.config);
        expect(result).toEqual({config: {}, source: 'relative-fallback'});
        expect(getApiTarget()).toBe('');
    });

    it('rejects invalid JSON and server errors instead of silently booting with bad config', async () => {
        await expect(loadDashboardRuntimeConfig({fetchImpl: async () => response('<html>')})).rejects.toMatchObject({code: 'invalid-json'});
        await expect(loadDashboardRuntimeConfig({fetchImpl: async () => response('{}', 503)})).rejects.toMatchObject({code: 'http'});
    });

    it('times out and forwards caller cancellation', async () => {
        const fetchImpl: typeof fetch = (_input, init) => new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {once: true});
        });
        await expect(loadDashboardRuntimeConfig({fetchImpl, timeoutMs: 5})).rejects.toMatchObject({code: 'timeout'});

        const controller = new AbortController();
        const pending = loadDashboardRuntimeConfig({fetchImpl, signal: controller.signal, timeoutMs: 1_000});
        controller.abort();
        await expect(pending).rejects.toMatchObject({code: 'aborted'});
    });
});
