import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/chat/conversation/')({
  beforeLoad: () => {
    throw redirect({ to: '/chat/history' })
  },
})
