import { createFileRoute } from '@tanstack/react-router'
import React from 'react'

import { AssistantSharePageView } from './-AssistantSharePageView'

export const Route = createFileRoute('/assistant-share-page/$shareCode')({
  component: AssistantSharePage,
  validateSearch: (search: Record<string, unknown>): { embed?: boolean } => ({
    embed: search.embed === 1 || search.embed === '1' || search.embed === 'true' || search.embed === true,
  }),
})

function AssistantSharePage() {
  const { shareCode } = Route.useParams()
  const { embed } = Route.useSearch()
  return <AssistantSharePageView shareCode={shareCode} embed={embed} />
}
