/**
 * 消息区自动跟随底部守卫：流式更新期间用户手动上滑后暂停强制滚底，回到底部附近恢复跟随。
 */

/** 判定“贴在底部”的距底距离阈值（px）：取值极小，上滑一点点即离开底部区并暂停自动滚底 */
const BOTTOM_ZONE = 16

/**
 * 根据一次滚动采样计算下一个“用户手动上滑”状态：
 * 主动向上滚且离开底部区返回 true（暂停自动滚底）；
 * 主动向下滚回底部区返回 false（恢复自动滚底）；其余情况保持 prev。
 * 恢复仅限主动下滚：内容折叠致 scrollHeight 缩水时浏览器会被动钳制 scrollTop，
 * 若无方向条件会误恢复跟随，下一次流式更新又把视图拽回底部。
 * 内容增长不触发 scroll 事件（scrollTop 不变），不会误暂停跟随。
 */
export function nextUserScrolled(
  prev: boolean,
  prevScrollTop: number,
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): boolean {
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight
  if (scrollTop < prevScrollTop && distanceFromBottom > BOTTOM_ZONE) return true
  if (scrollTop > prevScrollTop && distanceFromBottom <= BOTTOM_ZONE) return false
  return prev
}
