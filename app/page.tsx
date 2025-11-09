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
  Share2,
  Copy,
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

// 前回の学習設定を保存する型
interface LastLearningSettings {
  selectionType: "folder" | "category"
  selectedFolders: string[]
  selectedCategories: string[]
  questionOrder: QuestionOrder["type"]
}

// 出題方法の選択肢を定義
const questionOrderOptions: QuestionOrder[] = [
  { type: "unlearned-first", label: "未学習優先" },
  { type: "random", label: "ランダム" },
  { type: "learned-first", label: "復習モード" },
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

// サンプルフォルダデータ
const sampleFolders: FolderType[] = [
  defaultFolder,
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
  const [weeks, setWeeks] = useState<Array<Array<{ date: string; count: number; intensity: number }>>>([])

  useEffect(() => {
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
    const newWeeks = []
    for (let i = 0; i < days.length; i += 7) {
      newWeeks.push(days.slice(i, i + 7))
    }
    setWeeks(newWeeks)
  }, [dailyActivity])

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
  onDeleteCategory,
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
  onDeleteCategory: (category: string) => void
}) => {
  const [isAddingProblem, setIsAddingProblem] = useState(false)
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null)
  const [showExpectedCode, setShowExpectedCode] = useState<{ [key: string]: boolean }>({})
  const [selectedFolder, setSelectedFolder] = useState<string>("all")
  const [isManagingCategories, setIsManagingCategories] = useState(false)
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
    const trimmedCategory = newCategoryName.trim()
    console.log("handleAddCategory called with:", trimmedCategory)
    console.log("Current categories:", categories)

    if (!trimmedCategory) {
      alert("カテゴリ名を入力してください")
      return
    }
    if (categories.includes(trimmedCategory)) {
      alert("このカテゴリは既に存在します")
      return
    }

    console.log("Adding category:", trimmedCategory)
    onAddCategory(trimmedCategory)
    setFormData((prev) => ({ ...prev, category: trimmedCategory }))
    setNewCategoryName("")
    // モーダルは開いたまま（管理モーダルの場合）
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
                <div className="flex gap-2">
                  <Select
                    value={formData.category || undefined}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ ...prev, category: value }))
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsManagingCategories(true)}
                    title="カテゴリを管理"
                  >
                    <Cog size={16} />
                  </Button>
                </div>
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

        {/* カテゴリ管理モーダル */}
        {isManagingCategories && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <Card className="w-[500px]">
              <CardHeader>
                <CardTitle>カテゴリ管理</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 新規カテゴリ追加 */}
                  <div>
                    <Label htmlFor="newCategory">新しいカテゴリを追加</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="newCategory"
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newCategoryName.trim()) {
                            handleAddCategory()
                          }
                        }}
                        placeholder="例: 基本操作"
                      />
                      <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                        追加
                      </Button>
                    </div>
                  </div>

                  {/* 登録済みカテゴリ一覧 */}
                  <div>
                    <Label>登録済みカテゴリ ({categories.length}件)</Label>
                    <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                      {categories.map((cat) => {
                        const problemCount = problems.filter((p) => p.category === cat).length
                        return (
                          <div
                            key={cat}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                          >
                            <div className="flex-1">
                              <span className="font-medium">{cat}</span>
                              <span className="text-xs text-gray-500 ml-2">({problemCount}問)</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteCategory(cat)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        )
                      })}
                      {categories.length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                          カテゴリが登録されていません
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t">
                    <Button onClick={() => {
                      setIsManagingCategories(false)
                      setNewCategoryName("")
                    }}>
                      閉じる
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

// 前回の学習設定を読み込む
const loadLastLearningSettings = (): LastLearningSettings | null => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("playwright-learning-last-settings")
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error("Failed to load last learning settings:", error)
    }
  }
  return null
}

// 前回の学習設定を保存する
const saveLastLearningSettings = (settings: LastLearningSettings) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("playwright-learning-last-settings", JSON.stringify(settings))
    } catch (error) {
      console.error("Failed to save last learning settings:", error)
    }
  }
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

  // 出題方法の設定を管理（非推奨：旧モーダル用）
  const [questionOrder, setQuestionOrder] = useState<QuestionOrder["type"]>("unlearned-first")
  const [showQuestionOrderModal, setShowQuestionOrderModal] = useState(false)
  const [showFolderSelectionModal, setShowFolderSelectionModal] = useState(false)
  const [selectedFolders, setSelectedFolders] = useState<string[]>([])
  const [progressTab, setProgressTab] = useState<"category" | "folder">("category")

  // 新しい統合学習開始モーダル用の状態
  const [showUnifiedStartModal, setShowUnifiedStartModal] = useState(false)
  const [hasLastSettings, setHasLastSettings] = useState(false)
  const [selectionType, setSelectionType] = useState<"folder" | "category">("folder")
  const [selectedFoldersNew, setSelectedFoldersNew] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [questionOrderNew, setQuestionOrderNew] = useState<QuestionOrder["type"]>("unlearned-first")

  // ストリーク（連続学習日数）の状態
  const [currentStreak, setCurrentStreak] = useState(0)

  // 今日の日付（クライアント側のみ）
  const [todayDate, setTodayDate] = useState("")

  // 今週の解答数（クライアント側のみ）
  const [weeklyProblems, setWeeklyProblems] = useState(0)

  // SNSシェアの表示状態
  const [showShareOptions, setShowShareOptions] = useState(false)

  // フォルダ・問題管理の状態
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [showAddFolderModal, setShowAddFolderModal] = useState(false)
  const [showEditFolderModal, setShowEditFolderModal] = useState(false)
  const [showAddProblemModal, setShowAddProblemModal] = useState(false)
  const [showEditProblemModal, setShowEditProblemModal] = useState(false)
  const [showCategoryManagementModal, setShowCategoryManagementModal] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null)
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null)
  const [selectedFolderForAdd, setSelectedFolderForAdd] = useState<string>("")

  // 問題追加・編集時のヒントと代替回答の状態
  const [newHints, setNewHints] = useState<string[]>([])
  const [newAlternatives, setNewAlternatives] = useState<string[]>([])
  const [editHints, setEditHints] = useState<string[]>([])
  const [editAlternatives, setEditAlternatives] = useState<string[]>([])

  // カテゴリ管理の状態
  const [newCategoryName, setNewCategoryName] = useState("")

  // 利用規約の状態
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  // 利用規約の同意状態をチェック（クライアント側のみ）
  useEffect(() => {
    if (typeof window !== "undefined") {
      const agreed = localStorage.getItem("playwright-learning-terms-agreed")
      if (agreed === "true") {
        setHasAgreedToTerms(true)
      } else {
        setShowTermsModal(true)
      }
    }
  }, [])

  // 前回の設定を読み込む（クライアント側のみ）
  useEffect(() => {
    const lastSettings = loadLastLearningSettings()
    if (lastSettings) {
      setHasLastSettings(true)
      setSelectionType(lastSettings.selectionType)
      setSelectedFoldersNew(lastSettings.selectedFolders)
      setSelectedCategories(lastSettings.selectedCategories)
      setQuestionOrderNew(lastSettings.questionOrder)
    }
  }, [])

  // 今日の日付を設定（クライアント側のみ）
  useEffect(() => {
    setTodayDate(new Date().toISOString().split("T")[0])
  }, [])

  // ストリークを計算（クライアント側のみ）
  useEffect(() => {
    let streak = 0
    const sortedActivity = [...userProgress.dailyActivity].sort((a, b) => b.date.localeCompare(a.date))
    for (const activity of sortedActivity) {
      if (activity.problemsSolved > 0) streak++
      else break
    }
    setCurrentStreak(streak)
  }, [userProgress.dailyActivity])

  // 今週の解答数を計算（クライアント側のみ）
  useEffect(() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const count = userProgress.dailyActivity
      .filter((a) => new Date(a.date) >= weekAgo)
      .reduce((sum, a) => sum + a.problemsSolved, 0)
    setWeeklyProblems(count)
  }, [userProgress.dailyActivity])

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

  // カテゴリまたはフォルダで問題を選択する新しい関数
  const selectProblemsForSessionNew = (
    orderType: QuestionOrder["type"],
    allProblems: Problem[],
    solvedProblems: string[],
    type: "folder" | "category",
    folderIds: string[],
    categoryNames: string[],
  ): Problem[] => {
    // フォルダまたはカテゴリでフィルタリング
    let filteredProblems: Problem[]
    if (type === "folder") {
      filteredProblems = folderIds.length === 0 ? allProblems : allProblems.filter((p) => folderIds.includes(p.folderId))
    } else {
      filteredProblems =
        categoryNames.length === 0 ? allProblems : allProblems.filter((p) => categoryNames.includes(p.category))
    }

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
    // 新しい統合モーダルを開く
    setShowUnifiedStartModal(true)
  }

  // クイックスタート：前回と同じ設定で開始
  const quickStart = () => {
    const lastSettings = loadLastLearningSettings()
    if (!lastSettings) {
      // 前回の設定がない場合は通常のモーダルを開く
      setShowUnifiedStartModal(true)
      return
    }

    // 前回の設定でセッションを開始
    startSessionWithUnifiedSettings(
      lastSettings.selectionType,
      lastSettings.selectionType === "folder" ? lastSettings.selectedFolders : lastSettings.selectedCategories,
      lastSettings.questionOrder,
    )
  }

  // 統合モーダルから学習を開始
  const startSessionWithUnifiedSettings = (
    type: "folder" | "category",
    selectedIds: string[],
    orderType: QuestionOrder["type"],
  ) => {
    if (selectedIds.length === 0) {
      alert(type === "folder" ? "フォルダを選択してください" : "カテゴリを選択してください")
      return
    }

    const selectedProblems = selectProblemsForSessionNew(
      orderType,
      problems,
      userProgress.solvedProblems,
      type,
      type === "folder" ? selectedIds : [],
      type === "category" ? selectedIds : [],
    )

    if (selectedProblems.length === 0) {
      alert("選択した条件に一致する問題がありません")
      return
    }

    // 設定を保存
    saveLastLearningSettings({
      selectionType: type,
      selectedFolders: type === "folder" ? selectedIds : [],
      selectedCategories: type === "category" ? selectedIds : [],
      questionOrder: orderType,
    })

    // セッションを開始
    setCurrentSession({
      sessionId: Date.now().toString(),
      problems: selectedProblems,
      currentProblemIndex: 0,
      startedAt: new Date(),
      isCompleted: false,
      answersShown: new Set(),
      selectedFolders: type === "folder" ? selectedIds : [],
    })

    setCurrentView("learning")
    setUserCode("")
    setCurrentHintIndex(-1)
    setShowAnswer(false)
    setFeedback(null)
    setShowComparison(false)
    setUserAnswerForComparison("")
    setShowUnifiedStartModal(false)
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
    console.log("addCategory called with:", category)
    console.log("Current categories state:", categories)

    if (!categories.includes(category)) {
      const updatedCategories = [...categories, category]
      console.log("Updated categories:", updatedCategories)
      setCategories(updatedCategories)
      saveCategories(updatedCategories)
      console.log("Category added successfully")
    } else {
      console.log("Category already exists")
    }
  }

  const deleteCategory = (category: string) => {
    // カテゴリを使用している問題があるかチェック
    const problemsUsingCategory = problems.filter((p) => p.category === category)
    if (problemsUsingCategory.length > 0) {
      alert(`このカテゴリは${problemsUsingCategory.length}個の問題で使用されているため削除できません。`)
      return
    }

    if (confirm(`カテゴリ「${category}」を削除しますか？`)) {
      const updatedCategories = categories.filter((c) => c !== category)
      setCategories(updatedCategories)
      saveCategories(updatedCategories)
    }
  }

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim())
      setNewCategoryName("")
    }
  }

  const handleAgreeToTerms = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("playwright-learning-terms-agreed", "true")
      setHasAgreedToTerms(true)
      setShowTermsModal(false)
    }
  }

  const handleAIProblemGenerated = (
    problemOrProblems:
      | Omit<Problem, "id" | "createdAt" | "updatedAt">
      | { problems: Array<Omit<Problem, "id" | "createdAt" | "updatedAt">> },
  ) => {
    // 複数問題の場合と単一問題の場合を判定
    const isMultiple = "problems" in problemOrProblems
    const problemsList = isMultiple ? problemOrProblems.problems : [problemOrProblems]

    if (problemsList.length === 0) return

    // 最初の問題のフォルダIDとカテゴリを確認（すべて同じフォルダ・カテゴリに保存される想定）
    const targetFolderId = problemsList[0].folderId
    const targetCategory = problemsList[0].category
    let finalFolderId = targetFolderId
    let finalCategory = targetCategory

    // フォルダIDの検証（1回のみ）
    const folderExists = folders.some((f) => f.id === targetFolderId)

    if (!folderExists) {
      // フォルダが存在しない場合、ユーザーに確認
      const useDefault = confirm(
        `指定されたフォルダが見つかりませんでした。\n\n「OK」を押すと「未分類」フォルダに保存します。\n「キャンセル」を押すと新しいフォルダを作成します。`
      )

      if (useDefault) {
        // デフォルトフォルダに保存
        finalFolderId = "default"
      } else {
        // 新しいフォルダを作成
        const folderName = prompt("新しいフォルダ名を入力してください:")

        if (folderName && folderName.trim()) {
          // 新しいフォルダを作成
          const newFolder: FolderType = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: folderName.trim(),
            description: "AI問題生成時に作成されたフォルダ",
            color: "bg-purple-100",
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const updatedFolders = [...folders, newFolder]
          setFolders(updatedFolders)
          saveFolders(updatedFolders)

          // 新しいフォルダのIDを使用
          finalFolderId = newFolder.id
        } else {
          // フォルダ名が入力されなかった場合はデフォルトフォルダに保存
          alert("フォルダ名が入力されなかったため、「未分類」フォルダに保存します。")
          finalFolderId = "default"
        }
      }
    }

    // カテゴリの検証と作成（1回のみ）
    const categoryExists = categories.includes(targetCategory)

    if (!categoryExists && targetCategory && targetCategory.trim()) {
      // カテゴリが存在しない場合、ユーザーに確認
      const createCategory = confirm(
        `カテゴリ「${targetCategory}」が見つかりませんでした。\n\n新しいカテゴリとして作成しますか？\n\n「OK」で作成、「キャンセル」で既存のカテゴリから選択します。`
      )

      if (createCategory) {
        // 新しいカテゴリを作成
        addCategory(targetCategory)
        finalCategory = targetCategory
      } else {
        // 既存のカテゴリから選択（カテゴリがある場合）
        if (categories.length > 0) {
          const categoryOptions = categories.map((c, i) => `${i + 1}. ${c}`).join("\n")
          const selection = prompt(
            `既存のカテゴリから選択してください（番号を入力）:\n\n${categoryOptions}\n\nまたは、新しいカテゴリ名を直接入力してください:`,
          )

          if (selection) {
            const selectionNum = parseInt(selection)
            if (!isNaN(selectionNum) && selectionNum > 0 && selectionNum <= categories.length) {
              // 番号で選択
              finalCategory = categories[selectionNum - 1]
            } else if (selection.trim()) {
              // 新しいカテゴリ名を入力
              addCategory(selection.trim())
              finalCategory = selection.trim()
            } else {
              finalCategory = targetCategory
            }
          } else {
            // キャンセルされた場合は元のカテゴリを使用
            finalCategory = targetCategory
          }
        } else {
          // カテゴリが1つもない場合は自動的に作成
          addCategory(targetCategory)
          finalCategory = targetCategory
        }
      }
    }

    // 全ての問題を作成
    const newProblems: Problem[] = problemsList.map((problemData, index) => ({
      ...problemData,
      folderId: finalFolderId, // 確定したフォルダIDを使用
      category: finalCategory, // 確定したカテゴリを使用
      id: (Date.now() + index).toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    const updatedProblems = [...problems, ...newProblems]
    setProblems(updatedProblems)
    saveProblems(updatedProblems)

    // フォルダ名を取得
    const folderName = folders.find((f) => f.id === finalFolderId)?.name || "未分類"

    // ユーザーに結果を通知
    const message = `✅ 問題を作成しました\n\n📁 フォルダ: ${folderName}\n🏷️ カテゴリ: ${finalCategory}\n📝 問題数: ${newProblems.length}件`
    alert(message)

    console.log(
      `[v0] Created ${newProblems.length} problem(s) in folder ${finalFolderId} (${folderName}) with category ${finalCategory}`,
    )
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

      // 前回の学習設定もクリア
      if (typeof window !== "undefined") {
        localStorage.removeItem("playwright-learning-last-settings")
        setHasLastSettings(false)
      }

      alert("学習進捗をリセットしました。")
    }
  }

  const character = getCharacterInfo(userProgress.currentLevel)

  // フォルダの開閉切り替え
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    )
  }

  // SNSシェア用のテキスト生成
  const generateShareText = () => {
    const today = new Date().toISOString().split("T")[0]
    const todayProblems = userProgress.dailyActivity.find((a) => a.date === today)?.problemsSolved || 0
    const nextLevelProblems = 10 - (userProgress.totalSolved % 10)

    return `📚 Playwright学習アプリで学習中！

🔥 連続学習: ${currentStreak}日
📊 今日の学習: ${todayProblems}問
📈 総解答数: ${userProgress.totalSolved}問
⭐ 現在のレベル: Lv.${userProgress.currentLevel}
🎯 次の目標: レベル${userProgress.currentLevel + 1}まであと${nextLevelProblems}問

#Playwright #プログラミング学習 #E2Eテスト`
  }

  // Twitterでシェア
  const shareToTwitter = () => {
    const text = generateShareText()
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  // テキストをクリップボードにコピー
  const copyShareText = () => {
    const text = generateShareText()
    navigator.clipboard.writeText(text).then(
      () => {
        alert("シェア用テキストをクリップボードにコピーしました！")
      },
      () => {
        alert("コピーに失敗しました。")
      }
    )
  }

  const editProblem = (id: string, problem: Omit<Problem, "id" | "createdAt" | "updatedAt">) => {
    const updatedProblems = problems.map((p) => (p.id === id ? { ...p, ...problem, updatedAt: new Date() } : p))
    setProblems(updatedProblems)
    saveProblems(updatedProblems)
  }

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between py-2 sm:h-16">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-8 w-full sm:w-auto">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Playwright学習アプリ</h1>
              <nav className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                <Button
                  variant={currentView === "dashboard" ? "default" : "ghost"}
                  onClick={() => setCurrentView("dashboard")}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">ダッシュボード</span>
                  <span className="sm:hidden">ダッシュ</span>
                </Button>
                <Button
                  variant={currentView === "learning" ? "default" : "ghost"}
                  onClick={startNewSession}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  学習
                </Button>
                <Button
                  variant={currentView === "problems" ? "default" : "ghost"}
                  onClick={() => setCurrentView("problems")}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  問題
                </Button>
                <Button
                  variant={currentView === "settings" ? "default" : "ghost"}
                  onClick={() => setCurrentView("settings")}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  設定
                </Button>
                <Button
                  variant={currentView === "manual" ? "default" : "ghost"}
                  onClick={() => setCurrentView("manual")}
                  size="sm"
                  className="text-xs sm:text-sm hidden sm:inline-flex"
                >
                  マニュアル
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowTermsModal(true)}
                  size="sm"
                  className="text-xs sm:text-sm hidden sm:inline-flex"
                >
                  利用規約
                </Button>
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-xs sm:text-sm font-medium text-gray-700">
                  🔥 {currentStreak}日
                </div>
                <div className="text-xs sm:text-sm font-medium bg-blue-100 text-blue-700 px-2 sm:px-3 py-1 rounded-full">
                  Lv.{userProgress.currentLevel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* モバイルユーザー向けPC推奨バナー（問題セッション以外で表示） */}
      {isMobile && currentView !== "learning" && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💻</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800 mb-1">PC環境を推奨</p>
                <p className="text-xs text-yellow-700">
                  本アプリはPC環境での利用を想定して作られているため、モバイル端末でのご利用は非推奨です。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasAgreedToTerms ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-2xl">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">利用規約の確認</h2>
                <p className="text-gray-600 mb-6">
                  サービスをご利用いただく前に、利用規約をご確認ください。
                </p>
              </CardContent>
            </Card>
          </div>
        ) : currentView === "dashboard" && (
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
                        (a) => a.date === todayDate
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
                      {currentStreak}日
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
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">今週の解答数</span>
                      <span className="text-lg font-bold">
                        {weeklyProblems}問
                      </span>
                    </div>

                    {/* SNSシェアボタン */}
                    <div className="pt-2 border-t border-gray-200">
                      <button
                        onClick={() => setShowShareOptions(!showShareOptions)}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <Share2 size={12} />
                        学習記録をシェア
                      </button>

                      {showShareOptions && (
                        <div className="mt-3 space-y-2">
                          <div className="flex gap-2">
                            <Button onClick={shareToTwitter} size="sm" className="text-xs bg-blue-500 hover:bg-blue-600">
                              <Share2 size={12} className="mr-1" />
                              X(旧Twitter)
                            </Button>
                            <Button onClick={copyShareText} size="sm" variant="outline" className="text-xs">
                              <Copy size={12} className="mr-1" />
                              コピー
                            </Button>
                          </div>
                        </div>
                      )}
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
            <div className="flex justify-center">
              <Button onClick={startNewSession} size="lg" className="text-lg">
                <Play size={20} className="mr-2" />
                学習開始
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

        {currentView === "learning" && !currentSession && (
          <div className="text-center space-y-6">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">学習セッションを開始しましょう</h2>
                <p className="text-gray-600 mb-6">下のボタンから新しい学習セッションを開始できます</p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={startNewSession} size="lg">
                    <Play size={20} className="mr-2" />
                    学習開始
                  </Button>
                  <Button variant="outline" onClick={() => setCurrentView("dashboard")}>
                    ダッシュボードに戻る
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === "problems" && (
          <div className="space-y-6">
            {/* フォルダと問題の統合管理 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>📁 フォルダと問題の管理</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowAddFolderModal(true)} size="sm">
                      <FolderPlus size={16} className="mr-2" />
                      フォルダを追加
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {folders.map((folder) => {
                    const folderProblems = problems.filter((p) => p.folderId === folder.id)
                    const isExpanded = expandedFolders.includes(folder.id)

                    return (
                      <Card key={folder.id} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <button
                                onClick={() => toggleFolder(folder.id)}
                                className="hover:bg-gray-100 p-1 rounded"
                              >
                                {isExpanded ? "▼" : "▶"}
                              </button>
                              <div>
                                <div className="font-semibold">{folder.name}</div>
                                <div className="text-sm text-gray-500">{folderProblems.length}問</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setShowAddProblemModal(true)
                                  setSelectedFolderForAdd(folder.id)
                                }}
                                size="sm"
                                variant="outline"
                              >
                                <Plus size={14} className="mr-1" />
                                問題追加
                              </Button>
                              <Button
                                onClick={() => {
                                  const input = document.createElement("input")
                                  input.type = "file"
                                  input.accept = ".json"
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0]
                                    if (file) {
                                      const reader = new FileReader()
                                      reader.onload = (event) => {
                                        try {
                                          const json = JSON.parse(event.target?.result as string)
                                          // フォルダIDを上書きしてインポート
                                          const problemsWithFolderId = json.map((p: any) => ({
                                            ...p,
                                            folderId: folder.id,
                                          }))
                                          importProblems(problemsWithFolderId)
                                        } catch (error) {
                                          alert("JSONファイルの読み込みに失敗しました")
                                        }
                                      }
                                      reader.readAsText(file)
                                    }
                                  }
                                  input.click()
                                }}
                                size="sm"
                                variant="outline"
                              >
                                <Upload size={14} className="mr-1" />
                                インポート
                              </Button>
                              <Button
                                onClick={() => exportProblems(folder.id)}
                                size="sm"
                                variant="outline"
                              >
                                <Download size={14} className="mr-1" />
                                エクスポート
                              </Button>
                              <Button
                                onClick={() => {
                                  setEditingFolder(folder)
                                  setShowEditFolderModal(true)
                                }}
                                size="sm"
                                variant="outline"
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button onClick={() => deleteFolder(folder.id)} size="sm" variant="outline">
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        {isExpanded && (
                          <CardContent className="pt-0">
                            {folderProblems.length === 0 ? (
                              <div className="text-center text-gray-500 py-8">
                                このフォルダには問題がありません
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {folderProblems.map((problem) => (
                                  <div
                                    key={problem.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100"
                                  >
                                    <div className="flex-1">
                                      <div className="font-medium">{problem.title}</div>
                                      <div className="text-sm text-gray-600">{problem.description}</div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        カテゴリ: {problem.category}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => {
                                          setEditingProblem(problem)
                                          setEditHints(problem.hints)
                                          setEditAlternatives(problem.alternativeAnswers || [])
                                          setShowEditProblemModal(true)
                                        }}
                                        size="sm"
                                        variant="outline"
                                      >
                                        <Edit2 size={14} />
                                      </Button>
                                      <Button onClick={() => deleteProblem(problem.id)} size="sm" variant="outline">
                                        <Trash2 size={14} />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* カテゴリ管理 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🏷️ カテゴリ管理</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowCategoryManagementModal(true)} variant="outline" className="w-full">
                  <Cog size={16} className="mr-2" />
                  カテゴリを管理
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === "settings" && (
          <div className="space-y-8">
            <SettingsManager settings={settings} onUpdate={updateSettings} />

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
                  <h3 className="font-semibold mb-2">📁 フォルダと問題数の指定</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• 保存先のフォルダと作成する問題数を指定できます</li>
                    <li>• 例: 「基本操作フォルダに5問作成して」</li>
                    <li>• フォルダ名や問題数が指定されない場合、AIが確認します</li>
                    <li>• 指定されたフォルダが存在しない場合は、新規作成または未分類フォルダを選択可能</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">📚 複数問題の一括生成</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• 一度に複数の問題を作成可能（基礎→応用の流れ）</li>
                    <li>• 指定した件数に応じて、段階的な問題セットを自動生成</li>
                    <li>• 体系的な学習プランを自動構築</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🔍 柔軟なフォルダ管理</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• 指定したフォルダが存在しない場合、その場で新規作成可能</li>
                    <li>• または「未分類」フォルダに保存を選択可能</li>
                    <li>• 自動作成されたフォルダは紫色で表示され、区別しやすい</li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-3 rounded">
                  <h3 className="font-semibold text-blue-800 mb-2">💡 使用例</h3>
                  <div className="text-blue-700 text-sm space-y-2">
                    <p><strong>例1（フォルダと件数を指定）:</strong></p>
                    <p className="pl-4">ユーザー: 「基本操作フォルダにボタンクリックの問題を5問作って」</p>
                    <p className="pl-4">AI: 基本操作フォルダに5問の問題を作成</p>
                    <p className="mt-2"><strong>例2（曖昧な要望）:</strong></p>
                    <p className="pl-4">ユーザー: 「Playwrightを勉強したい」</p>
                    <p className="pl-4">AI: 「どのフォルダに何問作成しますか？どの分野を学習したいですか？」→ 確認後に問題作成</p>
                    <p className="mt-2"><strong>例3（存在しないフォルダを指定）:</strong></p>
                    <p className="pl-4">ユーザー: 「テストフォルダに3問」</p>
                    <p className="pl-4">システム: フォルダが見つからない → 新規作成 or 未分類に保存を選択</p>
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
                  もしこのアプリが役に立ったと感じていただけたら、開発を支援していただけると嬉しいです！
                </p>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-blue-800 text-sm mb-3">💝 サポートしていただくと...</p>
                  <ul className="text-blue-700 text-sm space-y-1 text-left">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowFolderSelectionModal(false)}>
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowQuestionOrderModal(false)}>
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
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
                          {option.type === "unlearned-first" && "まだ解いていない問題を優先的に出題します（デフォルト推奨）"}
                          {option.type === "random" && "全ての問題をランダムな順序で出題します"}
                          {option.type === "learned-first" && "既に学習した問題を優先的に出題します（復習向け）"}
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

        {/* 統合学習開始モーダル */}
        {showUnifiedStartModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowUnifiedStartModal(false)}>
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>学習範囲を選択</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 前回の続きから開始ボタン */}
                {hasLastSettings && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-blue-900">前回の設定で開始する</div>
                        <div className="text-sm text-blue-700 mt-1">
                          {(() => {
                            const type = selectionType === "folder" ? "フォルダ" : "カテゴリ"
                            const count = selectionType === "folder"
                              ? selectedFoldersNew.length
                              : selectedCategories.length
                            const orderLabel = questionOrderOptions.find(o => o.type === questionOrderNew)?.label || ""
                            return `${type}: ${count}件選択 / ${orderLabel}`
                          })()}
                        </div>
                      </div>
                      <Button onClick={quickStart} variant="default">
                        <Play size={16} className="mr-1" />
                        開始
                      </Button>
                    </div>
                  </div>
                )}

                {/* タブ切り替え */}
                <div className="flex gap-2 border-b">
                  <Button
                    variant={selectionType === "folder" ? "default" : "ghost"}
                    className="flex-1"
                    onClick={() => {
                      setSelectionType("folder")
                      setSelectedCategories([])
                    }}
                  >
                    📁 フォルダで選ぶ
                  </Button>
                  <Button
                    variant={selectionType === "category" ? "default" : "ghost"}
                    className="flex-1"
                    onClick={() => {
                      setSelectionType("category")
                      setSelectedFoldersNew([])
                    }}
                  >
                    🏷️ カテゴリで選ぶ
                  </Button>
                </div>

                {/* フォルダ選択 */}
                {selectionType === "folder" && (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {folders.map((folder) => {
                      const problemCount = problems.filter((p) => p.folderId === folder.id).length
                      return (
                        <div key={folder.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`folder-${folder.id}`}
                            checked={selectedFoldersNew.includes(folder.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFoldersNew((prev) => [...prev, folder.id])
                              } else {
                                setSelectedFoldersNew((prev) => prev.filter((id) => id !== folder.id))
                              }
                            }}
                          />
                          <label
                            htmlFor={`folder-${folder.id}`}
                            className={`flex-1 p-3 rounded cursor-pointer ${folder.color} hover:opacity-80`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Folder size={16} />
                                <span className="font-medium">{folder.name}</span>
                              </div>
                              <span className="text-sm text-gray-600">({problemCount}問)</span>
                            </div>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* カテゴリ選択 */}
                {selectionType === "category" && (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {categories.map((category) => {
                      const problemCount = problems.filter((p) => p.category === category).length
                      return (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCategories((prev) => [...prev, category])
                              } else {
                                setSelectedCategories((prev) => prev.filter((c) => c !== category))
                              }
                            }}
                          />
                          <label
                            htmlFor={`category-${category}`}
                            className="flex-1 p-3 rounded cursor-pointer bg-blue-50 hover:bg-blue-100"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{category}</span>
                              <span className="text-sm text-gray-600">({problemCount}問)</span>
                            </div>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 出題方法選択 */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">出題方法</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {questionOrderOptions.map((option) => (
                      <Button
                        key={option.type}
                        variant={questionOrderNew === option.type ? "default" : "outline"}
                        className="h-auto py-3"
                        onClick={() => setQuestionOrderNew(option.type)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() =>
                      startSessionWithUnifiedSettings(
                        selectionType,
                        selectionType === "folder" ? selectedFoldersNew : selectedCategories,
                        questionOrderNew,
                      )
                    }
                    disabled={
                      (selectionType === "folder" && selectedFoldersNew.length === 0) ||
                      (selectionType === "category" && selectedCategories.length === 0)
                    }
                    className="flex-1"
                    size="lg"
                  >
                    学習開始 (
                    {selectionType === "folder"
                      ? `${selectedFoldersNew.length}フォルダ`
                      : `${selectedCategories.length}カテゴリ`}
                    )
                  </Button>
                  <Button onClick={() => setShowUnifiedStartModal(false)} variant="outline" size="lg">
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* フォルダ追加モーダル */}
      {showAddFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddFolderModal(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>新しいフォルダを追加</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="folder-name">フォルダ名</Label>
                <Input
                  id="folder-name"
                  placeholder="例: ページ操作"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement
                      if (input.value.trim()) {
                        addFolder({
                          name: input.value.trim(),
                          description: "",
                          color: "#3B82F6",
                        })
                        setShowAddFolderModal(false)
                      }
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const input = document.getElementById("folder-name") as HTMLInputElement
                    if (input.value.trim()) {
                      addFolder({
                        name: input.value.trim(),
                        description: "",
                        color: "#3B82F6",
                      })
                      setShowAddFolderModal(false)
                    }
                  }}
                  className="flex-1"
                >
                  追加
                </Button>
                <Button onClick={() => setShowAddFolderModal(false)} variant="outline" className="flex-1">
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* フォルダ編集モーダル */}
      {showEditFolderModal && editingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => { setShowEditFolderModal(false); setEditingFolder(null); }}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>フォルダを編集</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit-folder-name">フォルダ名</Label>
                <Input
                  id="edit-folder-name"
                  defaultValue={editingFolder.name}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement
                      if (input.value.trim()) {
                        editFolder(editingFolder.id, {
                          name: input.value.trim(),
                          description: editingFolder.description,
                          color: editingFolder.color,
                        })
                        setShowEditFolderModal(false)
                        setEditingFolder(null)
                      }
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const input = document.getElementById("edit-folder-name") as HTMLInputElement
                    if (input.value.trim()) {
                      editFolder(editingFolder.id, {
                        name: input.value.trim(),
                        description: editingFolder.description,
                        color: editingFolder.color,
                      })
                      setShowEditFolderModal(false)
                      setEditingFolder(null)
                    }
                  }}
                  className="flex-1"
                >
                  保存
                </Button>
                <Button
                  onClick={() => {
                    setShowEditFolderModal(false)
                    setEditingFolder(null)
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 問題追加モーダル */}
      {showAddProblemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => { setShowAddProblemModal(false); setSelectedFolderForAdd(""); setNewHints([]); setNewAlternatives([]); }}>
          <Card className="w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>新しい問題を追加</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="problem-title">タイトル</Label>
                <Input id="problem-title" placeholder="例: ボタンをクリック" />
              </div>
              <div>
                <Label htmlFor="problem-description">説明</Label>
                <Textarea id="problem-description" placeholder="問題の説明を入力" rows={3} />
              </div>
              <div>
                <Label htmlFor="problem-code">期待するコード</Label>
                <Textarea id="problem-code" placeholder="await page.click('#button')" rows={3} />
              </div>
              <div>
                <Label htmlFor="problem-category">カテゴリ</Label>
                <Select
                  onValueChange={(value) => {
                    const select = document.getElementById("problem-category-hidden") as HTMLInputElement
                    if (select) select.value = value
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
                  </SelectContent>
                </Select>
                <input type="hidden" id="problem-category-hidden" />
              </div>
              <div>
                <Label>ヒント</Label>
                <div className="space-y-2">
                  {newHints.map((hint, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={hint}
                        onChange={(e) => {
                          const updated = [...newHints]
                          updated[index] = e.target.value
                          setNewHints(updated)
                        }}
                        placeholder={`ヒント ${index + 1}`}
                      />
                      <Button
                        onClick={() => setNewHints(newHints.filter((_, i) => i !== index))}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() => setNewHints([...newHints, ""])}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Plus size={14} className="mr-2" />
                    ヒントを追加
                  </Button>
                </div>
              </div>
              <div>
                <Label>代替回答</Label>
                <div className="space-y-2">
                  {newAlternatives.map((alt, index) => (
                    <div key={index} className="flex gap-2">
                      <Textarea
                        value={alt}
                        onChange={(e) => {
                          const updated = [...newAlternatives]
                          updated[index] = e.target.value
                          setNewAlternatives(updated)
                        }}
                        placeholder={`代替回答 ${index + 1}`}
                        rows={2}
                      />
                      <Button
                        onClick={() => setNewAlternatives(newAlternatives.filter((_, i) => i !== index))}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() => setNewAlternatives([...newAlternatives, ""])}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Plus size={14} className="mr-2" />
                    代替回答を追加
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const title = (document.getElementById("problem-title") as HTMLInputElement).value
                    const description = (document.getElementById("problem-description") as HTMLTextAreaElement).value
                    const code = (document.getElementById("problem-code") as HTMLTextAreaElement).value
                    const category = (document.getElementById("problem-category-hidden") as HTMLInputElement).value

                    const hints = newHints.filter((h) => h.trim() !== "")
                    const alternatives = newAlternatives.filter((a) => a.trim() !== "")

                    if (title && description && code && category) {
                      addProblem({
                        title,
                        description,
                        expectedCode: code,
                        category,
                        folderId: selectedFolderForAdd || folders[0]?.id || "",
                        hints,
                        alternativeAnswers: alternatives,
                        difficulty: 2,
                      })
                      setShowAddProblemModal(false)
                      setSelectedFolderForAdd("")
                      setNewHints([])
                      setNewAlternatives([])
                    } else {
                      alert("タイトル、説明、期待するコード、カテゴリは必須です")
                    }
                  }}
                  className="flex-1"
                >
                  追加
                </Button>
                <Button
                  onClick={() => {
                    setShowAddProblemModal(false)
                    setSelectedFolderForAdd("")
                    setNewHints([])
                    setNewAlternatives([])
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 問題編集モーダル */}
      {showEditProblemModal && editingProblem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => { setShowEditProblemModal(false); setEditingProblem(null); setEditHints([]); setEditAlternatives([]); }}>
          <Card className="w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>問題を編集</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit-problem-title">タイトル</Label>
                <Input id="edit-problem-title" defaultValue={editingProblem.title} />
              </div>
              <div>
                <Label htmlFor="edit-problem-description">説明</Label>
                <Textarea id="edit-problem-description" defaultValue={editingProblem.description} rows={3} />
              </div>
              <div>
                <Label htmlFor="edit-problem-code">期待するコード</Label>
                <Textarea id="edit-problem-code" defaultValue={editingProblem.expectedCode} rows={3} />
              </div>
              <div>
                <Label htmlFor="edit-problem-category">カテゴリ</Label>
                <Select
                  defaultValue={editingProblem.category}
                  onValueChange={(value) => {
                    const select = document.getElementById("edit-problem-category-hidden") as HTMLInputElement
                    if (select) select.value = value
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" id="edit-problem-category-hidden" defaultValue={editingProblem.category} />
              </div>
              <div>
                <Label>ヒント</Label>
                <div className="space-y-2">
                  {editHints.map((hint, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={hint}
                        onChange={(e) => {
                          const updated = [...editHints]
                          updated[index] = e.target.value
                          setEditHints(updated)
                        }}
                        placeholder={`ヒント ${index + 1}`}
                      />
                      <Button
                        onClick={() => setEditHints(editHints.filter((_, i) => i !== index))}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() => setEditHints([...editHints, ""])}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Plus size={14} className="mr-2" />
                    ヒントを追加
                  </Button>
                </div>
              </div>
              <div>
                <Label>代替回答</Label>
                <div className="space-y-2">
                  {editAlternatives.map((alt, index) => (
                    <div key={index} className="flex gap-2">
                      <Textarea
                        value={alt}
                        onChange={(e) => {
                          const updated = [...editAlternatives]
                          updated[index] = e.target.value
                          setEditAlternatives(updated)
                        }}
                        placeholder={`代替回答 ${index + 1}`}
                        rows={2}
                      />
                      <Button
                        onClick={() => setEditAlternatives(editAlternatives.filter((_, i) => i !== index))}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() => setEditAlternatives([...editAlternatives, ""])}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Plus size={14} className="mr-2" />
                    代替回答を追加
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const title = (document.getElementById("edit-problem-title") as HTMLInputElement).value
                    const description = (document.getElementById("edit-problem-description") as HTMLTextAreaElement)
                      .value
                    const code = (document.getElementById("edit-problem-code") as HTMLTextAreaElement).value
                    const categoryInput = document.getElementById("edit-problem-category-hidden") as HTMLInputElement
                    const category = categoryInput ? categoryInput.value : editingProblem.category

                    const hints = editHints.filter((h) => h.trim() !== "")
                    const alternatives = editAlternatives.filter((a) => a.trim() !== "")

                    if (title && description && code && category) {
                      editProblem(editingProblem.id, {
                        title,
                        description,
                        expectedCode: code,
                        category,
                        folderId: editingProblem.folderId,
                        hints,
                        alternativeAnswers: alternatives,
                        difficulty: editingProblem.difficulty,
                      })
                      setShowEditProblemModal(false)
                      setEditingProblem(null)
                      setEditHints([])
                      setEditAlternatives([])
                    } else {
                      alert("タイトル、説明、期待するコード、カテゴリは必須です")
                    }
                  }}
                  className="flex-1"
                >
                  保存
                </Button>
                <Button
                  onClick={() => {
                    setShowEditProblemModal(false)
                    setEditingProblem(null)
                    setEditHints([])
                    setEditAlternatives([])
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* カテゴリ管理モーダル */}
      {showCategoryManagementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={() => { setShowCategoryManagementModal(false); setNewCategoryName(""); }}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>カテゴリ管理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 新規カテゴリ追加 */}
                <div>
                  <Label htmlFor="newCategory">新しいカテゴリを追加</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="newCategory"
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCategoryName.trim()) {
                          handleAddCategory()
                        }
                      }}
                      placeholder="例: 基本操作"
                    />
                    <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                      追加
                    </Button>
                  </div>
                </div>

                {/* 登録済みカテゴリ一覧 */}
                <div>
                  <Label>登録済みカテゴリ ({categories.length}件)</Label>
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {categories.map((cat) => {
                      const problemCount = problems.filter((p) => p.category === cat).length
                      return (
                        <div
                          key={cat}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                        >
                          <div className="flex-1">
                            <span className="font-medium">{cat}</span>
                            <span className="text-xs text-gray-500 ml-2">({problemCount}問)</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCategory(cat)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      )
                    })}
                    {categories.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        カテゴリが登録されていません
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <Button onClick={() => {
                    setShowCategoryManagementModal(false)
                    setNewCategoryName("")
                  }}>
                    閉じる
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 利用規約モーダル */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" onClick={() => { if (hasAgreedToTerms) setShowTermsModal(false); }}>
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>利用規約</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-4 text-sm">
                <p className="font-semibold">
                  本サービスをご利用いただく前に、以下の利用規約をお読みいただき、同意の上でご利用ください。
                </p>

                <div>
                  <h3 className="font-semibold text-base mb-2">1. サービスの内容</h3>
                  <p className="text-gray-700">
                    本サービスは、提供者の裁量により、予告なく変更・中断・終了することがあります。
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2">2. データの取り扱い</h3>
                  <p className="text-gray-700 mb-2">
                    システムの更新、障害、メンテナンス等により、ユーザが作成または保存したデータが消失・破損する可能性があります。
                  </p>
                  <p className="text-gray-700">
                    提供者はデータの保全を保証するものではなく、これにより生じた損害について一切の責任を負いません。
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2">3. 免責事項</h3>
                  <p className="text-gray-700">
                    本サービスの利用または利用不能により発生した損害（間接的・派生的損害を含む）について、提供者は責任を負いません。
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-base mb-2">4. 利用者の責任</h3>
                  <p className="text-gray-700">
                    ユーザは自己の責任において本サービスを利用するものとし、重要なデータについては適宜バックアップを行うものとします。
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                {!hasAgreedToTerms && (
                  <>
                    <Button onClick={handleAgreeToTerms} className="flex-1">
                      同意する
                    </Button>
                    <Button
                      onClick={() => {
                        if (!hasAgreedToTerms) {
                          alert("利用規約に同意いただけない場合、本サービスをご利用いただけません。")
                        } else {
                          setShowTermsModal(false)
                        }
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      同意しない
                    </Button>
                  </>
                )}
                {hasAgreedToTerms && (
                  <Button onClick={() => setShowTermsModal(false)} className="w-full">
                    閉じる
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ToasterとAIChatWidgetを追加 */}
      <Toaster />
      <AIChatWidget onProblemGenerated={handleAIProblemGenerated} folders={folders} categories={categories} />
    </div>
  )
}
