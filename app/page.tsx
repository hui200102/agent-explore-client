"use client"

import { ChatContainer } from "@/components/chat/chat-container"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black p-4">
      <Card className="w-full max-w-4xl h-[800px] shadow-2xl">
        <CardHeader className="border-b">
          <CardTitle className="text-2xl">AI Chat Assistant</CardTitle>
          <CardDescription>
            Powered by Redis stateless architecture with real-time streaming
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-5rem)]">
          <ChatContainer />
        </CardContent>
      </Card>
    </div>
  )
}
