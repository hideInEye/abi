import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

import { TASK_DETAIL_ROUTE } from '@/constant/layout'

import GroupSessionListView from './-GroupSessionListView'

export const Route = createFileRoute('/chat/group/$groupId')({
  component: ConversationGroupPage,
})

function ConversationGroupPage() {
  const { groupId } = Route.useParams()
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleOpenSession = useCallback(
    (chatId: string) => {
      navigate({ to: TASK_DETAIL_ROUTE, params: { taskId: chatId } })
    },
    [navigate],
  )

  const handleGroupDeleted = useCallback(() => {
    navigate({ to: TASK_DETAIL_ROUTE, params: { taskId: 'new' } })
  }, [navigate])

  useEffect(() => {
    const handleConversationChanged = () => setRefreshKey((key) => key + 1)
    window.addEventListener('conversation-created', handleConversationChanged)
    return () => window.removeEventListener('conversation-created', handleConversationChanged)
  }, [])

  return (
    <GroupSessionListView
      groupId={groupId}
      onOpenSession={handleOpenSession}
      onGroupDeleted={handleGroupDeleted}
      refreshKey={refreshKey}
    />
  )
}
