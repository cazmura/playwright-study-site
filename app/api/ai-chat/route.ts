import { streamText } from "ai"
import { z } from "zod"

export const maxDuration = 30

const problemSchema = z.object({
  title: z.string().describe("問題のタイトル"),
  description: z.string().describe("問題の説明文"),
  expectedCode: z.string().describe("期待される回答コード"),
  alternativeAnswers: z.array(z.string()).optional().describe("代替解答の配列"),
  hints: z.array(z.string()).describe("ヒントの配列"),
  difficulty: z.number().min(1).max(3).describe("難易度 (1: 初級, 2: 中級, 3: 上級)"),
  category: z.string().describe("カテゴリ"),
  folderId: z.string().describe("フォルダID (通常は 'default')"),
})

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: "openai/gpt-5-mini",
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

  return result.toUIMessageStreamResponse()
}
