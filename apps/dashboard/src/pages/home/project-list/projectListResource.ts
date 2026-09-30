import type {IPage, IProjectInfo} from '../../../designer/DesignerType';
import {createStableRequestKey, RequestResource} from '../../../runtime/requestResource';

export interface ProjectListQuery {
    current: number;
    endTime?: string;
    keywords?: string;
    size: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    spaceId?: number;
    startTime?: string;
    statusFilter?: string;
}

export type ProjectListPage = IPage<IProjectInfo>;
export type ProjectListFetcher = (query: ProjectListQuery, signal: AbortSignal) => Promise<ProjectListPage>;

export function readDashboardSpaceId(): number | undefined {
    const value = Number(localStorage.getItem('spaceId'));
    return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function normalizeProjectListQuery(query: ProjectListQuery): ProjectListQuery {
    return {
        current: Math.max(1, Math.trunc(query.current || 1)),
        endTime: query.endTime || undefined,
        keywords: query.keywords?.trim() || undefined,
        size: Math.max(1, Math.trunc(query.size || 12)),
        sortField: query.sortField || undefined,
        sortOrder: query.sortOrder || undefined,
        spaceId: query.spaceId,
        startTime: query.startTime || undefined,
        statusFilter: query.statusFilter || undefined,
    };
}

export function getProjectListRequestKey(query: ProjectListQuery): string {
    return createStableRequestKey('dashboard-project-list', normalizeProjectListQuery(query));
}

async function fetchProjectList(query: ProjectListQuery, signal: AbortSignal): Promise<ProjectListPage> {
    const normalized = normalizeProjectListQuery(query);
    const {default: FetchUtil} = await import('../../../utils/FetchUtil');
    const response = await FetchUtil.post('/dashboard/api/v1/project/pageList', {
        current: normalized.current,
        endTime: normalized.endTime,
        keywords: normalized.keywords,
        size: normalized.size,
        sortField: normalized.sortField,
        sortOrder: normalized.sortOrder,
        spaceId: normalized.spaceId,
        startTime: normalized.startTime,
        status: normalized.statusFilter,
    }, {signal});
    if (response.code !== 200) throw new Error(response.msg || '项目列表加载失败');
    const data = response.data as Partial<ProjectListPage> | undefined;
    return {
        records: Array.isArray(data?.records) ? data.records : [],
        total: Number(data?.total) || 0,
        current: Number(data?.current) || normalized.current,
        size: Number(data?.size) || normalized.size,
    };
}

function keyMatchesSpace(key: string, spaceId: number | undefined): boolean {
    if (!key.startsWith('dashboard-project-list:')) return false;
    try {
        const params = JSON.parse(key.slice(key.indexOf(':') + 1));
        return params.spaceId === (spaceId ?? '__undefined__');
    } catch {
        return false;
    }
}

export class ProjectListRequestClient {
    private readonly resource = new RequestResource<ProjectListPage>();

    constructor(private readonly fetcher: ProjectListFetcher = fetchProjectList) {}

    load(query: ProjectListQuery, options: {force?: boolean} = {}): Promise<ProjectListPage> {
        const normalized = normalizeProjectListQuery(query);
        const key = getProjectListRequestKey(normalized);
        return this.resource.load(key, signal => this.fetcher(normalized, signal), {force: options.force});
    }

    abort(key: string): void {
        this.resource.abort(key);
    }

    invalidateForSpace(spaceId: number | undefined): void {
        this.resource.invalidate(key => keyMatchesSpace(key, spaceId));
    }

    getSnapshot(query: ProjectListQuery) {
        return this.resource.getSnapshot(getProjectListRequestKey(query));
    }
}

export const projectListRequestClient = new ProjectListRequestClient();

export function getDefaultProjectListQuery(): ProjectListQuery {
    return {
        current: 1,
        size: 12,
        spaceId: readDashboardSpaceId(),
    };
}

export function preloadDefaultProjectList(): Promise<ProjectListPage> {
    return projectListRequestClient.load(getDefaultProjectListQuery());
}
