import { GLOBAL_SIDER_MENU_ID } from '@/constants/app';
import GlobalContent from '../modules/global-content';
import GlobalMenu from '../modules/global-menu';
import { getThemeSettings } from '@/store/slice/theme';

export function Component() {
    const themeSettings = useAppSelector(getThemeSettings)
  
  return (
    <div className='flex'>
      <div className={'h-full w-[15rem]'} id={GLOBAL_SIDER_MENU_ID} />
      <GlobalMenu mode={themeSettings.layout.mode} reverse={themeSettings.layout.reverseHorizontalMix} />

      <GlobalContent closePadding={true} />
    </div>
  );
}
