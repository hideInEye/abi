import { createFileRoute, redirect } from '@tanstack/react-router'

// 分组详情已并入对话路由 /chat/task/$taskId（通过 search 参数携带 groupId），
// 使分组视图复用同一个 ConversationAnalysis 组件实例，进入分组时顶部大模型与底部输入框不重建。
// 此处保留旧路由并重定向，保证旧深链、书签仍可用。
export const Route = createFileRoute('/chat/group/$groupId')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/chat/task/$taskId',
      params: { taskId: 'new' },
      search: { groupId: String(params.groupId || '') },
    })
  },
})
