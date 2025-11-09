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
    const { messages, folders, categories } = await req.json()

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

## 利用可能なフォルダ

${folders && folders.length > 0 ? folders.map((f: any) => `- ${f.name} (ID: ${f.id})`).join('\n') : '※フォルダがありません'}

## 利用可能なカテゴリ

${categories && categories.length > 0 ? categories.map((c: string) => `- ${c}`).join('\n') : '※カテゴリがありません'}

## 基本的な振る舞い

1. **ユーザーからの指定を確認**：
   - ユーザーが「フォルダ」「カテゴリ」「問題数」を指定している場合は、その通りに問題を作成してください
   - 例：「基本操作フォルダのセレクタカテゴリに5問作りたい」→ 指定されたフォルダ・カテゴリに5問作成
   - **重要**: フォルダが指定されない場合は、どのフォルダに作成するか必ず確認してください
   - **重要**: カテゴリが指定されない場合は、どのカテゴリに作成するか必ず確認してください
   - 問題数が指定されない場合は、1問のみ作成してください
   - 指定されたカテゴリが存在しない場合は、新しいカテゴリとして作成されます

2. **曖昧な要件の場合**：
   - ユーザーの要望が抽象的な場合は、フォルダと問題数を確認してください
   - 例：「Playwrightを学びたい」→ 「どのフォルダに何問作成しますか？」
   - 必要に応じて、学習レベルや具体的な内容も確認してください

3. **複数問題の作成**：
   - ユーザーが複数問題を要求した場合、createProblemsツールを使用してください（一度に複数問題を作成）
   - 各問題は関連性を持たせ、基礎→応用の流れで作成してください
   - 1問のみの場合はcreateProblemツールを使用してください

4. **問題作成のガイドライン**：
   - 問題の難易度は、ユーザーのレベルに応じて1（初級）、2（中級）、3（上級）から選択してください
   - expectedCode は**1〜数行のPlaywrightコード**とし、必要なら条件分岐（if）、待機、ロケータ操作などを用いてください
   - ただし、expectedCode 内にコメントや console 出力は含めないでください（純粋なコードのみ）
   - 問題文は、ユーザーが正解を予想できるように「前提状態・対象要素のセレクタ・条件・目標」を具体的に記述してください
   - hints は3〜5個、段階的に具体化してください（最後のヒントはほぼ解法に近づけてOK）
   - alternativeAnswers には、等価なバリエーションを含めてください（ロケータ/セレクタの書き方違いなど）。複数行も可

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

**1行コードの問題例**：
良い例:
- expectedCode: "await page.click('button')"
- expectedCode: "await page.fill('#email', 'test@example.com')"
- expectedCode: "await page.locator('.submit').click()"

悪い例（不適切な例）:
- "const button = page.locator('button');\nawait button.click();" ← NG
- "await page.goto('https://example.com');\nawait page.click('button');" ← NG
   （課題で遷移を求めていないのに不要な操作が含まれている/目的が曖昧/コメントやconsole出力が含まれる など）

問題を作成する際は、必ずcreateProblemツールを呼び出してください。`,
          },
          ...messages,
        ],
        temperature: 0.4,
        max_tokens: 2000,
        tools: [
          {
            type: "function",
            function: {
              name: "createProblems",
              description: "複数のPlaywright学習問題を一度に作成して登録します",
              parameters: {
                type: "object",
                properties: {
                  problems: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "問題のタイトル" },
                        description: { type: "string", description: "問題の説明" },
                        expectedCode: { type: "string", description: "期待される回答コード（1〜数行のPlaywrightコード）" },
                        alternativeAnswers: { type: "array", items: { type: "string" }, description: "代替解答のリスト" },
                        hints: { type: "array", items: { type: "string" }, description: "ヒントのリスト" },
                        difficulty: { type: "number", minimum: 1, maximum: 3, description: "難易度" },
                        category: { type: "string", description: "カテゴリ名" },
                        folderId: { type: "string", description: "フォルダID" },
                      },
                      required: ["title", "description", "expectedCode", "alternativeAnswers", "hints", "difficulty", "category", "folderId"],
                    },
                    description: "作成する問題のリスト",
                  },
                },
                required: ["problems"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "createProblem",
              description: "Playwrightの学習問題を1問作成して登録します",
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
                    description: "フォルダID（ユーザーが指定したフォルダに格納します）",
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
                  "folderId",
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

      if (toolCall.function.name === "createProblems") {
        const problemsData = JSON.parse(toolCall.function.arguments)
        console.log("[v0] AI Chat - Multiple problems created:", problemsData.problems.length)

        return new Response(
          JSON.stringify({
            role: "assistant",
            content: assistantMessage.content || `${problemsData.problems.length}問の問題を作成しました。`,
            toolCall: {
              name: "createProblems",
              parameters: problemsData,
            },
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        )
      }

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
