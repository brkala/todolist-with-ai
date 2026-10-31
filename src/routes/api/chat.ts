import { createDeepSeek } from '@ai-sdk/deepseek'
import { createFileRoute } from '@tanstack/react-router'
import { convertToModelMessages, streamText } from 'ai'
import { z } from 'zod'

import type { ChatUIMessage } from '#/lib/ai/chat-message-types'
import { buildSystemPrompt } from '#/lib/ai/system-prompt'
import { taskToolDefinitions } from '#/lib/ai/tools'
import { taskListSchema } from '#/lib/task'

/**
 * Streaming chat endpoint.
 *
 * Tools are declared here but deliberately have no `execute`: the task list
 * lives in the browser (localStorage), so the client runs the tool and sends
 * the result back with the next request.
 */

const requestBodySchema = z.object({
  messages: z.array(z.unknown()).min(1, 'At least one message is required.'),
  tasks: taskListSchema.default([]),
})

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.DEEPSEEK_API_KEY?.trim()

        if (!apiKey) {
          return jsonError(
            'DEEPSEEK_API_KEY is not set. Add it to .env (see .env.example) and restart the dev server.',
            500,
          )
        }

        let body: unknown

        try {
          body = await request.json()
        } catch {
          return jsonError('Request body must be valid JSON.', 400)
        }

        const parsed = requestBodySchema.safeParse(body)

        if (!parsed.success) {
          const issue = parsed.error.issues[0]
          const path = issue.path.join('.') || 'body'
          return jsonError(`Invalid request: ${path} — ${issue.message}`, 400)
        }

        const deepseek = createDeepSeek({ apiKey })

        const messages = await convertToModelMessages(
          parsed.data.messages as ChatUIMessage[],
        )

        const result = streamText({
          model: deepseek('deepseek-chat'),
          system: buildSystemPrompt(parsed.data.tasks),
          messages,
          tools: taskToolDefinitions,
          maxRetries: 1,
          onError: ({ error }) => {
            console.error('[chat] DeepSeek stream error:', error)
          },
        })

        return result.toUIMessageStreamResponse({
          onError: (error) =>
            error instanceof Error
              ? error.message
              : 'The assistant failed to respond.',
        })
      },
    },
  },
})
