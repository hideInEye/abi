import { cloneDeep } from 'lodash';
import { create } from 'zustand';

type StoreType = {
  debugInfoMap: any;
  setDebugInfoMap: (debugInfo: any) => void;
  userDebugInfoMap: Map<string, any>;
  setUserDebugInfoMap: (userDebugInfo: any) => void;
  userChatHistory: Map<string, any>;
  setUserChatHistory: (userChatHistory: any) => void;
}

const initialState = {
  debugInfoMap: {
    // '123-da-x_1': [ { loading: true, info: 'xxx' }, { loading: false, info: 'xxx' } ]
  },  
  // 用户调试信息缓存
  userDebugInfoMap: new Map(),
  // 存储用户对话历史
  userChatHistory: new Map(),

};

export const useDebugStore = create<StoreType>()(set => ({
  ...initialState,
  setDebugInfoMap: (debugInfo: any) => {
    set(state => {
      const debugInfoMap = cloneDeep(state.debugInfoMap);
      if (debugInfoMap[debugInfo.uid]) {
        const index = debugInfo.metrics.current_stage - 1;
        if (debugInfoMap[debugInfo.uid][index]) {
          debugInfoMap[debugInfo.uid][index] = debugInfo;
        } else {
          debugInfoMap[debugInfo.uid].push(debugInfo);
        }
      } else {
        debugInfoMap[debugInfo.uid] = [debugInfo];
      }
      
      return {
        ...state,
        debugInfoMap
      };
    });
  },
  setUserDebugInfoMap: (userDebugInfo: any) => {
    set(state => {
      return {
        ...state,
        userDebugInfoMap: new Map(state.userDebugInfoMap).set(userDebugInfo.order, userDebugInfo),
      };
    });
  },
  setUserChatHistory: (userChatHistory: any) => {
    const { conv_uid, data } = userChatHistory;
    set(state => {
      return {
        ...state,
        userChatHistory: new Map(state.userChatHistory).set(conv_uid, data),
      };
    });
  },
}));
