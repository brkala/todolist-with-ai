import { createFileRoute } from '@tanstack/react-router'

import { ChatPanel } from '#/components/chat/chat-panel'
import { TaskBoard } from '#/components/tasks/task-board'
import { useChat } from '#/hooks/use-chat'
import { useTasks } from '#/hooks/use-tasks'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: 'Todo list + AI assistant' }],
  }),
  component: Home,
})

function Home() {
  const {
    tasks,
    hydrated,
    openCount,
    doneCount,
    addTask,
    updateTask,
    removeTask,
    replaceTasks,
    toggleTask,
    clearCompleted,
  } = useTasks()

  const chat = useChat({ tasks, replaceTasks })

  return (
    <main className="mx-auto w-[min(1280px,calc(100%-2rem))] pt-5 pb-10">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        <TaskBoard
          tasks={tasks}
          openCount={openCount}
          doneCount={doneCount}
          hydrated={hydrated}
          onAdd={addTask}
          onUpdate={updateTask}
          onRemove={removeTask}
          onToggle={toggleTask}
          onClearCompleted={clearCompleted}
        />

        <div className="h-[min(72vh,600px)] lg:sticky lg:top-20 lg:h-[calc(100dvh-6.5rem)]">
          <ChatPanel
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            isBusy={chat.isBusy}
            error={chat.error}
            onSend={chat.sendMessage}
            onStop={chat.stopStreaming}
            onClear={chat.clearChat}
            onDismissError={chat.dismissError}
          />
        </div>
      </div>
    </main>
  )
}
