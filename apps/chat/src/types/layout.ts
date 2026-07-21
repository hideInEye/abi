export type WorkbenchPanel = 'history' | 'conversation'

export type TopicItem = {
  chatId: string
  title: string
  updateTime?: string
  // 排序值：>0 视为置顶，值越大越靠前（与后端 session 的 sortOrder 一致）
  sortOrder?: number
}

export type UserInfo = {
  userName?: string
  nickName?: string
}

export type SpaceInfo = {
  spaceId: number
  spaceName: string
  remark?: string
  userCount?: number
  chatCount?: number
}
