export type DashboardRuntimeConfig = Record<string, unknown>;

export type DashboardConfigSource = 'remote' | 'relative-fallback';

export interface DashboardConfigResult {
    config: DashboardRuntimeConfig;
    source: DashboardConfigSource;
}

export type DashboardConfigFailureCode = 'aborted' | 'http' | 'invalid-json' | 'invalid-shape' | 'network' | 'timeout';

export class DashboardConfigError extends Error {
    readonly code: DashboardConfigFailureCode;
    readonly cause?: unknown;

    constructor(code: DashboardConfigFailureCode, message: string, cause?: unknown) {
        super(message);
        this.name = 'DashboardConfigError';
        this.code = code;
        this.cause = cause;
    }
}

interface LoadDashboardRuntimeConfigOptions {
    baseUrl?: string;
    fetchImpl?: typeof fetch;
    mode?: string;
    path?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
let apiTarget = '';

export function getDashboardConfigPath(
    mode = import.meta.env.MODE,
    baseUrl = import.meta.env.BASE_URL,
): string {
    if (mode === 'development') return 'http://localhost:5174/config.json';
    return `${baseUrl.replace(/\/?$/, '/')}config.json`;
}

export function applyDashboardRuntimeConfig(config: DashboardRuntimeConfig): void {
    const target = config.VITE_API_TARGET;
    apiTarget = typeof target === 'string' ? target.replace(/\/$/, '') : '';
}

export function getApiTarget(): string {
    return apiTarget;
}

function abortError(): DashboardConfigError {
    return new DashboardConfigError('aborted', '运行配置加载已取消');
}

function isPlainObject(value: unknown): value is DashboardRuntimeConfig {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function loadDashboardRuntimeConfig({
    baseUrl = import.meta.env.BASE_URL,
    fetchImpl = fetch,
    mode = import.meta.env.MODE,
    path = getDashboardConfigPath(mode, baseUrl),
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
}: LoadDashboardRuntimeConfigOptions = {}): Promise<DashboardConfigResult> {
    if (signal?.aborted) throw abortError();

    const requestController = new AbortController();
    let didTimeout = false;
    const abortFromCaller = () => requestController.abort();
    signal?.addEventListener('abort', abortFromCaller, {once: true});
    const timeoutId = setTimeout(() => {
        didTimeout = true;
        requestController.abort();
    }, timeoutMs);

    try {
        const response = await fetchImpl(path, {
            cache: 'no-store',
            signal: requestController.signal,
        });

        // 保持既有语义：部署未提供 config.json 时使用相对请求路径。
        if (response.status === 404) {
            return {config: {}, source: 'relative-fallback'};
        }
        if (!response.ok) {
            throw new DashboardConfigError('http', `运行配置请求失败（HTTP ${response.status}）`);
        }

        let config: unknown;
        try {
            config = JSON.parse(await response.text());
        } catch (error) {
            throw new DashboardConfigError('invalid-json', '运行配置不是有效 JSON', error);
        }
        if (!isPlainObject(config)) {
            throw new DashboardConfigError('invalid-shape', '运行配置必须是 JSON 对象');
        }
        return {config, source: 'remote'};
    } catch (error) {
        if (didTimeout) {
            throw new DashboardConfigError('timeout', `运行配置加载超过 ${timeoutMs}ms`);
        }
        if (signal?.aborted) throw abortError();
        if (error instanceof DashboardConfigError) throw error;
        throw new DashboardConfigError('network', '运行配置请求失败，请检查网络后重试', error);
    } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', abortFromCaller);
    }
}
