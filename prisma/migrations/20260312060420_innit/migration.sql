-- CreateTable
CREATE TABLE "evaluations" (
    "id" UUID NOT NULL,
    "user_id" TEXT,
    "unit" TEXT,
    "question" TEXT,
    "student_answer" TEXT,
    "understanding" TEXT,
    "ai_comment" TEXT,
    "next_task" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);
