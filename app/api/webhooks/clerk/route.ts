import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { PrismaClient } from "../../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL環境変数が設定されていません");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export async function POST(req: Request) {
    // Webhookシークレットを取得
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        console.error("CLERK_WEBHOOK_SECRET環境変数が設定されていません");
        return new Response("CLERK_WEBHOOK_SECRET環境変数が設定されていません", {
            status: 500,
        });
    }

    // ヘッダーを取得
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response("ヘッダーが不足しています", { status: 400 });
    }

    // リクエストボディを生の文字列として取得（検証に必要）
    const body = await req.text();

    // Webhookシークレットを検証
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (err) {
        console.error("Webhook検証エラー:", err);
        return new Response(
            JSON.stringify({ error: "Webhook検証に失敗しました", details: String(err) }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    // イベントタイプを取得
    const eventType = evt.type;
    console.log(`Webhookイベント受信: ${eventType}`);

    // イベントに応じて処理
    if (eventType === "user.created") {
        const { id } = evt.data;

        try {
            await prisma.user.create({
                data: {
                    clerk_user_id: id,
                },
            });

            console.log(`ユーザー作成成功: ${id}`);

            return new Response(
                JSON.stringify({ message: "ユーザーを作成しました", userId: id }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        } catch (error: any) {
            console.error("ユーザー作成エラー:", error);

            // 既に存在する場合は成功として扱う
            if (error?.code === "P2002") {
                console.log(`ユーザーは既に存在します: ${id}`);

                return new Response(
                    JSON.stringify({ message: "ユーザーは既に存在します", userId: id }),
                    { status: 200, headers: { "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({ error: "ユーザーの作成に失敗しました", details: String(error) }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }

    if (eventType === "user.updated") {
        const { id } = evt.data;

        try {
            await prisma.user.update({
                where: {
                    clerk_user_id: id,
                },
                data: {
                    // updated_atは自動的に更新されます
                },
            });

            console.log(`ユーザー更新成功: ${id}`);

            return new Response(
                JSON.stringify({ message: "ユーザーを更新しました", userId: id }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        } catch (error: any) {
            console.error("ユーザー更新エラー:", error);

            // ユーザーが存在しない場合は作成
            if (error?.code === "P2025") {
                try {
                    await prisma.user.create({
                        data: {
                            clerk_user_id: id,
                        },
                    });

                    console.log(`ユーザーが存在しなかったため作成しました: ${id}`);

                    return new Response(
                        JSON.stringify({ message: "ユーザーを作成しました", userId: id }),
                        { status: 200, headers: { "Content-Type": "application/json" } }
                    );
                } catch (createError) {
                    console.error("ユーザー作成エラー:", createError);
                }
            }

            return new Response(
                JSON.stringify({ error: "ユーザーの更新に失敗しました", details: String(error) }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }

    if (eventType === "user.deleted") {
        const { id } = evt.data;

        try {
            // onDelete: Cascadeが設定されているので、関連するevaluationsも自動的に削除されます
            await prisma.user.delete({
                where: {
                    clerk_user_id: id,
                },
            });

            console.log(`ユーザー削除成功: ${id}`);

            return new Response(
                JSON.stringify({ message: "ユーザーを削除しました", userId: id }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        } catch (error: any) {
            console.error("ユーザー削除エラー:", error);

            // 既に削除されている場合は成功として扱う
            if (error?.code === "P2025") {
                console.log(`ユーザーは既に削除されています: ${id}`);

                return new Response(
                    JSON.stringify({ message: "ユーザーは既に削除されています", userId: id }),
                    { status: 200, headers: { "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({ error: "ユーザーの削除に失敗しました", details: String(error) }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }

    // その他のイベントタイプ
    console.log(`未処理のイベントタイプ: ${eventType}`);

    return new Response(
        JSON.stringify({ message: "イベントを受信しました", eventType }),
        { status: 200, headers: { "Content-Type": "application/json" } }
    );
}