import {describe, expect, it} from 'vitest';
import {DEFAULT_MAP_RENDERER, parseMapRendererConfig, parsePlotRendererConfig} from './renderer-registry';

describe('renderer registry config', () => {
    it('accepts registered JSON renderer configurations', () => {
        expect(parsePlotRendererConfig({version: 1, type: 'line', options: {xField: 'date', yField: 'value'}}).type).toBe('line');
        expect(parseMapRendererConfig(JSON.stringify(DEFAULT_MAP_RENDERER))).toEqual(DEFAULT_MAP_RENDERER);
    });

    it('rejects scripts, unknown renderers and unsafe keys', () => {
        expect(() => parsePlotRendererConfig('function () {}')).toThrow();
        expect(() => parsePlotRendererConfig({version: 1, type: 'custom', options: {}})).toThrow();
        expect(() => parsePlotRendererConfig({version: 1, type: '__proto__', options: {}})).toThrow();
        expect(() => parsePlotRendererConfig(JSON.parse('{"version":1,"type":"line","options":{"__proto__":{}}}'))).toThrow();
        expect(() => parseMapRendererConfig({version: 1, type: 'standard', options: {zoom: '11'}})).toThrow();
    });
});
