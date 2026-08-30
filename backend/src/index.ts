import express from "express";
import "dotenv/config";
import cors from "cors";
import { GoogleGenAI, Modality } from "@google/genai";
import { Github } from "../scrapper/Github.js";
import { ParseInterview } from "../type.js";
import { prisma } from "../db.js";

const app = express();
const apiKey = process.env.API_KEY;

if (!apiKey) {
  throw new Error("API_KEY is not defined");
}

const gemini = new GoogleGenAI({
  apiKey,
  httpOptions: { apiVersion: "v1alpha" },
});

app.use(express.json());
app.use(cors());

app.post("/api/v1/interview", async (req, res) => {
  try {
    const r = ParseInterview.safeParse(req.body);

    if (!r.success) {
      return res.status(400).json({ error: "Invalid GitHub URL" });
    }

    const githubUrl = r.data.github.endsWith("/")
      ? r.data.github.slice(0, -1)
      : r.data.github;
    const githubUsername = githubUrl.split("/").pop()!.split("?")[0];

    if (!githubUsername) {
      return res.status(400).json({ error: "Invalid GitHub URL" });
    }

    const githubData = await Github(githubUsername);

    const interview = await prisma.interview.create({
      data: {
        status: "PRE",
        githubMetaData: githubData,
      },
    });

    return res.json({ id: interview.id });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; meta?: unknown };
    console.error("Interview create error:", err);

    return res.status(500).json({
      error: err?.message ?? "Failed to create interview",
      code: err?.code,
    });
  }
});

const LIVE_MODEL = "gemini-3.1-flash-live-preview";

app.get("/api/v1/gemini-token", async (_req, res) => {
  try {
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await gemini.authTokens.create({
      config: {
        uses: 3,
        expireTime,
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            sessionResumption: {},
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
      },
    });

    return res.json({ token: token.name });
  } catch (error) {
    console.error("Gemini token error:", error);
    return res.status(500).json({ error: "Failed to create Gemini token" });
  }
});

app.get("/api/v1/interview/:id", async (req, res) => {
  try {
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.id },
      include: {
        conversation: {
          orderBy: { id: "asc" },
        },
      },
    });

    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    return res.json(interview);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch interview" });
  }
});

app.patch("/api/v1/interview/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["PRE", "PROGRESS", "POST"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const interview = await prisma.interview.update({
      where: { id: req.params.id },
      data: { status },
    });

    return res.json(interview);
  } catch (error) {
    console.error("Status update error:", error);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

app.post("/api/v1/conversation", async (req, res) => {
  try {
    const { interviewId, message, type } = req.body;

    if (!interviewId || !message || !type) {
      return res.status(400).json({
        error: "interviewId, message and type are required",
      });
    }

    const conversation = await prisma.conversation.create({
      data: {
        InterviewId: interviewId,
        message,
        type,
      },
    });

    return res.json(conversation);
  } catch (error) {
    console.error("Conversation save error:", error);
    return res.status(500).json({ error: "Failed to save conversation" });
  }
});

async function evaluateInterview(interviewId: string) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      conversation: {
        orderBy: { id: "asc" },
      },
    },
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  const transcript = interview.conversation
    .map((msg) => `${msg.type}: ${msg.message}`)
    .join("\n");

  const prompt = `You are an expert technical interviewer evaluator.

Analyze this interview transcript and GitHub context, then respond with ONLY valid JSON (no markdown fences):

{
  "score": <number 0-100>,
  "feedback": "<overall summary paragraph>",
  "technicalScore": <number 0-100>,
  "communicationScore": <number 0-100>,
  "efficiency": <number 0-100 overall interview efficiency>,
  "recommendation": "<Strong Hire | Hire | Maybe | No Hire>",
  "contextSummary": "<what GitHub context was used and what topics were discussed>",
  "conversationDepth": "<how deep/thorough the conversation was>",
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"]
}

GitHub context:
${JSON.stringify(interview.githubMetaData)}

Interview transcript:
${transcript || "No conversation recorded."}`;

  const response = await gemini.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  const text = response.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Failed to parse evaluation response");
  }

  const evaluation = JSON.parse(jsonMatch[0]) as {
    score: number;
    feedback: string;
    technicalScore?: number;
    communicationScore?: number;
    efficiency?: number;
    recommendation?: string;
    contextSummary?: string;
    strengths?: string[];
    improvements?: string[];
    conversationDepth?: string;
  };

  const score = Math.min(100, Math.max(0, Math.round(evaluation.score)));

  const structuredFeedback = JSON.stringify({
    summary: evaluation.feedback,
    technicalScore: evaluation.technicalScore ?? score,
    communicationScore: evaluation.communicationScore ?? score,
    efficiency: evaluation.efficiency ?? score,
    recommendation: evaluation.recommendation ?? "Review needed",
    contextSummary: evaluation.contextSummary ?? "",
    strengths: evaluation.strengths ?? [],
    improvements: evaluation.improvements ?? [],
    conversationDepth: evaluation.conversationDepth ?? "",
  });

  return prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: "POST",
      score,
      feedback: structuredFeedback,
    },
    include: {
      conversation: {
        orderBy: { id: "asc" },
      },
    },
  });
}

app.post("/api/v1/interview/:id/complete", async (req, res) => {
  try {
    const interview = await evaluateInterview(req.params.id);
    return res.json(interview);
  } catch (error) {
    console.error("Interview complete error:", error);
    return res.status(500).json({ error: "Failed to complete interview" });
  }
});

app.get("/api/v1/result/:id", async (req, res) => {
  try {
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.id },
      include: {
        conversation: {
          orderBy: { id: "asc" },
        },
      },
    });

    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    const userMessages = interview.conversation.filter((m) => m.type === "USER").length;
    const aiMessages = interview.conversation.filter((m) => m.type === "ASSISTANT").length;

    let parsedFeedback = null;
    try {
      parsedFeedback = interview.feedback ? JSON.parse(interview.feedback) : null;
    } catch {
      parsedFeedback = interview.feedback
        ? { summary: interview.feedback }
        : null;
    }

    return res.json({
      id: interview.id,
      status: interview.status,
      score: interview.score,
      feedback: parsedFeedback,
      githubMetaData: interview.githubMetaData,
      stats: {
        totalMessages: interview.conversation.length,
        userMessages,
        aiMessages,
        conversationEfficiency:
          interview.conversation.length > 0
            ? Math.round((userMessages / interview.conversation.length) * 100)
            : 0,
      },
      transcript: interview.conversation.map((msg) => ({
        type: msg.type,
        content: msg.message,
        id: msg.id,
      })),
    });
  } catch (error) {
    console.error("Result fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch result" });
  }
});

const PORT = process.env.PORT ?? 3001;

export default app;

if (process.env.NODE_ENV !== "production") {
  app.listen(3001, () => {
    console.log("Backend running on 3001");
  });
}
