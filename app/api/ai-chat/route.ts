import { streamText } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    console.log("[v0] AI Chat - Received messages:", messages.length)

    const result = streamText({
      model: "openai/gpt-4o-mini", // Updated to correct model name
      messages,
      system: `あなたはPlaywrightの学習支援AIです。ユーザーの要望を聞いて、適切な学習問題を作成します。

問題を作成する際は、以下のフォーマットでJSON形式で出力してください：

\`\`\`json
{
  "title": "問題のタイトル",
  "description": "問題の説明（何をするべきか明確に記述）",
  "expectedCode": "期待される回答コード（Playwrightのコード）",
  "alternativeAnswers": ["代替解答1", "代替解答2"],
  "hints": ["ヒント1", "ヒント2"],
  "difficulty": 1,
  "category": "カテゴリ名",
  "folderId": "default"
}
\`\`\`

ユーザーが学びたい内容を理解し、実践的で分かりやすい問題を作成してください。
問題の難易度は、ユーザーのレベルに応じて1（初級）、2（中級）、3（上級）から選択してください。
expectedCodeには、実際に動作するPlaywrightのコードを記述してください。`,
      temperature: 0.7,
      maxTokens: 2000,
    })

    console.log("[v0] AI Chat - Streaming response")
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] AI Chat - Error:", error)
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
