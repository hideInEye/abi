import { App } from 'antd';

import { DARK_MODE_MEDIA_QUERY } from '@/constants/common';
import { cacheTabs } from '@/store/slice/tab';
import { cacheThemeSettings } from '@/store/slice/theme';
import { setDarkMode } from '@/store/slice/theme/index.ts';

function ContextHolder() {
  const { message, modal, notification } = App.useApp();
  window.$message = message;
  window.$modal = modal;
  window.$notification = notification;
  return null;
}

const AppProvider = memo(({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();

  useEventListener(
    'beforeunload',
    () => {
      // If logout or space-switch sets this flag, skip caching to avoid persisting old tabs
      // which would be restored on next login.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).__SKIP_CACHE_ON_UNLOAD) return;

      dispatch(cacheTabs());
      dispatch(cacheThemeSettings());
    },
    { target: window }
  );

  useMount(() => {
    window.matchMedia(DARK_MODE_MEDIA_QUERY).addEventListener('change', event => {
      dispatch(setDarkMode(event.matches));
    });
  });

  return (
    <App className="h-full">
      <ContextHolder />
      {children}
    </App>
  );
});

export default AppProvider;
