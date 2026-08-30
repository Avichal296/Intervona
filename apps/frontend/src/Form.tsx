import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { BackendUrl } from "./lib/config";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function Form() {
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (githubUrl.trim() === "") { setError("GitHub URL is required"); return; }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${BackendUrl}/api/v1/interview`, { github: githubUrl.trim() });
      navigate(`/interview/${response.data.id}`);
    } catch {
      setError("Failed to start interview. Check the GitHub URL.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.07),transparent_60%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/20">
            <Sparkles className="h-8 w-8 text-stone-950" />
          </div>
          <p className="text-xs font-medium uppercase tracking-widest text-amber-500/80">Intervona</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">AI Interview</h1>
          <p className="mt-3 text-stone-500">Enter your GitHub URL to begin a voice-based technical interview</p>
        </div>

        <div className="w-full rounded-2xl border border-stone-700/50 bg-stone-900/60 p-8 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="github-url" className="mb-2 block text-sm font-medium text-stone-400">
                GitHub Profile URL
              </label>
              <div className="relative">
                <GitHubIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500" />
                <input
                  id="github-url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full rounded-xl border border-stone-700 bg-stone-950 py-3.5 pl-11 pr-4 text-stone-100 placeholder:text-stone-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  type="url"
                  placeholder="https://github.com/your-username"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-base font-semibold text-stone-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing GitHub...</>
              ) : (
                <><Link2 className="h-5 w-5" /> Start Interview</>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-1 border-t border-stone-800 pt-6 text-center text-xs text-stone-600">
            <p>Repos analyzed to personalize your questions</p>
            <p>Powered by Gemini Live API</p>
          </div>
        </div>
      </div>
    </div>
  );
}
