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

## 基本的な振る舞い

1. **曖昧な要件の場合**：
   - ユーザーの要望が抽象的または曖昧な場合は、質問をして詳細を確認してください
   - 例：「Playwrightを学びたい」→ 「どのような操作を学びたいですか？（例：要素の取得、クリック操作、フォーム入力、画面遷移など）」
   - 必要に応じて、学習レベル（初級・中級・上級）や具体的なシナリオを確認してください

2. **要件が明確になったら**：
   - 要件を理解できたら、createProblemツールを使用して問題を作成してください
   - 1つの要望から複数の関連する問題を作成することも可能です（基礎→応用の流れなど）
   - 問題を作成した後、他に作成すべき関連問題があれば提案してください

3. **問題作成のガイドライン**：
   - 問題の難易度は、ユーザーのレベルに応じて1（初級）、2（中級）、3（上級）から選択してください
   - expectedCodeには、実際に動作するPlaywrightのコードを記述してください
   - hintsは段階的に詳しくなるように3つ程度用意してください
   - alternativeAnswersには、正解の別の書き方を含めてください

## 例

**曖昧な要望への対応例**：
- ユーザー：「Playwrightを勉強したい」
- AI：「Playwrightのどの分野を学習したいですか？例えば：
  1. 基本的な要素の取得とクリック操作
  2. フォーム入力やデータ送信
  3. 画面遷移やページの状態確認
  4. 複雑なセレクタの使用
  どれに興味がありますか？または、他の特定の操作を学びたい場合は教えてください。」

**明確な要望への対応例**：
- ユーザー：「ボタンをクリックする方法を学びたい」
- AI：問題を作成 → 「ボタンクリックの基本問題を作成しました。さらに、特定の条件でのボタンクリック（disabled状態の確認など）も学習したい場合はお知らせください。」

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
