import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ConversationItem {
  conv_uid: string;
  [key: string]: any;
}

export interface ConversationsState {
  chatIdToConvList: Record<string, ConversationItem[]>;
  lastChatId?: string;
  // 添加对话历史缓存
  convHistoryCache: Record<string, any[]>;
  // 添加推荐问题缓存
  recQuestionCache: Record<string, any[]>;
  // 添加数据源缓存
  datasourceCache: Record<string, any>;
}

const initialState: ConversationsState = {
  chatIdToConvList: {},
  lastChatId: undefined,
  convHistoryCache: {},
  recQuestionCache: {},
  datasourceCache: {},
};

export const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    setConvListForChat(
      state,
      action: PayloadAction<{ chatId: string; convList: ConversationItem[] }>
    ) {
      const { chatId, convList } = action.payload;
      state.chatIdToConvList[chatId] = convList || [];
      state.lastChatId = chatId;
    },
    upsertConvForChat(
      state,
      action: PayloadAction<{ chatId: string; conv: ConversationItem; toTop?: boolean }>
    ) {
      const { chatId, conv, toTop = true } = action.payload;
      const list = state.chatIdToConvList[chatId] || [];
      const idx = list.findIndex((c) => c.conv_uid === conv.conv_uid);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...conv };
      } else {
        if (toTop) {
          list.unshift(conv);
        } else {
          list.push(conv);
        }
      }
      state.chatIdToConvList[chatId] = list;
      state.lastChatId = chatId;
    },
    removeConvForChat(
      state,
      action: PayloadAction<{ chatId: string; convUid: string }>
    ) {
      const { chatId, convUid } = action.payload;
      const list = state.chatIdToConvList[chatId] || [];
      state.chatIdToConvList[chatId] = list.filter((c) => c.conv_uid !== convUid);
      state.lastChatId = chatId;
    },
    clearConvListForChat(state, action: PayloadAction<{ chatId: string }>) {
      const { chatId } = action.payload;
      delete state.chatIdToConvList[chatId];
      if (state.lastChatId === chatId) state.lastChatId = undefined;
    },
    // 设置对话历史缓存 (for initial load)
    setConvHistoryCache(
      state,
      action: PayloadAction<{ convUid: string; data: any[] }>
    ) {
      const { convUid, data } = action.payload;
      state.convHistoryCache[convUid] = data;
    },
    // 添加或更新对话历史记录到缓存
    upsertConvHistoryToCache(
      state,
      action: PayloadAction<{ convUid: string; message: any }>
    ) {
      const { convUid, message } = action.payload;
      if (!state.convHistoryCache[convUid]) {
        state.convHistoryCache[convUid] = [];
      }
      // 尝试通过 roundIndex (适用于 AI 和 View 消息) 或 id (适用于 Human 消息) 查找现有消息
      const existingMessageIndex = state.convHistoryCache[convUid].findIndex(
        (item) =>
          (item.roundIndex !== undefined && item.roundIndex === message.roundIndex) ||
          (item.id !== undefined && item.id === message.id)
      );

      if (existingMessageIndex !== -1) {
        // 如果找到现有消息，则更新
        state.convHistoryCache[convUid][existingMessageIndex] = {
          ...state.convHistoryCache[convUid][existingMessageIndex],
          ...message,
        };
      } else {
        // 如果没有找到，则添加新消息
        state.convHistoryCache[convUid].push(message);
      }
    },
    // 清空对话历史缓存
    clearConvHistoryCache(state) {
      state.convHistoryCache = {};
    },
    // 设置推荐问题缓存
    setRecQuestionCache(
      state,
      action: PayloadAction<{ agentId: string; data: any[] }>
    ) {
      const { agentId, data } = action.payload;
      state.recQuestionCache[agentId] = data;
    },
    // 清空推荐问题缓存
    clearRecQuestionCache(state) {
      state.recQuestionCache = {};
    },
    // 设置数据源缓存
    setDatasourceCache(
      state,
      action: PayloadAction<{ agentId: string; data: any }>
    ) {
      const { agentId, data } = action.payload;
      state.datasourceCache[agentId] = data;
    },
    // 清空数据源缓存
    clearDatasourceCache(state) {
      state.datasourceCache = {};
    },
    // 清空所有缓存（用于切换空间时）
    clearAllCache(state) {
      state.convHistoryCache = {};
      state.recQuestionCache = {};
      state.datasourceCache = {};
    },
  },
});

export const {
  setConvListForChat,
  upsertConvForChat,
  removeConvForChat,
  clearConvListForChat,
  setConvHistoryCache,
  upsertConvHistoryToCache, // 导出新的 action
  clearConvHistoryCache,
  setRecQuestionCache,
  clearRecQuestionCache,
  setDatasourceCache, // 导出新的 action
  clearDatasourceCache, // 导出新的 action
  clearAllCache,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;

export const selectConvListByChatId = (
  state: { conversations: ConversationsState },
  chatId: string
) => state.conversations.chatIdToConvList[chatId] || [];

// 选择器：获取对话历史缓存
export const selectConvHistoryCache = (state: { conversations: ConversationsState }) => 
  state.conversations.convHistoryCache;

// 选择器：获取推荐问题缓存
export const selectRecQuestionCache = (state: { conversations: ConversationsState }) => 
  state.conversations.recQuestionCache;

// 选择器：获取数据源缓存
export const selectDatasourceCache = (state: { conversations: ConversationsState }) => 
  state.conversations.datasourceCache; 