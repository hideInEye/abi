import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/chat/history')({
  beforeLoad: () => {
    throw redirect({ to: '/chat/' })
  },
})
