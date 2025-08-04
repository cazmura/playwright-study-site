"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Play,
  RotateCcw,
  BookOpen,
  Trophy,
  Calendar,
  Settings,
  User,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// データ型定義
interface Problem {
  id: string
  title: string
  description: string
  expectedCode: string
  alternativeAnswers?: string[]
  hints: string[]
  difficulty: number
  category: string
  createdAt: Date
  updatedAt: Date
}

interface UserProgress {
  userId: string
  solvedProblems: string[]
  currentLevel: number
  totalSolved: number
  lastActivityDate: Date
  dailyActivity: { date: string; problemsSolved: number }[]
}

interface LearningSession {
  sessionId: string
  problems: Problem[]
  currentProblemIndex: number
  startedAt: Date
  isCompleted: boolean
  answersShown: Set<string>
}

// 出題方法の型定義を追加
interface QuestionOrder {
  type: "random" | "unlearned-first" | "learned-first" | "easy-first" | "hard-first"
  label: string
}

// 出題方法の選択肢を定義
const questionOrderOptions: QuestionOrder[] = [
  { type: "random", label: "ランダム" },
  { type: "unlearned-first", label: "未学習から優先" },
  { type: "learned-first", label: "学習済みから優先" },
  { type: "easy-first", label: "難易度が低いものから優先" },
  { type: "hard-first", label: "難易度が高いものから優先" },
]

// サンプル問題データ
const sampleProblems: Problem[] = [
  {
    id: "1",
    title: "基本的な要素選択",
    description: "ページ内のボタン要素を選択してください。",
    expectedCode: `await page.locator('button').click();`,
    alternativeAnswers: [`page.locator('button').click();`, `await page.click('button');`],
    hints: [
      "page.locator()を使用して要素を選択します",
      'セレクタには"button"を指定します',
      "click()メソッドでクリックします",
    ],
    difficulty: 1,
    category: "要素選択",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    title: "IDによる要素選択",
    description: 'ID="submit-btn"の要素をクリックしてください。',
    expectedCode: `await page.locator('#submit-btn').click();`,
    alternativeAnswers: [`page.locator('#submit-btn').click();`, `await page.click('#submit-btn');`],
    hints: ["IDセレクタは#を使います", "submit-btnがIDです", "locator()でセレクタを指定します"],
    difficulty: 1,
    category: "要素選択",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    title: "テキスト入力",
    description: 'input要素に"Hello World"と入力してください。',
    expectedCode: `await page.locator('input').fill('Hello World');`,
    alternativeAnswers: [`page.locator('input').fill('Hello World');`, `await page.fill('input', 'Hello World');`],
    hints: [
      "fill()メソッドを使用してテキストを入力します",
      "locator()で入力フィールドを選択します",
      "テキストは文字列として渡します",
    ],
    difficulty: 2,
    category: "アクション実行",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    title: "要素の表示待機",
    description: ".loading要素が非表示になるまで待機してください。",
    expectedCode: `await page.locator('.loading').waitFor({ state: 'hidden' });`,
    alternativeAnswers: [
      `page.locator('.loading').waitFor({ state: 'hidden' });`,
      `await page.waitForSelector('.loading', { state: 'hidden' });`,
    ],
    hints: ["waitFor()メソッドを使用します", 'state: "hidden"で非表示を待機します', "クラスセレクタは.を使います"],
    difficulty: 3,
    category: "待機処理",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "5",
    title: "アサーション",
    description: 'h1要素のテキストが"Welcome"であることを確認してください。',
    expectedCode: `await expect(page.locator('h1')).toHaveText('Welcome');`,
    alternativeAnswers: [
      `expect(page.locator('h1')).toHaveText('Welcome');`,
      `await expect(page.locator('h1')).toContainText('Welcome');`,
    ],
    hints: ["expect()とtoHaveText()を使用します", "h1要素を選択します", "テキストの内容を検証します"],
    difficulty: 2,
    category: "アサーション",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// キャラクター定義
const getCharacterInfo = (level: number) => {
  if (level <= 10) return { name: "初心者プレイヤー", emoji: "🐣", color: "text-green-500" }
  if (level <= 25) return { name: "中級者プレイヤー", emoji: "🐦", color: "text-blue-500" }
  if (level <= 50) return { name: "上級者プレイヤー", emoji: "🦅", color: "text-purple-500" }
  return { name: "プレイライトマスター", emoji: "🦉", color: "text-yellow-500" }
}

// 学習カレンダーコンポーネント
const LearningCalendar = ({ dailyActivity }: { dailyActivity: { date: string; problemsSolved: number }[] }) => {
  const today = new Date()
  const days = []

  // 過去12週間のデータを生成
  for (let i = 83; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    const activity = dailyActivity.find((a) => a.date === dateStr)
    const count = activity ? activity.problemsSolved : 0

    days.push({
      date: dateStr,
      count,
      intensity: count === 0 ? 0 : Math.min(Math.ceil(count / 2), 4),
    })
  }

  // 週単位でグループ化
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>学習カレンダー（過去12週間）</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 overflow-x-auto">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-3 h-3 rounded-sm ${
                    day.intensity === 0
                      ? "bg-gray-100"
                      : day.intensity === 1
                        ? "bg-green-200"
                        : day.intensity === 2
                          ? "bg-green-300"
                          : day.intensity === 3
                            ? "bg-green-400"
                            : "bg-green-500"
                  }`}
                  title={`${day.date}: ${day.count}問解答`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>少ない</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-300 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
          </div>
          <span>多い</span>
        </div>
      </CardContent>
    </Card>
  )
}

// コードエディタコンポーネント
const CodeEditor = ({
  code,
  onChange,
  onRun,
  onReset,
}: {
  code: string
  onChange: (code: string) => void
  onRun: () => void
  onReset: () => void
}) => {
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-800">
        <span className="text-gray-300 text-sm font-mono">playwright-code.js</span>
        <div className="flex gap-2">
          <Button
            onClick={onReset}
            variant="secondary"
            size="sm"
            className="bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            <RotateCcw size={14} className="mr-1" />
            リセット
          </Button>
          <Button onClick={onRun} size="sm" className="bg-green-600 hover:bg-green-700">
            <Play size={14} className="mr-1" />
            実行
          </Button>
        </div>
      </div>
      <Textarea
        value={code}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-64 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none border-0 rounded-none"
        placeholder="ここにPlaywrightコードを入力してください..."
        spellCheck={false}
      />
    </div>
  )
}

// 問題管理コンポーネント
const ProblemManager = ({
  problems,
  onAdd,
  onEdit,
  onDelete,
  onImport,
  onExport,
}: {
  problems: Problem[]
  onAdd: (problem: Omit<Problem, "id" | "createdAt" | "updatedAt">) => void
  onEdit: (id: string, problem: Omit<Problem, "id" | "createdAt" | "updatedAt">) => void
  onDelete: (id: string) => void
  onImport: (problems: Problem[]) => void
  onExport: () => void
}) => {
  const [isAddingProblem, setIsAddingProblem] = useState(false)
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null)
  const [showExpectedCode, setShowExpectedCode] = useState<{ [key: string]: boolean }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    expectedCode: "",
    alternativeAnswers: [""],
    hints: [""],
    difficulty: 1,
    category: "",
  })

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      expectedCode: "",
      alternativeAnswers: [""],
      hints: [""],
      difficulty: 1,
      category: "",
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const problemData = {
      ...formData,
      hints: formData.hints.filter((h) => h.trim() !== ""),
      alternativeAnswers: formData.alternativeAnswers.filter((a) => a.trim() !== ""),
    }

    if (editingProblem) {
      onEdit(editingProblem.id, problemData)
      setEditingProblem(null)
    } else {
      onAdd(problemData)
      setIsAddingProblem(false)
    }
    resetForm()
  }

  const startEdit = (problem: Problem) => {
    setEditingProblem(problem)
    setFormData({
      title: problem.title,
      description: problem.description,
      expectedCode: problem.expectedCode,
      alternativeAnswers:
        problem.alternativeAnswers && problem.alternativeAnswers.length > 0 ? problem.alternativeAnswers : [""],
      hints: problem.hints.length > 0 ? problem.hints : [""],
      difficulty: problem.difficulty,
      category: problem.category,
    })
    setIsAddingProblem(true)
  }

  const addHint = () => {
    setFormData((prev) => ({
      ...prev,
      hints: [...prev.hints, ""],
    }))
  }

  const updateHint = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      hints: prev.hints.map((hint, i) => (i === index ? value : hint)),
    }))
  }

  const removeHint = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      hints: prev.hints.filter((_, i) => i !== index),
    }))
  }

  const addAlternativeAnswer = () => {
    setFormData((prev) => ({
      ...prev,
      alternativeAnswers: [...prev.alternativeAnswers, ""],
    }))
  }

  const updateAlternativeAnswer = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      alternativeAnswers: prev.alternativeAnswers.map((answer, i) => (i === index ? value : answer)),
    }))
  }

  const removeAlternativeAnswer = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      alternativeAnswers: prev.alternativeAnswers.filter((_, i) => i !== index),
    }))
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importedProblems = JSON.parse(content) as Problem[]

        if (
          Array.isArray(importedProblems) &&
          importedProblems.every(
            (p) => p.title && p.description && p.expectedCode && Array.isArray(p.hints) && p.difficulty && p.category,
          )
        ) {
          const processedProblems = importedProblems.map((p) => ({
            ...p,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
            updatedAt: new Date(),
          }))

          const success = onImport(processedProblems)
          if (success) {
            alert(`${processedProblems.length}個の問題をインポートしました！`)
          }
        } else {
          alert("不正なファイル形式です。")
        }
      } catch (error) {
        alert("ファイルの読み込みに失敗しました。")
      }
    }
    reader.readAsText(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  if (isAddingProblem || editingProblem) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{editingProblem ? "問題を編集" : "新しい問題を追加"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">問題文</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="h-24"
                required
              />
            </div>

            <div>
              <Label htmlFor="expectedCode">期待する回答コード（メイン）</Label>
              <Textarea
                id="expectedCode"
                value={formData.expectedCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, expectedCode: e.target.value }))}
                className="h-32 bg-gray-900 text-gray-100 font-mono text-sm"
                required
              />
            </div>

            <div>
              <Label>代替解答（オプション）</Label>
              {formData.alternativeAnswers.map((answer, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Textarea
                    value={answer}
                    onChange={(e) => updateAlternativeAnswer(index, e.target.value)}
                    className="flex-1 h-20 bg-gray-900 text-gray-100 font-mono text-sm"
                    placeholder={`代替解答 ${index + 1}`}
                  />
                  {formData.alternativeAnswers.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeAlternativeAnswer(index)}
                      variant="destructive"
                      size="sm"
                    >
                      削除
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" onClick={addAlternativeAnswer} variant="outline" size="sm">
                代替解答を追加
              </Button>
            </div>

            <div>
              <Label>ヒント</Label>
              {formData.hints.map((hint, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    value={hint}
                    onChange={(e) => updateHint(index, e.target.value)}
                    placeholder={`ヒント ${index + 1}`}
                    className="flex-1"
                  />
                  {formData.hints.length > 1 && (
                    <Button type="button" onClick={() => removeHint(index)} variant="destructive" size="sm">
                      削除
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" onClick={addHint} variant="outline" size="sm">
                ヒントを追加
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="difficulty">難易度</Label>
                <Select
                  value={formData.difficulty.toString()}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, difficulty: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">初級</SelectItem>
                    <SelectItem value="2">中級</SelectItem>
                    <SelectItem value="3">上級</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">カテゴリ</Label>
                <Input
                  id="category"
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">{editingProblem ? "更新" : "追加"}</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingProblem(false)
                  setEditingProblem(null)
                  resetForm()
                }}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>問題管理</CardTitle>
          <div className="flex gap-2">
            <Button onClick={onExport} variant="outline">
              <Upload size={16} className="mr-2" />
              エクスポート
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Download size={16} className="mr-2" />
              インポート
            </Button>
            <Button onClick={() => setIsAddingProblem(true)}>
              <Plus size={16} className="mr-2" />
              問題を追加
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileImport} className="hidden" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">タイトル</th>
                <th className="px-4 py-3">カテゴリ</th>
                <th className="px-4 py-3">難易度</th>
                <th className="px-4 py-3">期待コード</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => (
                <tr key={problem.id} className="bg-white border-b">
                  <td className="px-4 py-4 font-medium text-gray-900">{problem.title}</td>
                  <td className="px-4 py-4">{problem.category}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        problem.difficulty === 1
                          ? "bg-green-100 text-green-800"
                          : problem.difficulty === 2
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {problem.difficulty === 1 ? "初級" : problem.difficulty === 2 ? "中級" : "上級"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowExpectedCode((prev) => ({
                            ...prev,
                            [problem.id]: !prev[problem.id],
                          }))
                        }
                      >
                        {showExpectedCode[problem.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                      {showExpectedCode[problem.id] && (
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-xs truncate">
                          {problem.expectedCode}
                        </code>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(problem)}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(problem.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// loadUserProgress関数の後に、問題データを読み込む関数を追加
const loadProblems = (): Problem[] => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("playwright-learning-problems")
      if (saved) {
        const parsed = JSON.parse(saved)
        // 日付オブジェクトを復元
        return parsed.map((problem: any) => ({
          ...problem,
          createdAt: new Date(problem.createdAt),
          updatedAt: new Date(problem.updatedAt),
        }))
      }
    } catch (error) {
      console.error("Failed to load problems from localStorage:", error)
    }
  }

  // デフォルト値（サンプル問題）
  return sampleProblems
}

// モバイル端末検出用のhook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const mobileKeywords = ["mobile", "android", "iphone", "ipad", "ipod", "blackberry", "windows phone"]
      const isMobileDevice = mobileKeywords.some((keyword) => userAgent.includes(keyword))
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }

    checkDevice()
    window.addEventListener("resize", checkDevice)
    return () => window.removeEventListener("resize", checkDevice)
  }, [])

  return isMobile
}

// メインアプリケーション
export default function PlaywrightLearningApp() {
  const [currentView, setCurrentView] = useState<"dashboard" | "learning" | "problems" | "manual">("dashboard")
  // const [problems, setProblems] = useState<Problem[]>(sampleProblems) を以下に変更
  const [problems, setProblems] = useState<Problem[]>(loadProblems)
  const [currentSession, setCurrentSession] = useState<LearningSession | null>(null)
  const [userCode, setUserCode] = useState("")
  const [currentHintIndex, setCurrentHintIndex] = useState(-1)
  const [showAnswer, setShowAnswer] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "hint"; message: string } | null>(null)

  // ローカルストレージから進捗データを復元する関数
  const loadUserProgress = (): UserProgress => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("playwright-learning-progress")
        if (saved) {
          const parsed = JSON.parse(saved)
          // 日付オブジェクトを復元
          return {
            ...parsed,
            lastActivityDate: new Date(parsed.lastActivityDate),
          }
        }
      } catch (error) {
        console.error("Failed to load progress from localStorage:", error)
      }
    }

    // デフォルト値
    return {
      userId: "user1",
      solvedProblems: [],
      currentLevel: 1,
      totalSolved: 0,
      lastActivityDate: new Date(),
      dailyActivity: [],
    }
  }

  const [userProgress, setUserProgress] = useState<UserProgress>(loadUserProgress)

  const isMobile = useIsMobile()

  // 出題方法の設定を管理
  // 出題方法の設定を管理（localStorageから読み込まない）
  const [questionOrder, setQuestionOrder] = useState<QuestionOrder["type"]>("unlearned-first")
  const [showQuestionOrderModal, setShowQuestionOrderModal] = useState(false)

  // 出題方法をlocalStorageに保存
  // この部分を削除
  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     try {
  //       localStorage.setItem("playwright-learning-question-order", questionOrder)
  //     } catch (error) {
  //       console.error("Failed to save question order to localStorage:", error)
  //     }
  //   }
  // }, [questionOrder])

  // 問題を選択する関数を追加
  const selectProblemsForSession = (
    orderType: QuestionOrder["type"],
    allProblems: Problem[],
    solvedProblems: string[],
  ): Problem[] => {
    let sortedProblems: Problem[] = []

    switch (orderType) {
      case "random":
        sortedProblems = [...allProblems].sort(() => Math.random() - 0.5)
        break

      case "unlearned-first":
        const unlearned = allProblems.filter((p) => !solvedProblems.includes(p.id))
        const learned = allProblems.filter((p) => solvedProblems.includes(p.id))
        sortedProblems = [...unlearned, ...learned]
        break

      case "learned-first":
        const learnedFirst = allProblems.filter((p) => solvedProblems.includes(p.id))
        const unlearnedLast = allProblems.filter((p) => !solvedProblems.includes(p.id))
        sortedProblems = [...learnedFirst, ...unlearnedLast]
        break

      case "easy-first":
        sortedProblems = [...allProblems].sort((a, b) => a.difficulty - b.difficulty)
        break

      case "hard-first":
        sortedProblems = [...allProblems].sort((a, b) => b.difficulty - a.difficulty)
        break

      default:
        sortedProblems = allProblems
    }

    return sortedProblems.slice(0, 5) // 最初の5問を選択
  }

  const calculateLevel = (solvedCount: number) => Math.floor(solvedCount / 10) + 1

  // 進捗データをlocalStorageに保存
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("playwright-learning-progress", JSON.stringify(userProgress))
      } catch (error) {
        console.error("Failed to save progress to localStorage:", error)
      }
    }
  }, [userProgress])

  // 進捗データをlocalStorageに保存するuseEffectの後に、問題データ保存用のuseEffectを追加
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("playwright-learning-problems", JSON.stringify(problems))
      } catch (error) {
        console.error("Failed to save problems to localStorage:", error)
      }
    }
  }, [problems])

  const startNewSession = () => {
    setShowQuestionOrderModal(true)
  }

  const startSessionWithOrder = (orderType: QuestionOrder["type"]) => {
    const sessionProblems = selectProblemsForSession(orderType, problems, userProgress.solvedProblems)
    setCurrentSession({
      sessionId: Date.now().toString(),
      problems: sessionProblems,
      currentProblemIndex: 0,
      startedAt: new Date(),
      isCompleted: false,
      answersShown: new Set(),
    })
    setUserCode("")
    setCurrentHintIndex(-1)
    setShowAnswer(false)
    setFeedback(null)
    setShowQuestionOrderModal(false)
    setCurrentView("learning")
  }

  const runCode = () => {
    if (!currentSession) return

    const currentProblem = currentSession.problems[currentSession.currentProblemIndex]
    const normalizedUserCode = userCode.trim().replace(/\s+/g, " ")

    const allAnswers = [currentProblem.expectedCode, ...(currentProblem.alternativeAnswers || [])]

    const isCorrect = allAnswers.some((answer) => normalizedUserCode === answer.trim().replace(/\s+/g, " "))

    if (isCorrect) {
      setFeedback({ type: "success", message: "正解です！素晴らしい！" })

      const today = new Date().toISOString().split("T")[0]
      setUserProgress((prev) => {
        const todayActivity = prev.dailyActivity.find((a) => a.date === today)
        const updatedDailyActivity = todayActivity
          ? prev.dailyActivity.map((a) => (a.date === today ? { ...a, problemsSolved: a.problemsSolved + 1 } : a))
          : [...prev.dailyActivity, { date: today, problemsSolved: 1 }]

        if (!currentSession.answersShown.has(currentProblem.id)) {
          const newSolvedProblems = [...prev.solvedProblems, currentProblem.id]
          const newTotalSolved = newSolvedProblems.length
          const newLevel = calculateLevel(newTotalSolved)

          return {
            ...prev,
            solvedProblems: newSolvedProblems,
            totalSolved: newTotalSolved,
            currentLevel: newLevel,
            lastActivityDate: new Date(),
            dailyActivity: updatedDailyActivity,
          }
        } else {
          return {
            ...prev,
            lastActivityDate: new Date(),
            dailyActivity: updatedDailyActivity,
          }
        }
      })

      setTimeout(() => {
        if (currentSession.currentProblemIndex < currentSession.problems.length - 1) {
          setCurrentSession((prev) =>
            prev
              ? {
                  ...prev,
                  currentProblemIndex: prev.currentProblemIndex + 1,
                }
              : null,
          )
          setUserCode("")
          setCurrentHintIndex(-1)
          setShowAnswer(false)
          setFeedback(null)
        } else {
          setCurrentSession((prev) => (prev ? { ...prev, isCompleted: true } : null))
          setFeedback({ type: "success", message: "セッション完了！お疲れ様でした！" })
        }
      }, 2000)
    } else {
      setFeedback({ type: "error", message: "残念！もう一度試してみてください。" })
    }
  }

  const showCorrectAnswer = () => {
    if (!currentSession) return

    const currentProblem = currentSession.problems[currentSession.currentProblemIndex]
    setUserCode(currentProblem.expectedCode)
    setShowAnswer(true)
    setFeedback({ type: "hint", message: "正解を表示しました。コードを確認して学習しましょう！" })

    setCurrentSession((prev) =>
      prev
        ? {
            ...prev,
            answersShown: new Set([...prev.answersShown, currentProblem.id]),
          }
        : null,
    )
  }

  const showHint = () => {
    if (!currentSession) return

    const currentProblem = currentSession.problems[currentSession.currentProblemIndex]
    const nextHintIndex = currentHintIndex + 1

    if (nextHintIndex < currentProblem.hints.length) {
      setCurrentHintIndex(nextHintIndex)
      setFeedback({
        type: "hint",
        message: `ヒント ${nextHintIndex + 1}: ${currentProblem.hints[nextHintIndex]}`,
      })
    }
  }

  const resetCode = () => {
    setUserCode("")
    setCurrentHintIndex(-1)
    setShowAnswer(false)
    setFeedback(null)
  }

  // resetProgress関数の後に、進捗リセット用のヘルパー関数を追加
  const resetProgressData = () => {
    setUserProgress((prev) => ({
      ...prev,
      solvedProblems: [], // 解答済み問題のみクリア
      totalSolved: 0, // 総解答数のみクリア
      currentLevel: 1, // レベルもリセット
      // dailyActivity, lastActivityDateは保持
    }))
  }

  // addProblem関数を以下のように変更
  const addProblem = (problemData: Omit<Problem, "id" | "createdAt" | "updatedAt">) => {
    if (
      confirm(
        "問題を追加すると進捗率（解答済み問題）とレベルがリセットされます。学習カレンダーは保持されます。続行しますか？",
      )
    ) {
      const newProblem: Problem = {
        ...problemData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setProblems((prev) => [...prev, newProblem])
      resetProgressData()
      alert("問題を追加し、進捗率とレベルをリセットしました。")
    }
  }

  // importProblems関数の確認メッセージを変更
  const importProblems = (importedProblems: Problem[]): boolean => {
    if (
      confirm(
        `${importedProblems.length}個の問題をインポートすると進捗率（解答済み問題）とレベルがリセットされます。学習カレンダーは保持されます。続行しますか？`,
      )
    ) {
      setProblems((prev) => [...prev, ...importedProblems])
      resetProgressData()
      alert(`${importedProblems.length}個の問題をインポートし、進捗率とレベルをリセットしました。`)
      return true
    }
    return false
  }

  // deleteProblem関数の確認メッセージを変更
  const deleteProblem = (id: string) => {
    if (
      confirm(
        "問題を削除すると進捗率（解答済み問題）とレベルがリセットされます。学習カレンダーは保持されます。続行しますか？",
      )
    ) {
      setProblems((prev) => prev.filter((p) => p.id !== id))
      resetProgressData()
      alert("問題を削除し、進捗率とレベルをリセットしました。")
    }
  }

  const exportProblems = () => {
    const dataStr = JSON.stringify(problems, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = `playwright-problems-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const resetProgress = () => {
    if (confirm("学習進捗を全てリセットしますか？この操作は取り消せません。")) {
      const resetData: UserProgress = {
        userId: "user1",
        solvedProblems: [],
        currentLevel: 1,
        totalSolved: 0,
        lastActivityDate: new Date(),
        dailyActivity: [],
      }
      setUserProgress(resetData)
      alert("学習進捗をリセットしました。")
    }
  }

  const character = getCharacterInfo(userProgress.currentLevel)

  const editProblem = (id: string, problem: Omit<Problem, "id" | "createdAt" | "updatedAt">) => {
    setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, ...problem, updatedAt: new Date() } : p)))
  }

  // モバイル端末の場合は警告画面を表示
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">💻</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">PC推奨</h2>
            <p className="text-gray-600 mb-6">
              このアプリケーションはコード入力が必要なため、PC（デスクトップ・ノートパソコン）でのご利用を推奨します。
            </p>
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">推奨環境</h3>
              <ul className="text-yellow-700 text-sm space-y-1 text-left">
                <li>• デスクトップPC または ノートパソコン</li>
                <li>• Chrome, Firefox, Safari, Edge</li>
                <li>• 画面幅: 1024px以上</li>
                <li>• キーボード入力可能</li>
              </ul>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full">
              再読み込み
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-gray-900">Playwright学習アプリ</h1>
              <nav className="flex gap-4">
                <Button
                  variant={currentView === "dashboard" ? "default" : "ghost"}
                  onClick={() => setCurrentView("dashboard")}
                >
                  <Trophy size={16} className="mr-2" />
                  ダッシュボード
                </Button>
                <Button variant={currentView === "learning" ? "default" : "ghost"} onClick={startNewSession}>
                  <BookOpen size={16} className="mr-2" />
                  学習開始
                </Button>
                <Button
                  variant={currentView === "problems" ? "default" : "ghost"}
                  onClick={() => setCurrentView("problems")}
                >
                  <Settings size={16} className="mr-2" />
                  問題管理
                </Button>
                <Button
                  variant={currentView === "manual" ? "default" : "ghost"}
                  onClick={() => setCurrentView("manual")}
                >
                  <BookOpen size={16} className="mr-2" />
                  マニュアル
                </Button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                <span className="text-lg">{character.emoji}</span>
                <div className="text-sm">
                  <div className={`font-medium ${character.color}`}>Lv.{userProgress.currentLevel}</div>
                  <div className="text-gray-600 text-xs">{character.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "dashboard" && (
          <div className="space-y-8">
            {/* 学習統計 */}
            <div className="grid grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BookOpen className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{userProgress.totalSolved}</div>
                      <div className="text-sm text-gray-600">解答済み問題</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {userProgress.dailyActivity.filter((a) => a.problemsSolved > 0).length}
                      </div>
                      <div className="text-sm text-gray-600">学習日数</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <User className="text-yellow-600" size={20} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round((userProgress.totalSolved / problems.length) * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">進捗率</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 学習統計の後に進捗リセットセクションを追加 */}
            {/*
            <Card>
              <CardHeader>
                <CardTitle>学習データ管理</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>学習進捗のリセット</Label>
                    <p className="text-sm text-gray-600 mb-3">
                      解答済み問題、レベル、学習カレンダーなど全ての学習データをリセットします。
                    </p>
                    <Button onClick={resetProgress} variant="destructive">
                      学習進捗をリセット
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            */}

            {/* キャラクター表示 */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-6xl mb-4">{character.emoji}</div>
                <h2 className={`text-2xl font-bold mb-2 ${character.color}`}>レベル {userProgress.currentLevel}</h2>
                <p className="text-gray-600 mb-4">{character.name}</p>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${((userProgress.totalSolved % 10) / 10) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">次のレベルまで {10 - (userProgress.totalSolved % 10)} 問</p>
              </CardContent>
            </Card>

            {/* 学習カレンダー */}
            <LearningCalendar dailyActivity={userProgress.dailyActivity} />

            {/* 学習開始ボタン */}
            <div className="text-center">
              <Button onClick={startNewSession} size="lg" className="text-lg">
                <Play size={20} className="mr-2" />
                新しいセッションを開始
              </Button>
            </div>

            {/* 進捗リセットセクション - ダッシュボードの最下部に配置 */}
            <div className="text-center">
              <Button onClick={resetProgress} variant="destructive">
                学習進捗をリセット
              </Button>
            </div>
          </div>
        )}

        {currentView === "learning" && currentSession && !currentSession.isCompleted && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 問題エリア */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      問題 {currentSession.currentProblemIndex + 1} / {currentSession.problems.length}
                    </h2>
                    <div className="text-sm text-gray-600">
                      {currentSession.problems[currentSession.currentProblemIndex].category}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((currentSession.currentProblemIndex + 1) / currentSession.problems.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {currentSession.problems[currentSession.currentProblemIndex].title}
                </h3>

                <p className="text-gray-700 mb-6">
                  {currentSession.problems[currentSession.currentProblemIndex].description}
                </p>

                {/* フィードバック表示 */}
                {feedback && (
                  <div
                    className={`p-4 rounded-lg mb-4 ${
                      feedback.type === "success"
                        ? "bg-green-100 text-green-800"
                        : feedback.type === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}

                {/* ヒント・解答ボタン */}
                <div className="flex gap-2">
                  {currentHintIndex < currentSession.problems[currentSession.currentProblemIndex].hints.length - 1 && (
                    <Button onClick={showHint} variant="outline" size="sm">
                      ヒントを見る ({currentHintIndex + 2}/
                      {currentSession.problems[currentSession.currentProblemIndex].hints.length})
                    </Button>
                  )}

                  {currentHintIndex >= currentSession.problems[currentSession.currentProblemIndex].hints.length - 1 &&
                    !showAnswer && (
                      <Button onClick={showCorrectAnswer} variant="destructive" size="sm">
                        解答を見る
                      </Button>
                    )}

                  {showAnswer && (
                    <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded text-sm">解答を表示中です</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* コードエディタエリア */}
            <div>
              <CodeEditor code={userCode} onChange={setUserCode} onRun={runCode} onReset={resetCode} />
            </div>
          </div>
        )}

        {currentView === "learning" && currentSession?.isCompleted && (
          <div className="text-center space-y-6">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">セッション完了！</h2>
                <p className="text-gray-600 mb-6">素晴らしい！5問すべて正解しました！</p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={startNewSession}>新しいセッションを開始</Button>
                  <Button variant="outline" onClick={() => setCurrentView("dashboard")}>
                    ダッシュボードに戻る
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === "problems" && (
          <ProblemManager
            problems={problems}
            onAdd={addProblem}
            onEdit={editProblem}
            onDelete={deleteProblem}
            onImport={importProblems}
            onExport={exportProblems}
          />
        )}

        {currentView === "manual" && (
          <div className="space-y-8">
            {/* アプリケーション概要 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">📚 Playwright学習アプリ マニュアル</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  このアプリケーションは、Playwrightのコードを実際に書いて学習できるインタラクティブな学習ツールです。
                  問題を解いてレベルアップし、学習進捗を可視化できます。
                </p>
              </CardContent>
            </Card>

            {/* データ管理 */}
            <Card>
              <CardHeader>
                <CardTitle>💾 データ管理</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">🔄 データの永続化</h3>
                  <div className="bg-green-50 p-3 rounded mb-3">
                    <p className="text-green-700 mb-2">以下のデータがブラウザに自動保存されます：</p>
                    <ul className="text-green-600 space-y-1">
                      <li>• 問題データ（追加・編集した問題）</li>
                      <li>• 学習進捗（解答済み問題、レベル）</li>
                      <li>• 学習カレンダー（日別活動記録）</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🗑️ データのリセット</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>
                      • <strong>学習進捗リセット</strong>: 全ての学習データを初期化
                    </li>
                    <li>
                      • <strong>部分リセット</strong>: 問題変更時は進捗率とレベルのみリセット
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 制限事項・注意点 */}
            <Card>
              <CardHeader>
                <CardTitle>⚠️ 制限事項・注意点</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 p-4 rounded">
                  <h3 className="font-semibold text-red-800 mb-2">📱 ブラウザ依存</h3>
                  <ul className="text-red-700 space-y-1">
                    <li>• データは使用中のブラウザにのみ保存されます</li>
                    <li>• 他のブラウザやデバイスでは共有されません</li>
                    <li>• ブラウザのデータクリア時にデータが消失する可能性があります</li>
                  </ul>

                  <div className="mt-3 p-3 bg-red-100 rounded">
                    <h4 className="font-medium text-red-800 mb-2">⚠️ データが消える具体的な操作例</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      <li>
                        • <strong>Chrome/Edge</strong>: 設定 → プライバシーとセキュリティ → 閲覧履歴データの削除 →
                        「Cookieと他のサイトデータ」をチェックして削除
                      </li>
                      <li>
                        • <strong>Firefox</strong>: 設定 → プライバシーとセキュリティ → Cookieとサイトデータ →
                        データを消去
                      </li>
                      <li>
                        • <strong>Safari</strong>: 環境設定 → プライバシー → Webサイトデータを管理 → すべてを削除
                      </li>
                      <li>
                        • <strong>シークレット/プライベートモード</strong>
                        での使用（ウィンドウを閉じると自動的にデータが削除）
                      </li>
                      <li>
                        • <strong>ブラウザの自動クリーンアップ機能</strong>（一定期間後に自動削除される場合）
                      </li>
                      <li>
                        • <strong>ストレージ容量不足</strong>時の自動削除
                      </li>
                      <li>
                        • <strong>ブラウザの再インストール</strong>やプロファイルのリセット
                      </li>
                      <li>
                        • <strong>PCの初期化</strong>やOSの再インストール
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded">
                  <h3 className="font-semibold text-orange-800 mb-2">💽 容量制限</h3>
                  <ul className="text-orange-700 space-y-1">
                    <li>• localStorageの容量制限（通常5-10MB）があります</li>
                    <li>• 大量の問題データを保存する場合は注意が必要です</li>
                    <li>• 定期的なエクスポートによるバックアップを推奨します</li>
                  </ul>

                  <div className="mt-3 p-3 bg-orange-100 rounded">
                    <h4 className="font-medium text-orange-800 mb-2">📊 容量の目安</h4>
                    <ul className="text-orange-700 text-sm space-y-1">
                      <li>
                        • <strong>問題データ</strong>: 1問あたり約1-2KB（100問で約100-200KB）
                      </li>
                      <li>
                        • <strong>学習進捗</strong>: 数KB程度
                      </li>
                      <li>
                        • <strong>学習カレンダー</strong>: 1年分で約10-20KB
                      </li>
                      <li>
                        • <strong>推奨問題数</strong>: 1000問以下（安全な範囲）
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* トラブルシューティング */}
            <Card>
              <CardHeader>
                <CardTitle>🔧 トラブルシューティング</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">❓ よくある問題と解決方法</h3>

                  <div className="space-y-3">
                    <div className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-medium">Q: データが消えてしまいました</h4>
                      <p className="text-gray-600 text-sm">
                        A:
                        ブラウザのデータクリアやプライベートモードが原因の可能性があります。定期的なエクスポートでバックアップを取ることを推奨します。
                      </p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-medium">Q: 問題をインポートできません</h4>
                      <p className="text-gray-600 text-sm">
                        A:
                        JSONファイルの形式が正しいか確認してください。エクスポートしたファイルと同じ形式である必要があります。
                      </p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-medium">Q: レベルが上がりません</h4>
                      <p className="text-gray-600 text-sm">
                        A: 解答を見た問題は進捗にカウントされません。ヒントを使わずに正解することでレベルアップします。
                      </p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-medium">Q: 他のデバイスでデータを共有したい</h4>
                      <p className="text-gray-600 text-sm">
                        A: エクスポート機能でデータをファイルに保存し、他のデバイスでインポートしてください。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 出題方法選択モーダル */}
        {showQuestionOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>出題方法を選択</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {questionOrderOptions.map((option) => (
                    <Button
                      key={option.type}
                      onClick={() => startSessionWithOrder(option.type)}
                      variant="outline"
                      className="w-full justify-start text-left h-auto p-4"
                    >
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {option.type === "random" && "問題をランダムな順序で出題します"}
                          {option.type === "unlearned-first" && "未学習の問題を優先的に出題します"}
                          {option.type === "learned-first" && "学習済みの問題を優先的に出題します（復習向け）"}
                          {option.type === "easy-first" && "難易度の低い問題から順番に出題します"}
                          {option.type === "hard-first" && "難易度の高い問題から順番に出題します"}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
                <div className="mt-4">
                  <Button onClick={() => setShowQuestionOrderModal(false)} variant="ghost" className="w-full">
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
