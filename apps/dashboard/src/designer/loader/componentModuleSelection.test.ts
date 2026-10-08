import {describe, expect, it} from 'vitest';

import type {ProjectDataType} from '../DesignerType.ts';
import {getRuntimeConvertNames, getRuntimeDefinitionNames} from './componentModuleSelection.ts';

describe('runtime component module selection', () => {
    it('selects only component definitions present in project data', () => {
        const data = {
            layerManager: {
                layerConfigs: {
                    group: {id: 'group', type: 'group'},
                    text: {id: 'text', type: 'BaseText'},
                    table: {id: 'table', type: 'LcBaseTable'},
                    carousel: {id: 'carousel', type: 'carousel'},
                    duplicate: {id: 'duplicate', type: 'BaseText'},
                },
            },
        } as unknown as ProjectDataType;

        expect(getRuntimeDefinitionNames(data)).toEqual(['BaseTable', 'BaseText', 'Carousel']);
        expect(getRuntimeConvertNames(data)).toEqual([]);
    });

    it('loads the image converter only for projects that use BaseImage', () => {
        const data = {
            layerManager: {layerConfigs: {image: {id: 'image', type: 'BaseImage'}}},
        } as unknown as ProjectDataType;

        expect(getRuntimeDefinitionNames(data)).toEqual(['BaseImage']);
        expect(getRuntimeConvertNames(data)).toEqual(['BaseImage']);
    });
});
