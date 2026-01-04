// 1-已删除,0-待处理,1-生成日报中,2-日报已生成,3-已发送,4-发送失败
export const shareMailStatus = {
  0: '待处理',
  1: '生成日报中',
  2: '日报已生成',
  3: '已发送',
  4: '发送失败',
  5: '文件生成失败'
};

export const shareMailColor = {
  0: '#8C8C8C',
  1: '#1677FF',
  2: '#52C41A',
  3: '#389E0D',
  4: '#FF4D4F',
  5: '#FF7875',
};

export type statusType = keyof typeof shareMailStatus;
