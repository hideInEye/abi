import { authManager } from '@/utils/auth';
import { localStg } from '@/utils/storage';

import type { RequestInstanceState } from './type';

export function getAuthorization() {
  return authManager.getAuthorization();
}

export function getUserId() {
  return localStg.get('userId');
}

export function showErrorMsg(state: RequestInstanceState, message: string) {
  if (!state.errMsgStack?.length) {
    state.errMsgStack = [];
  }

  const isExist = state.errMsgStack.includes(message);

  if (!isExist) {
    state.errMsgStack.push(message);

    window.$message?.error({
      content: message,
      onClose: () => {
        state.errMsgStack = state.errMsgStack.filter(msg => msg !== message);

        setTimeout(() => {
          state.errMsgStack = [];
        }, 5000);
      }
    });
  }
}
