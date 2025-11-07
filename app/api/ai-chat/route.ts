import { streamText, tool } from "ai"
import { z } from "zod"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    console.log("[v0] AI Chat - Received messages:", messages.length)

    const result = streamText({
      model: "openai/gpt-4o-mini",
      messages,
      system: `あなたはPlaywrightの学習支援AIです。ユーザーの要望を聞いて、適切な学習問題を作成します。

ユーザーが学びたい内容を理解したら、createProblemツールを使用して問題を作成してください。

問題の難易度は、ユーザーのレベルに応じて1（初級）、2（中級）、3（上級）から選択してください。
expectedCodeには、実際に動作するPlaywrightのコードを記述してください。

例：
- 「ボタンをクリックする方法を学びたい」→ ボタンをクリックする練習問題を作成
- 「フォーム入力を学習したい」→ フォームに入力する練習問題を作成
- 「要素の取得方法を教えて」→ 要素を取得する練習問題を作成

問題を作成する際は、必ずcreateProblemツールを呼び出してください。`,
      temperature: 0.7,
      maxTokens: 2000,
      tools: {
        createProblem: tool({
          description: "Playwrightの学習問題を作成して登録します",
          parameters: z.object({
            title: z.string().describe("問題のタイトル"),
            description: z.string().describe("問題の説明（何をするべきか明確に記述）"),
            expectedCode: z.string().describe("期待される回答コード（Playwrightのコード）"),
            alternativeAnswers: z.array(z.string()).describe("代替解答のリスト"),
            hints: z.array(z.string()).describe("ヒントのリスト"),
            difficulty: z.number().min(1).max(3).describe("難易度（1: 初級, 2: 中級, 3: 上級）"),
            category: z.string().describe("カテゴリ名（例: 基本操作、要素の取得、フォーム入力など）"),
            folderId: z.string().default("default").describe("フォルダID"),
          }),
          execute: async (params) => {
            console.log("[v0] AI Chat - Creating problem:", params.title)
            // ツールの実行結果を返す（クライアント側で実際の登録処理を行う）
            return {
              success: true,
              message: `問題「${params.title}」を作成しました。`,
              problem: params,
            }
          },
        }),
      },
    })

    console.log("[v0] AI Chat - Streaming response")
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] AI Chat - Error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
