import { useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  RotateCcw,
  Sparkles,
  Square,
  TriangleAlert,
  Wrench,
} from 'lucide-react'

import { ChatMessageBubble, TypingDots } from '#/components/chat/chat-message'
import { Button } from '#/components/ui/button'
import type { ChatUIMessage } from '#/lib/ai/chat-message-types'
import { CHAT_SUGGESTIONS } from '#/lib/chat'

export type ChatPanelProps = {
  messages: ChatUIMessage[]
  isStreaming: boolean
  isBusy: boolean
  error: string | null
  onSend: (prompt: string) => boolean
  onStop: () => void
  onClear: () => void
  onDismissError: () => void
}

const MAX_PROMPT_LENGTH = 2000

export function ChatPanel({
  messages,
  isStreaming,
  isBusy,
  error,
  onSend,
  onStop,
  onClear,
  onDismissError,
}: ChatPanelProps) {
  const [value, setValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keep the newest message (and the streaming tail) in view.
  useEffect(() => {
    const element = scrollRef.current

    if (element) {
      element.scrollTop = element.scrollHeight
    }
  }, [messages, isStreaming])

  // Grow the composer with its content, up to a point.
  useEffect(() => {
    const element = textareaRef.current

    if (element) {
      element.style.height = 'auto'
      element.style.height = `${Math.min(element.scrollHeight, 132)}px`
    }
  }, [value])

  function submit(prompt: string) {
    if (onSend(prompt)) {
      setValue('')
      textareaRef.current?.focus()
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(value)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit(value)
    }
  }

  const isOverLimit = value.length > MAX_PROMPT_LENGTH
  const canSend = value.trim().length > 0 && !isBusy && !isOverLimit
  const lastMessage = messages[messages.length - 1]
  const waitingForFirstToken =
    isBusy &&
    (messages.length === 0 ||
      lastMessage.role === 'user' ||
      lastMessage.parts.length === 0)

  return (
    <section className="island-shell flex h-full min-h-0 flex-col overflow-hidden rounded-3xl">
      <header className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(140deg,rgba(79,184,178,0.4),rgba(47,106,74,0.22))] text-[var(--lagoon-deep)]">
          <Sparkles className="size-4" />
        </span>

        <div className="min-w-0">
          <h2 className="display-title m-0 truncate text-lg leading-tight font-bold text-[var(--sea-ink)]">
            AI assistant
          </h2>
          <p className="m-0 truncate text-xs text-[var(--sea-ink-soft)]">
            DeepSeek · deepseek-chat
          </p>
        </div>

        <span
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-[rgba(50,143,151,0.32)] bg-[rgba(79,184,178,0.16)] px-2 py-0.5 text-[0.68rem] font-bold tracking-wide text-[var(--lagoon-deep)] uppercase"
          title="The assistant can read and change your tasks"
        >
          <Wrench className="size-3" />
          Tools
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          disabled={messages.length === 0}
          title="Clear conversation"
          aria-label="Clear conversation"
          className="text-[var(--sea-ink-soft)] hover:bg-[rgba(79,184,178,0.16)] hover:text-[var(--sea-ink)]"
        >
          <RotateCcw />
        </Button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(243,250,245,0.45))] px-4 py-4"
        aria-live="polite"
        aria-busy={isBusy}
      >
        {messages.length === 0 ? (
          <EmptyChat onPick={submit} />
        ) : (
          messages.map((message, index) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              isStreaming={
                isStreaming &&
                index === messages.length - 1 &&
                message.role === 'assistant'
              }
            />
          ))
        )}

        {waitingForFirstToken ? (
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-[rgba(50,143,151,0.28)] bg-[linear-gradient(140deg,rgba(79,184,178,0.35),rgba(47,106,74,0.18))] text-[var(--lagoon-deep)]">
              <Sparkles className="size-3.5" />
            </span>
            <div className="rounded-2xl rounded-tl-md border border-[var(--line)] bg-white/85 px-3.5 py-2.5 shadow-[0_10px_24px_rgba(30,90,72,0.08)]">
              <TypingDots />
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="mx-4 mb-1 flex items-start gap-2 rounded-lg border border-[rgba(196,74,74,0.3)] bg-[rgba(196,74,74,0.1)] px-3 py-2 text-xs font-semibold text-[#9c3131]"
        >
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={onDismissError}
            className="font-bold underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="border-t border-[var(--line)] bg-[var(--surface-strong)] p-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-[var(--line)] bg-white/85 p-2 shadow-[0_8px_20px_rgba(30,90,72,0.07)] focus-within:border-[rgba(50,143,151,0.5)] focus-within:ring-2 focus-within:ring-[rgba(79,184,178,0.25)]">
          <label htmlFor="chat-composer" className="sr-only">
            Message the assistant
          </label>
          <textarea
            id="chat-composer"
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your tasks, or paste notes to turn into tasks…"
            aria-invalid={isOverLimit}
            className="max-h-[132px] min-h-9 flex-1 resize-none border-0 bg-transparent px-1.5 py-2 text-sm leading-6 text-[var(--sea-ink)] outline-none placeholder:text-[var(--sea-ink-soft)]/70"
          />

          {isBusy ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={onStop}
              title="Stop generating"
              aria-label="Stop generating"
            >
              <Square />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon-sm"
              disabled={!canSend}
              title="Send message"
              aria-label="Send message"
            >
              <ArrowUp />
            </Button>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between px-1 text-[0.68rem] text-[var(--sea-ink-soft)]">
          <span>
            <kbd className="font-sans font-semibold">Enter</kbd> to send ·{' '}
            <kbd className="font-sans font-semibold">Shift</kbd>+
            <kbd className="font-sans font-semibold">Enter</kbd> for a new line
          </span>
          {value.length > MAX_PROMPT_LENGTH - 200 ? (
            <span className={isOverLimit ? 'font-bold text-[#9c3131]' : ''}>
              {value.length}/{MAX_PROMPT_LENGTH}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  )
}

function EmptyChat({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-2xl border border-[rgba(50,143,151,0.24)] bg-[linear-gradient(150deg,rgba(79,184,178,0.28),rgba(47,106,74,0.12))] text-[var(--lagoon-deep)]">
        <Sparkles className="size-5" />
      </span>

      <div>
        <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
          Ask me about your list
        </p>
        <p className="m-0 mt-1 max-w-[26ch] text-xs text-[var(--sea-ink-soft)]">
          I can read, add, update and remove tasks — or turn a block of notes
          into tasks for you.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {CHAT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5 hover:border-[rgba(50,143,151,0.45)] hover:bg-white"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
