import {afterEach, describe, expect, it} from 'vitest';
import canvasManager from '../header/items/canvas/CanvasManager';
import themeManager from '../header/items/theme/ThemeManager';

describe('designer manager lifecycle defaults', () => {
    afterEach(() => {
        canvasManager.destroy();
        themeManager.destroy();
    });

    it('restores canvas defaults during repeated initialization', () => {
        canvasManager.updateCanvasConfig({width: 800});
        canvasManager.setCanvasVisible(true);
        canvasManager.destroy();
        canvasManager.init({height: 720});

        expect(canvasManager.canvasConfig).toMatchObject({width: 1920, height: 720, adaptationType: 'scale'});
        expect(canvasManager.canvasVisible).toBe(false);
    });

    it('does not retain the previous project theme after destroy', () => {
        themeManager.updateThemeConfig([{id: 'custom', name: 'custom', colors: {}}]);
        themeManager.setThemeVisible(true);
        themeManager.destroy();

        expect(themeManager.themeConfig?.[0]?.id).toBe('0');
        expect(themeManager.themeVisible).toBe(false);
    });
});
