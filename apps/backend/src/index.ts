import express from "express";
import "dotenv/config";
import cors from "cors";
import { GoogleGenAI, Modality } from "@google/genai";
import { Github } from "../scrapper/Github.js";
import { ParseInterview } from "../type.js";
import { prisma } from "../db.js";
import {createClient}  from "redis";
 
const redis = createClient({
  url: process.env.REDIS_URL!,
})

redis.connect();
const app = express();
const apiKey = process.env.API_KEY;

const gemini = apiKey
  ? new GoogleGenAI({
      apiKey,
      // httpOptions: { apiVersion: "v1alpha" },
    })
  : null;

function requireGemini() {
  if (!gemini || !apiKey) {
    throw new Error("API_KEY is not defined");
  }
  return gemini;
}

app.use(express.json());
app.use(cors({ origin: true }));

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
// -const EVALUATION_MODEL = "gemini-2.5-flash";
const EVALUATION_MODEL = "gemini-3.6-flash";
app.get("/api/v1/gemini-token", async (_req, res) => {
  try {
    const geminiClient = requireGemini();
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await geminiClient.authTokens.create({
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
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error), });
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

export async function evaluateInterview(interviewId: string) {
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

async function generateWithRetry(
  generateFn: () => Promise<any>,
  retries = 4
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await generateFn();
    } catch (error: any) {
      const status = error?.status;

      if (status !== 503 || attempt === retries) {
        throw error;
      }

      const delay = 2000 * Math.pow(2, attempt - 1);

      console.log(
        `Gemini 503. Retrying in ${delay / 1000}s... attempt ${attempt}/${retries}`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }

  throw new Error("Gemini request failed after retries");
}
const response = await generateWithRetry(() =>
  requireGemini().models.generateContent({
    model: EVALUATION_MODEL,
    contents: prompt,
  })
);
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

  return prisma.$transaction(async (tx)=>{
    
      const interview = await tx.interview.update({
      where: {
        id: interviewId,
      },
      data: {
        status: "POST",
        score: score,
        feedback: structuredFeedback,
      }
    })
    
    const result = await tx.interviewResult.create({
      
      data:{
        summary: structuredFeedback,
        technicalScore: evaluation.technicalScore ?? score,
        communicationScore: evaluation.communicationScore ?? score,
        efficiency: evaluation.efficiency ?? score,
        recommendation: evaluation.recommendation ?? "Review needed",
        contextSummary: evaluation.contextSummary ?? "",
        strengths: evaluation.strengths ?? [],
        improvements: evaluation.improvements ?? [],
        conversationDepth: evaluation.conversationDepth ?? "",
        interviewId: interviewId,
        
      }
    })
     
     return {
      interview,
      result
     }
  


})}

app.post("/api/v1/interview/:id/complete", async (req, res) => {
  try {
     
    // const interview = await evaluateInterview(req.params.id);
    // const cachedkey = await redis.get(`interview:${req.params.id}`);
    // if(cachedkey){
    //   return res.status(200).json(JSON.parse(cachedkey));
    // }
    const InterviewId = req.params.id;
    const queue = await redis.lPush(`Interview_queue` , JSON.stringify({id: InterviewId}) )
    return res.status(200).json({
      message: "Interview evaluation job queued",
      queue,
    });
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

export default app;

const PORT = Number(process.env.PORT ?? 3001);

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}
