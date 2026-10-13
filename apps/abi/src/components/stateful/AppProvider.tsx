import App from 'antd/es/app';

import { DARK_MODE_MEDIA_QUERY } from '@/constants/common';
import { cacheTabs } from '@/store/slice/tab';
import { getThemeSettings, setDarkMode } from '@/store/slice/theme';

function ContextHolder() {
  const { message, modal, notification } = App.useApp();
  window.$message = message;
  window.$modal = modal;
  window.$notification = notification;
  return null;
}

const AppProvider = memo(({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const themeScheme = useAppSelector(state => getThemeSettings(state).themeScheme);

  useEventListener(
    'beforeunload',
    () => {
      // If logout or space-switch sets this flag, skip caching to avoid persisting old tabs
      // which would be restored on next login.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).__SKIP_CACHE_ON_UNLOAD) return;

      dispatch(cacheTabs());
    },
    { target: window }
  );

  useEffect(() => {
    if (themeScheme !== 'auto') return;
    const mediaQueryList = window.matchMedia(DARK_MODE_MEDIA_QUERY);
    const handler = (event: MediaQueryListEvent) => {
      dispatch(setDarkMode(event.matches));
    };

    mediaQueryList.addEventListener('change', handler);
    return () => {
      mediaQueryList.removeEventListener('change', handler);
    };
  }, [dispatch, themeScheme]);

  return (
    <App className="h-full">
      <ContextHolder />
      {children}
    </App>
  );
});

export default AppProvider;
