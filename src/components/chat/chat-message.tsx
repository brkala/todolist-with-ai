import type { ToolUIPart, UIDataTypes, UIMessagePart } from 'ai'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Check,
  CircleAlert,
  Loader2,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'

import type { ChatTools, ChatUIMessage } from '#/lib/ai/chat-message-types'
import { TASK_TOOL_LABELS } from '#/lib/ai/tools'
import type { TaskToolName } from '#/lib/ai/tools'

export type ChatMessageBubbleProps = {
  message: ChatUIMessage
  /** True while this (assistant) message is still receiving parts. */
  isStreaming?: boolean
}

export function ChatMessageBubble({
  message,
  isStreaming = false,
}: ChatMessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')

    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[linear-gradient(135deg,var(--lagoon-deep),#2f7f8c)] px-3.5 py-2.5 text-sm leading-6 text-white shadow-[0_10px_22px_rgba(50,143,151,0.24)]">
          <p className="m-0 whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    )
  }

  const textParts = message.parts.filter((part) => part.type === 'text')
  const toolParts = message.parts.filter(isToolPart)
  const text = textParts.map((part) => part.text).join('')
  const isTextStreaming =
    isStreaming && textParts.some((part) => part.state === 'streaming')
  const isEmpty = text.length === 0 && toolParts.length === 0

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-[rgba(50,143,151,0.28)] bg-[linear-gradient(140deg,rgba(79,184,178,0.35),rgba(47,106,74,0.18))] text-[var(--lagoon-deep)]">
        <Sparkles className="size-3.5" />
      </span>

      <div className="flex min-w-0 max-w-[85%] flex-col gap-1.5">
        {toolParts.map((part) => (
          <ToolCallCard key={part.toolCallId} part={part} />
        ))}

        {text || isEmpty ? (
          <div className="rounded-2xl rounded-tl-md border border-[var(--line)] bg-white/85 px-3.5 py-2.5 text-sm leading-6 text-[var(--sea-ink)] shadow-[0_10px_24px_rgba(30,90,72,0.08)]">
            {isEmpty ? (
              <TypingDots />
            ) : (
              <div className="chat-markdown">
                <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
                {isTextStreaming ? (
                  <span className="typing-caret" aria-hidden="true" />
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

type ToolPart = ToolUIPart<ChatTools>

function isToolPart(
  part: UIMessagePart<UIDataTypes, ChatTools>,
): part is ToolPart {
  return part.type.startsWith('tool-')
}

function toolName(part: ToolPart): TaskToolName {
  return part.type.replace('tool-', '') as TaskToolName
}

function ToolCallCard({ part }: { part: ToolPart }) {
  const { label, detail, status } = describeToolPart(part)

  return (
    <div
      className={[
        'flex items-start gap-2 rounded-xl border px-2.5 py-1.5 text-xs',
        status === 'error'
          ? 'border-[rgba(196,74,74,0.32)] bg-[rgba(196,74,74,0.08)] text-[#9c3131]'
          : 'border-[rgba(50,143,151,0.28)] bg-[rgba(79,184,178,0.1)] text-[var(--sea-ink)]',
      ].join(' ')}
    >
      <span className="mt-px shrink-0">
        {status === 'pending' ? (
          <Loader2 className="size-3.5 animate-spin text-[var(--lagoon-deep)]" />
        ) : status === 'error' ? (
          <CircleAlert className="size-3.5" />
        ) : (
          <Check
            className="size-3.5 text-[var(--lagoon-deep)]"
            strokeWidth={3}
          />
        )}
      </span>

      <span className="min-w-0">
        <span className="font-semibold">{label}</span>
        {detail ? (
          <span className="block text-[var(--sea-ink-soft)]">{detail}</span>
        ) : null}
      </span>
    </div>
  )
}

function describeToolPart(part: ToolPart): {
  label: string
  detail?: string
  status: 'pending' | 'done' | 'error'
} {
  const pendingLabel = TASK_TOOL_LABELS[toolName(part)]

  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return { label: pendingLabel, status: 'pending' }
  }

  if (part.state !== 'output-available' && part.state !== 'output-error') {
    return { label: pendingLabel, status: 'pending' }
  }

  if (part.state === 'output-error') {
    return {
      label: `${pendingLabel} — failed`,
      detail: part.errorText,
      status: 'error',
    }
  }

  switch (part.type) {
    case 'tool-listTasks':
      return {
        label: `Read ${part.output.total} task${part.output.total === 1 ? '' : 's'}`,
        detail: `${part.output.open} open · ${part.output.completed} completed`,
        status: 'done',
      }

    case 'tool-addTask':
    case 'tool-removeTask':
    case 'tool-updateTask':
      return {
        label: part.output.ok
          ? pendingLabel.replace(/ing /, 'ed ')
          : 'No change',
        detail: part.output.message,
        status: part.output.ok ? 'done' : 'error',
      }

    case 'tool-createTasksFromSummary':
      return {
        label: part.output.ok
          ? `Created ${part.output.created.length} task${part.output.created.length === 1 ? '' : 's'}`
          : 'No tasks created',
        detail: part.output.message,
        status: part.output.ok ? 'done' : 'error',
      }

    default:
      return { label: pendingLabel, status: 'done' }
  }
}

export function TypingDots() {
  return (
    <span
      className="flex items-center gap-1 py-1"
      aria-label="Assistant is typing"
    >
      <span className="typing-dot size-1.5 rounded-full bg-[var(--lagoon-deep)]" />
      <span className="typing-dot size-1.5 rounded-full bg-[var(--lagoon-deep)] [animation-delay:150ms]" />
      <span className="typing-dot size-1.5 rounded-full bg-[var(--lagoon-deep)] [animation-delay:300ms]" />
    </span>
  )
}

export function ChatErrorNote({ message }: { message: string }) {
  return (
    <p className="m-0 mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#9c3131]">
      <TriangleAlert className="size-3.5" />
      {message}
    </p>
  )
}
