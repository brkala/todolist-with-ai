import { Check, Pencil, Trash2 } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { formatTaskDate } from '#/lib/task'
import type { Task, TaskPriority } from '#/lib/task'

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  high: 'border-[rgba(178,58,58,0.26)] bg-[rgba(196,74,74,0.12)] text-[#9c3131]',
  medium:
    'border-[rgba(196,138,32,0.28)] bg-[rgba(214,158,46,0.14)] text-[#8a5a12]',
  low: 'border-[rgba(50,143,151,0.28)] bg-[rgba(79,184,178,0.16)] text-[#2b6f75]',
}

export type TaskTableProps = {
  tasks: Task[]
  onToggle: (id: string) => void
  onEdit: (task: Task) => void
  onRemove: (id: string) => void
}

export function TaskTable({
  tasks,
  onToggle,
  onEdit,
  onRemove,
}: TaskTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Your tasks</caption>
        <thead>
          <tr className="text-left text-[0.7rem] font-bold tracking-[0.14em] text-[var(--sea-ink-soft)] uppercase">
            <th scope="col" className="w-12 py-2 pl-4">
              <span className="sr-only">Completed</span>
            </th>
            <th scope="col" className="py-2 pr-3">
              Task
            </th>
            <th scope="col" className="hidden py-2 pr-3 sm:table-cell">
              Priority
            </th>
            <th scope="col" className="hidden py-2 pr-3 md:table-cell">
              Added
            </th>
            <th scope="col" className="py-2 pr-4 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="border-t border-[var(--line)] align-middle transition-colors hover:bg-[rgba(79,184,178,0.07)]"
            >
              <td className="py-2.5 pl-4">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.done}
                  aria-label={
                    task.done
                      ? `Mark “${task.title}” as not done`
                      : `Mark “${task.title}” as done`
                  }
                  onClick={() => onToggle(task.id)}
                  className={[
                    'grid size-5 place-items-center rounded-full border transition',
                    task.done
                      ? 'border-[var(--lagoon-deep)] bg-[var(--lagoon-deep)] text-white'
                      : 'border-[rgba(23,58,64,0.28)] bg-white/80 text-transparent hover:border-[var(--lagoon-deep)] hover:text-[rgba(50,143,151,0.5)]',
                  ].join(' ')}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </button>
              </td>

              <td className="max-w-0 py-2.5 pr-3">
                <p
                  className={[
                    'm-0 truncate font-semibold',
                    task.done
                      ? 'text-[var(--sea-ink-soft)] line-through decoration-[rgba(65,97,102,0.5)]'
                      : 'text-[var(--sea-ink)]',
                  ].join(' ')}
                  title={task.title}
                >
                  {task.title}
                </p>
                {task.notes ? (
                  <p
                    className="m-0 mt-0.5 truncate text-xs text-[var(--sea-ink-soft)]"
                    title={task.notes}
                  >
                    {task.notes}
                  </p>
                ) : null}
              </td>

              <td className="hidden py-2.5 pr-3 sm:table-cell">
                <span
                  className={[
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold',
                    PRIORITY_STYLES[task.priority],
                  ].join(' ')}
                >
                  {PRIORITY_LABELS[task.priority]}
                </span>
              </td>

              <td className="hidden py-2.5 pr-3 text-xs text-[var(--sea-ink-soft)] md:table-cell">
                {formatTaskDate(task.createdAt)}
              </td>

              <td className="py-2.5 pr-3">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(task)}
                    aria-label={`Edit “${task.title}”`}
                    title="Edit task"
                    className="text-[var(--sea-ink-soft)] hover:bg-[rgba(79,184,178,0.16)] hover:text-[var(--sea-ink)]"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemove(task.id)}
                    aria-label={`Remove “${task.title}”`}
                    title="Remove task"
                    className="text-[rgba(156,49,49,0.75)] hover:bg-[rgba(196,74,74,0.12)] hover:text-[#9c3131]"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
