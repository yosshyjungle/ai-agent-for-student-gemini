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
・過去の学習履歴を考慮して、継続的な成長をサポートする

【対応手順】
1. 過去の学習履歴がある場合は、学習の進捗や傾向を把握する
2. 理解度を ◎ / ○ / △ で判断
3. 前回の学習内容との関連性を考慮して、考え違いをやさしく説明
4. 過去の学習内容を踏まえて、適切な次の課題を1問出す
5. 前向きな一言を添える

出力形式：
理解度：
AIコメント：
次の課題：
`

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// ClerkのユーザーIDからデータベースのUUIDを取得する関数
async function getUserIdFromClerkId(clerkUserId: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: {
            clerk_user_id: clerkUserId,
        },
        select: {
            id: true,
        },
    })

    if (!user) {
        // ユーザーが存在しない場合は作成
        const newUser = await prisma.user.create({
            data: {
                clerk_user_id: clerkUserId,
            },
            select: {
                id: true,
            },
        })

        return newUser.id
    }

    return user.id
}

// 過去の学習履歴を取得する関数
async function getLearningHistory(userId: string, limit: number = 5) {
    return await prisma.evaluation.findMany({
        where: {
            user_id: userId,
        },
        orderBy: {
            created_at: "desc",
        },
        take: limit,
        select: {
            unit: true,
            question: true,
            understanding: true,
            ai_comment: true,
            next_task: true,
            created_at: true,
        },
    })
}

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
    clerk_user_id: string
    unit: string
    question: string
    answer: string
}) {
    // ClerkのユーザーIDからデータベースのUUIDを取得
    const userId = await getUserIdFromClerkId(data.clerk_user_id)

    // 過去の学習履歴を取得（最新5件）
    const history = await getLearningHistory(userId, 5)
    const lastLearning = history.length > 0 ? history[0] : null

    // 学習履歴のテキストを生成
    let historyContext = ""
    if (history.length > 0) {
        historyContext = "\n【過去の学習履歴】\n"
        history.slice(0, 3).forEach((item, index) => {
            const date = new Date(item.created_at).toLocaleDateString("ja-JP")
            historyContext += `${index + 1}. ${date} - ${item.unit || "科目不明"}\n`
            if (item.understanding) historyContext += `   理解度: ${item.understanding}\n`
            if (item.next_task) {
                const taskPreview =
                    item.next_task.length > 50
                        ? item.next_task.substring(0, 50) + "..."
                        : item.next_task
                historyContext += `   次の課題: ${taskPreview}\n`
            }
        })
    }

    // 前回学習の詳細情報
    let lastLearningContext = ""
    if (lastLearning) {
        lastLearningContext = `
【前回の学習内容（参考）】
・授業科目: ${lastLearning.unit || "なし"}
・理解度: ${lastLearning.understanding || "なし"}
・前回の次の課題: ${lastLearning.next_task || "なし"}
・前回のAIコメント（要約）: ${lastLearning.ai_comment
                ? lastLearning.ai_comment.length > 150
                    ? lastLearning.ai_comment.substring(0, 150) + "..."
                    : lastLearning.ai_comment
                : "なし"
            }
`
    }

    const prompt = `
${historyContext}${lastLearningContext}
【今回の学習内容】
【授業科目】
${data.unit}

【問題】
${data.question}

【生徒の解答】
${data.answer}

${lastLearning
            ? "前回の学習内容との関連性や進捗を考慮して、継続的な成長をサポートする評価をしてください。"
            : ""
        }
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

    // データベースに保存
    const evaluation = await prisma.evaluation.create({
        data: {
            user_id: userId,
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