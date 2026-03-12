// app/student/page.tsx
"use client"

import { useState } from "react"
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
        <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
            <h1>今日の学習</h1>

            <label>授業科目</label>
            <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{ width: "100%", marginBottom: 10 }}
            />

            <label>問題</label>
            <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={{ width: "100%", height: 80, marginBottom: 10 }}
            />

            <label>自分の解答</label>
            <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                style={{ width: "100%", height: 80, marginBottom: 20 }}
            />

            <button onClick={handleSubmit} disabled={loading}>
                {loading ? "AIが確認中..." : "AIに確認してもらう"}
            </button>

            {result && (
                <div style={{ marginTop: 30 }}>
                    <h2>AIからのアドバイス</h2>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{result.aiResponse}</pre>
                </div>
            )}
        </div>
    )
}