import {describe, expect, it} from 'vitest';
import {
    applyDataTransform,
    evaluateCondition,
    evaluateVisibilityRule,
    RuntimeConfigError,
} from './runtime-config';

describe('runtime config interpreter', () => {
    it('evaluates only the supported visibility grammar', () => {
        expect(evaluateVisibilityRule("{enabled} === 'true'", {enabled: true})).toBe(true);
        expect(evaluateVisibilityRule('window.location.href = "https://attacker"', {})).toBe(false);
    });

    it('runs validated condition and transform DSLs', () => {
        expect(evaluateCondition({count: 3}, {version: 1, mode: 'all', conditions: [{path: 'count', operator: 'gte', value: 2}]})).toBe(true);
        expect(applyDataTransform([{id: 2}, {id: 1}], {version: 1, steps: [{type: 'sort', path: 'id', direction: 'asc'}, {type: 'limit', count: 1}]})).toEqual([{id: 1}]);
    });

    it('migrates only a legacy identity transform and rejects arbitrary scripts', () => {
        expect(applyDataTransform({ok: true}, 'function filter(data){ return data }')).toEqual({ok: true});
        expect(() => applyDataTransform({}, 'function filter(data){ fetch("/token"); return data }')).toThrow(RuntimeConfigError);
        expect(() => applyDataTransform({}, {version: 1, steps: [{type: 'select', path: '__proto__.polluted'}]})).toThrow(RuntimeConfigError);
    });
});
