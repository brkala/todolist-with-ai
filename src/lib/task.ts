import { z } from 'zod'

/**
 * Task domain model. Everything that crosses a trust boundary
 * (localStorage, a future API/server function) goes through these schemas.
 */

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const

export const taskPrioritySchema = z.enum(TASK_PRIORITIES)

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(1, 'Give the task a title.')
    .max(120, 'Keep titles under 120 characters.'),
  notes: z.string().trim().max(500, 'Keep notes under 500 characters.'),
  priority: taskPrioritySchema,
  done: z.boolean(),
  createdAt: z.string().min(1),
})

export type Task = z.infer<typeof taskSchema>
export type TaskPriority = z.infer<typeof taskPrioritySchema>

/** What the add/edit form is allowed to change. */
export const taskDraftSchema = taskSchema.pick({
  title: true,
  notes: true,
  priority: true,
})

export type TaskDraft = z.infer<typeof taskDraftSchema>
/** Input shape for the form (before `.default()` is applied). */
export type TaskDraftInput = z.input<typeof taskDraftSchema>

export const taskListSchema = z.array(taskSchema)

export const emptyTaskDraft: TaskDraftInput = {
  title: '',
  notes: '',
  priority: 'medium',
}

/** First error message per field, keyed by field name. */
export function collectFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    errors[key] ??= issue.message
  }

  return errors
}

export function createTask(draft: TaskDraft): Task {
  return {
    id: createTaskId(),
    title: draft.title,
    notes: draft.notes,
    priority: draft.priority,
    done: false,
    createdAt: new Date().toISOString(),
  }
}

function createTaskId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
})

export function formatTaskDate(isoDate: string): string {
  const date = new Date(isoDate)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return dateFormatter.format(date)
}
