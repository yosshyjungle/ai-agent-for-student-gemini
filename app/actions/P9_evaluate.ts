// app/actions/evaluate.ts
"use server"

import { GoogleGenAI } from "@google/genai"

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

export async function evaluateAnswer(data: {
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

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_PROMPT,
        },
    })

    return response.text ?? null
}