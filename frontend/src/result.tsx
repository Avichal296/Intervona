import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, BarChart3, Brain, CheckCircle2, Clock,
  GitBranch, Loader2, Star, Target, Trophy, Zap,
} from "lucide-react";
import { BackendUrl } from "./lib/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeedbackData {
  summary?: string;
  technicalScore?: number;
  communicationScore?: number;
  efficiency?: number;
  recommendation?: string;
  contextSummary?: string;
  strengths?: string[];
  improvements?: string[];
  conversationDepth?: string;
}

interface ResultData {
  id: string;
  status: "PRE" | "PROGRESS" | "POST";
  score: number;
  feedback: FeedbackData | string | null;
  githubMetaData?: { name?: string; description?: string }[];
  stats?: {
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    conversationEfficiency: number;
  };
}

const statusConfig = {
  PRE: { label: "Preparing", color: "bg-stone-700/50 text-stone-400", icon: Clock },
  PROGRESS: { label: "Evaluating", color: "bg-amber-500/15 text-amber-400", icon: Loader2 },
  POST: { label: "Completed", color: "bg-emerald-500/15 text-emerald-400", icon: CheckCircle2 },
};

function ScoreRing({ score, label, color = "#fbbf24" }: { score: number; label: string; color?: string }) {
  const c = 2 * Math.PI * 40;
  const offset = c - (score / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-1000" />
        </svg>
        <span className="absolute text-2xl font-bold text-stone-100">{score}</span>
      </div>
      <span className="text-xs text-stone-500">{label}</span>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-700/50 bg-stone-900/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-amber-500/80">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-stone-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-500">{sub}</p>}
    </div>
  );
}

export function Result() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchResult = async () => {
      try {
        const response = await axios.get<ResultData>(`${BackendUrl}/api/v1/result/${id}`);
        setData(response.data);
        setError(null);
        if (response.data.status === "POST") setLoading(false);
      } catch {
        setError("Failed to load results.");
        setLoading(false);
      }
    };
    fetchResult();
    const interval = setInterval(fetchResult, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const status = data?.status ?? "PRE";
  const StatusIcon = statusConfig[status].icon;
  const isEvaluating = status !== "POST";
  const feedback: FeedbackData = typeof data?.feedback === "string" ? { summary: data.feedback } : data?.feedback ?? {};
  const repoCount = Array.isArray(data?.githubMetaData) ? data.githubMetaData.length : 0;

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.05),transparent_60%)]" />
      <div className="relative mx-auto max-w-5xl space-y-6 p-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-amber-500/80">Intervona</p>
            <h1 className="mt-1 text-2xl font-bold">Interview Results</h1>
          </div>
          <Button variant="outline" className="border-stone-600 bg-stone-900 text-stone-200 hover:bg-stone-800" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" /> New Interview
          </Button>
        </header>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-red-300">{error}</div>}

        {isEvaluating && (
          <Card className="border-amber-500/20 bg-amber-500/5 text-stone-100">
            <CardContent className="flex items-center gap-4 p-6">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <div>
                <p className="font-semibold text-amber-300">Evaluating your interview...</p>
                <p className="text-sm text-stone-500">Analyzing performance, context, and efficiency.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-stone-700/50 bg-stone-900/60 text-stone-100 lg:col-span-1">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" /> Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pb-6">
              {loading || isEvaluating ? (
                <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
              ) : (
                <ScoreRing score={data?.score ?? 0} label="out of 100" />
              )}
              <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${statusConfig[status].color}`}>
                <StatusIcon className={`h-4 w-4 ${status === "PROGRESS" ? "animate-spin" : ""}`} />
                {statusConfig[status].label}
              </div>
              {!isEvaluating && feedback.recommendation && (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm text-amber-300">{feedback.recommendation}</span>
              )}
            </CardContent>
          </Card>

          <Card className="border-stone-700/50 bg-stone-900/60 text-stone-100 lg:col-span-2">
            <CardHeader>
              <CardTitle>Performance Breakdown</CardTitle>
              <CardDescription className="text-stone-500">Technical, communication & efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              {isEvaluating ? (
                <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-xl bg-stone-800" />)}</div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <ScoreRing score={feedback.technicalScore ?? data?.score ?? 0} label="Technical" color="#f59e0b" />
                  <ScoreRing score={feedback.communicationScore ?? data?.score ?? 0} label="Communication" color="#fb7185" />
                  <ScoreRing score={feedback.efficiency ?? data?.score ?? 0} label="Efficiency" color="#34d399" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={BarChart3} label="Total Turns" value={data?.stats?.totalMessages ?? 0} sub="messages exchanged" />
          <MetricCard icon={Zap} label="Your Responses" value={data?.stats?.userMessages ?? 0} sub="candidate replies" />
          <MetricCard icon={Target} label="Participation" value={`${data?.stats?.conversationEfficiency ?? 0}%`} sub="your share" />
          <MetricCard icon={GitBranch} label="Repos Analyzed" value={repoCount} sub="from GitHub" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-stone-700/50 bg-stone-900/60 text-stone-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-amber-400" /> Context & Topics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-stone-400">
              {isEvaluating ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-4 animate-pulse rounded bg-stone-800" />)}</div>
              ) : (
                <>
                  <p className="text-stone-300">{feedback.contextSummary || "GitHub profile used to personalize questions."}</p>
                  <p>{feedback.conversationDepth || "Depth analysis not available."}</p>
                  {Array.isArray(data?.githubMetaData) && data.githubMetaData.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {data.githubMetaData.slice(0, 8).map((repo, i) => (
                        <span key={i} className="rounded-full border border-stone-700 bg-stone-800 px-2.5 py-1 text-xs text-stone-400">
                          {repo.name ?? `repo-${i}`}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-stone-700/50 bg-stone-900/60 text-stone-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-rose-400" /> Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isEvaluating ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-4 animate-pulse rounded bg-stone-800" />)}</div>
              ) : (
                <p className="text-sm leading-relaxed text-stone-400">{feedback.summary || "No summary available."}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {!isEvaluating && (feedback.strengths?.length || feedback.improvements?.length) ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-emerald-500/20 bg-emerald-500/5 text-stone-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-400"><Star className="h-5 w-5" /> Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.strengths?.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-400">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-rose-500/20 bg-rose-500/5 text-stone-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-400"><Target className="h-5 w-5" /> Improve</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.improvements?.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-400">
                      <span className="mt-0.5 text-rose-400">→</span> {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
