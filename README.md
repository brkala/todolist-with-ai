# Todo list + AI assistant

A small todo app with a DeepSeek-powered assistant next to it. The assistant can
read, add, update and remove tasks — and turn a block of pasted notes into tasks.

Built with **Vite + TanStack Start** (React 19, file-based routing), **Tailwind CSS v4**,
**shadcn/ui**, **zod**, and the **Vercel AI SDK** (`ai` + `@ai-sdk/deepseek` + `@ai-sdk/react`).

## Run it

```bash
npm install
cp .env.example .env      # then put your DeepSeek key in .env
npm run dev               # http://localhost:3000
```

`.env` needs one variable:

```bash
DEEPSEEK_API_KEY=sk-...
```

Get a key at <https://platform.deepseek.com/api_keys>. The key is only read by the
server route (`src/routes/api/chat.ts`) — it never reaches the browser bundle.

Other scripts: `npm run build`, `npm run lint`, `npm run check` (prettier).

## What's in the app

Left column — the task list:

- Table with completed toggle, title/notes, priority, created date and row actions.
- **Add task** / **Edit task** modal (shadcn `Dialog`) with inline zod field errors.
- **Remove** button per row, plus **Clear completed** in the header.
- Tasks persist in `localStorage` (`todolist.tasks.v1`) and are parsed with zod on
  read, so a corrupt/old payload can never crash the table.

Right column — the AI assistant:

- Streaming replies from `deepseek-chat`, rendered as markdown (GFM: bold, lists, tables).
- Every tool call shows up as a small card in the conversation ("Added a task",
  "Read 7 tasks · 6 open · 1 completed", …), so you can see what the model did.
- Composer: `Enter` sends, `Shift+Enter` newline, auto-grow, stop-generating button,
  zod validation and a character limit, suggestion chips, clear conversation.
- Errors (missing key, bad key, network) surface in a dismissible banner with the
  real message from DeepSeek.

## The assistant's tools

| Tool                     | What it does                                                               |
| ------------------------ | -------------------------------------------------------------------------- |
| `listTasks`              | Lists tasks with **remaining first, ordered by priority**, completed last. |
| `addTask`                | Adds a single task with optional notes and priority.                       |
| `updateTask`             | Renames, edits notes/priority, or completes / reopens a task.              |
| `removeTask`             | Removes a task, matched by `taskId` or a title `query`.                    |
| `createTasksFromSummary` | Splits pasted text into several atomic tasks and creates them in one go.   |

### How a tool call flows

The task list lives in the browser, so the tools are executed **client-side**:

```
browser                       server (TanStack Start route)          DeepSeek
  │ POST /api/chat ─────────────▶ streamText({ tools, tasks }) ──────▶ │
  │ ◀──────────── stream: text + tool-call parts ──────────────────────┘
  │ onToolCall → zod-validate input → mutate the task store
  │ addToolOutput(...) → SDK re-sends with the tool result ────────────▶ │
  │ ◀──────────────── final assistant text ────────────────────────────┘
```

- `src/routes/api/chat.ts` — the streaming endpoint. Declares the tools **without**
  `execute`, injects the current task snapshot into the system prompt, and validates
  the request body with zod.
- `src/lib/ai/tools.ts` — the shared contract: zod input schemas, tool descriptions,
  and output types. Used by both the server (definitions) and the client (validation).
- `src/lib/ai/task-tool-runner.ts` — pure functions that validate one tool input and
  return the next task list. Easy to unit test, no React or network involved.
- `src/hooks/use-chat.ts` — wires `useChat` to the endpoint, runs the tools in
  `onToolCall`, persists the resulting list through `useTasks`, and auto-continues the
  turn with `lastAssistantMessageIsCompleteWithToolCalls`.
- `src/lib/ai/system-prompt.ts` — instructions + the task snapshot handed to the model.

## Project layout

```
src/
  routes/
    __root.tsx                 shell: <head>, header, devtools, 404
    index.tsx                  two-column layout (tasks | chat)
    api/chat.ts                POST endpoint: DeepSeek + tools (server-only)
  components/
    tasks/task-board.tsx       task card: header, stats, empty state, dialog wiring
    tasks/task-table.tsx       the table + row actions
    tasks/task-form-dialog.tsx add/edit modal, zod validation
    chat/chat-panel.tsx        chat layout, composer, suggestions, error banner
    chat/chat-message.tsx      message bubbles, tool cards, typing dots, markdown
    ui/                        shadcn primitives
  lib/
    task.ts                    zod schemas + Task helpers
    chat.ts                    prompt schema, suggestions, error formatting
    ai/tools.ts                tool schemas/descriptions + output types
    ai/task-tool-runner.ts     client-side tool execution
    ai/chat-message-types.ts   typed UIMessage for the chat
    ai/system-prompt.ts        system prompt builder
  hooks/
    use-tasks.ts               localStorage-backed task store
    use-chat.ts                AI SDK useChat + tool execution
```

## Notes / next steps

- Swap `deepseek-chat` for another model id in `src/routes/api/chat.ts` (e.g. a
  reasoning model) if you want; the tools and UI stay the same.
- The task store is still `localStorage`: if you move tasks to a database, keep the
  tool input schemas and execute the same tools on the server instead.
- Conversations are not persisted; reloading clears the chat.
