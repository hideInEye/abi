// 根据传进来的min-max返回一个顺序的数组
export function getOrderArr(min: number, max: number) {
  const arr: number[] = [];
  for (let i = min; i <= max; i++) {
    arr.push(i);
  }
  return arr;
}

function compare(value1, value2) {
  if (value2 - value1 > 0) {
    return -1;
  }
  return 1;
}

// 根据规则返回一个具有周期性的数组
export function getCycleArr(rule: string, limit: number, status?: boolean) {
  // status--表示是否从0开始（则从1开始）
  const arr = [];
  const cycleArr = rule.split('-');
  const min = Number(cycleArr[0]);
  let max = Number(cycleArr[1]);
  if (min > max) {
    max += limit;
  }
  for (let i = min; i <= max; i++) {
    let add = 0;
    if (status == false && i % limit == 0) {
      add = limit;
    }
    arr.push(Math.round((i % limit) + add));
  }
  arr.sort(compare);
  return arr;
}

// 根据一定算术规则计算返回一个数组
export function getAverageArr(rule, limit) {
  const arr = [];
  const agArr = rule.split('/');
  let min = Number(agArr[0]);
  const step = Number(agArr[1]);
  while (min <= limit) {
    arr.push(min);
    min += step;
  }
  return arr;
}

// 根据规则中指定的零散值返回一个数组
export function getAssignArr(rule) {
  const arr = [];
  const assiginArr = rule.split(',');
  for (let i = 0; i < assiginArr.length; i++) {
    arr[i] = Number(assiginArr[i]);
  }
  arr.sort(compare);
  return arr;
}

// 用于计算某位数字在数组中的索引
// eslint-disable-next-line consistent-return
export function getIndex(arr: any, value: any) {
  if (value <= arr[0] || value > arr[arr.length - 1]) {
    return 0;
  }
  for (let i = 0; i < arr.length - 1; i++) {
    if (value > arr[i] && value <= arr[i + 1]) {
      return i + 1;
    }
  }
}

// 格式化日期格式如：2017-9-19 18:04:33
export function formatDate(value: any, type?: string) {
  // 计算日期相关值
  const time = typeof value === 'number' ? new Date(value) : value;
  const Y = time.getFullYear();
  const M = time.getMonth() + 1;
  const D = time.getDate();
  const h = time.getHours();
  const m = time.getMinutes();
  const s = time.getSeconds();
  const week = time.getDay();
  // 如果传递了type的话
  if (type == undefined) {
    return `${Y}-${M < 10 ? `0${M}` : M}-${D < 10 ? `0${D}` : D} ${h < 10 ? `0${h}` : h}:${m < 10 ? `0${m}` : m}:${
      s < 10 ? `0${s}` : s
    }`;
  } else if (type == 'week') {
    // 在quartz中 1为星期日
    return week + 1;
  }
}

// 检查日期是否存在
export function checkDate(value: any) {
  const time = new Date(value);
  const format = formatDate(time);
  return value === format;
}
