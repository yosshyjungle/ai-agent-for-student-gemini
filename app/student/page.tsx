// app/student/page.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { evaluateAnswer } from "../actions/evaluate"

export default function StudentPage() {
    const [userId] = useState("student-001") // 実際のアプリでは認証から取得
    const [unit, setUnit] = useState("")
    const [question, setQuestion] = useState("")
    const [answer, setAnswer] = useState("")
    const [result, setResult] = useState<{
        id: string
        aiResponse: string | null
        understanding: string | null
        aiComment: string | null
        nextTask: string | null
        createdAt: Date
    } | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        setLoading(true)
        setResult(null)

        const res = await evaluateAnswer({
            user_id: userId,
            unit,
            question,
            answer,
        })

        setResult(res)
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <header className="border-b border-[var(--border)] bg-[var(--surface)]">
                <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
                    <Link
                        href="/"
                        className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                        ← トップへ
                    </Link>
                    <h1 className="text-lg font-semibold text-[var(--foreground)]">
                        今日の学習
                    </h1>
                    <div className="w-16" />
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-6 py-10">
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleSubmit()
                    }}
                    className="space-y-6"
                >
                    <div>
                        <label
                            htmlFor="unit"
                            className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
                        >
                            授業科目
                        </label>
                        <input
                            id="unit"
                            type="text"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="例：数学・二次関数"
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="question"
                            className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
                        >
                            問題
                        </label>
                        <textarea
                            id="question"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="問題文を入力してください"
                            rows={4}
                            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="answer"
                            className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
                        >
                            自分の解答
                        </label>
                        <textarea
                            id="answer"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="解答を入力してください"
                            rows={4}
                            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-[var(--primary)] py-3 font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:pointer-events-none"
                    >
                        {loading ? "AIが確認中..." : "AIに確認してもらう"}
                    </button>
                </form>

                {result && (
                    <section className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                        <h2 className="mb-4 text-base font-semibold text-[var(--foreground)]">
                            AIからのアドバイス
                        </h2>

                        {result.understanding && (
                            <div className="mb-4">
                                <span className="text-sm text-[var(--muted)]">
                                    理解度：
                                </span>
                                <p className="mt-0.5 text-[var(--foreground)]">
                                    {result.understanding}
                                </p>
                            </div>
                        )}

                        {result.aiComment && (
                            <div className="mb-4">
                                <span className="text-sm text-[var(--muted)]">
                                    AIコメント：
                                </span>
                                <p className="mt-0.5 whitespace-pre-wrap text-[var(--foreground)]">
                                    {result.aiComment}
                                </p>
                            </div>
                        )}

                        {result.nextTask && (
                            <div>
                                <span className="text-sm text-[var(--muted)]">
                                    次の課題：
                                </span>
                                <p className="mt-0.5 whitespace-pre-wrap text-[var(--foreground)]">
                                    {result.nextTask}
                                </p>
                            </div>
                        )}

                        {!result.understanding &&
                            !result.aiComment &&
                            !result.nextTask &&
                            result.aiResponse && (
                                <p className="whitespace-pre-wrap text-[var(--foreground)]">
                                    {result.aiResponse}
                                </p>
                            )}
                    </section>
                )}
            </main>
        </div>
    )
}