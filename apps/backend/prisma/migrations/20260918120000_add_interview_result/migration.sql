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

-- CreateIndex
CREATE UNIQUE INDEX "InterviewResult_interviewId_key"
ON "InterviewResult"("interviewId");

-- AddForeignKey
ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_InterviewId_fkey"
FOREIGN KEY ("InterviewId") REFERENCES "Interview"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewResult"
ADD CONSTRAINT "InterviewResult_interviewId_fkey"
FOREIGN KEY ("interviewId") REFERENCES "Interview"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
