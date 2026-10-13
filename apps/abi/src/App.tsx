import { RouterProvider } from '@sa/simple-router';
import type { WatermarkProps } from 'antd';

import { router } from '@/router';
import { getLocale } from '@/store/slice/app';
import { getDarkMode, getThemeSettings, themeColors } from '@/store/slice/theme';
import { getAntdTheme, setupThemeVarsToHtml, toggleAuxiliaryColorModes, toggleCssDarkMode, toggleGrayscaleMode } from '@/store/slice/theme/shared';

import AppProvider from './components/stateful/AppProvider';
import GlobalLoading from './components/stateful/GlobalLoading';
import GlobalLoadingContainer from './components/stateless/common/GlobalLoadingContainer';
import TableEmpty from './components/stateless/common/TableEmpty';
import { antdLocales } from './locales/antd';

const watermarkProps: WatermarkProps = {
  font: {
    fontSize: 16
  },
  height: 128,
  offset: [12, 60],
  rotate: -15,
  width: 240,
  zIndex: 9999
};

function useTheme() {
  const themeSettings = useAppSelector(getThemeSettings);
  const colors = useAppSelector(themeColors);

  const darkMode = useAppSelector(getDarkMode);
  const antdTheme = getAntdTheme(colors, darkMode, themeSettings.tokens);

  useEffect(() => {
    setupThemeVarsToHtml(colors, themeSettings.tokens, themeSettings.recommendColor);
  }, [colors, themeSettings]);

  useEffect(() => {
    toggleCssDarkMode(darkMode);
  }, [darkMode]);

  useEffect(() => {
    toggleGrayscaleMode(themeSettings.grayscale);
    toggleAuxiliaryColorModes(themeSettings.colourWeakness);
  }, [themeSettings.grayscale, themeSettings.colourWeakness]);

  return { antdTheme, themeSettings };
}

const App = () => {
  const locale = useAppSelector(getLocale);

  const { antdTheme, themeSettings } = useTheme();
  const appContent = (
    <>
      <GlobalLoading />
      <RouterProvider
        fallback={<GlobalLoadingContainer />}
        router={router}
      />
    </>
  );

  return (
    <AConfigProvider
      button={{ classNames: { icon: 'align-1px  text-icon' } }}
      // card={{ styles: { body: { flex: 1, overflow: 'hidden', padding: '12px 16px ' } } }}
      locale={antdLocales[locale]}
      renderEmpty={componentName => (componentName === 'Table' ? <TableEmpty /> : undefined)}
      theme={antdTheme}
    >
      <AppProvider>
        {themeSettings.watermark.visible ? (
          <AWatermark
            className="h-full"
            content={themeSettings.watermark.text || 'Soybean'}
            {...watermarkProps}
          >
            {appContent}
          </AWatermark>
        ) : (
          <div className="h-full">{appContent}</div>
        )}
      </AppProvider>
    </AConfigProvider>
  );
};

export default App;
