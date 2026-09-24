import {describe, expect, it, vi} from 'vitest';

vi.mock('../../../utils/FetchUtil', () => ({
    default: {post: vi.fn()},
}));

import {
    getProjectListRequestKey,
    ProjectListRequestClient,
    type ProjectListPage,
} from './projectListResource';

function page(current: number, name: string): ProjectListPage {
    return {current, records: [{id: String(current), name}], size: 12, total: 1};
}

describe('projectListResource', () => {
    it('includes space, pagination, sorting and active filters in the key', () => {
        const first = getProjectListRequestKey({
            current: 1,
            keywords: ' risk ',
            size: 12,
            sortField: 'updateTime',
            sortOrder: 'desc',
            spaceId: 7,
            statusFilter: '0',
        });
        const equivalent = getProjectListRequestKey({
            statusFilter: '0',
            spaceId: 7,
            sortOrder: 'desc',
            sortField: 'updateTime',
            size: 12,
            keywords: 'risk',
            current: 1,
        });
        const nextPage = getProjectListRequestKey({current: 2, keywords: 'risk', size: 12, spaceId: 7});

        expect(first).toBe(equivalent);
        expect(nextPage).not.toBe(first);
    });

    it('does not let an aborted old page replace the latest page', async () => {
        const resolvers = new Map<number, (value: ProjectListPage) => void>();
        const client = new ProjectListRequestClient((query) => new Promise(resolve => {
            resolvers.set(query.current, resolve);
        }));
        const firstQuery = {current: 1, size: 12, spaceId: 7};
        const secondQuery = {current: 2, size: 12, spaceId: 7};
        const first = client.load(firstQuery).catch(error => error);
        client.abort(getProjectListRequestKey(firstQuery));
        const second = client.load(secondQuery);

        resolvers.get(2)?.(page(2, 'latest'));
        await second;
        resolvers.get(1)?.(page(1, 'stale'));
        const firstResult = await first;

        expect(firstResult).toMatchObject({name: 'AbortError'});
        expect(client.getSnapshot(secondQuery)).toMatchObject({
            status: 'success',
            data: page(2, 'latest'),
        });
        expect(client.getSnapshot(firstQuery).data).toBeUndefined();
    });
});
