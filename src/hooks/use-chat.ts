import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChat as useAiChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai'

import type { ChatTools, ChatUIMessage } from '#/lib/ai/chat-message-types'
import {
  runAddTask,
  runCreateTasksFromSummary,
  runListTasks,
  runRemoveTask,
  runUpdateTask,
} from '#/lib/ai/task-tool-runner'
import type { TaskToolName } from '#/lib/ai/tools'
import { chatPromptSchema, formatChatError } from '#/lib/chat'
import type { Task } from '#/lib/task'

const TASK_TOOL_NAMES: ReadonlyArray<TaskToolName> = [
  'listTasks',
  'addTask',
  'removeTask',
  'updateTask',
  'createTasksFromSummary',
]

function isTaskToolName(name: string): name is TaskToolName {
  return (TASK_TOOL_NAMES as ReadonlyArray<string>).includes(name)
}

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

export type UseChatResult = {
  messages: ChatUIMessage[]
  status: ChatStatus
  isStreaming: boolean
  isBusy: boolean
  error: string | null
  sendMessage: (rawPrompt: string) => boolean
  stopStreaming: () => void
  clearChat: () => void
  dismissError: () => void
}

export type UseChatOptions = {
  tasks: Task[]
  /** Persists a list computed by a tool call (keeps one source of truth). */
  replaceTasks: (tasks: Task[]) => void
}

/**
 * Chat state + DeepSeek streaming via the Vercel AI SDK.
 *
 * The task list is client-owned, so every tool runs here: the model emits a
 * tool call, we validate + execute it against the real list, push the result
 * back to the model, and the SDK automatically continues the turn.
 */
export function useChat({
  tasks,
  replaceTasks,
}: UseChatOptions): UseChatResult {
  const [promptError, setPromptError] = useState<string | null>(null)

  const tasksRef = useRef(tasks)
  const replaceTasksRef = useRef(replaceTasks)
  const addToolOutputRef = useRef<
    ReturnType<typeof useAiChat<ChatUIMessage>>['addToolOutput'] | null
  >(null)

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    replaceTasksRef.current = replaceTasks
  }, [replaceTasks])

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: '/api/chat',
        // The model needs the current list to resolve "the sprint task" etc.
        body: () => ({ tasks: tasksRef.current }),
        // Surface the server's `{ error }` message instead of a generic 500.
        fetch: async (input, init) => {
          const response = await globalThis.fetch(input, init)

          if (!response.ok) {
            let message = `The assistant request failed (${response.status}).`

            try {
              const data: unknown = await response.clone().json()
              if (
                typeof data === 'object' &&
                data !== null &&
                'error' in data &&
                typeof data.error === 'string'
              ) {
                message = (data as { error: string }).error
              }
            } catch {
              // keep the generic message
            }

            throw new Error(message)
          }

          return response
        },
      }),
    [],
  )

  const chat = useAiChat<ChatUIMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      const addToolOutput = addToolOutputRef.current

      if (!addToolOutput) {
        return
      }

      const { toolCallId, toolName } = toolCall

      if (!isTaskToolName(toolName)) {
        addToolOutput({
          tool: toolName as keyof ChatTools,
          toolCallId,
          state: 'output-error',
          errorText: `Unknown tool “${toolName}”.`,
        })
        return
      }

      const working = tasksRef.current

      switch (toolName) {
        case 'listTasks': {
          const output = runListTasks(toolCall.input, working)
          addToolOutput({ tool: 'listTasks', toolCallId, output })
          return
        }

        case 'addTask': {
          const { output, tasks: next } = runAddTask(toolCall.input, working)
          replaceTasksRef.current(next)
          tasksRef.current = next
          addToolOutput({ tool: 'addTask', toolCallId, output })
          return
        }

        case 'removeTask': {
          const { output, tasks: next } = runRemoveTask(toolCall.input, working)
          replaceTasksRef.current(next)
          tasksRef.current = next
          addToolOutput({ tool: 'removeTask', toolCallId, output })
          return
        }

        case 'updateTask': {
          const { output, tasks: next } = runUpdateTask(toolCall.input, working)
          replaceTasksRef.current(next)
          tasksRef.current = next
          addToolOutput({ tool: 'updateTask', toolCallId, output })
          return
        }

        case 'createTasksFromSummary': {
          const { output, tasks: next } = runCreateTasksFromSummary(
            toolCall.input,
            working,
          )
          replaceTasksRef.current(next)
          tasksRef.current = next
          addToolOutput({ tool: 'createTasksFromSummary', toolCallId, output })
          return
        }
      }
    },
  })

  // `onToolCall` is fired by the chat instance, which does not exist yet while
  // the hook initialises — reach the helpers through a ref instead.
  useEffect(() => {
    addToolOutputRef.current = chat.addToolOutput
  }, [chat.addToolOutput])

  const sendMessage = useCallback(
    (rawPrompt: string) => {
      const parsed = chatPromptSchema.safeParse(rawPrompt)

      if (!parsed.success) {
        setPromptError(parsed.error.issues[0]?.message ?? 'Cannot send that.')
        return false
      }

      setPromptError(null)
      void chat.sendMessage({ text: parsed.data })
      return true
    },
    [chat],
  )

  const stopStreaming = useCallback(() => {
    void chat.stop()
  }, [chat])

  const clearChat = useCallback(() => {
    void chat.stop()
    chat.setMessages([])
    chat.clearError()
    setPromptError(null)
  }, [chat])

  const dismissError = useCallback(() => {
    chat.clearError()
    setPromptError(null)
  }, [chat])

  const error = promptError ?? (chat.error ? formatChatError(chat.error) : null)

  return {
    messages: chat.messages,
    status: chat.status,
    isStreaming: chat.status === 'streaming',
    isBusy: chat.status === 'submitted' || chat.status === 'streaming',
    error,
    sendMessage,
    stopStreaming,
    clearChat,
    dismissError,
  }
}
