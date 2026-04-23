import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/chat/conversation/$conversationId')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/chat/task/$taskId',
      params: { taskId: String(params.conversationId || '') },
    })
  },
})
