import { createFileRoute } from '@tanstack/react-router'

import { SkillStoreView } from '@/components/layout/SkillStoreView'

export const Route = createFileRoute('/chat/skill')({
  component: SkillStoreView,
})
