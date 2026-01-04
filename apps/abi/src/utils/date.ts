export function formattedDate() {
  const currentTime = new Date();
  const year = currentTime.getFullYear();
  const month = String(currentTime.getMonth() + 1).padStart(2, '0'); // 月份从0开始，所以需要加1，并且用padStart来确保两位数字
  const day = String(currentTime.getDate()).padStart(2, '0'); // 用padStart来确保两位数字
  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


// 一个相对宽松但够用的邮箱正则
const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 校验多个邮箱（用逗号分隔）
 * @param {string} value - 输入的字符串，例如 "a@x.com, b@y.com"
 * @returns {{ valid: boolean, invalidEmails: string[] }}
 */
export function validateMultiEmails(value: string) {
  if (!value) {
    return { valid: true, invalidEmails: [] }; // 看业务是否允许为空
  }

  // 按中英文逗号拆分
  const parts = value
    .split(/[,，]/)
    .map(v => v.trim())
    .filter(v => v.length > 0); // 去掉空串

  if (parts.length === 0) {
    return { valid: true, invalidEmails: [] };
  }

  const invalid = parts.filter((email: string) => !emailReg.test(email));
  return {
    valid: invalid.length === 0,
    invalidEmails: invalid
  };
}
