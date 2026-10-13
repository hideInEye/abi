import {readFileSync} from 'node:fs';
import {Empty} from 'antd';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, describe, expect, it, vi} from 'vitest';

import MyScreen from './MyScreen';

const source = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');

afterEach(() => vi.unstubAllGlobals());

describe('published screens presentation', () => {
    it('renders the original search, filter, empty state and pagination controls', () => {
        vi.stubGlobal('localStorage', {getItem: () => null});
        const markup = renderToStaticMarkup(createElement(MyScreen));
        for (const icon of ['search', 'filter', 'down', 'left', 'right']) {
            expect(markup).toContain(`data-icon="${icon}"`);
        }
        expect(markup).toContain('ant-input-affix-wrapper');
        expect(markup).toContain('ant-select-selector');
        expect(markup).toContain(renderToStaticMarkup(Empty.PRESENTED_IMAGE_SIMPLE));
        expect(markup).not.toMatch(/[⌕≡⌄▦‹›]/u);
    });

    it('reuses the shared search debounce and keeps optional features lazy', () => {
        const page = source('./MyScreen.tsx');
        expect(page).toContain('<SearchFilterBar');
        expect(page).toContain('onSearchChange={setSearchKeyword}');
        expect(page).not.toContain('searchTimerRef');
        for (const name of ['MyScreenDateRangeFilter', 'ShareRecordList', 'MyScreenUnpublishDialog']) {
            expect(page).toContain(`() => import('./${name}.tsx')`);
            expect(page).not.toMatch(new RegExp(`import .+ from ['"]\\./${name}`));
        }
    });

    it('retains contextual action hints without eagerly importing the share dialog', () => {
        const item = source('./MyScreenItem.tsx');
        for (const label of ['查看项目', '取消发布', '分享项目']) {
            expect(item).toContain(`<Popover content="${label}">`);
        }
        expect(item).toContain("() => import('./MyScreenShareDialog.tsx')");
    });
});
