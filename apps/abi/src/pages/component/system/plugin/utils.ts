import { localStg } from '@/utils/storage';

/** 获取平台当前登录态的 Bearer 凭证 */
export const getPlatformBearerToken = () => {
  const token = localStg.get('token') || '';
  return token ? `Bearer ${token}` : '';
};
