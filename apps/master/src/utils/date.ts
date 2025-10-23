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
