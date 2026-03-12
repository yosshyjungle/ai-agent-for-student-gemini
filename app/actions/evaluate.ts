// app/actions/evaluate.ts
"use server"

import { GoogleGenAI } from "@google/genai"
import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
    throw new Error("DATABASE_URL環境変数が設定されていません")
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// 以下が肝で、ここを変えることで様々な業種のAIコーチになります。
const SYSTEM_PROMPT = `
あなたは学校教育向けの学習コーチAIです。

【ルール】
・点数や成績評価はしない
・生徒を否定しない
・必ず励ます

【対応手順】
1. 理解度を ◎ / ○ / △ で判断
2. 考え違いをやさしく説明
3. 次の課題を1問出す
4. 前向きな一言を添える

出力形式：
理解度：
AIコメント：
次の課題：
`

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// AI結果をパースする関数
function parseAIResponse(content: string | null): {
    understanding: string | null
    ai_comment: string | null
    next_task: string | null
} {
    if (!content) {
        return {
            understanding: null,
            ai_comment: null,
            next_task: null,
        }
    }

    // 理解度を抽出
    const understandingMatch = content.match(/理解度[:：]\s*(.+?)(?:\n|AIコメント|$)/i)
    const understanding = understandingMatch ? understandingMatch[1].trim() : null

    // AIコメントを抽出
    const commentMatch = content.match(/AIコメント[:：]\s*([\s\S]+?)(?:\n次の課題|$)/i)
    const ai_comment = commentMatch ? commentMatch[1].trim() : null

    // 次の課題を抽出
    const taskMatch = content.match(/次の課題[:：]\s*([\s\S]+)$/i)
    const next_task = taskMatch ? taskMatch[1].trim() : null

    return {
        understanding,
        ai_comment,
        next_task,
    }
}

export async function evaluateAnswer(data: {
    user_id: string
    unit: string
    question: string
    answer: string
}) {
    const prompt = `
【授業科目】
${data.unit}

【問題】
${data.question}

【生徒の解答】
${data.answer}
`

    // AI評価取得
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_PROMPT,
        },
    })

    const aiContent = response.text ?? null

    // AI結果をパース
    const parsed = parseAIResponse(aiContent)

    // DB保存
    const evaluation = await prisma.evaluation.create({
        data: {
            user_id: data.user_id,
            unit: data.unit,
            question: data.question,
            student_answer: data.answer,
            understanding: parsed.understanding,
            ai_comment: parsed.ai_comment,
            next_task: parsed.next_task,
        },
    })

    return {
        id: evaluation.id,
        aiResponse: aiContent,
        understanding: parsed.understanding,
        aiComment: parsed.ai_comment,
        nextTask: parsed.next_task,
        createdAt: evaluation.created_at,
    }
}