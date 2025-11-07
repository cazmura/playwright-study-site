export const maxDuration = 30

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

interface OpenAIResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string
      tool_calls?: Array<{
        id: string
        type: string
        function: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason: string
  }>
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    console.log("[v0] AI Chat - Received messages:", messages.length)

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set")
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `あなたはPlaywrightの学習支援AIです。ユーザーの要望を聞いて、適切な学習問題を作成します。

ユーザーが学びたい内容を理解したら、createProblemツールを使用して問題を作成してください。

問題の難易度は、ユーザーのレベルに応じて1（初級）、2（中級）、3（上級）から選択してください。
expectedCodeには、実際に動作するPlaywrightのコードを記述してください。

例：
- 「ボタンをクリックする方法を学びたい」→ ボタンをクリックする練習問題を作成
- 「フォーム入力を学習したい」→ フォームに入力する練習問題を作成
- 「要素の取得方法を教えて」→ 要素を取得する練習問題を作成

問題を作成する際は、必ずcreateProblemツールを呼び出してください。`,
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 2000,
        tools: [
          {
            type: "function",
            function: {
              name: "createProblem",
              description: "Playwrightの学習問題を作成して登録します",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "問題のタイトル",
                  },
                  description: {
                    type: "string",
                    description: "問題の説明（何をするべきか明確に記述）",
                  },
                  expectedCode: {
                    type: "string",
                    description: "期待される回答コード（Playwrightのコード）",
                  },
                  alternativeAnswers: {
                    type: "array",
                    items: { type: "string" },
                    description: "代替解答のリスト",
                  },
                  hints: {
                    type: "array",
                    items: { type: "string" },
                    description: "ヒントのリスト",
                  },
                  difficulty: {
                    type: "number",
                    minimum: 1,
                    maximum: 3,
                    description: "難易度（1: 初級, 2: 中級, 3: 上級）",
                  },
                  category: {
                    type: "string",
                    description: "カテゴリ名（例: 基本操作、要素の取得、フォーム入力など）",
                  },
                  folderId: {
                    type: "string",
                    description: "フォルダID（AI生成問題は自動的にai-generatedフォルダに格納されます）",
                    default: "ai-generated",
                  },
                },
                required: [
                  "title",
                  "description",
                  "expectedCode",
                  "alternativeAnswers",
                  "hints",
                  "difficulty",
                  "category",
                ],
              },
            },
          },
        ],
        tool_choice: "auto",
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] OpenAI API Error:", error)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data: OpenAIResponse = await response.json()
    console.log("[v0] AI Chat - Response received")

    const assistantMessage = data.choices[0].message

    // Check if tool was called
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0]
      if (toolCall.function.name === "createProblem") {
        const problemData = JSON.parse(toolCall.function.arguments)
        console.log("[v0] AI Chat - Problem created:", problemData.title)

        return new Response(
          JSON.stringify({
            role: "assistant",
            content: assistantMessage.content || `問題「${problemData.title}」を作成しました。`,
            toolCall: {
              name: "createProblem",
              parameters: problemData,
            },
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        )
      }
    }

    return new Response(
      JSON.stringify({
        role: "assistant",
        content: assistantMessage.content,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    )
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
