import { z } from 'zod'

/** Validates whatever the user typed into the composer before sending. */
export const chatPromptSchema = z
  .string()
  .trim()
  .min(1, 'Type a message first.')
  .max(2000, 'Messages max out at 2000 characters.')

export const CHAT_SUGGESTIONS = [
  'What should I do first?',
  'Add a task to review the pull request tomorrow',
  'Remove the oldest task',
  'Mark the first task as done',
] as const

/**
 * Turns an SDK/proxy error into a short message for the chat panel. The server
 * returns `{ error }` JSON, but the AI SDK wraps it in an Error message, so we
 * try to recover the readable part.
 */
export function formatChatError(error: Error): string {
  const raw = error.message.trim()

  if (!raw) {
    return 'The assistant could not be reached. Try again.'
  }

  const jsonStart = raw.indexOf('{')

  if (jsonStart !== -1) {
    try {
      const parsed: unknown = JSON.parse(raw.slice(jsonStart))
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'error' in parsed &&
        typeof parsed.error === 'string'
      ) {
        return parsed.error
      }
    } catch {
      // fall through to the raw message
    }
  }

  return raw
}
