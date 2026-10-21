import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { setLng } from '@/locales';
import { persistCurrentSpaceInfo } from '@/utils/spaceStorage';
import { localStg } from '@/utils/storage';

import type { AppThunk } from '../..';
import { getThemeSettings } from '../theme';

import type { CurrentSpaceInfo } from './types';

export type { CurrentSpaceInfo } from './types';

interface InitialStateType {
  contentXScrollable: boolean;
  fullContent: boolean;
  isMobile: boolean;
  locale: App.I18n.LangType;
  localeOptions: App.I18n.LangOption[];
  mixSiderFixed: boolean;
  reloadFlag: boolean;
  siderCollapse: boolean;
  currentSpaceInfo: CurrentSpaceInfo | null;
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
  // 启动时由会话初始化选择空间，不把历史缓存直接当作当前账号的选中项。
  currentSpaceInfo: null,
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
    setCurrentSpaceInfo(state, { payload }: PayloadAction<CurrentSpaceInfo | null>) {
      const spaceId = Number(payload?.spaceId);
      if (payload && (!Number.isFinite(spaceId) || spaceId <= 0 || !payload.spaceName?.trim())) return;
      const next = payload ? { spaceId, spaceName: payload.spaceName.trim() } : null;
      persistCurrentSpaceInfo(next);
      if (state.currentSpaceInfo?.spaceId !== next?.spaceId || state.currentSpaceInfo?.spaceName !== next?.spaceName) {
        state.currentSpaceInfo = next;
      }
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
    getCurrentSpaceInfo: app => app.currentSpaceInfo,
    // 保留只需要 ID 的业务订阅，不额外维护一份可独立变更的 ID 状态。
    getSpaceId: app => app.currentSpaceInfo?.spaceId ?? 0,
    getThemeDrawerVisible: app => app.themeDrawerVisible,
    getSpaceHidden: state => state.spaceHidden
  }
});
// Action creators are generated for each case reducer function.
export const {
  changeLocale,
  setCurrentSpaceInfo,
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
  getCurrentSpaceInfo,
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
