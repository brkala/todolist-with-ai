import { tool } from 'ai'
import { z } from 'zod'

import { taskPrioritySchema } from '#/lib/task'

/**
 * Shared contract for the assistant's tools.
 *
 * The `*InputSchema` objects are the single source of truth: the server sends
 * the definitions to DeepSeek, and the client re-validates every tool call
 * against the same schema before touching the task list (model output is
 * untrusted input).
 */

const trimmedTitle = z.string().trim().min(1).max(120)
const trimmedNotes = z.string().trim().max(500)

const priorityField = taskPrioritySchema.describe(
  'Priority of the task: high, medium or low. Defaults to medium.',
)

/** How the model points at an existing task. */
export const taskRefFields = {
  taskId: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Exact task id, taken from the task snapshot or a listTasks result.',
    ),
  query: z
    .string()
    .min(1)
    .max(120)
    .optional()
    .describe(
      'Case-insensitive text from the task title, used when the id is unknown (e.g. "sprint").',
    ),
}

export const listTasksInputSchema = z.object({
  includeCompleted: z
    .boolean()
    .optional()
    .describe(
      'When false, completed tasks are left out. Defaults to true (completed tasks are listed last).',
    ),
})

export const addTaskInputSchema = z.object({
  title: trimmedTitle.describe('Short, action-oriented task title.'),
  notes: trimmedNotes.optional().describe('Optional extra detail.'),
  priority: priorityField.optional(),
})

export const removeTaskInputSchema = z.object({
  ...taskRefFields,
  reason: z
    .string()
    .max(200)
    .optional()
    .describe('Optional short reason, echoed back to the user.'),
})

export const updateTaskInputSchema = z.object({
  ...taskRefFields,
  title: trimmedTitle.optional().describe('New title, if it should change.'),
  notes: trimmedNotes.optional().describe('New notes, if they should change.'),
  priority: priorityField.optional(),
  done: z
    .boolean()
    .optional()
    .describe('true marks the task complete, false reopens it.'),
})

export const createTasksFromSummaryInputSchema = z.object({
  summary: trimmedNotes
    .optional()
    .describe('One-line summary of what the pasted text was about.'),
  tasks: z
    .array(
      z.object({
        title: trimmedTitle,
        notes: trimmedNotes.optional(),
        priority: priorityField.optional(),
      }),
    )
    .min(1)
    .max(20)
    .describe(
      'The individual tasks extracted from the user text, in the order they should be tackled.',
    ),
})

export type ListTasksInput = z.infer<typeof listTasksInputSchema>
export type AddTaskInput = z.infer<typeof addTaskInputSchema>
export type RemoveTaskInput = z.infer<typeof removeTaskInputSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>
export type CreateTasksFromSummaryInput = z.infer<
  typeof createTasksFromSummaryInputSchema
>

/* -------------------------------------------------------------------------- */
/* Tool outputs (returned to the model, rendered in the chat as tool cards)    */
/* -------------------------------------------------------------------------- */

export type ToolTaskSummary = {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low'
  done: boolean
}

export type ListTasksOutput = {
  total: number
  open: number
  completed: number
  tasks: Array<ToolTaskSummary>
}

export type TaskMutationOutput = {
  ok: boolean
  message: string
  task?: ToolTaskSummary
}

export type CreateTasksOutput = {
  ok: boolean
  message: string
  created: Array<ToolTaskSummary>
}

/* -------------------------------------------------------------------------- */
/* Definitions handed to the model                                             */
/* -------------------------------------------------------------------------- */

export const taskToolDefinitions = {
  listTasks: tool({
    description:
      'List the user tasks. Remaining tasks come first ordered by priority (high → medium → low), completed tasks last. Use this when the user asks what is on the list, how much is left, or what to do next.',
    inputSchema: listTasksInputSchema,
  }),

  addTask: tool({
    description:
      'Add one task to the list. Use when the user asks for a single, well-defined task with a clear title.',
    inputSchema: addTaskInputSchema,
  }),

  removeTask: tool({
    description:
      'Remove one task. Identify it with taskId, or with `query` matching part of the title when the id is not at hand.',
    inputSchema: removeTaskInputSchema,
  }),

  updateTask: tool({
    description:
      'Change an existing task: rename it, edit notes, change priority, or mark it complete / reopen it. Only send the fields that change.',
    inputSchema: updateTaskInputSchema,
  }),

  createTasksFromSummary: tool({
    description:
      'Create several tasks at once by turning free-form text from the user (meeting notes, an email, a brain dump, a plan) into concrete atomic tasks. Split the text yourself and pass the extracted tasks.',
    inputSchema: createTasksFromSummaryInputSchema,
  }),
}

export type TaskToolName = keyof typeof taskToolDefinitions

export const TASK_TOOL_LABELS: Record<TaskToolName, string> = {
  listTasks: 'Reading the task list',
  addTask: 'Adding a task',
  removeTask: 'Removing a task',
  updateTask: 'Updating a task',
  createTasksFromSummary: 'Creating tasks from text',
}
