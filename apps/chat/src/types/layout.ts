export type WorkbenchPanel = 'history' | 'conversation'

export type TopicItem = {
  chatId: string
  title: string
  updateTime?: string
}

export type UserInfo = {
  userName?: string
  nickName?: string
}

export type SpaceInfo = {
  spaceId: number
  spaceName: string
}
