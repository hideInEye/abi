import { createFileRoute } from '@tanstack/react-router'

import { WorkshopView } from '@/components/layout/WorkshopView'

export const Route = createFileRoute('/chat/workshop')({
  component: WorkshopView,
})
