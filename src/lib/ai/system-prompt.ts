import type { Task } from '#/lib/task'

type SnapshotTask = {
  id: string
  title: string
  priority: Task['priority']
  done: boolean
  notes?: string
}

function toSnapshot(tasks: ReadonlyArray<Task>): SnapshotTask[] {
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    done: task.done,
    ...(task.notes ? { notes: task.notes } : {}),
  }))
}

export function buildSystemPrompt(tasks: ReadonlyArray<Task>): string {
  const today = new Date().toISOString().slice(0, 10)
  const open = tasks.filter((task) => !task.done).length

  return [
    "You are the assistant inside a small todo list app. You manage the user's task list through tools and answer questions about it.",
    `Today is ${today}. The list currently has ${tasks.length} task(s): ${open} open, ${tasks.length - open} completed.`,
    '',
    'Rules:',
    '- Always use a tool when the user asks to see, add, change, complete or remove tasks. Never claim a change without calling the matching tool.',
    '- When the user points at a task, prefer the exact `taskId` from the snapshot below; otherwise pass a short `query` taken from the title.',
    '- Use `createTasksFromSummary` when the user pastes notes, an email, a plan or asks for several tasks at once, and split them into small, atomic tasks with sensible priorities.',
    '- Use `addTask` for a single task the user dictates.',
    '- When the user asks what to do next or wants a list, call `listTasks` and order the answer by priority, with completed items last.',
    '- Keep replies short and concrete: 1-4 sentences or a compact bullet list. Do not repeat the whole task list unless asked.',
    '- If a tool reports `ok: false`, say plainly what went wrong and what you need to fix it.',
    '- Refuse politely, in one sentence, for anything unrelated to the task list.',
    '',
    'Current task snapshot (JSON, newest first; `done` items are already completed):',
    JSON.stringify(toSnapshot(tasks), null, 0),
  ].join('\n')
}
