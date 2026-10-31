import { useEffect, useState } from 'react'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import {
  TASK_PRIORITIES,
  collectFieldErrors,
  emptyTaskDraft,
  taskDraftSchema,
} from '#/lib/task'
import type { Task, TaskDraft, TaskDraftInput, TaskPriority } from '#/lib/task'

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export type TaskFormDialogProps = {
  open: boolean
  task: Task | null
  onOpenChange: (open: boolean) => void
  onSubmit: (draft: TaskDraft) => void
}

export function TaskFormDialog({
  open,
  task,
  onOpenChange,
  onSubmit,
}: TaskFormDialogProps) {
  const [values, setValues] = useState<TaskDraftInput>(emptyTaskDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Re-seed the form every time the dialog opens (create vs. edit).
  useEffect(() => {
    if (!open) {
      return
    }

    setValues(
      task
        ? { title: task.title, notes: task.notes, priority: task.priority }
        : emptyTaskDraft,
    )
    setErrors({})
  }, [open, task])

  const isEditing = task !== null

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = taskDraftSchema.safeParse(values)

    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error))
      return
    }

    onSubmit(parsed.data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-2xl border-[var(--line)] bg-white p-6 text-[var(--sea-ink)] shadow-[0_24px_50px_rgba(30,90,72,0.22)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="display-title text-2xl font-bold">
            {isEditing ? 'Edit task' : 'Add task'}
          </DialogTitle>
          <DialogDescription className="text-[var(--sea-ink-soft)]">
            {isEditing
              ? 'Update the details and save your changes.'
              : 'Give it a clear title so the assistant can help you triage it later.'}
          </DialogDescription>
        </DialogHeader>

        <form id="task-form" onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              name="title"
              autoFocus
              autoComplete="off"
              placeholder="e.g. Draft the sprint plan"
              value={values.title}
              aria-invalid={Boolean(errors.title)}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
              className="bg-white/80"
            />
            {errors.title ? (
              <p className="m-0 text-xs font-semibold text-[#9c3131]">
                {errors.title}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-notes">
              Notes <span className="font-normal opacity-60">(optional)</span>
            </Label>
            <Textarea
              id="task-notes"
              name="notes"
              rows={3}
              placeholder="Anything worth remembering…"
              value={values.notes}
              aria-invalid={Boolean(errors.notes)}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  notes: event.target.value,
                }))
              }
              className="resize-none bg-white/80"
            />
            {errors.notes ? (
              <p className="m-0 text-xs font-semibold text-[#9c3131]">
                {errors.notes}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Priority</span>
            <div role="radiogroup" aria-label="Priority" className="flex gap-2">
              {TASK_PRIORITIES.map((priority) => {
                const active = values.priority === priority

                return (
                  <button
                    key={priority}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() =>
                      setValues((previous) => ({ ...previous, priority }))
                    }
                    className={[
                      'flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition',
                      active
                        ? 'border-[var(--lagoon-deep)] bg-[rgba(79,184,178,0.18)] text-[var(--lagoon-deep)] shadow-[0_6px_16px_rgba(50,143,151,0.16)]'
                        : 'border-[var(--line)] bg-white/70 text-[var(--sea-ink-soft)] hover:border-[rgba(50,143,151,0.4)]',
                    ].join(' ')}
                  >
                    {PRIORITY_LABELS[priority]}
                  </button>
                )
              })}
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="task-form">
            {isEditing ? 'Save changes' : 'Add task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
