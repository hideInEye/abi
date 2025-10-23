import CryptoJS from 'crypto-js';

/**
 * @param pwd
 * @param userName
 * @returns
 */
export function generateMD5(pwd: string, userName: string) {
  const salt = 'B9i4peC2A';
  const str = pwd + salt + userName;
  const md5Hash = CryptoJS.MD5(str).toString();
  return md5Hash;
}
