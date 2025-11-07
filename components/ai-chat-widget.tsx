"use client"

import { useState } from "react"
import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, AlertCircle, CheckCircle } from "lucide-react"

interface AIChatWidgetProps {
  onProblemGenerated: (problem: {
    title: string
    description: string
    expectedCode: string
    alternativeAnswers?: string[]
    hints: string[]
    difficulty: number
    category: string
    folderId: string
  }) => void
}

export function AIChatWidget({ onProblemGenerated }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error: chatError,
  } = useChat({
    api: "/api/ai-chat",
    maxSteps: 5,
    async onToolCall({ toolCall }) {
      console.log("[v0] Tool called:", toolCall.toolName, toolCall.args)

      if (toolCall.toolName === "createProblem") {
        try {
          // 問題データを登録
          onProblemGenerated(toolCall.args as any)
          setError(null)
          return {
            success: true,
            message: `問題「${toolCall.args.title}」を作成しました。`,
          }
        } catch (err) {
          console.error("[v0] Failed to create problem:", err)
          setError("問題の作成に失敗しました")
          return {
            success: false,
            message: "問題の作成に失敗しました",
          }
        }
      }
    },
    onError: (error) => {
      console.error("[v0] Chat error:", error)
      setError(error.message)
    },
  })

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl flex flex-col z-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">AI アシスタント</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center p-4">
              こんにちは！問題を作成したい内容を教えてください。
              <br />
              例: 「Playwrightでボタンをクリックする方法を学びたい」
            </div>
          )}

          {(error || chatError) && (
            <div className="mx-4 my-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">{error || chatError?.message}</p>
            </div>
          )}

          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div key={message.id}>
                <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {message.parts?.map((part, index) => {
                      if (part.type === "text") {
                        return (
                          <p key={index} className="text-sm whitespace-pre-wrap">
                            {part.text}
                          </p>
                        )
                      }

                      if (part.type === "tool-invocation") {
                        const toolInvocation = part.toolInvocation
                        if (toolInvocation.toolName === "createProblem") {
                          if (toolInvocation.state === "call") {
                            return (
                              <div key={index} className="text-sm flex items-center gap-2 text-muted-foreground">
                                <CheckCircle className="h-4 w-4" />
                                問題「{toolInvocation.args.title}」を作成中...
                              </div>
                            )
                          }
                          if (toolInvocation.state === "result") {
                            return (
                              <div key={index} className="text-sm flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                {toolInvocation.result.message}
                              </div>
                            )
                          }
                        }
                      }

                      return null
                    })}
                    {!message.parts && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-4 py-2 bg-muted">
                  <p className="text-sm text-muted-foreground">考え中...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="メッセージを入力..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
