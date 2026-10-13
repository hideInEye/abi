import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { themeSettings } from '../../../theme/settings';
import { localStg } from '../../../utils/storage';
import { resetTheme, themeSlice } from './index';
import { initThemeSettings, toggleAuxiliaryColorModes, toggleCssDarkMode, toggleGrayscaleMode } from './shared';

vi.mock('@/utils/storage', () => ({ localStg: { get: vi.fn(), set: vi.fn() } }));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));

const source = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');

function readEffect(fileName: string, includes: string) {
  const file = ts.createSourceFile(fileName, source(fileName), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect' && node.arguments[0].getText(file).includes(includes)) callback = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(file);
  expect(callback).toBeDefined();
  return ts.transpileModule(`const run = ${callback!.getText(file)}; run();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('BUILD_TIME', 'current-build');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('configuration-only theme settings', () => {
  it('ignores all historical production theme values, not only sidebar widths', () => {
    vi.stubEnv('PROD', true);
    const cached = structuredClone(themeSettings);
    cached.sider.width = 220;
    cached.sider.mixWidth = 90;
    cached.themeScheme = 'dark';
    cached.themeColor = '#ff0000';
    cached.header.height = 100;
    cached.footer.visible = !themeSettings.footer.visible;
    cached.grayscale = true;
    vi.mocked(localStg.get).mockReturnValue(cached);

    expect(initThemeSettings()).toEqual(themeSettings);
    expect(localStg.get).not.toHaveBeenCalled();
    expect(localStg.set).not.toHaveBeenCalled();
  });

  it.each([true, false])('uses an independent complete configuration with no cache (production=%s)', production => {
    vi.stubEnv('PROD', production);
    vi.mocked(localStg.get).mockReturnValue(null);
    const settings = initThemeSettings();
    expect(settings).toEqual(themeSettings);
    expect(settings).not.toBe(themeSettings);
    expect(settings.sider).not.toBe(themeSettings.sider);
    expect(settings.tokens.light.colors).not.toBe(themeSettings.tokens.light.colors);
    settings.sider.width = 999;
    settings.tokens.light.colors.layout = '#ff0000';
    expect(initThemeSettings()).toEqual(themeSettings);
    expect(localStg.get).not.toHaveBeenCalled();
  });

  it('resets every in-memory setting to a fresh configuration', () => {
    const edited = structuredClone(themeSlice.getInitialState());
    edited.darkMode = true;
    edited.settings.sider.width = 220;
    edited.settings.layout.mode = 'horizontal';
    edited.settings.themeColor = '#ff0000';
    edited.settings.grayscale = true;
    edited.settings.colourWeakness = true;
    edited.settings.watermark.text = 'custom';
    const reset = themeSlice.reducer(edited, resetTheme());
    expect(reset.settings).toEqual(themeSettings);
    expect(reset.settings).not.toBe(themeSettings);
    expect(reset.darkMode).toBe(false);
  });

  it.each([
    ['dark', false, true],
    ['light', true, false],
    ['auto', true, true],
    ['auto', false, false]
  ] as const)('derives initial and reset dark mode from %s with system dark=%s', async (scheme, systemDark, expected) => {
    vi.resetModules();
    vi.doMock('@/theme/settings', () => ({ themeSettings: { ...themeSettings, themeScheme: scheme } }));
    vi.stubGlobal('window', { matchMedia: vi.fn(() => ({ matches: systemDark })) });
    try {
      const fresh = await import('./index');
      expect(fresh.themeSlice.getInitialState().darkMode).toBe(expected);
      const edited = { ...fresh.themeSlice.getInitialState(), darkMode: !expected };
      expect(fresh.themeSlice.reducer(edited, fresh.resetTheme()).darkMode).toBe(expected);
    } finally {
      vi.doUnmock('@/theme/settings');
      vi.resetModules();
    }
  });

  it('does not write theme caches or use build-time overrides; tab caching remains', () => {
    const provider = source('../../../components/stateful/AppProvider.tsx');
    expect(provider).not.toContain('cacheThemeSettings');
    expect(provider).toContain('dispatch(cacheTabs())');
    expect(source('./index.ts')).not.toContain('cacheThemeSettings');
    expect(source('./shared.ts')).not.toContain('overrideThemeFlag');
    expect(source('../../../theme/settings.ts')).not.toContain('overrideThemeSettings');
    expect(source('../../../App.tsx')).not.toMatch(/localStg\.set\('themeColor'/);
  });

  it('applies dark, grayscale and colour weakness on initial mount and resets, respecting explicit colour schemes', () => {
    const app = source('../../../App.tsx');
    expect(app).toMatch(/useEffect\(\(\) => \{\s*toggleCssDarkMode\(darkMode\)/);
    expect(app).toContain('toggleGrayscaleMode(themeSettings.grayscale)');
    expect(app).toContain('toggleAuxiliaryColorModes(themeSettings.colourWeakness)');
    expect(source('../../../components/stateful/AppProvider.tsx')).toContain("if (themeScheme !== 'auto') return");
  });

  it('clears stale DOM theme effects when the configured theme is restored', () => {
    const classes = new Set(['dark', 'grayscale']);
    const html = { classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) }, style: { filter: 'invert(80%)' } };
    vi.stubGlobal('document', { documentElement: html });
    runInNewContext(readEffect('../../../App.tsx', 'toggleCssDarkMode'), { darkMode: false, toggleCssDarkMode });
    runInNewContext(readEffect('../../../App.tsx', 'toggleGrayscaleMode'), { themeSettings, toggleGrayscaleMode, toggleAuxiliaryColorModes });
    expect(classes.has('dark')).toBe(false);
    expect(classes.has('grayscale')).toBe(themeSettings.grayscale);
    expect(html.style.filter).toBe('');
  });

  it('only subscribes to system colour changes in auto mode and cleans up the listener', () => {
    const effect = readEffect('../../../components/stateful/AppProvider.tsx', 'matchMedia');
    const media = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const matchMedia = vi.fn(() => media);
    const dispatch = vi.fn();
    const setDarkMode = (payload: boolean) => ({ type: 'theme/setDarkMode', payload });
    const context = { DARK_MODE_MEDIA_QUERY: '(prefers-color-scheme: dark)', dispatch, setDarkMode, window: { matchMedia } };
    for (const themeScheme of ['light', 'dark']) runInNewContext(effect, { ...context, themeScheme });
    expect(matchMedia).not.toHaveBeenCalled();
    const cleanup = runInNewContext(effect, { ...context, themeScheme: 'auto' });
    const handler = media.addEventListener.mock.calls[0][1];
    handler({ matches: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'theme/setDarkMode', payload: true });
    cleanup();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', handler);
  });
});
