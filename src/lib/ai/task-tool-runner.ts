import { z } from 'zod'

import {
  addTaskInputSchema,
  createTasksFromSummaryInputSchema,
  listTasksInputSchema,
  removeTaskInputSchema,
  updateTaskInputSchema,
} from '#/lib/ai/tools'
import type {
  CreateTasksOutput,
  ListTasksOutput,
  TaskMutationOutput,
  ToolTaskSummary,
} from '#/lib/ai/tools'
import { createTask, taskDraftSchema } from '#/lib/task'
import type { Task } from '#/lib/task'

/**
 * Client-side tool execution.
 *
 * Every tool call is validated with zod first (the model's output is untrusted
 * input), then applied to a working copy of the task list. The caller persists
 * the returned array, so several tool calls in one turn see each other.
 */

const PRIORITY_WEIGHT: Record<Task['priority'], number> = {
  high: 3,
  medium: 2,
  low: 1,
}

const namedDraftSchema = taskDraftSchema.extend({
  priority: taskDraftSchema.shape.priority.default('medium'),
  notes: taskDraftSchema.shape.notes.default(''),
})

export function sortTasksForListing(tasks: ReadonlyArray<Task>): Task[] {
  return [...tasks].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
      b.createdAt.localeCompare(a.createdAt),
  )
}

function toSummary(task: Task): ToolTaskSummary {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    done: task.done,
  }
}

function describeTaskList(tasks: ReadonlyArray<Task>): string {
  const open = tasks.filter((task) => !task.done).length
  const completed = tasks.length - open

  if (tasks.length === 0) {
    return 'The list is empty.'
  }

  return `${open} open, ${completed} completed (${tasks.length} total).`
}

type TaskLocator = { taskId?: string; query?: string }

function findTask(
  tasks: ReadonlyArray<Task>,
  locator: TaskLocator,
): Task | null {
  if (locator.taskId) {
    const byId = tasks.find((task) => task.id === locator.taskId)
    if (byId) {
      return byId
    }
  }

  const query = locator.query?.trim().toLowerCase()

  if (!query) {
    return null
  }

  // Prefer the closest match: exact, then startsWith, then substring.
  const open = tasks.filter((task) => !task.done)
  const pools = [open, tasks]

  for (const pool of pools) {
    const exact = pool.find((task) => task.title.toLowerCase() === query)
    if (exact) {
      return exact
    }

    const startsWith = pool.find((task) =>
      task.title.toLowerCase().startsWith(query),
    )
    if (startsWith) {
      return startsWith
    }

    const contains = pool.find((task) =>
      task.title.toLowerCase().includes(query),
    )
    if (contains) {
      return contains
    }
  }

  return null
}

function notFoundMessage(locator: TaskLocator): string {
  const hint = locator.query ?? locator.taskId ?? 'unknown task'
  return `No task matched “${hint}”. Call listTasks to see the current titles.`
}

/* -------------------------------------------------------------------------- */
/* Tools                                                                      */
/* -------------------------------------------------------------------------- */

export function runListTasks(input: unknown, tasks: Task[]): ListTasksOutput {
  const parsed = listTasksInputSchema.safeParse(input ?? {})

  if (!parsed.success) {
    return { total: tasks.length, open: 0, completed: 0, tasks: [] }
  }

  const includeCompleted = parsed.data.includeCompleted ?? true
  const visible = includeCompleted
    ? sortTasksForListing(tasks)
    : sortTasksForListing(tasks.filter((task) => !task.done))

  return {
    total: visible.length,
    open: visible.filter((task) => !task.done).length,
    completed: visible.filter((task) => task.done).length,
    tasks: visible.map(toSummary),
  }
}

export function runAddTask(
  input: unknown,
  tasks: Task[],
): { output: TaskMutationOutput; tasks: Task[] } {
  const parsed = addTaskInputSchema.safeParse(input)

  if (!parsed.success) {
    return {
      output: {
        ok: false,
        message: `Could not add the task: ${parsed.error.issues[0]?.message ?? 'invalid input'}.`,
      },
      tasks,
    }
  }

  const draft = namedDraftSchema.safeParse(parsed.data)

  if (!draft.success) {
    return {
      output: {
        ok: false,
        message: `Could not add the task: ${draft.error.issues[0]?.message ?? 'invalid input'}.`,
      },
      tasks,
    }
  }

  const task = createTask(draft.data)
  const next = [task, ...tasks]

  return {
    output: {
      ok: true,
      message: `Added “${task.title}” (${task.priority} priority). ${describeTaskList(next)}`,
      task: toSummary(task),
    },
    tasks: next,
  }
}

export function runRemoveTask(
  input: unknown,
  tasks: Task[],
): { output: TaskMutationOutput; tasks: Task[] } {
  const parsed = removeTaskInputSchema.safeParse(input)

  if (!parsed.success) {
    return {
      output: {
        ok: false,
        message: `Could not remove the task: ${parsed.error.issues[0]?.message ?? 'invalid input'}.`,
      },
      tasks,
    }
  }

  const target = findTask(tasks, parsed.data)

  if (!target) {
    return {
      output: { ok: false, message: notFoundMessage(parsed.data) },
      tasks,
    }
  }

  const next = tasks.filter((task) => task.id !== target.id)

  return {
    output: {
      ok: true,
      message: `Removed “${target.title}”. ${describeTaskList(next)}`,
      task: toSummary(target),
    },
    tasks: next,
  }
}

export function runUpdateTask(
  input: unknown,
  tasks: Task[],
): { output: TaskMutationOutput; tasks: Task[] } {
  const parsed = updateTaskInputSchema.safeParse(input)

  if (!parsed.success) {
    return {
      output: {
        ok: false,
        message: `Could not update the task: ${parsed.error.issues[0]?.message ?? 'invalid input'}.`,
      },
      tasks,
    }
  }

  const { taskId, query, ...changes } = parsed.data
  const hasChanges =
    changes.title !== undefined ||
    changes.notes !== undefined ||
    changes.priority !== undefined ||
    changes.done !== undefined

  if (!hasChanges) {
    return {
      output: {
        ok: false,
        message:
          'No changes were provided. Pass at least one of title, notes, priority or done.',
      },
      tasks,
    }
  }

  const target = findTask(tasks, { taskId, query })

  if (!target) {
    return {
      output: { ok: false, message: notFoundMessage({ taskId, query }) },
      tasks,
    }
  }

  const validated = z
    .object({
      title: taskDraftSchema.shape.title.optional(),
      notes: taskDraftSchema.shape.notes.optional(),
      priority: taskDraftSchema.shape.priority.optional(),
      done: z.boolean().optional(),
    })
    .safeParse(changes)

  if (!validated.success) {
    return {
      output: {
        ok: false,
        message: `Could not update the task: ${validated.error.issues[0]?.message ?? 'invalid input'}.`,
      },
      tasks,
    }
  }

  const updated: Task = {
    ...target,
    ...(validated.data.title !== undefined && { title: validated.data.title }),
    ...(validated.data.notes !== undefined && { notes: validated.data.notes }),
    ...(validated.data.priority !== undefined && {
      priority: validated.data.priority,
    }),
    ...(validated.data.done !== undefined && { done: validated.data.done }),
  }

  const next = tasks.map((task) => (task.id === target.id ? updated : task))

  const changeSummary = [
    validated.data.title !== undefined ? 'title' : null,
    validated.data.notes !== undefined ? 'notes' : null,
    validated.data.priority !== undefined
      ? `priority → ${updated.priority}`
      : null,
    validated.data.done !== undefined
      ? updated.done
        ? 'marked complete'
        : 'reopened'
      : null,
  ]
    .filter(Boolean)
    .join(', ')

  return {
    output: {
      ok: true,
      message: `Updated “${updated.title}” (${changeSummary}). ${describeTaskList(next)}`,
      task: toSummary(updated),
    },
    tasks: next,
  }
}

export function runCreateTasksFromSummary(
  input: unknown,
  tasks: Task[],
): { output: CreateTasksOutput; tasks: Task[] } {
  const parsed = createTasksFromSummaryInputSchema.safeParse(input)

  if (!parsed.success) {
    return {
      output: {
        ok: false,
        message: `Could not create the tasks: ${parsed.error.issues[0]?.message ?? 'invalid input'}.`,
        created: [],
      },
      tasks,
    }
  }

  const drafts = z.array(namedDraftSchema).safeParse(
    parsed.data.tasks.map((task) => ({
      ...task,
      notes: task.notes ?? '',
      priority: task.priority ?? 'medium',
    })),
  )

  if (!drafts.success) {
    return {
      output: {
        ok: false,
        message: `Could not create the tasks: ${drafts.error.issues[0]?.message ?? 'invalid input'}.`,
        created: [],
      },
      tasks,
    }
  }

  const created = drafts.data.map((draft) => createTask(draft))
  const next = [...created, ...tasks]
  const titles = created.map((task) => `“${task.title}”`).join(', ')

  return {
    output: {
      ok: true,
      message: `Added ${created.length} task${created.length === 1 ? '' : 's'}: ${titles}. ${describeTaskList(next)}`,
      created: created.map(toSummary),
    },
    tasks: next,
  }
}
