import { localStg } from '@/utils/storage';

/** 鑾峰彇骞冲彴褰撳墠鐧诲綍鎬佺殑 Bearer 鍑瘉 */
export const getPlatformBearerToken = () => {
  const token = localStg.get('token') || '';
  return token ? `Bearer ${token}` : '';
};
