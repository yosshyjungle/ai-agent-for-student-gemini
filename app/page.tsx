import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            学習サポートAI
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-2xl font-semibold text-[var(--foreground)]">
            今日の学習を、AIと一緒に
          </h2>
          <p className="text-[var(--muted)]">
            解答を入力すると、AIが理解度を確認し、アドバイスと次の課題を提案します。
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <Link
            href="/student"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--primary)] px-8 font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            学習を始める
          </Link>
        </div>
      </main>
    </div>
  );
}
