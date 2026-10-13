import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';

import ProjectListControls from './ProjectListControls';
import ProjectListCardView from './ProjectListCardView';

const source = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');

describe('project list presentation', () => {
    it('renders the original search, filter, toolbar and view icons', () => {
        const markup = renderToStaticMarkup(createElement(ProjectListControls, {
            children: null,
            columnOptions: [],
            dateRange: null,
            onBatchDelete: vi.fn(),
            onColumnToggle: vi.fn(),
            onDateRangeChange: vi.fn(),
            onNewProject: vi.fn(),
            onPreloadNewProject: vi.fn(),
            onReady: vi.fn(),
            onReset: vi.fn(),
            onSearchChange: vi.fn(),
            onSearchSubmit: vi.fn(),
            onViewModeChange: vi.fn(),
            searchKeyword: '',
            selectedCount: 0,
            viewMode: 'card',
        }));

        for (const icon of ['search', 'filter', 'plus', 'delete', 'unordered-list', 'appstore', 'setting', 'down']) {
            expect(markup).toContain(`data-icon="${icon}"`);
        }
        expect(markup).toContain('ant-input-affix-wrapper');
        expect(markup).toContain('ant-btn-dangerous');
        expect(markup).not.toMatch(/[⌕≡⌫☷▦⚙]/u);
    });

    it('renders card actions using SVG icons and the original more-menu trigger', () => {
        const markup = renderToStaticMarkup(createElement(ProjectListCardView, {
            onOperate: vi.fn(),
            onRename: vi.fn(),
            records: [{id: 'screen-1', name: '回归测试', status: '1'}],
            visibleKeys: ['name', 'status'],
        }));
        for (const icon of ['edit', 'eye', 'more']) {
            expect(markup).toContain(`data-icon="${icon}"`);
        }
        expect(markup).toContain('ant-dropdown-trigger');
        expect(markup).not.toMatch(/[✎◉⋯]/u);
    });

    it('retains the original empty state, pagination controls and confirmation UI', () => {
        const view = source('./ProjectListView.tsx');
        const controls = source('./ProjectListControls.tsx');
        expect(view).toContain('Empty.PRESENTED_IMAGE_SIMPLE');
        expect(view).toContain('<Select');
        expect(view).toContain('<Input');
        expect(view).toContain('<LeftOutlined');
        expect(view).toContain('<RightOutlined');
        expect(controls).toContain('<Popconfirm');
        expect(controls).toContain('onConfirm={onBatchDelete}');
        expect(controls).not.toContain('window.confirm');
    });

    it('keeps optional views, date filtering and operation dialogs behind dynamic imports', () => {
        const view = source('./ProjectListView.tsx');
        const controls = source('./ProjectListControls.tsx');
        const page = source('./ProjectList.tsx');
        for (const name of ['ProjectListCardView', 'ProjectListTableView', 'ProjectListControls']) {
            expect(view).toContain(`() => import('./${name}')`);
            expect(view).not.toMatch(new RegExp(`import (?!type\\b)[^;]+ from ['"]\\./${name}['"]`));
        }
        expect(controls).toContain("() => import('../../my-screen/MyScreenDateRangeFilter')");
        for (const name of ['NewProjectDialog', 'DelProjectDialog', 'CloneProjectDialog', 'ProjectRenameDialog']) {
            expect(page).toContain(`() => import('./${name}')`);
        }
    });

    it('uses only the shared search bar debounce when restoring its controls', () => {
        expect(source('./ProjectListControls.tsx')).toContain('<SearchFilterBar');
        expect(source('./ProjectList.tsx')).not.toContain('searchTimerRef');
        expect(source('./SearchFilterBar.tsx')).toContain('clearTimer();');
    });
});
