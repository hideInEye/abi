import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useCallback } from 'react'

import { TASK_DETAIL_ROUTE } from '@/constant/layout'

import GroupSessionListView from './-GroupSessionListView'

export const Route = createFileRoute('/chat/group/$groupId')({
  component: ConversationGroupPage,
})

function ConversationGroupPage() {
  const { groupId } = Route.useParams()
  const navigate = useNavigate()

  const handleOpenSession = useCallback(
    (chatId: string) => {
      navigate({ to: TASK_DETAIL_ROUTE, params: { taskId: chatId } })
    },
    [navigate],
  )

  const handleGroupDeleted = useCallback(() => {
    navigate({ to: TASK_DETAIL_ROUTE, params: { taskId: 'new' } })
  }, [navigate])

  return (
    <GroupSessionListView
      groupId={groupId}
      onOpenSession={handleOpenSession}
      onGroupDeleted={handleGroupDeleted}
    />
  )
}
