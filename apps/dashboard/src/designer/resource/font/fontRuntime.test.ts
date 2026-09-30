import {afterEach, describe, expect, it, vi} from 'vitest';

import type {ProjectDataType} from '../../DesignerType.ts';
import {registerDashboardFonts} from './fontRuntime.ts';

describe('Dashboard font runtime', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('registers only a font referenced by view data without fetching the full catalog', () => {
        const add = vi.fn();
        const FontFaceMock = vi.fn(function FontFace(
            this: {family: string; source: string},
            family: string,
            source: string,
        ) {
            this.family = family;
            this.source = source;
        });
        vi.stubGlobal('FontFace', FontFaceMock);
        vi.stubGlobal('document', {fonts: {add}});

        registerDashboardFonts({
            layerManager: {
                layerConfigs: {
                    title: {style: {fontFamily: 'DouyinSansBold'}},
                },
            },
        } as unknown as ProjectDataType);

        expect(FontFaceMock).toHaveBeenCalledTimes(1);
        expect(FontFaceMock).toHaveBeenCalledWith(
            'DouyinSansBold',
            expect.stringContaining('DouyinSansBold'),
            expect.objectContaining({display: 'swap'}),
        );
        expect(add).toHaveBeenCalledTimes(1);
    });
});
