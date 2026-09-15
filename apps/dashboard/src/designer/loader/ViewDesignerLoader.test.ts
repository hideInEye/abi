import {describe, expect, it} from 'vitest';
import {parseViewProjectData} from './viewProjectData';

describe('view project data', () => {
    it('returns null for absent or malformed project data', () => {
        expect(parseViewProjectData(null)).toBeNull();
        expect(parseViewProjectData({dataJson: '{broken'})).toBeNull();
        expect(parseViewProjectData({dataJson: {}})).toBeNull();
        expect(parseViewProjectData({dataJson: '[]'})).toBeNull();
        expect(parseViewProjectData({dataJson: '"text"'})).toBeNull();
    });

    it('parses a valid project payload', () => {
        expect(parseViewProjectData({dataJson: '{"layerManager":{}}'})).toEqual({layerManager: {}});
    });
});
