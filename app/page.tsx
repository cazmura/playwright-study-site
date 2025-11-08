"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Play,
  RotateCcw,
  BookOpen,
  Trophy,
  Calendar,
  User,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Upload,
  Folder,
  FolderPlus,
  Cog,
  X,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // Update: Added CardDescription, CardFooter
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress" // Update: Added Progress
import { useToast } from "@/hooks/use-toast" // Update: Added useToast
import { Toaster } from "@/components/ui/toaster" // Update: Added Toaster
// import { useIsMobile } from "@/hooks/use-mobile" // Update: Moved useIsMobile hook here - This line is removed due to redeclaration error

import { AIChatWidget } from "@/components/ai-chat-widget"

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
  folderId: string
  createdAt: Date
  updatedAt: Date
}

interface FolderType {
  id: string
  name: string
  description: string
  color: string
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
  selectedFolders: string[]
}

interface AppSettings {
  normalizeQuotes: boolean // シングルクォートとダブルクォートを同一として扱うかどうか
  normalizeSpaces: boolean // 空欄（スペース）を正規化するかどうか
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
  { type: "easy-first", label: "学習済みから優先" }, // duplicate, will be removed later if intended
  { type: "easy-first", label: "難易度が低いものから優先" },
  { type: "hard-first", label: "難易度が高いものから優先" },
]

// デフォルトフォルダ
const defaultFolder: FolderType = {
  id: "default",
  name: "未分類",
  description: "フォルダが指定されていない問題",
  color: "bg-gray-100",
  createdAt: new Date(),
  updatedAt: new Date(),
}

// AI生成問題用フォルダ（削除不可）
const aiGeneratedFolder: FolderType = {
  id: "ai-generated",
  name: "AI生成問題",
  description: "AIによって自動生成された問題",
  color: "bg-green-100",
  createdAt: new Date(),
  updatedAt: new Date(),
}

// サンプルフォルダデータ
const sampleFolders: FolderType[] = [
  defaultFolder,
  aiGeneratedFolder,
  {
    id: "basic",
    name: "基本操作",
    description: "Playwrightの基本的な操作を学習",
    color: "bg-blue-100",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "advanced",
    name: "応用操作",
    description: "より高度なPlaywright操作",
    color: "bg-purple-100",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
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
    folderId: "basic",
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
    folderId: "basic",
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
    folderId: "basic",
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
    folderId: "advanced",
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
    folderId: "advanced",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// デフォルト設定
const defaultSettings: AppSettings = {
  normalizeQuotes: true, // デフォルトではクォートを正規化する
  normalizeSpaces: true, // デフォルトでは空欄を正規化する
}

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
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault()
            onRun()
          }
        }}
        className="w-full h-64 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none border-0 rounded-none"
        placeholder="ここにPlaywrightコードを入力してください..."
        spellCheck={false}
      />
    </div>
  )
}

// 解答比較コンポーネント
const AnswerComparison = ({
  userAnswer,
  correctAnswer,
  onClose,
}: {
  userAnswer: string
  correctAnswer: string
  onClose: () => void
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>解答比較</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ユーザーの解答 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-red-600">あなたの解答</h3>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-800">
                  <span className="text-gray-300 text-sm font-mono">your-answer.js</span>
                </div>
                <div className="p-4">
                  <pre className="text-gray-100 font-mono text-sm whitespace-pre-wrap">
                    {userAnswer || "（解答が入力されていません）"}
                  </pre>
                </div>
              </div>
            </div>

            {/* 正解 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-600">正解</h3>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-800">
                  <span className="text-gray-300 text-sm font-mono">correct-answer.js</span>
                </div>
                <div className="p-4">
                  <pre className="text-gray-100 font-mono text-sm whitespace-pre-wrap">{correctAnswer}</pre>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">💡 学習のポイント</h4>
            <p className="text-blue-700 text-sm">
              左側があなたの解答、右側が正解です。違いを比較して、正しい書き方を覚えましょう。
              解答を参考にして、もう一度挑戦してみてください！
            </p>
          </div>

          <div className="mt-4 flex justify-center">
            <Button onClick={onClose} className="px-8">
              比較を閉じる
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 設定管理コンポーネント
const SettingsManager = ({
  settings,
  onUpdate,
}: {
  settings: AppSettings
  onUpdate: (settings: AppSettings) => void
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>アプリケーション設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">回答判定設定</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="normalize-quotes">クォート正規化</Label>
              <p className="text-sm text-gray-600">シングルクォート（'）とダブルクォート（"）を同一として扱います</p>
            </div>
            <Switch
              id="normalize-quotes"
              checked={settings.normalizeQuotes}
              onCheckedChange={(checked) =>
                onUpdate({
                  ...settings,
                  normalizeQuotes: checked,
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="normalize-spaces">空欄正規化</Label>
              <p className="text-sm text-gray-600">すべての空白文字（スペース、タブ、改行）を削除して比較します</p>
            </div>
            <Switch
              id="normalize-spaces"
              checked={settings.normalizeSpaces}
              onCheckedChange={(checked) =>
                onUpdate({
                  ...settings,
                  normalizeSpaces: checked,
                })
              }
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">設定の説明</h4>
            <div className="text-blue-700 text-sm space-y-3">
              <div>
                <strong>クォート正規化 ON:</strong>
                <div className="ml-4 mt-1">
                  <code className="bg-white px-2 py-1 rounded">page.locator('button')</code> と{" "}
                  <code className="bg-white px-2 py-1 rounded">page.locator("button")</code> は同じとして扱われます
                </div>
              </div>
              <div>
                <strong>クォート正規化 OFF:</strong>
                <div className="ml-4 mt-1">
                  <code className="bg-white px-2 py-1 rounded">page.locator('button')</code> と{" "}
                  <code className="bg-white px-2 py-1 rounded">page.locator("button")</code> は別物として扱われます
                </div>
              </div>
              <div>
                <strong>空欄正規化 ON:</strong>
                <div className="ml-4 mt-1">
                  <code className="bg-white px-2 py-1 rounded">page.locator( 'button' )</code> と{" "}
                  <code className="bg-white px-2 py-1 rounded">page.locator('button')</code> は同じとして扱われます
                </div>
              </div>
              <div>
                <strong>空欄正規化 OFF:</strong>
                <div className="ml-4 mt-1">
                  <code className="bg-white px-2 py-1 rounded">page.locator( 'button' )</code> と{" "}
                  <code className="bg-white px-2 py-1 rounded">page.locator('button')</code> は別物として扱われます
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// フォルダ管理コンポーネント
const FolderManager = ({
  folders,
  onAdd,
  onEdit,
  onDelete,
}: {
  folders: FolderType[]
  onAdd: (folder: Omit<FolderType, "id" | "createdAt" | "updatedAt">) => void
  onEdit: (id: string, folder: Omit<FolderType, "id" | "createdAt" | "updatedAt">) => void
  onDelete: (id: string) => void
}) => {
  const [isAddingFolder, setIsAddingFolder] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "bg-blue-100",
  })

  const colorOptions = [
    { value: "bg-blue-100", label: "青", class: "bg-blue-100" },
    { value: "bg-green-100", label: "緑", class: "bg-green-100" },
    { value: "bg-purple-100", label: "紫", class: "bg-purple-100" },
    { value: "bg-red-100", label: "赤", class: "bg-red-100" },
    { value: "bg-yellow-100", label: "黄", class: "bg-yellow-100" },
    { value: "bg-pink-100", label: "ピンク", class: "bg-pink-100" },
    { value: "bg-indigo-100", label: "藍", class: "bg-indigo-100" },
    { value: "bg-gray-100", label: "グレー", class: "bg-gray-100" },
  ]

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "bg-blue-100",
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingFolder) {
      onEdit(editingFolder.id, formData)
      setEditingFolder(null)
    } else {
      onAdd(formData)
      setIsAddingFolder(false)
    }
    resetForm()
  }

  const startEdit = (folder: FolderType) => {
    setEditingFolder(folder)
    setFormData({
      name: folder.name,
      description: folder.description,
      color: folder.color,
    })
    setIsAddingFolder(true)
  }

  if (isAddingFolder || editingFolder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{editingFolder ? "フォルダを編集" : "新しいフォルダを追加"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="folderName">フォルダ名</Label>
              <Input
                id="folderName"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="folderDescription">説明</Label>
              <Textarea
                id="folderDescription"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="h-20"
              />
            </div>

            <div>
              <Label>カラー</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color: color.value }))}
                    className={`p-3 rounded border-2 ${color.class} ${
                      formData.color === color.value ? "border-gray-800" : "border-gray-300"
                    }`}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">{editingFolder ? "更新" : "追加"}</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingFolder(false)
                  setEditingFolder(null)
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">フォルダ管理</h3>
        <Button onClick={() => setIsAddingFolder(true)} size="sm">
          <FolderPlus size={16} className="mr-2" />
          フォルダを追加
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders
          .filter((folder) => folder.id !== "default")
          .map((folder) => (
            <Card key={folder.id} className={`${folder.color} border-2`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Folder size={16} />
                    <h4 className="font-medium">{folder.name}</h4>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(folder)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(folder.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{folder.description}</p>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}

// 問題管理コンポーネント
const ProblemManager = ({
  problems,
  folders,
  categories,
  onAdd,
  onEdit,
  onDelete,
  onImport,
  onExport,
  onNavigateToProblems,
  onAddCategory,
}: {
  problems: Problem[]
  folders: FolderType[]
  categories: string[]
  onAdd: (problem: Omit<Problem, "id" | "createdAt" | "updatedAt">) => void
  onEdit: (id: string, problem: Omit<Problem, "id" | "createdAt" | "updatedAt">) => void
  onDelete: (id: string) => void
  onImport: (problems: Problem[], folderId?: string) => void
  onExport: (folderId?: string) => void
  onNavigateToProblems: () => void
  onAddCategory: (category: string) => void
}) => {
  const [isAddingProblem, setIsAddingProblem] = useState(false)
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null)
  const [showExpectedCode, setShowExpectedCode] = useState<{ [key: string]: boolean }>({})
  const [selectedFolder, setSelectedFolder] = useState<string>("all")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    expectedCode: "",
    alternativeAnswers: [""],
    hints: [""],
    difficulty: 1,
    category: "",
    folderId: "default",
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
      folderId: "default",
    })
  }

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      onAddCategory(newCategoryName.trim())
      setFormData((prev) => ({ ...prev, category: newCategoryName.trim() }))
      setNewCategoryName("")
      setIsAddingCategory(false)
    }
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
      // 問題追加後に問題一覧画面に遷移
      onNavigateToProblems()
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
      folderId: problem.folderId,
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
        const importedData = JSON.parse(content)

        // フォルダ指定でのインポートかどうかを確認
        if (importedData.folder && importedData.problems) {
          // フォルダ付きインポート
          const folderId = selectedFolder === "all" ? "default" : selectedFolder
          onImport(importedData.problems, folderId)
        } else if (Array.isArray(importedData)) {
          // 従来の問題のみのインポート
          const folderId = selectedFolder === "all" ? "default" : selectedFolder
          onImport(importedData, folderId)
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

  const filteredProblems = selectedFolder === "all" ? problems : problems.filter((p) => p.folderId === selectedFolder)

  const getFolderName = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId)
    return folder ? folder.name : "未分類"
  }

  const getFolderColor = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId)
    return folder ? folder.color : "bg-gray-100"
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
              <Label>ヒント（オプション）</Label>
              {formData.hints.map((hint, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={hint}
                    onChange={(e) => updateHint(index, e.target.value)}
                    className="flex-1"
                    placeholder={`ヒント ${index + 1}`}
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

            <div className="grid grid-cols-3 gap-4">
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
                <Select
                  value={formData.category}
                  onValueChange={(value) => {
                    if (value === "__add_new__") {
                      setIsAddingCategory(true)
                    } else {
                      setFormData((prev) => ({ ...prev, category: value }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="__add_new__">+ 新しいカテゴリを追加</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="folder">フォルダ</Label>
                <Select
                  value={formData.folderId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, folderId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全てのフォルダ</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => onExport(selectedFolder === "all" ? undefined : selectedFolder)} variant="outline">
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
                <th className="px-4 py-3">フォルダ</th>
                <th className="px-4 py-3">タイトル</th>
                <th className="px-4 py-3">カテゴリ</th>
                <th className="px-4 py-3">難易度</th>
                <th className="px-4 py-3">期待コード</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProblems.map((problem) => (
                <tr key={problem.id} className="bg-white border-b">
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${getFolderColor(problem.folderId)}`}>
                      {getFolderName(problem.folderId)}
                    </span>
                  </td>
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

      {/* 新しいカテゴリ追加モーダル */}
      {isAddingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>新しいカテゴリを追加</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newCategory">カテゴリ名</Label>
                  <Input
                    id="newCategory"
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddCategory()
                      }
                    }}
                    placeholder="例: 基本操作"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => {
                    setIsAddingCategory(false)
                    setNewCategoryName("")
                  }}>
                    キャンセル
                  </Button>
                  <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                    追加
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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
          folderId: problem.folderId || "default", // 既存データの互換性のため
        }))
      }
    } catch (error) {
      console.error("Failed to load problems from localStorage:", error)
    }
  }

  // デフォルト値（サンプル問題）
  return sampleProblems
}

// saveProblems関数を追加
const saveProblems = (problems: Problem[]) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("playwright-learning-problems", JSON.stringify(problems))
    } catch (error) {
      console.error("Failed to save problems to localStorage:", error)
    }
  }
}

// フォルダデータを読み込む関数を追加
const loadFolders = (): FolderType[] => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("playwright-learning-folders")
      if (saved) {
        const parsed = JSON.parse(saved)
        // 日付オブジェクトを復元
        const folders = parsed.map((folder: any) => ({
          ...folder,
          createdAt: new Date(folder.createdAt),
          updatedAt: new Date(folder.updatedAt),
        }))
        // デフォルトフォルダが存在しない場合は追加
        if (!folders.find((f: FolderType) => f.id === "default")) {
          folders.unshift(defaultFolder)
        }
        // AI生成フォルダが存在しない場合は追加
        if (!folders.find((f: FolderType) => f.id === "ai-generated")) {
          folders.splice(1, 0, aiGeneratedFolder)
        }
        return folders
      }
    } catch (error) {
      console.error("Failed to load folders from localStorage:", error)
    }
  }

  // デフォルト値（サンプルフォルダ）
  return sampleFolders
}

// saveFolders関数を追加
const saveFolders = (folders: FolderType[]) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("playwright-learning-folders", JSON.stringify(folders))
    } catch (error) {
      console.error("Failed to save folders to localStorage:", error)
    }
  }
}

// 設定データを読み込む関数を追加
const loadSettings = (): AppSettings => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("playwright-learning-settings")
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error)
    }
  }

  // デフォルト値
  return defaultSettings
}

// saveSettings関数を追加
const saveSettings = (settings: AppSettings) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("playwright-learning-settings", JSON.stringify(settings))
    } catch (error) {
      console.error("Failed to save settings to localStorage:", error)
    }
  }
}

// loadUserProgress関数の定義 (既存のまま)
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

// saveUserProgress関数を追加
const saveUserProgress = (progress: UserProgress) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("playwright-learning-progress", JSON.stringify(progress))
    } catch (error) {
      console.error("Failed to save progress to localStorage:", error)
    }
  }
}

// モバイル端末検出用のhook
// The original useIsMobile hook was removed because it was redeclared.
// This is the corrected version.
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

// クォート正規化関数
const normalizeQuotes = (code: string): string => {
  // シングルクォートをダブルクォートに統一
  return code.replace(/'/g, '"')
}

// メインアプリケーション
// カテゴリを読み込む関数
const loadCategories = (): string[] => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("playwright-learning-categories")
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error("Failed to load categories from localStorage:", error)
    }
  }
  // デフォルトカテゴリ
  return ["基本操作", "要素の取得", "フォーム入力", "画面遷移", "アサーション"]
}

// カテゴリを保存する関数
const saveCategories = (categories: string[]) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("playwright-learning-categories", JSON.stringify(categories))
    } catch (error) {
      console.error("Failed to save categories to localStorage:", error)
    }
  }
}

export default function PlaywrightLearningApp() {
  const [currentView, setCurrentView] = useState<"dashboard" | "learning" | "problems" | "manual" | "settings">(
    "dashboard",
  )
  const [problems, setProblems] = useState<Problem[]>(loadProblems)
  const [folders, setFolders] = useState<FolderType[]>(loadFolders)
  const [categories, setCategories] = useState<string[]>(loadCategories)
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [currentSession, setCurrentSession] = useState<LearningSession | null>(null)
  const [userCode, setUserCode] = useState("")
  const [currentHintIndex, setCurrentHintIndex] = useState(-1)
  const [showAnswer, setShowAnswer] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "hint"; message: string } | null>(null)

  // 解答比較用の状態を追加
  const [showComparison, setShowComparison] = useState(false)
  const [userAnswerForComparison, setUserAnswerForComparison] = useState("")
  const { toast } = useToast() // Initialize toast

  // ローカルストレージから進捗データを復元する関数 (loadUserProgress is defined above)

  const [userProgress, setUserProgress] = useState<UserProgress>(loadUserProgress)

  const isMobile = useIsMobile()

  // 出題方法の設定を管理
  const [questionOrder, setQuestionOrder] = useState<QuestionOrder["type"]>("unlearned-first")
  const [showQuestionOrderModal, setShowQuestionOrderModal] = useState(false)
  const [showFolderSelectionModal, setShowFolderSelectionModal] = useState(false)
  const [selectedFolders, setSelectedFolders] = useState<string[]>([])
  const [progressTab, setProgressTab] = useState<"category" | "folder">("category")

  // 問題を選択する関数を追加
  const selectProblemsForSession = (
    orderType: QuestionOrder["type"],
    allProblems: Problem[],
    solvedProblems: string[],
    folderIds: string[],
  ): Problem[] => {
    // フォルダでフィルタリング
    const filteredProblems =
      folderIds.length === 0 ? allProblems : allProblems.filter((p) => folderIds.includes(p.folderId))

    let sortedProblems: Problem[] = []

    switch (orderType) {
      case "random":
        sortedProblems = [...filteredProblems].sort(() => Math.random() - 0.5)
        break

      case "unlearned-first":
        const unlearned = filteredProblems.filter((p) => !solvedProblems.includes(p.id))
        const learned = filteredProblems.filter((p) => solvedProblems.includes(p.id))
        sortedProblems = [...unlearned, ...learned]
        break

      case "learned-first":
        const learnedFirst = filteredProblems.filter((p) => solvedProblems.includes(p.id))
        const unlearnedLast = filteredProblems.filter((p) => !solvedProblems.includes(p.id))
        sortedProblems = [...learnedFirst, ...unlearnedLast]
        break

      case "easy-first":
        sortedProblems = [...filteredProblems].sort((a, b) => a.difficulty - b.difficulty)
        break

      case "hard-first":
        sortedProblems = [...filteredProblems].sort((a, b) => b.difficulty - a.difficulty)
        break

      default:
        sortedProblems = filteredProblems
    }

    return sortedProblems.slice(0, 5) // 最初の5問を選択
  }

  const calculateLevel = (solvedCount: number) => Math.floor(solvedCount / 10) + 1

  // 進捗データをlocalStorageに保存
  useEffect(() => {
    saveUserProgress(userProgress)
  }, [userProgress])

  // 問題データ保存用のuseEffect
  useEffect(() => {
    saveProblems(problems)
  }, [problems])

  // フォルダデータ保存用のuseEffect
  useEffect(() => {
    saveFolders(folders)
  }, [folders])

  // 設定データ保存用のuseEffect
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const startNewSession = () => {
    setShowFolderSelectionModal(true)
  }

  const startFolderSelection = () => {
    setSelectedFolders([])
    setShowFolderSelectionModal(true)
  }

  const startSessionWithFolders = () => {
    setShowFolderSelectionModal(false)
    setShowQuestionOrderModal(true)
  }

  const startSessionWithOrder = (orderType: QuestionOrder["type"]) => {
    const sessionProblems = selectProblemsForSession(orderType, problems, userProgress.solvedProblems, selectedFolders)

    if (sessionProblems.length === 0) {
      alert("選択したフォルダに問題がありません。")
      return
    }

    setCurrentSession({
      sessionId: Date.now().toString(),
      problems: sessionProblems,
      currentProblemIndex: 0,
      startedAt: new Date(),
      isCompleted: false,
      answersShown: new Set(),
      selectedFolders: selectedFolders,
    })
    setUserCode("")
    setCurrentHintIndex(-1)
    setShowAnswer(false)
    setFeedback(null)
    setShowComparison(false)
    setUserAnswerForComparison("")
    setShowQuestionOrderModal(false)
    setCurrentView("learning")
  }

  const runCode = () => {
    if (!currentSession) return

    const currentProblem = currentSession.problems[currentSession.currentProblemIndex]
    let normalizedUserCode = userCode

    const allAnswers = [currentProblem.expectedCode, ...(currentProblem.alternativeAnswers || [])]

    // 設定に応じて正規化を適用
    let normalizedAnswers = allAnswers

    if (settings.normalizeSpaces) {
      normalizedUserCode = normalizedUserCode.replace(/\s+/g, "")
      normalizedAnswers = allAnswers.map((answer) => answer.replace(/\s+/g, ""))
    }

    if (settings.normalizeQuotes) {
      normalizedUserCode = normalizeQuotes(normalizedUserCode)
      normalizedAnswers = normalizedAnswers.map((answer) => normalizeQuotes(answer))
    }

    const isCorrect = normalizedAnswers.some((answer) => normalizedUserCode === answer)

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
          setShowComparison(false)
          setUserAnswerForComparison("")
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

    // ユーザーの解答を保存して比較表示
    setUserAnswerForComparison(userCode)
    setShowComparison(true)
    setShowAnswer(true)
    setFeedback({ type: "hint", message: "解答比較を表示しました。違いを確認して学習しましょう！" })

    setCurrentSession((prev) =>
      prev
        ? {
            ...prev,
            answersShown: new Set([...prev.answersShown, currentProblem.id]),
          }
        : null,
    )
  }

  const closeComparison = () => {
    setShowComparison(false)
    setUserAnswerForComparison("")
    setShowAnswer(false) // この行を追加
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
    setShowComparison(false)
    setUserAnswerForComparison("")
  }

  // フォルダ管理関数
  const addFolder = (folderData: Omit<FolderType, "id" | "createdAt" | "updatedAt">) => {
    const newFolder: FolderType = {
      ...folderData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const updatedFolders = [...folders, newFolder]
    setFolders(updatedFolders)
    saveFolders(updatedFolders)
  }

  const editFolder = (id: string, folderData: Omit<FolderType, "id" | "createdAt" | "updatedAt">) => {
    const updatedFolders = folders.map((f) => (f.id === id ? { ...f, ...folderData, updatedAt: new Date() } : f))
    setFolders(updatedFolders)
    saveFolders(updatedFolders)
  }

  const deleteFolder = (id: string) => {
    if (id === "default") {
      alert("デフォルトフォルダは削除できません。")
      return
    }

    if (id === "ai-generated") {
      alert("AI生成問題フォルダは削除できません。")
      return
    }

    const problemsInFolder = problems.filter((p) => p.folderId === id)
    if (problemsInFolder.length > 0) {
      if (
        confirm(
          `このフォルダには${problemsInFolder.length}個の問題があります。フォルダを削除すると、これらの問題は「未分類」フォルダに移動されます。続行しますか？`,
        )
      ) {
        // 問題を未分類フォルダに移動
        const updatedProblems = problems.map((p) => (p.folderId === id ? { ...p, folderId: "default" } : p))
        setProblems(updatedProblems)
        saveProblems(updatedProblems)
        // フォルダを削除
        const updatedFolders = folders.filter((f) => f.id !== id)
        setFolders(updatedFolders)
        saveFolders(updatedFolders)
      }
    } else {
      if (confirm("このフォルダを削除しますか？")) {
        const updatedFolders = folders.filter((f) => f.id !== id)
        setFolders(updatedFolders)
        saveFolders(updatedFolders)
      }
    }
  }

  // 問題管理関数
  const addProblem = (problemData: Omit<Problem, "id" | "createdAt" | "updatedAt">) => {
    const newProblem: Problem = {
      ...problemData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const updatedProblems = [...problems, newProblem]
    setProblems(updatedProblems)
    saveProblems(updatedProblems)
  }

  const addCategory = (category: string) => {
    if (!categories.includes(category)) {
      const updatedCategories = [...categories, category]
      setCategories(updatedCategories)
      saveCategories(updatedCategories)
    }
  }

  const handleAIProblemGenerated = (problemData: Omit<Problem, "id" | "createdAt" | "updatedAt">) => {
    const newProblem: Problem = {
      ...problemData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Generate a more unique ID
      folderId: "ai-generated", // AI生成問題は必ずai-generatedフォルダに格納
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updatedProblems = [...problems, newProblem]
    setProblems(updatedProblems)
    saveProblems(updatedProblems)

    // toastは表示しない（AIチャット内で完結するため）
  }

  const importProblems = (importedProblems: Problem[], folderId?: string): boolean => {
    const targetFolderId = folderId || "default"
    const processedProblems = importedProblems.map((p) => ({
      ...p,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Generate a more unique ID
      folderId: targetFolderId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    if (confirm(`${processedProblems.length}個の問題をインポートしますか？`)) {
      const updatedProblems = [...problems, ...processedProblems]
      setProblems(updatedProblems)
      saveProblems(updatedProblems)
      alert(`${processedProblems.length}個の問題をインポートしました。`)
      return true
    }
    return false
  }

  const deleteProblem = (id: string) => {
    if (confirm("この問題を削除しますか？")) {
      const updatedProblems = problems.filter((p) => p.id !== id)
      setProblems(updatedProblems)
      saveProblems(updatedProblems)

      // 削除した問題が解答済みリストに含まれていれば、そこからも削除
      setUserProgress((prev) => ({
        ...prev,
        solvedProblems: prev.solvedProblems.filter((problemId) => problemId !== id),
      }))
    }
  }

  const exportProblems = (folderId?: string) => {
    const exportData = folderId
      ? {
          folder: folders.find((f) => f.id === folderId),
          problems: problems.filter((p) => p.folderId === folderId),
        }
      : {
          folders: folders,
          problems: problems,
        }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    const folderName = folderId ? folders.find((f) => f.id === folderId)?.name || "unknown" : "all"
    link.download = `playwright-problems-${folderName}-${new Date().toISOString().split("T")[0]}.json`
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
      saveUserProgress(resetData)
      alert("学習進捗をリセットしました。")
    }
  }

  const character = getCharacterInfo(userProgress.currentLevel)

  const editProblem = (id: string, problem: Omit<Problem, "id" | "createdAt" | "updatedAt">) => {
    const updatedProblems = problems.map((p) => (p.id === id ? { ...p, ...problem, updatedAt: new Date() } : p))
    setProblems(updatedProblems)
    saveProblems(updatedProblems)
  }

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
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
                  <FileText size={16} className="mr-2" /> {/* Update: Changed Settings to FileText */}
                  問題管理
                </Button>
                <Button
                  variant={currentView === "settings" ? "default" : "ghost"}
                  onClick={() => setCurrentView("settings")}
                >
                  <Cog size={16} className="mr-2" />
                  設定
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
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-700">
                  🔥 {(() => {
                    let streak = 0
                    const sortedActivity = [...userProgress.dailyActivity].sort((a, b) => b.date.localeCompare(a.date))
                    for (const activity of sortedActivity) {
                      if (activity.problemsSolved > 0) streak++
                      else break
                    }
                    return streak
                  })()}日
                </div>
                <div className="text-sm font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  Lv.{userProgress.currentLevel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "dashboard" && (
          <div className="space-y-6">
            {/* 今日の学習進捗 - 最優先エリア */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📊 今日の学習</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">解答した問題</div>
                    <div className="text-2xl font-bold">
                      {userProgress.dailyActivity.find(
                        (a) => a.date === new Date().toISOString().split("T")[0]
                      )?.problemsSolved || 0}問
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">総解答数</div>
                    <div className="text-2xl font-bold">{userProgress.totalSolved}問</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">🔥 連続学習</div>
                    <div className="text-2xl font-bold">
                      {(() => {
                        let streak = 0
                        const sortedActivity = [...userProgress.dailyActivity].sort((a, b) => b.date.localeCompare(a.date))
                        for (const activity of sortedActivity) {
                          if (activity.problemsSolved > 0) streak++
                          else break
                        }
                        return streak
                      })()}日
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 次の目標 + 今週の進捗 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🎯 次の目標</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">レベル{userProgress.currentLevel + 1}まで</span>
                    <span className="text-lg font-bold">あと{10 - (userProgress.totalSolved % 10)}問</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${((userProgress.totalSolved % 10) / 10) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📈 今週の進捗</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">今週の解答数</span>
                      <span className="text-lg font-bold">
                        {(() => {
                          const weekAgo = new Date()
                          weekAgo.setDate(weekAgo.getDate() - 7)
                          return userProgress.dailyActivity
                            .filter((a) => new Date(a.date) >= weekAgo)
                            .reduce((sum, a) => sum + a.problemsSolved, 0)
                        })()}問
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* カテゴリ別 / フォルダ別進捗 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">📚 進捗状況</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={progressTab === "category" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProgressTab("category")}
                    >
                      カテゴリ別
                    </Button>
                    <Button
                      variant={progressTab === "folder" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProgressTab("folder")}
                    >
                      フォルダ別
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {progressTab === "category" ? (
                  // カテゴリ別進捗
                  (() => {
                    const categories = Array.from(new Set(problems.map((p) => p.category)))
                    return categories.slice(0, 5).map((category) => {
                      const categoryProblems = problems.filter((p) => p.category === category)
                      const solvedInCategory = categoryProblems.filter((p) =>
                        userProgress.solvedProblems.includes(p.id)
                      ).length
                      const percentage = categoryProblems.length > 0
                        ? Math.round((solvedInCategory / categoryProblems.length) * 100)
                        : 0

                      return (
                        <div key={category}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{category}</span>
                            <span className="text-gray-600">{percentage}% ({solvedInCategory}/{categoryProblems.length}問)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  })()
                ) : (
                  // フォルダ別進捗
                  (() => {
                    return folders.map((folder) => {
                      const folderProblems = problems.filter((p) => p.folderId === folder.id)
                      const solvedInFolder = folderProblems.filter((p) =>
                        userProgress.solvedProblems.includes(p.id)
                      ).length
                      const percentage = folderProblems.length > 0
                        ? Math.round((solvedInFolder / folderProblems.length) * 100)
                        : 0

                      return (
                        <div key={folder.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{folder.name}</span>
                            <span className="text-gray-600">{percentage}% ({solvedInFolder}/{folderProblems.length}問)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  })()
                )}
              </CardContent>
            </Card>

            {/* 学習カレンダー（4週間に短縮） */}
            <LearningCalendar dailyActivity={userProgress.dailyActivity.slice(-28)} />

            {/* 学習開始ボタン */}
            <div className="text-center">
              <Button onClick={startNewSession} size="lg" className="text-lg">
                <Play size={20} className="mr-2" />
                新しいセッションを開始
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
                  <Progress value={((currentSession.currentProblemIndex + 1) / currentSession.problems.length) * 100} />
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

                  {currentHintIndex >= currentSession.problems[currentSession.currentProblemIndex].hints.length - 1 && (
                    <Button onClick={showCorrectAnswer} variant="destructive" size="sm">
                      {showAnswer ? "解答を再表示" : "解答を見る"}
                    </Button>
                  )}

                  {showComparison && (
                    <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded text-sm">解答比較を表示中です</div>
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
          <div className="space-y-8">
            <FolderManager folders={folders} onAdd={addFolder} onEdit={editFolder} onDelete={deleteFolder} />
            <ProblemManager
              problems={problems}
              folders={folders}
              categories={categories}
              onAdd={addProblem}
              onEdit={editProblem}
              onDelete={deleteProblem}
              onImport={importProblems}
              onExport={exportProblems}
              onNavigateToProblems={() => setCurrentView("problems")}
              onAddCategory={addCategory}
            />
          </div>
        )}

        {currentView === "settings" && (
          <div className="space-y-8">
            <SettingsManager settings={settings} onUpdate={updateSettings} />

            {/* Ko-fi サポートセクション */}
            <Card>
              <CardHeader>
                <CardTitle>☕ このアプリを支援</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  このアプリは無料で利用できますが、開発やサーバー維持にはコストがかかります。
                  <br />
                  もしこのアプリが役に立ったと感じていただけたら、開発を支援していただけると嬉しいです！
                </p>
                <div className="text-center">
                  <a
                    href={`https://ko-fi.com/${process.env.NEXT_PUBLIC_KOFI_USERNAME || "yourusername"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <img
                      src="https://storage.ko-fi.com/cdn/kofi2.png?v=3"
                      alt="Buy Me a Coffee at ko-fi.com"
                      className="h-12 hover:opacity-80 transition-opacity"
                    />
                  </a>
                </div>
                <p className="text-gray-500 text-xs text-center">Ko-fiは手数料無料の支援プラットフォームです</p>
              </CardContent>
            </Card>

            {/* 学習進捗リセット */}
            <Card>
              <CardHeader>
                <CardTitle>🗑️ データ管理</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 p-4 rounded">
                  <h3 className="font-semibold text-red-800 mb-2">⚠️ 学習進捗のリセット</h3>
                  <p className="text-red-700 text-sm mb-4">
                    以下の項目が初期化されます（この操作は取り消せません）：
                  </p>
                  <ul className="text-red-700 text-sm mb-4 list-disc list-inside">
                    <li>解答済み問題リスト</li>
                    <li>レベル（Lv.1に戻ります）</li>
                    <li>総解答数</li>
                    <li>学習カレンダー・連続学習日数</li>
                  </ul>
                  <p className="text-red-700 text-sm mb-4">
                    ※ 問題データやフォルダは削除されません
                  </p>
                  <div className="text-center">
                    <Button onClick={resetProgress} variant="destructive">
                      学習進捗をリセット
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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

            {/* AI機能 */}
            <Card>
              <CardHeader>
                <CardTitle>🤖 AI問題生成機能</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">💬 AIチャット</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• 画面右下のチャットボタンからAIアシスタントを起動</li>
                    <li>• 学びたい内容を自然な言葉で伝えると、適切な問題を自動生成</li>
                    <li>• 会話履歴を保持し、詳細を聞き返しながら問題を作成</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🎯 曖昧な要件のブレイクダウン</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• 「Playwrightを学びたい」のような抽象的な要望でもOK</li>
                    <li>• AIが質問をして、学びたい内容を具体化</li>
                    <li>• 難易度やシナリオを確認して、最適な問題を提案</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">📚 複数問題の一括生成</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• 1つの要望から基礎→応用の流れで複数の問題を作成可能</li>
                    <li>• 問題作成後、関連する追加問題を提案</li>
                    <li>• 体系的な学習プランを自動構築</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🗂️ 自動フォルダ分類</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• AI生成問題は「AI生成問題」フォルダに自動保存</li>
                    <li>• このフォルダは削除不可で、常に利用可能</li>
                    <li>• 手動作成の問題と明確に区別して管理</li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-3 rounded">
                  <h3 className="font-semibold text-blue-800 mb-2">💡 使用例</h3>
                  <div className="text-blue-700 text-sm space-y-2">
                    <p><strong>例1（曖昧な要望）:</strong></p>
                    <p className="pl-4">ユーザー: 「Playwrightを勉強したい」</p>
                    <p className="pl-4">AI: 「どの分野を学習したいですか？」→ ユーザーが選択 → 問題作成</p>
                    <p className="mt-2"><strong>例2（明確な要望）:</strong></p>
                    <p className="pl-4">ユーザー: 「ボタンをクリックする方法を学びたい」</p>
                    <p className="pl-4">AI: 即座に問題を作成 + 関連問題を提案</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* フォルダ機能 */}
            <Card>
              <CardHeader>
                <CardTitle>📁 フォルダ機能</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">🗂️ 問題の分類</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• 問題をフォルダごとに分類して管理できます</li>
                    <li>• 学習セッション開始時に特定のフォルダを選択可能</li>
                    <li>• フォルダごとに色分けして視覚的に管理</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">📤 フォルダ別エクスポート・インポート</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• 特定のフォルダの問題のみをエクスポート可能</li>
                    <li>• インポート時にフォルダを指定して問題を追加</li>
                    <li>• フォルダ情報も含めてデータを共有</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 設定機能 */}
            <Card>
              <CardHeader>
                <CardTitle>⚙️ 設定機能</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">🔤 クォート正規化設定</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• シングルクォート（'）とダブルクォート（"）の扱いを設定可能</li>
                    <li>• 正規化ON: 'button' と "button" を同じとして扱う</li>
                    <li>• 正規化OFF: 'button' と "button" を別物として扱う</li>
                    <li>• デフォルトは正規化ONで、より柔軟な学習が可能</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🔲 空欄正規化設定</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• 空欄（スペース）の扱いを設定可能</li>
                    <li>• 正規化ON: 複数の空欄を1つにまとめ、前後の空欄を削除</li>
                    <li>• 正規化OFF: 空欄も含めて完全一致を要求</li>
                    <li>• デフォルトは正規化ONで、より学習しやすい設定</li>
                  </ul>
                </div>
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
                      <li>• フォルダデータ（作成したフォルダ情報）</li>
                      <li>• 問題データ（追加・編集した問題）</li>
                      <li>• 学習進捗（解答済み問題、レベル）</li>
                      <li>• 学習カレンダー（日別活動記録）</li>
                      <li>• アプリケーション設定（クォート正規化など）</li>
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
                        • <strong>PCの初期化</strong>やOSの再インストール
                      </li>
                      <li>
                        • <strong>ブラウザの再インストール</strong>やプロファイルのリセット
                      </li>
                      <li>
                        • <strong>ストレージ容量不足</strong>時の自動削除
                      </li>
                      <li>
                        • <strong>ブラウザの自動クリーンアップ機能</strong>（一定期間後に自動削除される場合）
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
                        • <strong>フォルダデータ</strong>: 1フォルダあたり約0.5KB
                      </li>
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
                      <h4 className="font-medium">Q: フォルダを削除したら問題はどうなりますか？</h4>
                      <p className="text-gray-600 text-sm">
                        A: フォルダ内の問題は「未分類」フォルダに自動的に移動されます。問題自体は削除されません。
                      </p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-medium">Q: クォート正規化とは何ですか？</h4>
                      <p className="text-gray-600 text-sm">
                        A:
                        シングルクォート（'）とダブルクォート（"）を同じものとして扱うかどうかの設定です。ONにすると、より柔軟な回答判定が可能になります。
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

                    <div className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-medium">Q: 空欄正規化とは何ですか？</h4>
                      <p className="text-gray-600 text-sm">
                        A:
                        複数の空欄を1つにまとめ、前後の空欄を削除するかどうかの設定です。ONにすると、空欄の違いを気にせずに学習できます。
                      </p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-medium">Q: 解答比較画面とは何ですか？</h4>
                      <p className="text-gray-600 text-sm">
                        A:
                        「解答を見る」ボタンを押すと、あなたの解答と正解を並べて比較できる画面が表示されます。違いを確認して学習に役立ててください。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ko-fi サポートセクション */}
            <Card>
              <CardHeader>
                <CardTitle>☕ このアプリを支援</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-700">
                  このアプリは無料で利用できますが、開発やサーバー維持にはコストがかかります。
                  <br />
                  もしこのアプリが役に立ったと感じていただけたら、開発を支援していただけると嬉しいです！
                </p>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-blue-800 text-sm mb-3">💝 サポートしていただくと...</p>
                  <ul className="text-blue-700 text-sm space-y-1 text-left">
                    <li>• 新機能の開発が促進されます</li>
                    <li>• バグ修正が迅速に行われます</li>
                    <li>• サーバーの安定運用が継続できます</li>
                    <li>• AI機能の利用コストをカバーできます</li>
                  </ul>
                </div>
                <a
                  href={`https://ko-fi.com/${process.env.NEXT_PUBLIC_KOFI_USERNAME || "yourusername"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <img
                    src="https://storage.ko-fi.com/cdn/kofi2.png?v=3"
                    alt="Buy Me a Coffee at ko-fi.com"
                    className="h-14 hover:opacity-80 transition-opacity"
                  />
                </a>
                <p className="text-gray-500 text-xs">Ko-fiは手数料無料の支援プラットフォームです</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 解答比較モーダル */}
        {showComparison && currentSession && (
          <AnswerComparison
            userAnswer={userAnswerForComparison}
            correctAnswer={currentSession.problems[currentSession.currentProblemIndex].expectedCode}
            onClose={closeComparison}
          />
        )}

        {/* フォルダ選択モーダル */}
        {showFolderSelectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>学習するフォルダを選択</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {folders.map((folder) => (
                    <div key={folder.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={folder.id}
                        checked={selectedFolders.includes(folder.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedFolders((prev) => [...prev, folder.id])
                          } else {
                            setSelectedFolders((prev) => prev.filter((id) => id !== folder.id))
                          }
                        }}
                      />
                      <label htmlFor={folder.id} className={`flex-1 p-2 rounded cursor-pointer ${folder.color}`}>
                        <div className="flex items-center gap-2">
                          <Folder size={16} />
                          <span className="font-medium">{folder.name}</span>
                          <span className="text-sm text-gray-600">
                            ({problems.filter((p) => p.folderId === folder.id).length}問)
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{folder.description}</p>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={startSessionWithFolders} disabled={selectedFolders.length === 0} className="flex-1">
                    選択完了 ({selectedFolders.length}フォルダ)
                  </Button>
                  <Button onClick={() => setShowFolderSelectionModal(false)} variant="ghost">
                    キャンセル
                  </Button>
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

      {/* ToasterとAIChatWidgetを追加 */}
      <Toaster />
      <AIChatWidget onProblemGenerated={handleAIProblemGenerated} />
    </div>
  )
}
