# AI Chat Assistant - Frontend

A modern chat interface built with Next.js, React, and shadcn/ui components, designed to work with the Redis-based stateless backend architecture.

## Features

✅ **Real-time Streaming** - Server-Sent Events (SSE) for live message updates
✅ **Stateless Architecture** - Works with Redis-backed session management
✅ **Modern UI** - Beautiful chat interface using shadcn/ui components
✅ **Message Types** - Support for text, images, code, and thinking blocks
✅ **Task Processing** - Visual feedback for async task execution
✅ **Responsive Design** - Works on desktop and mobile devices
✅ **Dark Mode** - Automatic theme switching

## Getting Started

### 1. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Configure Environment

Create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

Update the API URL in `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### 3. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

### Components

```
components/
├── chat/
│   ├── chat-container.tsx     # Main chat container with session management
│   ├── chat-input.tsx          # Message input with send button
│   └── message-bubble.tsx      # Individual message display
└── ui/
    ├── button.tsx              # shadcn Button component
    ├── input.tsx               # shadcn Input component
    ├── card.tsx                # shadcn Card component
    ├── avatar.tsx              # shadcn Avatar component
    └── scroll-area.tsx         # shadcn ScrollArea component
```

### API Client

The `lib/api-client.ts` provides a typed interface for the backend API:

```typescript
import { apiClient } from '@/lib/api-client'

// Create a session
const session = await apiClient.createSession('user_123')

// Send a message
const message = await apiClient.sendMessage(sessionId, {
  content: 'Hello, AI!',
  type: 'text'
})

// Subscribe to real-time updates
const cleanup = apiClient.subscribeToStream(
  sessionId,
  messageId,
  '0',
  (event) => console.log('Event:', event)
)
```

## Backend Integration

This frontend is designed to work with the Redis-based stateless backend. See `REDIS_ARCHITECTURE.md` for backend details.

### API Endpoints

- `POST /api/v1/sessions` - Create a new session
- `GET /api/v1/sessions/{session_id}` - Get session details
- `POST /api/v1/sessions/{session_id}/messages` - Send a message
- `GET /api/v1/sessions/{session_id}/messages` - Get all messages
- `GET /api/v1/sessions/{session_id}/messages/{message_id}/stream` - SSE stream

### Event Types

The frontend handles these stream events:

- `MESSAGE_START` / `MESSAGE_END` - Message lifecycle
- `TEXT_DELTA` - Incremental text updates
- `CONTENT_ADDED` / `CONTENT_UPDATED` - Content block changes
- `TASK_STARTED` / `TASK_PROGRESS` / `TASK_COMPLETED` / `TASK_FAILED` - Task updates
- `ERROR` / `PING` - Error handling and connection health

## Features Explained

### Real-time Streaming

Messages are streamed in real-time using Server-Sent Events (SSE). The chat automatically updates as the assistant generates responses:

```typescript
// Handled automatically in ChatContainer
subscribeToMessage(messageId)
```

### Content Blocks

The chat supports multiple content types:

- **Text** - Standard text messages
- **Images** - Inline image display with captions
- **Code** - Syntax-highlighted code blocks
- **Thinking** - AI reasoning process (shown in italic)
- **Files** - File attachments with icons

### Task Processing

Long-running tasks (like image generation) show loading indicators:

```typescript
// Backend sends task events
{
  event_type: 'TASK_PROGRESS',
  payload: { 
    task_id: 'task_001',
    progress: 0.5,
    status: 'processing'
  }
}
```

### Session Management

Sessions are created automatically on first message. The session ID is stored in the component state:

```typescript
const [sessionId, setSessionId] = useState<string | null>(null)

// Auto-create on mount
useEffect(() => {
  const session = await apiClient.createSession(userId)
  setSessionId(session.session_id)
}, [])
```

## Customization

### Styling

The app uses Tailwind CSS with shadcn/ui components. Customize colors in `app/globals.css`:

```css
:root {
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  /* ... more variables */
}
```

### Message Display

Customize message bubbles in `components/chat/message-bubble.tsx`:

```typescript
<Card className={cn(
  "px-4 py-3 max-w-[80%]",
  isAssistant ? "bg-muted" : "bg-primary text-primary-foreground"
)}>
```

### API Configuration

Change the API client behavior in `lib/api-client.ts`:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
```

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

Set these in your production environment:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourserver.com/api/v1
```

### Vercel Deployment

1. Push to GitHub
2. Import to Vercel
3. Set environment variables
4. Deploy

## Troubleshooting

### Connection Issues

If the chat doesn't connect:

1. Check that the backend is running
2. Verify `NEXT_PUBLIC_API_BASE_URL` is correct
3. Check browser console for errors
4. Ensure CORS is configured on the backend

### SSE Not Working

If messages don't stream:

1. Check that the backend supports SSE
2. Verify the stream endpoint returns `text/event-stream`
3. Check for proxy/firewall issues
4. Test the SSE endpoint directly in browser

### Styling Issues

If components look broken:

1. Run `npm install` to ensure all dependencies are installed
2. Check that `@radix-ui/*` packages are installed
3. Verify Tailwind CSS is properly configured

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **shadcn/ui** - Component library
- **Tailwind CSS v4** - Styling
- **TypeScript** - Type safety
- **Radix UI** - Accessible primitives
- **Lucide React** - Icons

## License

MIT

## Related Documentation

- [REDIS_ARCHITECTURE.md](./REDIS_ARCHITECTURE.md) - Backend architecture
- [shadcn/ui Documentation](https://ui.shadcn.com/) - Component library docs
- [Next.js Documentation](https://nextjs.org/docs) - Framework docs

