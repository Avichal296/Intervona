-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Messagetype" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "statusinterview" AS ENUM ('PRE', 'PROGRESS', 'POST');

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "githubMetaData" JSONB NOT NULL,
    "status" "statusinterview" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "feedback" TEXT,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "Messagetype" NOT NULL,
    "InterviewId" TEXT NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "evaluatorKind" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "nextFocus" JSONB NOT NULL,
    "criterionResults" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewResult" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "technicalScore" INTEGER NOT NULL,
    "communicationScore" INTEGER NOT NULL,
    "efficiency" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "contextSummary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "improvements" JSONB NOT NULL,
    "conversationDepth" TEXT NOT NULL,

    CONSTRAINT "InterviewResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Learner" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Learner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "blurb" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "constraints" JSONB NOT NULL,
    "functionalReqs" JSONB NOT NULL,
    "changeScenarios" JSONB NOT NULL,
    "designSignals" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "assumptions" TEXT NOT NULL,
    "classDesign" TEXT NOT NULL,
    "relationships" TEXT NOT NULL,
    "tradeoffs" TEXT NOT NULL,
    "codeSketch" TEXT NOT NULL DEFAULT '',
    "diagramSource" TEXT NOT NULL DEFAULT '',
    "contentHash" TEXT NOT NULL,
    "failReason" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attempt_learnerId_startedAt_idx" ON "Attempt"("learnerId", "startedAt");

-- CreateIndex
CREATE INDEX "Attempt_problemId_idx" ON "Attempt"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_submissionId_key" ON "Evaluation"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewResult_interviewId_key" ON "InterviewResult"("interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_slug_key" ON "Problem"("slug");

-- CreateIndex
CREATE INDEX "Submission_attemptId_createdAt_idx" ON "Submission"("attemptId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_attemptId_contentHash_key" ON "Submission"("attemptId", "contentHash");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_InterviewId_fkey" FOREIGN KEY ("InterviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewResult" ADD CONSTRAINT "InterviewResult_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

