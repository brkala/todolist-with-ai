import type { UIDataTypes, UIMessage } from 'ai'

import type {
  AddTaskInput,
  CreateTasksFromSummaryInput,
  CreateTasksOutput,
  ListTasksInput,
  ListTasksOutput,
  RemoveTaskInput,
  TaskMutationOutput,
  UpdateTaskInput,
} from '#/lib/ai/tools'

/** Tool contract used by `useChat` so tool parts are typed in the UI. */
export type ChatTools = {
  listTasks: { input: ListTasksInput; output: ListTasksOutput }
  addTask: { input: AddTaskInput; output: TaskMutationOutput }
  removeTask: { input: RemoveTaskInput; output: TaskMutationOutput }
  updateTask: { input: UpdateTaskInput; output: TaskMutationOutput }
  createTasksFromSummary: {
    input: CreateTasksFromSummaryInput
    output: CreateTasksOutput
  }
}

export type ChatUIMessage = UIMessage<never, UIDataTypes, ChatTools>

export function getMessageText(message: ChatUIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}
