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

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_InterviewId_key" ON "Conversation"("InterviewId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_InterviewId_fkey" FOREIGN KEY ("InterviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
