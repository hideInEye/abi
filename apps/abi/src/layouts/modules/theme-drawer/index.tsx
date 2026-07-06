import { SimpleScrollbar } from '@sa/materials'

import { closeThemeDrawer, getThemeDrawerVisible } from '@/store/slice/app'

import ConfigOperation from './modules/ConfigOperation'
import DarkMode from './modules/DarkMode'
import LayoutMode from './modules/LayoutMode'
import PageFun from './modules/PageFun'
import ThemeColor from './modules/ThemeColor'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

const ThemeDrawer = memo(() => {
  const { t } = useTranslation()

  const dispatch = useAppDispatch()

  const themeDrawerVisible = useAppSelector(getThemeDrawerVisible)

  function close() {
    dispatch(closeThemeDrawer())
  }

  return (
    <CommonDrawer footer={<ConfigOperation />} open={themeDrawerVisible} styles={{ body: { padding: 0 } }} title={t('theme.themeDrawerTitle')} onClose={close}>
      <SimpleScrollbar>
        <div className="overflow-x-hidden px-24px pb-24px pt-8px">
          <ADivider>{t('theme.themeSchema.title')}</ADivider>
          <DarkMode />
          <ADivider>{t('theme.layoutMode.title')}</ADivider>
          <LayoutMode />
          <ADivider>{t('theme.themeColor.title')}</ADivider>
          <ThemeColor />
          <ADivider>{t('theme.pageFunTitle')}</ADivider>
          <PageFun />
        </div>
      </SimpleScrollbar>
    </CommonDrawer>
  )
})

export default ThemeDrawer
