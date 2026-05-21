import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/chat/')({
  component: ChatEmptyPage,
})

function ChatEmptyPage() {
  return <div className="h-full w-full bg-[#f7f8fa]" />
}
