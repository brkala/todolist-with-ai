import { useMemo, useState } from 'react'
import { ListChecks, Plus, Sparkles } from 'lucide-react'

import { TaskFormDialog } from '#/components/tasks/task-form-dialog'
import { TaskTable } from '#/components/tasks/task-table'
import { Button } from '#/components/ui/button'
import type { Task, TaskDraft } from '#/lib/task'

export type TaskBoardProps = {
  tasks: Task[]
  openCount: number
  doneCount: number
  hydrated: boolean
  onAdd: (draft: TaskDraft) => void
  onUpdate: (id: string, draft: TaskDraft) => void
  onRemove: (id: string) => void
  onToggle: (id: string) => void
  onClearCompleted: () => void
}

export function TaskBoard({
  tasks,
  openCount,
  doneCount,
  hydrated,
  onAdd,
  onUpdate,
  onRemove,
  onToggle,
  onClearCompleted,
}: TaskBoardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort(
        (a, b) =>
          Number(a.done) - Number(b.done) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
    [tasks],
  )

  function openCreate() {
    setEditingTask(null)
    setDialogOpen(true)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setDialogOpen(true)
  }

  function handleSubmit(draft: TaskDraft) {
    if (editingTask) {
      onUpdate(editingTask.id, draft)
    } else {
      onAdd(draft)
    }
  }

  return (
    <section className="island-shell rise-in flex flex-col overflow-hidden rounded-3xl">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(140deg,rgba(79,184,178,0.34),rgba(47,106,74,0.2))] text-[var(--lagoon-deep)]">
          <ListChecks className="size-4" />
        </span>

        <div className="min-w-0">
          <h1 className="display-title m-0 text-xl leading-tight font-bold text-[var(--sea-ink)]">
            My tasks
          </h1>
          <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
            {hydrated
              ? `${openCount} open · ${doneCount} completed`
              : 'Loading your list…'}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {doneCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearCompleted}
              className="text-[var(--sea-ink-soft)] hover:bg-[rgba(79,184,178,0.16)] hover:text-[var(--sea-ink)]"
            >
              Clear completed
            </Button>
          ) : null}

          <Button type="button" size="sm" onClick={openCreate}>
            <Plus />
            Add task
          </Button>
        </div>
      </header>

      {!hydrated ? (
        <div className="space-y-2 px-5 py-6">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="h-11 animate-pulse rounded-lg bg-[rgba(23,58,64,0.06)]"
            />
          ))}
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-2xl border border-[rgba(50,143,151,0.24)] bg-[linear-gradient(150deg,rgba(79,184,178,0.24),rgba(47,106,74,0.1))] text-[var(--lagoon-deep)]">
            <Sparkles className="size-5" />
          </span>
          <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
            Nothing on the list yet
          </p>
          <p className="m-0 max-w-[32ch] text-xs text-[var(--sea-ink-soft)]">
            Add your first task and the assistant will be able to summarise and
            prioritise it for you.
          </p>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus />
            Add your first task
          </Button>
        </div>
      ) : (
        <TaskTable
          tasks={sortedTasks}
          onToggle={onToggle}
          onEdit={openEdit}
          onRemove={onRemove}
        />
      )}

      <TaskFormDialog
        open={dialogOpen}
        task={editingTask}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
