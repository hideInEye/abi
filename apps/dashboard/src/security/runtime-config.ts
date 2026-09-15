export type Scalar = string | number | boolean | null;

export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';

export interface ConditionClause {
    path: string;
    operator: ConditionOperator;
    value: Scalar;
}

export interface ConditionConfig {
    version: 1;
    mode: 'all' | 'any';
    conditions: ConditionClause[];
}

export type DataTransformStep =
    | {type: 'select'; path: string}
    | {type: 'filter'; condition: ConditionClause}
    | {type: 'limit'; count: number}
    | {type: 'sort'; path: string; direction: 'asc' | 'desc'};

export interface DataTransformConfig {
    version: 1;
    steps: DataTransformStep[];
}

export const EMPTY_DATA_TRANSFORM: DataTransformConfig = {version: 1, steps: []};
export const DEFAULT_CONDITION: ConditionConfig = {
    version: 1,
    mode: 'all',
    conditions: [{path: '', operator: 'eq', value: true}],
};

const FORBIDDEN_PATH_PARTS = new Set(['__proto__', 'prototype', 'constructor']);
const LEGACY_IDENTITY_TRANSFORM = /^(?:function\s+\w*\s*\(\s*(\w+)\s*\)\s*\{\s*return\s+\1\s*;?\s*\}|\(?\s*(\w+)\s*\)?\s*=>\s*\2)\s*;?$/;

export class RuntimeConfigError extends Error {
    constructor(message = '配置包含不受支持的旧版脚本，请手动迁移为 JSON 配置') {
        super(message);
        this.name = 'RuntimeConfigError';
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonValue(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
        return JSON.parse(trimmed);
    } catch {
        if (LEGACY_IDENTITY_TRANSFORM.test(trimmed)) return EMPTY_DATA_TRANSFORM;
        throw new RuntimeConfigError();
    }
}

function isSafePath(path: unknown): path is string {
    return typeof path === 'string' && path.split('.').every(part => !FORBIDDEN_PATH_PARTS.has(part));
}

function readPath(value: unknown, path: string): unknown {
    if (!path) return value;
    return path.split('.').reduce<unknown>((current, part) => {
        if (!isRecord(current) && !Array.isArray(current)) return undefined;
        return (current as Record<string, unknown>)[part];
    }, value);
}

function isScalar(value: unknown): value is Scalar {
    return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function parseConditionClause(value: unknown): ConditionClause {
    if (!isRecord(value) || !isSafePath(value.path) || !isScalar(value.value)) {
        throw new RuntimeConfigError('条件配置格式无效');
    }
    const operator = value.operator;
    if (!['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains'].includes(String(operator))) {
        throw new RuntimeConfigError('条件运算符不受支持');
    }
    return {path: value.path, operator: operator as ConditionOperator, value: value.value};
}

export function parseConditionConfig(value: unknown): ConditionConfig {
    const parsed = parseJsonValue(value);
    if (!isRecord(parsed) || parsed.version !== 1 || !['all', 'any'].includes(String(parsed.mode)) || !Array.isArray(parsed.conditions)) {
        throw new RuntimeConfigError('条件必须使用 version=1 的 JSON 配置');
    }
    return {
        version: 1,
        mode: parsed.mode as 'all' | 'any',
        conditions: parsed.conditions.map(parseConditionClause),
    };
}

function evaluateClause(data: unknown, condition: ConditionClause): boolean {
    const current = readPath(data, condition.path);
    switch (condition.operator) {
        case 'eq': return current === condition.value;
        case 'neq': return current !== condition.value;
        case 'gt': return typeof current === 'number' && typeof condition.value === 'number' && current > condition.value;
        case 'gte': return typeof current === 'number' && typeof condition.value === 'number' && current >= condition.value;
        case 'lt': return typeof current === 'number' && typeof condition.value === 'number' && current < condition.value;
        case 'lte': return typeof current === 'number' && typeof condition.value === 'number' && current <= condition.value;
        case 'contains': return typeof current === 'string' && typeof condition.value === 'string' && current.includes(condition.value);
    }
}

export function evaluateCondition(data: unknown, value: unknown): boolean {
    const config = parseConditionConfig(value);
    const results = config.conditions.map(condition => evaluateClause(data, condition));
    return config.mode === 'all' ? results.every(Boolean) : results.some(Boolean);
}

export function parseDataTransformConfig(value: unknown): DataTransformConfig {
    const parsed = parseJsonValue(value) ?? EMPTY_DATA_TRANSFORM;
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.steps)) {
        throw new RuntimeConfigError('数据转换必须使用 version=1 的 JSON 配置');
    }
    const steps = parsed.steps.map((step): DataTransformStep => {
        if (!isRecord(step) || typeof step.type !== 'string') throw new RuntimeConfigError('数据转换步骤格式无效');
        if (step.type === 'select' && isSafePath(step.path)) return {type: 'select', path: step.path};
        if (step.type === 'filter') return {type: 'filter', condition: parseConditionClause(step.condition)};
        if (step.type === 'limit' && Number.isInteger(step.count) && Number(step.count) >= 0) return {type: 'limit', count: Number(step.count)};
        if (step.type === 'sort' && isSafePath(step.path) && ['asc', 'desc'].includes(String(step.direction))) {
            return {type: 'sort', path: step.path, direction: step.direction as 'asc' | 'desc'};
        }
        throw new RuntimeConfigError(`不支持的数据转换步骤: ${String(step.type)}`);
    });
    return {version: 1, steps};
}

export function applyDataTransform(input: unknown, value: unknown): unknown {
    return parseDataTransformConfig(value).steps.reduce<unknown>((data, step) => {
        if (step.type === 'select') return readPath(data, step.path);
        if (step.type === 'filter') return Array.isArray(data) ? data.filter(item => evaluateClause(item, step.condition)) : data;
        if (step.type === 'limit') return Array.isArray(data) ? data.slice(0, step.count) : data;
        if (step.type === 'sort' && Array.isArray(data)) {
            const direction = step.direction === 'asc' ? 1 : -1;
            return [...data].sort((left, right) => {
                const leftValue = readPath(left, step.path);
                const rightValue = readPath(right, step.path);
                if (leftValue === rightValue) return 0;
                return String(leftValue) > String(rightValue) ? direction : -direction;
            });
        }
        return data;
    }, input);
}

export function evaluateVisibilityRule(rule: string, values: Record<string, unknown>): boolean {
    const trimmed = rule.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    const literalComparison = trimmed.match(/^(['"])(true|false)\1\s*={2,3}\s*(['"])(true|false)\3$/);
    if (literalComparison) return literalComparison[2] === literalComparison[4];

    const match = trimmed.match(/^\{([A-Za-z0-9_.-]+)\}\s*(!={2}|={2,3})\s*(['"])(.*?)\3$/);
    if (!match) return false;
    const [, key, operator, , expected] = match;
    const actual = String(values[key]);
    return operator.startsWith('!') ? actual !== expected : actual === expected;
}
