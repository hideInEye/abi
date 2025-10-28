import { configureStore } from '@reduxjs/toolkit';
import conversationsReducer from './slices/conversations';

export const store = configureStore({
  reducer: {
    conversations: conversationsReducer, // 直接使用原始reducer，不再使用持久化包装
  },
  // 移除持久化相关的middleware配置
});

// 移除persistor导出
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;