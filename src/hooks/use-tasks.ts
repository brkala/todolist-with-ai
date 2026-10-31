import { useCallback, useEffect, useMemo, useState } from 'react'

import { createTask, taskListSchema } from '#/lib/task'
import type { Task, TaskDraft } from '#/lib/task'

const STORAGE_KEY = 'todolist.tasks.v1'

const SEED_TASKS: ReadonlyArray<Task> = [
  {
    id: 'seed-plan-sprint',
    title: 'Plan the next sprint',
    notes: 'Groom the backlog and confirm scope with the team.',
    priority: 'high',
    done: false,
    createdAt: '2025-01-06T09:00:00.000Z',
  },
  {
    id: 'seed-wire-chat',
    title: 'Wire the chat panel to DeepSeek',
    notes: 'Swap the mock stream for a real model stream.',
    priority: 'medium',
    done: false,
    createdAt: '2025-01-07T09:00:00.000Z',
  },
  {
    id: 'seed-setup',
    title: 'Set up the project',
    notes: 'Vite + TanStack Start + Tailwind + zod.',
    priority: 'low',
    done: true,
    createdAt: '2025-01-05T09:00:00.000Z',
  },
]

function readStoredTasks(): Task[] | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (raw === null) {
    return null
  }

  try {
    const parsed = taskListSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export type UseTasksResult = {
  tasks: Task[]
  hydrated: boolean
  openCount: number
  doneCount: number
  addTask: (draft: TaskDraft) => void
  updateTask: (id: string, draft: TaskDraft) => void
  removeTask: (id: string) => void
  /** Used by the assistant tools: they compute the next list in one go. */
  replaceTasks: (tasks: Task[]) => void
  toggleTask: (id: string) => void
  clearCompleted: () => void
  resetList: () => void
}

export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Read from localStorage after mount so SSR and the first client render match.
  useEffect(() => {
    setTasks(readStoredTasks() ?? [...SEED_TASKS])
    setHydrated(true)
  }, [])

  // Persist only once the list really came from storage/seeds — writing before
  // that would clobber the stored list with the empty initial state (StrictMode
  // re-runs effects, so it would read its own premature write back).
  useEffect(() => {
    if (!hydrated) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks, hydrated])

  const addTask = useCallback((draft: TaskDraft) => {
    setTasks((previous) => [createTask(draft), ...previous])
  }, [])

  const updateTask = useCallback((id: string, draft: TaskDraft) => {
    setTasks((previous) =>
      previous.map((task) => (task.id === id ? { ...task, ...draft } : task)),
    )
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks((previous) => previous.filter((task) => task.id !== id))
  }, [])

  /** Used by the assistant's tools: they hand over the whole next list. */
  const replaceTasks = useCallback((next: Task[]) => {
    setTasks(next)
  }, [])

  const toggleTask = useCallback((id: string) => {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    )
  }, [])

  const clearCompleted = useCallback(() => {
    setTasks((previous) => previous.filter((task) => !task.done))
  }, [])

  const resetList = useCallback(() => {
    setTasks([])
  }, [])

  const { openCount, doneCount } = useMemo(() => {
    const done = tasks.filter((task) => task.done).length
    return { openCount: tasks.length - done, doneCount: done }
  }, [tasks])

  return {
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
    resetList,
  }
}
