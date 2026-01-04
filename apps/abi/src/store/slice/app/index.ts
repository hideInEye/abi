import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { setLng } from '@/locales';
import { localStg } from '@/utils/storage';

import type { AppThunk } from '../..';
import { getThemeSettings } from '../theme';

interface InitialStateType {
  contentXScrollable: boolean;
  fullContent: boolean;
  isMobile: boolean;
  locale: App.I18n.LangType;
  localeOptions: App.I18n.LangOption[];
  mixSiderFixed: boolean;
  reloadFlag: boolean;
  siderCollapse: boolean;
  spaceId: number;
  themeDrawerVisible: boolean;
  spaceHidden: boolean
}

const initialState: InitialStateType = {
  contentXScrollable: false,
  fullContent: false,
  /** Is mobile layout */
  isMobile: false,
  locale: localStg.get('lang') || 'zh-CN',
  localeOptions: [
    {
      key: 'zh-CN',
      label: '中文'
    },
    {
      key: 'en-US',
      label: 'English'
    }
  ],
  mixSiderFixed: false,
  reloadFlag: true,
  siderCollapse: false,
  spaceId: 0,
  themeDrawerVisible: false,
  spaceHidden: false,
};

export const appSlice = createSlice({
  initialState,
  name: 'app',
  reducers: {
    changeLocale(state, { payload }: PayloadAction<App.I18n.LangType>) {
      state.locale = payload;
      setLng(payload);
      localStg.set('lang', payload);
    },
    changeSpaceId(state, { payload }: PayloadAction<number>) {
      state.spaceId = payload;
    },
    closeThemeDrawer: state => {
      state.themeDrawerVisible = false;
    },
    openThemeDrawer: state => {
      state.themeDrawerVisible = true;
    },
    setContentXScrollable: (state, action: PayloadAction<boolean>) => {
      state.contentXScrollable = action.payload;
    },
    setIsMobile: (state, { payload }: { payload: boolean }) => {
      state.isMobile = payload;
    },
    setMixSiderFixed: (state, action: PayloadAction<boolean>) => {
      state.mixSiderFixed = action.payload;
    },
    setReloadFlag: (state, action: PayloadAction<boolean>) => {
      state.reloadFlag = action.payload;
    },
    setSiderCollapse: (state, { payload }: PayloadAction<boolean>) => {
      state.siderCollapse = payload;
    },
    toggleFullContent: state => {
      state.fullContent = !state.fullContent;
    },
    toggleMixSiderFixed: state => {
      state.mixSiderFixed = !state.mixSiderFixed;
    },
    toggleSiderCollapse: state => {
      state.siderCollapse = !state.siderCollapse;
    },
    setSpaceHidden: (state, {payload}) => {
      state.spaceHidden = payload
    }
  },
  selectors: {
    getContentXScrollable: app => app.contentXScrollable,
    getFullContent: app => app.fullContent,
    getIsMobile: app => app.isMobile,
    getLocale: app => app.locale,
    getLocaleOptions: app => app.localeOptions,
    getMixSiderFixed: app => app.mixSiderFixed,
    getReloadFlag: app => app.reloadFlag,
    getSiderCollapse: app => app.siderCollapse,
    getSpaceId: app => app.spaceId,
    getThemeDrawerVisible: app => app.themeDrawerVisible,
    getSpaceHidden: state => state.spaceHidden
  }
});
// Action creators are generated for each case reducer function.
export const {
  changeLocale,
  changeSpaceId,
  closeThemeDrawer,
  openThemeDrawer,
  setContentXScrollable,
  setIsMobile,
  setMixSiderFixed,
  setReloadFlag,
  setSiderCollapse,
  toggleFullContent,
  toggleMixSiderFixed,
  toggleSiderCollapse,
  setSpaceHidden
} = appSlice.actions;

// Selectors returned by `slice.selectors` take the root state as their first argument.
export const {
  getContentXScrollable,
  getFullContent,
  getIsMobile,
  getLocale,
  getLocaleOptions,
  getMixSiderFixed,
  getReloadFlag,
  getSiderCollapse,
  getSpaceId,
  getThemeDrawerVisible,
  getSpaceHidden
} = appSlice.selectors;

/**
 * Reload page
 *
 * @param duration Duration time
 */
export const reloadPage =
  (duration = 300): AppThunk =>
    async (dispatch, getState) => {
      dispatch(setReloadFlag(false));

      const themeSettings = getThemeSettings(getState());
      const d = themeSettings.page.animate ? duration : 40;

      await new Promise(resolve => {
        setTimeout(resolve, d);
      });

      dispatch(setReloadFlag(true));
    };
